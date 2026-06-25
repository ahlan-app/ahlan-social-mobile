// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/offlineQueue.ts
//
// In-memory + AsyncStorage-backed offline request queue.
//
// When the device is offline (or a network call fails because of a
// transport error), mutations like posting a comment, sending a
// notification, or registering a like must NOT be silently dropped.
// Instead, they are enqueued and replayed the next time connectivity
// is restored.
//
// Design goals:
//   - Framework-agnostic — pure TypeScript, no React, no Expo, no
//     native deps. This makes it trivially unit-testable with Jest
//     in a Node environment, mirroring the pattern used by
//     `services/fetchGuard.ts`.
//   - Bounded memory — a configurable `maxQueueSize` prevents a long
//     offline session from accumulating thousands of requests in RAM.
//     Once the cap is hit, the oldest queued request is evicted and
//     reported via an `onDrop` callback so the UI can warn the user.
//   - Replay preserves order — requests are replayed in FIFO order
//     so dependencies between them (e.g. create-then-react) stay
//     correct.
//   - Idempotency hooks — every enqueued request carries a stable
//     `id` (caller-supplied UUID or generated) so the replay layer
//     can dedupe across app restarts.
//   - Serializable — `serialize()` / `hydrate()` round-trip the
//     queue through AsyncStorage so pending mutations survive a
//     process restart and an offline cold start.

/** A queued request waiting to be replayed. */
export interface QueuedRequest<TPayload = unknown> {
  /** Stable unique id used for dedupe. Auto-generated when omitted. */
  id: string;
  /** Wall-clock ms when the request was enqueued. */
  enqueuedAt: number;
  /** Number of times replay has been attempted for this entry. */
  attempts: number;
  /** Logical request — what to replay. */
  request: TPayload;
}

export interface OfflineQueueOptions<TPayload = unknown> {
  /**
   * Hard cap on how many requests can sit in the queue at once.
   * Older entries are evicted (FIFO) once the cap is hit. Default: 100.
   */
  maxQueueSize?: number;
  /**
   * Maximum number of replay attempts per entry. Once exhausted, the
   * entry is dropped from the queue and reported via `onDrop`.
   * Default: 5.
   */
  maxAttempts?: number;
  /** Inject a clock for deterministic tests. */
  now?: () => number;
  /** Inject an id generator for deterministic tests. */
  generateId?: () => string;
  /** Notified when an entry is evicted (queue full or attempts exhausted). */
  onDrop?: (entry: QueuedRequest<TPayload>, reason: 'queue_full' | 'attempts_exhausted') => void;
}

/** Strategy used by `replay()` to actually perform a queued request. */
export type ReplayHandler<TPayload> = (entry: QueuedRequest<TPayload>) => Promise<void>;

export interface OfflineQueue<TPayload = unknown> {
  /** Current queue length. */
  size: () => number;
  /** All entries (oldest first). Snapshot — safe to iterate. */
  snapshot: () => QueuedRequest<TPayload>[];
  /** Push a request onto the queue. Returns the stored entry. */
  enqueue: (request: TPayload, options?: { id?: string }) => QueuedRequest<TPayload>;
  /** Remove a specific entry by id. */
  remove: (id: string) => boolean;
  /** Drop everything. */
  clear: () => void;
  /**
   * Replay queued requests in FIFO order using the supplied handler.
   * Stops at the first failure (handler throws) so order is preserved.
   * Returns the number of entries successfully replayed.
   */
  replay: (handler: ReplayHandler<TPayload>) => Promise<number>;
  /** Drop entries whose `attempts` field has hit `maxAttempts`. */
  pruneExhausted: () => number;
  /** Serialize to a JSON string for AsyncStorage. */
  serialize: () => string;
  /** Restore from a JSON string previously produced by `serialize`. */
  hydrate: (raw: string) => void;
}

/**
 * Generate a reasonably-unique id without depending on the `crypto`
 * global (which isn't always present in a Jest Node environment).
 */
