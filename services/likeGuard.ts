/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: services/likeGuard.ts
 *
 * Small in-flight + debounce guard for "like"-style handlers.
 *
 * Rationale: a user double-tapping the heart icon on a post/comment
 * was previously able to fire two requests before the first response
 * resolved, causing a visible flicker and occasional count drift. This
 * helper centralises the protection so every like handler can share
 * the same behaviour:
 *
 *   - While a request is in flight, additional taps are dropped.
 *   - For a short cool-down window (default 400ms) after a request
 *     settles, additional taps are also dropped. This catches the
 *     "release + immediate second tap" pattern where the first
 *     request has already resolved but the user is still mashing.
 *
 * The helper is framework-agnostic on purpose so it can be unit-tested
 * with plain Jest (no React Native renderer required) and reused by
 * both the Pressable (RN) handlers and the HTML <button> (web) handlers.
 */

/** Status of a guarded handler. */
export type LikeGuardStatus = 'idle' | 'pending' | 'cooldown';

export interface LikeGuard {
  /** Returns true if the tap should proceed, false if it should be dropped. */
  tryAcquire: () => boolean;
  /** Mark the in-flight request as finished; starts the cool-down. */
  release: () => void;
  /** Force the guard back to idle (e.g. on unmount or error reset). */
  reset: () => void;
  /** Inspect current status — useful for tests and debugging. */
  getStatus: () => LikeGuardStatus;
}

export interface LikeGuardOptions {
  /** Cool-down in ms after a request settles. Default: 400. */
  cooldownMs?: number;
  /** Optional clock for tests. */
  now?: () => number;
}

/**
 * Create a fresh guard. Each like-button should hold its own instance
 * so per-item state (e.g. per-post, per-comment) stays isolated.
 */
export function createLikeGuard(options: LikeGuardOptions = {}): LikeGuard {
  const cooldownMs = options.cooldownMs ?? 400;
  const now = options.now ?? Date.now;

  let status: LikeGuardStatus = 'idle';
  let cooldownEndsAt = 0;

  function getStatus(): LikeGuardStatus {
    if (status === 'cooldown' && now() >= cooldownEndsAt) {
      status = 'idle';
      cooldownEndsAt = 0;
    }
    return status;
  }

  function tryAcquire(): boolean {
    // Lazily expire cool-down when queried.
    if (status === 'cooldown' && now() >= cooldownEndsAt) {
      status = 'idle';
      cooldownEndsAt = 0;
    }
    if (status !== 'idle') return false;
    status = 'pending';
    return true;
  }

  function release(): void {
    if (status !== 'pending') {
      // Releasing without an acquire is a no-op (defensive).
      return;
    }
    status = 'cooldown';
    cooldownEndsAt = now() + cooldownMs;
  }

  function reset(): void {
    status = 'idle';
    cooldownEndsAt = 0;
  }

  return { tryAcquire, release, reset, getStatus };
}

/**
 * Convenience wrapper: runs `action` only if the guard allows it, and
 * always releases the guard when the action settles (success or error).
 *
 * Returns `true` when the action actually ran, `false` when it was
 * dropped by the guard.
 */
export async function runGuarded(
  guard: LikeGuard,
  action: () => Promise<unknown>,
): Promise<boolean> {
  if (!guard.tryAcquire()) return false;
  try {
    await action();
    return true;
  } finally {
    guard.release();
  }
}