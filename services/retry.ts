// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/retry.ts
//
// Generic retry helper for transient network failures.
//
// Supabase / fetch calls occasionally fail with network-level errors
// (timeouts, "Network request failed", DNS hiccups, 5xx from a CDN).
// Retrying immediately usually makes things worse, so we back off
// exponentially: 100ms, 200ms, 400ms, 800ms, … capped at `maxDelayMs`
// so a long-lived retry loop cannot sleep for hours.
//
// The helper is intentionally tiny and framework-agnostic so it can
// be unit-tested with plain Jest (no React Native renderer required)
// and reused by any fetch handler — feed loader, comments, profile
// hydration, story upload, etc.
//
// Default policy:
//   * 3 attempts total (initial + 2 retries)
//   * base delay 100ms, doubling each retry
//   * max delay 5_000ms
//   * all errors are treated as retryable; callers can supply a
//     `shouldRetry` predicate to filter (e.g. only retry on network
//     errors, not on 4xx).
//
// Sleep is injected via `sleep` so tests can swap it for an
// immediate resolve and assert on delay values without real waits.

export interface RetryOptions {
    /** Maximum total attempts, including the first call. Must be >= 1. */
    maxAttempts?: number;
    /** Base delay in milliseconds before the first retry. */
    baseDelayMs?: number;
    /** Maximum delay between retries, regardless of backoff. */
    maxDelayMs?: number;
    /** Optional predicate to decide whether a given error is retryable. */
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    /** Sleep implementation — exposed for tests. */
    sleep?: (ms: number) => Promise<void>;
    /** Optional onRetry hook, called before each backoff sleep. */
    onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_BASE_DELAY_MS = 100;
export const DEFAULT_MAX_DELAY_MS = 5_000;

const defaultSleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Compute the backoff delay for a given attempt index (1-based).
 * attempt=1 → baseDelayMs, attempt=2 → 2×, attempt=3 → 4×, … capped at maxDelayMs.
 */
export const computeBackoff = (
    attempt: number,
    baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
    maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
): number => {
    if (attempt < 1) return 0;
    // 2^(attempt-1) * base, clamped to maxDelayMs.
    const raw = Math.pow(2, attempt - 1) * baseDelayMs;
    return Math.min(raw, maxDelayMs);
};

/**
 * Run `task` with exponential backoff retries.
 *
 * Resolves with the task's return value on the first successful attempt.
 * Rejects with the last error after `maxAttempts` is exhausted, or
 * immediately if `shouldRetry` returns false for a given error.
 */
export async function retryWithBackoff<T>(
    task: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    const shouldRetry = options.shouldRetry ?? (() => true);
    const sleep = options.sleep ?? defaultSleep;
    const onRetry = options.onRetry;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await task();
        } catch (error) {
            lastError = error;

            if (attempt >= maxAttempts) {
                break;
            }

            if (!shouldRetry(error, attempt)) {
                break;
            }

            const delayMs = computeBackoff(attempt, baseDelayMs, maxDelayMs);
            if (onRetry) {
                onRetry({ attempt, delayMs, error });
            }
            await sleep(delayMs);
        }
    }

    throw lastError;
}

/**
 * Convenience predicate: retry only on network-shaped errors.
 * Treats TypeError("Network request failed"), AbortError, and any
 * error whose message mentions common network failure strings as
 * retryable. Everything else (4xx, JSON parse errors, etc.) is NOT
 * retried — those are caller mistakes, not transient outages.
 */
export const isNetworkError = (error: unknown): boolean => {
    if (!error) return false;
    if (typeof (error as { name?: unknown })?.name === 'string') {
        const name = (error as { name: string }).name;
        if (name === 'AbortError' || name === 'NetworkError' || name === 'TypeError') {
            return true;
        }
    }
    const message = String((error as { message?: unknown })?.message ?? error).toLowerCase();
    return (
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('fetch failed') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('socket hang up')
    );
};