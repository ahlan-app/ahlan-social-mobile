/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: services/fetchGuard.ts
 *
 * Small in-flight guard for "fetch" handlers (e.g. loading comments,
 * posts, notifications, profile data).
 *
 * Rationale: React components frequently re-run their `useEffect`
 * data-loading callbacks — route param changes, remounts, focus
 * listeners, pull-to-refresh, dependency-array churn — and if the
 * underlying network call hasn't returned yet, two or more requests
 * can be in flight at the same time. The first response to come back
 * wins, which can be the stale one, leaving the UI out of sync with
 * the latest state. This is a classic "last-write-wins race condition".
 *
 * This helper centralises the protection so every fetch handler can
 * share the same behaviour:
 *
 *   - While a request is in flight, additional fetches for the same
 *     key (postId, userId, …) are dropped.
 *   - The AbortController from the in-flight request is exposed via
 *     `abort()` so callers can cancel the losing request and avoid
 *     late responses overwriting fresh data (defence in depth on top
 *     of the in-flight drop).
 *   - For a short cool-down window (default 400ms) after a request
 *     settles, additional fetches for the same key are also dropped.
 *     This catches the "fire, complete, fire again immediately" loop
 *     from rapid user interaction.
 *
 * The helper is framework-agnostic on purpose so it can be unit-tested
 * with plain Jest (no React Native renderer required) and reused by
 * every fetch handler in the app.
 */

/** Status of a guarded fetch. */
export type FetchGuardStatus = 'idle' | 'pending' | 'cooldown';

export interface FetchGuard {
  /**
   * Attempt to start a fetch.
   *
   * Returns:
   *   - `{ started: true, signal }` when the caller may proceed. The
   *     `signal` is the AbortSignal of the in-flight request — pass it
   *     to `fetch` (or any other cancellable API) so the request can
   *     be aborted if a new request takes over.
   *   - `{ started: false }` when the fetch is dropped because
   *     another request is already pending or the cool-down has not
   *     elapsed yet.
   */
  tryAcquire: () => { started: boolean; signal?: AbortSignal };
  /**
   * Mark the in-flight request as finished. Starts the cool-down.
   * Safe to call multiple times; only the first call after an
   * `tryAcquire()` that returned `started: true` has any effect.
   */
  release: () => void;
  /**
   * Abort the in-flight request (if any) and reset the guard to idle.
   * Use on unmount, route change, or whenever the previous request
   * is no longer relevant.
   */
  abort: () => void;
  /** Force the guard back to idle (e.g. on unmount or error reset). */
  reset: () => void;
  /** Inspect current status — useful for tests and debugging. */
  getStatus: () => FetchGuardStatus;
  /**
   * Read the AbortSignal of the currently in-flight request, or
   * `undefined` when no request is pending. Lets callers chain the
   * signal with their own (e.g. an outer user-cancel signal).
   */
  getSignal: () => AbortSignal | undefined;
}

export interface FetchGuardOptions {
  /** Cool-down in ms after a request settles. Default: 400. */
  cooldownMs?: number;
  /** Optional clock for tests. */
  now?: () => number;
  /**
   * Optional AbortController factory for tests. Defaults to the
   * global `AbortController` when available.
   */
  createAbortController?: () => AbortController | undefined;
}

/**
 * Create a fresh guard. Each fetch handler (e.g. one per postId)
 * should hold its own instance so per-resource state stays isolated.
 */
export function createFetchGuard(
  options: FetchGuardOptions = {},
): FetchGuard {
  const cooldownMs = options.cooldownMs ?? 400;
  const now = options.now ?? Date.now;
  const createAbortController =
    options.createAbortController ??
    (() => {
      if (typeof AbortController === 'undefined') return undefined;
      return new AbortController();
    });

  let status: FetchGuardStatus = 'idle';
  let cooldownEndsAt = 0;
  let currentController: AbortController | undefined;

  function clearController(): void {
    if (currentController) {
      // The controller may already be aborted; calling abort again
      // is a no-op, so this is safe to do unconditionally.
      try {
        currentController.abort();
      } catch {
        // Defensive: some polyfills throw if abort() is called after
        // the controller has been garbage-collected. Swallow.
      }
      currentController = undefined;
    }
  }

  function getStatus(): FetchGuardStatus {
    if (status === 'cooldown' && now() >= cooldownEndsAt) {
      status = 'idle';
      cooldownEndsAt = 0;
    }
    return status;
  }

  function tryAcquire(): { started: boolean; signal?: AbortSignal } {
    // Lazily expire cool-down when queried.
    if (status === 'cooldown' && now() >= cooldownEndsAt) {
      status = 'idle';
      cooldownEndsAt = 0;
    }
    if (status !== 'idle') {
      return { started: false };
    }
    status = 'pending';
    const controller = createAbortController();
    currentController = controller;
    return { started: true, signal: controller?.signal };
  }

  function release(): void {
    if (status !== 'pending') {
      // Releasing without an acquire is a no-op (defensive).
      return;
    }
    status = 'cooldown';
    cooldownEndsAt = now() + cooldownMs;
    // The request is done — drop our handle to the controller. We do
    // NOT call abort() here; the request is allowed to finish so its
    // response can be applied normally.
    currentController = undefined;
  }

  function abort(): void {
    clearController();
    status = 'idle';
    cooldownEndsAt = 0;
  }

  function reset(): void {
    abort();
  }

  function getSignal(): AbortSignal | undefined {
    return currentController?.signal;
  }

  return { tryAcquire, release, abort, reset, getStatus, getSignal };
}

/**
 * Convenience wrapper: runs `action` only if the guard allows it, and
 * always releases the guard when the action settles (success or error).
 *
 * The `action` receives the AbortSignal of the in-flight request so it
 * can wire it into `fetch` (or any other cancellable API). If the
 * action throws or rejects, the guard is released AND the in-flight
 * signal is left alone so any background processing is not killed
 * unexpectedly by the wrapper.
 *
 * Returns:
 *   - `{ ran: true, value }` when the action actually ran.
 *   - `{ ran: false }` when it was dropped by the guard.
 *   - `{ ran: true, error }` when the action threw; the guard is
 *     already released and the caller is responsible for handling
 *     (or re-throwing) the error.
 */
export async function runFetchGuarded<T>(
  guard: FetchGuard,
  action: (signal: AbortSignal | undefined) => Promise<T>,
): Promise<{ ran: true; value?: T; error?: unknown } | { ran: false }> {
  const acquired = guard.tryAcquire();
  if (!acquired.started) {
    return { ran: false };
  }
  try {
    const value = await action(acquired.signal);
    return { ran: true, value };
  } catch (error) {
    return { ran: true, error };
  } finally {
    guard.release();
  }
}