const defaultGenerateId = (): string => {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${time}-${random}`;
};

export function createOfflineQueue<TPayload = unknown>(
  options: OfflineQueueOptions<TPayload> = {},
): OfflineQueue<TPayload> {
  const maxQueueSize = options.maxQueueSize ?? 100;
  const maxAttempts = options.maxAttempts ?? 5;
  const now = options.now ?? Date.now;
  const generateId = options.generateId ?? defaultGenerateId;
  const onDrop = options.onDrop;

  const items: QueuedRequest<TPayload>[] = [];

  function size(): number {
    return items.length;
  }

  function snapshot(): QueuedRequest<TPayload>[] {
    return items.slice();
  }

  function dropOldest(reason: 'queue_full' | 'attempts_exhausted'): void {
    const dropped = items.shift();
    if (dropped && onDrop) {
      try {
        onDrop(dropped, reason);
      } catch {
        // Defensive: an onDrop handler that throws must not break the queue.
      }
    }
  }

  function enqueue(request: TPayload, enqueueOptions?: { id?: string }): QueuedRequest<TPayload> {
    const entry: QueuedRequest<TPayload> = {
      id: enqueueOptions?.id ?? generateId(),
      enqueuedAt: now(),
      attempts: 0,
      request,
    };
    items.push(entry);
    // Evict the oldest entry until we're under the cap. We only ever
    // push one entry per `enqueue()` call, so this loop runs at most
    // once — but keeping it as a loop makes the bound airtight even
    // if the cap is changed underneath us.
    while (items.length > maxQueueSize) {
      dropOldest('queue_full');
    }
    return entry;
  }

  function remove(id: string): boolean {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    return true;
  }

  function clear(): void {
    items.length = 0;
  }

  function pruneExhausted(): number {
    let dropped = 0;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (items[i].attempts >= maxAttempts) {
        const removed = items.splice(i, 1)[0];
        dropped += 1;
        if (onDrop) {
          try {
            onDrop(removed, 'attempts_exhausted');
          } catch {
            // ignore — see above
          }
        }
      }
    }
    return dropped;
  }

  async function replay(handler: ReplayHandler<TPayload>): Promise<number> {
    let succeeded = 0;
    // Iterate over a snapshot so handlers that mutate the queue
    // (e.g. calling `remove()` from inside the handler) don't break
    // the in-place indexing.
    const pending = items.slice();
    for (const entry of pending) {
      // If the entry vanished between snapshot and now, skip it.
      if (!items.some(item => item.id === entry.id)) continue;
      try {
        await handler(entry);
        // Success: remove from the queue.
        remove(entry.id);
        succeeded += 1;
      } catch {
        // Failure: bump attempts and stop. Order matters for replay,
        // so we don't keep hammering later entries that might depend
        // on this one. The caller can call replay() again later.
        const live = items.find(item => item.id === entry.id);
        if (live) live.attempts += 1;
        break;
      }
    }
    return succeeded;
  }

  function serialize(): string {
    return JSON.stringify({ version: 1, items });
  }

  function hydrate(raw: string): void {
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt blob — discard rather than crash on boot.
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    const record = parsed as { version?: unknown; items?: unknown };
    if (record.version !== 1) return;
    if (!Array.isArray(record.items)) return;
    items.length = 0;
    for (const candidate of record.items) {
      if (!candidate || typeof candidate !== 'object') continue;
      const c = candidate as Partial<QueuedRequest<TPayload>>;
      if (
        typeof c.id === 'string' &&
        typeof c.enqueuedAt === 'number' &&
        typeof c.attempts === 'number' &&
        c.request !== undefined
      ) {
        items.push({
          id: c.id,
          enqueuedAt: c.enqueuedAt,
          attempts: c.attempts,
          request: c.request,
        });
      }
    }
  }

  return {
    size,
    snapshot,
    enqueue,
    remove,
    clear,
    replay,
    pruneExhausted,
    serialize,
    hydrate,
  };
}
