// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/api-error-handling.test.ts
//
// API error-handling tests covering four transport-level failure modes:
//   1. Network timeout — fetch rejects with an AbortError (the shape a
//      timeout/abort produces) and the caller sees the error propagate.
//   2. 500 server error — fetch resolves with ok:false / status 500 and
//      uploadMedia throws a descriptive error containing the status.
//   3. Malformed JSON response — the offline-queue hydrate path must not
//      crash when handed a corrupt JSON blob (defensive try/catch).
//   4. Retry on 429 — the offline queue replays a request that first
//      failed (rate limited) and succeeds on the next attempt, bumping
//      the attempt counter rather than dropping the entry.
//   5. Network error propagation — a TypeError from fetch (the shape the
//      WHATWG fetch spec throws for a DNS/unreachable failure) propagates.

// --- Mock the Supabase native client so apiService.ts can be imported ---
// in a pure-Node Jest environment without pulling in AsyncStorage / expo.
jest.mock('../../services/supabase.native', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  },
}), { virtual: true });

import { uploadMedia } from '../../services/apiService';
import { createOfflineQueue } from '../../services/offlineQueue';

describe('API error response handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    // Restore the real fetch between tests so mocks never leak.
    global.fetch = originalFetch;
  });

  // 1. Network timeout ------------------------------------------------------
  it('propagates a network timeout (AbortError) from fetch', async () => {
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'AbortError';
    global.fetch = jest.fn().mockRejectedValue(timeoutError) as unknown as typeof fetch;

    await expect(uploadMedia('file:///tmp/photo.jpg', 'user-1')).rejects.toThrow(/aborted/);
  });

  // 2. 500 server error -----------------------------------------------------
  it('throws a descriptive error on a 500 server error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response) as unknown as typeof fetch;

    await expect(uploadMedia('file:///tmp/photo.jpg', 'user-1')).rejects.toThrow(/500/);
  });

  // 3. Malformed JSON response ---------------------------------------------
  it('does not crash when hydrating a malformed JSON response', () => {
    const queue = createOfflineQueue<string>();
    const corruptBlob = '<<not-json>>{)[invalid';

    // hydrate must swallow the parse failure and leave the queue empty
    // rather than throwing and crashing the app on boot.
    expect(() => queue.hydrate(corruptBlob)).not.toThrow();
    expect(queue.size()).toBe(0);
  });

  // 4. Retry on 429 (rate limited) -----------------------------------------
  it('retries a rate-limited (429) request and succeeds on the next attempt', async () => {
    const queue = createOfflineQueue<string>({ maxAttempts: 5 });
    queue.enqueue('POST /comments');

    let callCount = 0;
    const handler = jest.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        // First attempt is rate-limited by the server.
        throw new Error('429 Too Many Requests');
      }
      // Second attempt succeeds.
    });

    // First replay — fails on the 429, stops, bumps attempts.
    const firstPass = await queue.replay(handler);
    expect(firstPass).toBe(0);
    expect(queue.size()).toBe(1);
    expect(queue.snapshot()[0].attempts).toBe(1);

    // Second replay — the retried request now succeeds and is removed.
    const secondPass = await queue.replay(handler);
    expect(secondPass).toBe(1);
    expect(queue.size()).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  // 5. Network error propagation (DNS / unreachable) -----------------------
  it('propagates a low-level network error (TypeError) from fetch', async () => {
    const networkError = new TypeError('Network request failed');
    global.fetch = jest.fn().mockRejectedValue(networkError) as unknown as typeof fetch;

    await expect(uploadMedia('file:///tmp/photo.jpg', 'user-1')).rejects.toThrow(/Network request failed/);
  });
});
