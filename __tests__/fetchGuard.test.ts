/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/fetchGuard.test.ts
 *
 * Tests for the `createFetchGuard` / `runFetchGuarded` helpers added
 * to services/fetchGuard.ts.
 *
 * The bug being fixed: `loadAndSetComments` in
 * `app/comments/[postId].tsx` was invoked from a `useEffect` that
 * depended on a `useCallback`, and a rapid sequence of postId
 * changes (or a remount, or a pull-to-refresh hammer) could fire
 * two `getCommentsForPost` requests at once. The first response to
 * come back was applied, which could be the stale one, leaving the
 * UI out of sync with the latest state. The guard now drops
 * concurrent fetches and exposes an AbortSignal so the underlying
 * request can be cancelled in flight.
 */

import { createFetchGuard, runFetchGuarded } from '../services/fetchGuard';

class FakeAbortController {
  public signal: { aborted: boolean };
  private listeners: Array<() => void> = [];

  constructor() {
    this.signal = { aborted: false };
  }

  abort(): void {
    if (this.signal.aborted) return;
    this.signal.aborted = true;
    for (const listener of this.listeners) listener();
  }

  // Minimal EventTarget-like API for tests if needed later.
  addEventListener(_event: 'abort', listener: () => void): void {
    this.listeners.push(listener);
  }
}

describe('createFetchGuard', () => {
  test('concurrent fetches are dropped — only the first runs', async () => {
    const guard = createFetchGuard({
      createAbortController: () => new FakeAbortController() as unknown as AbortController,
    });
    const action = jest.fn(async () => {
      // Simulate a slow network round-trip.
      await new Promise(resolve => setTimeout(resolve, 20));
      return ['comment-1'];
    });

    // Fire ten concurrent fetches as if React re-ran the effect.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => runFetchGuarded(guard, action)),
    );

    const ranCount = results.filter(r => r.ran).length;
    const droppedCount = results.length - ranCount;

    expect(ranCount).toBe(1);
    expect(droppedCount).toBe(9);
    expect(action).toHaveBeenCalledTimes(1);
  });

  test('fetches during the post-release cool-down window are also dropped', async () => {
    let now = 1_000;
    const guard = createFetchGuard({
      cooldownMs: 400,
      now: () => now,
      createAbortController: () => new FakeAbortController() as unknown as AbortController,
    });
    const action = jest.fn(async () => 'ok');

    // First fetch: acquires, runs, releases.
    const first = await runFetchGuarded(guard, () => action());
    expect(first.ran).toBe(true);
    expect(guard.getStatus()).toBe('cooldown');

    // Within the 400ms cool-down window no further fetch is allowed.
    now += 200;
    const second = await runFetchGuarded(guard, () => action());
    expect(second.ran).toBe(false);

    now += 100; // 300ms total since release
    const third = await runFetchGuarded(guard, () => action());
    expect(third.ran).toBe(false);

    // After the cool-down expires, the next fetch proceeds.
    now += 200; // 500ms total since release — past the 400ms window
    const fourth = await runFetchGuarded(guard, () => action());
    expect(fourth.ran).toBe(true);

    expect(action).toHaveBeenCalledTimes(2);
  });

  test('abort() cancels the in-flight signal and resets the guard', async () => {
    let aborted = false;
    const fakeController = {
      get signal() {
        return { aborted };
      },
      abort: () => {
        aborted = true;
      },
    } as unknown as AbortController;

    const guard = createFetchGuard({
      createAbortController: () => fakeController,
    });

    const acquired = guard.tryAcquire();
    expect(acquired.started).toBe(true);
    expect(acquired.signal).toBeDefined();
    expect(acquired.signal?.aborted).toBe(false);
    expect(guard.getStatus()).toBe('pending');

    // Simulate a route change / unmount: the caller calls abort().
    guard.abort();
    expect(aborted).toBe(true);
    expect(guard.getStatus()).toBe('idle');
    expect(guard.getSignal()).toBeUndefined();

    // The next fetch is allowed to start fresh.
    const acquired2 = guard.tryAcquire();
    expect(acquired2.started).toBe(true);
  });

  test('runFetchGuarded surfaces errors but still releases the guard', async () => {
    const guard = createFetchGuard({
      createAbortController: () => new FakeAbortController() as unknown as AbortController,
    });
    const action = jest.fn(async () => {
      throw new Error('network down');
    });

    const result = await runFetchGuarded(guard, action);
    expect(result.ran).toBe(true);
    if (result.ran) {
      expect((result.error as Error).message).toBe('network down');
    }

    // Guard must be released so the next fetch can proceed.
    expect(guard.getStatus()).toBe('cooldown');
  });
});
