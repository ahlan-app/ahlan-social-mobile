// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/offlineQueue.test.ts
//
// Tests for the offline request queue used to buffer mutations while
// the device has no connectivity, then replay them when the network
// comes back. Covers the four behaviours the feature brief calls out:
//
//   1. While the device is offline, mutations are buffered in the queue
//      (not silently dropped).
//   2. When the device comes back online, queued requests are replayed
//      in FIFO order through the supplied handler.
//   3. A failed replay keeps the entry in the queue, bumps `attempts`,
//      and stops the replay loop so dependent requests are not run
//      out of order.
//   4. The queue has a configurable hard cap (`maxQueueSize`); once
//      hit, the oldest entry is evicted and the caller is notified
//      via the `onDrop` hook.

import { createOfflineQueue, QueuedRequest } from '../../services/offlineQueue';

interface LikeRequest {
  kind: 'like';
  postId: string;
  userId: string;
}

interface CommentRequest {
  kind: 'comment';
  postId: string;
  body: string;
}

type Payload = LikeRequest | CommentRequest;

describe('offlineQueue — request queue and retry', () => {
  describe('queueing requests while offline', () => {
    test('enqueue buffers a request and exposes it via snapshot in FIFO order', () => {
      let now = 1_000;
      const queue = createOfflineQueue<Payload>({
        now: () => now,
        generateId: (() => {
          let n = 0;
          return () => `id-${(n += 1)}`;
        })(),
      });

      const first = queue.enqueue(
        { kind: 'like', postId: 'post-1', userId: 'user-1' },
        { id: 'like-1' },
      );
      now += 50;
      const second = queue.enqueue(
        { kind: 'comment', postId: 'post-1', body: 'hello' },
        { id: 'comment-1' },
      );
      now += 50;
      const third = queue.enqueue(
        { kind: 'like', postId: 'post-2', userId: 'user-1' },
        { id: 'like-2' },
      );

      // Buffered in arrival order — none have been dropped because the
      // device is "offline" so we never attempted to send them yet.
      const entries = queue.snapshot();
      expect(entries).toHaveLength(3);
      expect(entries.map(e => e.id)).toEqual(['like-1', 'comment-1', 'like-2']);
      expect(entries[0]).toBe(first);
      expect(entries[1]).toBe(second);
      expect(entries[2]).toBe(third);
      expect(entries[0].attempts).toBe(0);
      expect(entries[0].enqueuedAt).toBe(1_000);
      expect(entries[1].enqueuedAt).toBe(1_050);
      expect(entries[2].enqueuedAt).toBe(1_100);

      // No entry has been sent yet — size reflects what's still pending.
      expect(queue.size()).toBe(3);
    });

    test('enqueue assigns a generated id when the caller does not supply one', () => {
      let counter = 0;
      const queue = createOfflineQueue<Payload>({
        generateId: () => `auto-${(counter += 1)}`,
      });

      const a = queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' });
      const b = queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' });

      expect(a.id).toBe('auto-1');
      expect(b.id).toBe('auto-2');
      expect(a.id).not.toBe(b.id);
    });

    test('remove() drops a single entry by id without disturbing the others', () => {
      const queue = createOfflineQueue<Payload>();
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'a' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'b' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'c' });

      expect(queue.remove('b')).toBe(true);
      expect(queue.remove('does-not-exist')).toBe(false);
      expect(queue.snapshot().map(e => e.id)).toEqual(['a', 'c']);
      expect(queue.size()).toBe(2);
    });
  });

  describe('replay on reconnect', () => {
    test('replay() drains the queue in FIFO order via the supplied handler', async () => {
      const queue = createOfflineQueue<Payload>();
      const sent: QueuedRequest<Payload>[] = [];

      queue.enqueue({ kind: 'like', postId: 'post-1', userId: 'u1' }, { id: 'L1' });
      queue.enqueue({ kind: 'comment', postId: 'post-1', body: 'first' }, { id: 'C1' });
      queue.enqueue({ kind: 'like', postId: 'post-2', userId: 'u1' }, { id: 'L2' });

      const succeeded = await queue.replay(async entry => {
        sent.push(entry);
      });

      expect(succeeded).toBe(3);
      expect(sent.map(e => e.id)).toEqual(['L1', 'C1', 'L2']);
      // Each successful request is removed from the queue.
      expect(queue.size()).toBe(0);
      expect(queue.snapshot()).toEqual([]);
    });

    test('a handler failure keeps the entry queued, bumps attempts, and halts replay', async () => {
      const queue = createOfflineQueue<Payload>();
      const sent: string[] = [];

      queue.enqueue({ kind: 'like', postId: 'p1', userId: 'u' }, { id: 'A' });
      queue.enqueue({ kind: 'comment', postId: 'p1', body: 'b' }, { id: 'B' });
      queue.enqueue({ kind: 'like', postId: 'p2', userId: 'u' }, { id: 'C' });

      const calls: Array<() => Promise<void>> = [
        async () => { sent.push('A'); },
        async () => { throw new Error('network still down'); },
        async () => { sent.push('C'); }, // must NOT run on this pass
      ];

      const succeeded = await queue.replay(async entry => {
        await calls.shift()!();
      });

      // Only A succeeded. B threw and we stopped, so C is preserved for
      // the next replay attempt.
      expect(succeeded).toBe(1);
      expect(sent).toEqual(['A']);

      const remaining = queue.snapshot();
      expect(remaining.map(e => e.id)).toEqual(['B', 'C']);
      const b = remaining.find(e => e.id === 'B')!;
      expect(b.attempts).toBe(1);
      expect(remaining.find(e => e.id === 'C')!.attempts).toBe(0);
    });

    test('a second replay after the network recovers drains everything', async () => {
      const queue = createOfflineQueue<Payload>();
      let failB = true;

      queue.enqueue({ kind: 'like', postId: 'p1', userId: 'u' }, { id: 'A' });
      queue.enqueue({ kind: 'comment', postId: 'p1', body: 'b' }, { id: 'B' });
      queue.enqueue({ kind: 'like', postId: 'p2', userId: 'u' }, { id: 'C' });

      // First pass: B still fails.
      const firstPass = await queue.replay(async entry => {
        if (entry.id === 'B' && failB) throw new Error('still down');
      });
      expect(firstPass).toBe(1);
      expect(queue.snapshot().map(e => e.id)).toEqual(['B', 'C']);

      // Network recovers — second pass should clear the backlog.
      failB = false;
      const secondPass = await queue.replay(async () => {
        // succeeds
      });
      expect(secondPass).toBe(2);
      expect(queue.size()).toBe(0);
    });
  });

  describe('max queue size (FIFO eviction)', () => {
    test('once the cap is hit, the oldest entry is evicted and onDrop is notified', () => {
      const dropped: Array<{ id: string; reason: string }> = [];
      const queue = createOfflineQueue<Payload>({
        maxQueueSize: 3,
        generateId: (() => {
          let n = 0;
          return () => `id-${(n += 1)}`;
        })(),
        onDrop: (entry, reason) => {
          dropped.push({ id: entry.id, reason });
        },
      });

      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'a' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'b' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'c' });
      // Queue is at capacity — adding one more must evict `a`.
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'd' });

      expect(queue.size()).toBe(3);
      expect(queue.snapshot().map(e => e.id)).toEqual(['b', 'c', 'd']);
      expect(dropped).toEqual([{ id: 'a', reason: 'queue_full' }]);

      // Add two more; only `b` should be evicted next, then `c`.
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'e' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'f' });
      expect(queue.snapshot().map(e => e.id)).toEqual(['d', 'e', 'f']);
      expect(dropped.map(d => d.id)).toEqual(['a', 'b', 'c']);
      expect(dropped.every(d => d.reason === 'queue_full')).toBe(true);
    });

    test('a throwing onDrop handler does not corrupt the queue', () => {
      const queue = createOfflineQueue<Payload>({
        maxQueueSize: 2,
        onDrop: () => {
          throw new Error('boom');
        },
      });

      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'a' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'b' });
      // This would normally throw via onDrop; the queue must swallow it.
      expect(() =>
        queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'c' }),
      ).not.toThrow();
      expect(queue.snapshot().map(e => e.id)).toEqual(['b', 'c']);
    });

    test('pruneExhausted drops entries whose attempts have hit maxAttempts', () => {
      const dropped: Array<{ id: string; reason: string }> = [];
      const queue = createOfflineQueue<Payload>({
        maxAttempts: 3,
        onDrop: (entry, reason) => {
          dropped.push({ id: entry.id, reason });
        },
      });

      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'x' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'y' });
      queue.enqueue({ kind: 'like', postId: 'p', userId: 'u' }, { id: 'z' });

      // Simulate repeated failures bumping the attempt counter.
      for (const entry of queue.snapshot()) {
        if (entry.id === 'x') entry.attempts = 5; // way over
        if (entry.id === 'y') entry.attempts = 3; // exactly at the cap
        // z stays at 0
      }

      const pruned = queue.pruneExhausted();
      expect(pruned).toBe(2);
      expect(queue.snapshot().map(e => e.id)).toEqual(['z']);
      expect(dropped.map(d => d.id).sort()).toEqual(['x', 'y']);
      expect(dropped.every(d => d.reason === 'attempts_exhausted')).toBe(true);
    });
  });

  describe('persistence (serialize / hydrate)', () => {
    test('serialize → hydrate round-trip preserves the pending queue', () => {
      const queue = createOfflineQueue<Payload>({
        generateId: (() => {
          let n = 0;
          return () => `id-${(n += 1)}`;
        })(),
      });

      queue.enqueue({ kind: 'like', postId: 'p1', userId: 'u' }, { id: 'A' });
      queue.enqueue({ kind: 'comment', postId: 'p2', body: 'hi' }, { id: 'B' });
      // Mark one as having failed once before.
      queue.snapshot()[0].attempts = 1;

      const blob = queue.serialize();
      expect(typeof blob).toBe('string');

      const restored = createOfflineQueue<Payload>({
        generateId: (() => {
          let n = 0;
          return () => `id-${(n += 1)}`;
        })(),
      });
      restored.hydrate(blob);

      const entries = restored.snapshot();
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('A');
      expect(entries[0].attempts).toBe(1);
      expect(entries[0].request).toEqual({ kind: 'like', postId: 'p1', userId: 'u' });
      expect(entries[1].id).toBe('B');
      expect(entries[1].request).toEqual({ kind: 'comment', postId: 'p2', body: 'hi' });
    });

    test('hydrate ignores malformed input instead of throwing', () => {
      const queue = createOfflineQueue<Payload>();
      expect(() => queue.hydrate('not-json{')).not.toThrow();
      expect(() => queue.hydrate('{"version":2,"items":[]}')).not.toThrow();
      expect(() => queue.hydrate('{"version":1,"items":[{"bogus":true}]}')).not.toThrow();
      expect(queue.size()).toBe(0);
    });
  });
});
