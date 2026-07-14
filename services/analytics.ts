// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/analytics.ts
//
// Minimal analytics event tracking. Provides three primitives:
//
//   - trackScreenView(name, params?) — log a screen view
//   - trackUserAction(name, params?) — log a user-initiated event
//   - flush() — drain the queue through the supplied transport
//
// Events are buffered in-memory and can be flushed either manually or
// automatically once the queue reaches `batchSize`. The transport is
// injected so tests can substitute a deterministic recorder.
//
// Pure logic — no React Native dependencies — so the tests run under
// the same ts-jest config as the rest of the suite.

export type AnalyticsEvent =
  | { type: 'screen_view'; name: string; params?: Record<string, unknown>; timestamp: number }
  | { type: 'user_action'; name: string; params?: Record<string, unknown>; timestamp: number };

export interface AnalyticsTransport {
  send(events: AnalyticsEvent[]): Promise<void> | void;
}

export interface AnalyticsOptions {
  /** Max events buffered before auto-flush. Default 10. */
  batchSize?: number;
  /** Generates a unique id for the batch (defaults to crypto-free counter). */
  generateBatchId?: () => string;
  /** Returns the current epoch ms. */
  now?: () => number;
  /** Transport used to deliver flushed batches. */
  transport: AnalyticsTransport;
}

export interface Analytics {
  trackScreenView(name: string, params?: Record<string, unknown>): AnalyticsEvent;
  trackUserAction(name: string, params?: Record<string, unknown>): AnalyticsEvent;
  flush(): Promise<AnalyticsEvent[]>;
  size(): number;
  snapshot(): AnalyticsEvent[];
  reset(): void;
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  const batchSize = options.batchSize ?? 10;
  const now = options.now ?? (() => Date.now());
  let idCounter = 0;
  const generateBatchId = options.generateBatchId ?? (() => `batch-${(idCounter += 1)}`);

  const queue: AnalyticsEvent[] = [];
  const flushed: AnalyticsEvent[] = [];

  const enqueue = (event: AnalyticsEvent): AnalyticsEvent => {
    queue.push(event);
    return event;
  };

  const autoFlushIfNeeded = (): Promise<AnalyticsEvent[]> => {
    if (queue.length >= batchSize) {
      // Fire-and-forget; the returned promise from flush() awaits delivery.
      return flushInternal();
    }
    return Promise.resolve([]);
  };

  const flushInternal = async (): Promise<AnalyticsEvent[]> => {
    if (queue.length === 0) return [];
    const batch = queue.splice(0, queue.length);
    flushed.push(...batch);
    // Tag the batch via a side-channel record before sending.
    lastBatchId = generateBatchId();
    await options.transport.send(batch);
    return batch;
  };

  let lastBatchId: string | null = null;

  return {
    trackScreenView(name, params) {
      const event: AnalyticsEvent = {
        type: 'screen_view',
        name,
        params,
        timestamp: now(),
      };
      enqueue(event);
      // Resolve the auto-flush but don't block the caller.
      void autoFlushIfNeeded();
      return event;
    },
    trackUserAction(name, params) {
      const event: AnalyticsEvent = {
        type: 'user_action',
        name,
        params,
        timestamp: now(),
      };
      enqueue(event);
      void autoFlushIfNeeded();
      return event;
    },
    async flush() {
      return flushInternal();
    },
    size() {
      return queue.length;
    },
    snapshot() {
      return queue.slice();
    },
    reset() {
      queue.length = 0;
      flushed.length = 0;
      lastBatchId = null;
    },
  };
}
