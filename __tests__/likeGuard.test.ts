/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/likeGuard.test.ts
 *
 * Tests for the `createLikeGuard` helper added to services/likeGuard.ts.
 *
 * The bug being fixed: a rapid double-tap on the heart button was firing
 * two `toggleCommentLike` / `togglePostLike` requests before the first
 * response resolved, causing a visible flicker and occasional count drift.
 * The guard now drops taps while a request is in flight and during a
 * short cool-down window after the request settles.
 */

import { createLikeGuard, runGuarded } from '../services/likeGuard';

describe('createLikeGuard', () => {
  test('rapid taps while a request is in flight only acquire once', () => {
    const guard = createLikeGuard();

    // First tap proceeds.
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.getStatus()).toBe('pending');

    // 9 more rapid taps while the network call is still pending are all
    // dropped — no second request is allowed to start.
    for (let i = 0; i < 9; i++) {
      expect(guard.tryAcquire()).toBe(false);
    }
    expect(guard.getStatus()).toBe('pending');
  });

  test('taps during the post-release cool-down window are also dropped', () => {
    // Use a controllable clock so the test is deterministic.
    let now = 1_000;
    const guard = createLikeGuard({ cooldownMs: 400, now: () => now });

    // First tap + release cycle.
    expect(guard.tryAcquire()).toBe(true);
    guard.release();
    expect(guard.getStatus()).toBe('cooldown');

    // Within the 400ms cool-down window no further tap is allowed.
    now += 200;
    expect(guard.tryAcquire()).toBe(false);
    expect(guard.getStatus()).toBe('cooldown');

    now += 100; // 300ms total since release
    expect(guard.tryAcquire()).toBe(false);

    // After the cool-down expires, the next tap proceeds.
    now += 200; // 500ms total since release — past the 400ms window
    expect(guard.tryAcquire()).toBe(true);
    expect(guard.getStatus()).toBe('pending');
  });

  test('runGuarded fires the action exactly once across a burst of calls', async () => {
    const guard = createLikeGuard();
    const action = jest.fn(async () => {
      // Simulate a slow network round-trip.
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Fire ten concurrent taps as if the user mashed the heart.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => runGuarded(guard, action)),
    );

    const ranCount = results.filter(Boolean).length;
    const droppedCount = results.length - ranCount;

    expect(ranCount).toBe(1);
    expect(droppedCount).toBe(9);
    expect(action).toHaveBeenCalledTimes(1);
  });
});