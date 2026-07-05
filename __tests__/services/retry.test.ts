// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/retry.test.ts
//
// Behaviour tests for services/retry.ts — exponential backoff, max
// retry count, and "give up after limit" semantics.
//
// We inject a fake `sleep` so the suite stays fast and deterministic.
// The fake sleep records every requested delay so we can assert on
// the backoff sequence (100ms, 200ms, 400ms, …) without actually
// waiting.

import {
    retryWithBackoff,
    computeBackoff,
    isNetworkError,
    DEFAULT_BASE_DELAY_MS,
    DEFAULT_MAX_DELAY_MS,
} from '../../services/retry';

describe('retry — exponential backoff on network failure', () => {
    it('retries with exponentially increasing delays (100, 200, 400) before succeeding', async () => {
        const sleepDelays: number[] = [];
        const fakeSleep = (ms: number): Promise<void> => {
            sleepDelays.push(ms);
            return Promise.resolve();
        };

        let calls = 0;
        const flakyFetch = jest.fn(async () => {
            calls += 1;
            if (calls < 4) {
                throw new TypeError('Network request failed');
            }
            return { ok: true, payload: 'finally' };
        });

        const result = await retryWithBackoff(flakyFetch, {
            maxAttempts: 5,
            baseDelayMs: 100,
            sleep: fakeSleep,
        });

        expect(result).toEqual({ ok: true, payload: 'finally' });
        expect(calls).toBe(4); // 3 failures + 1 success
        // Backoff before retry 2, 3, 4 → attempt 1, 2, 3 → 100, 200, 400.
        expect(sleepDelays).toEqual([100, 200, 400]);
    });

    it('does not sleep after a successful attempt', async () => {
        const sleepDelays: number[] = [];
        const fakeSleep = (ms: number): Promise<void> => {
            sleepDelays.push(ms);
            return Promise.resolve();
        };

        const task = jest.fn(async () => 'ok');

        const result = await retryWithBackoff(task, {
            maxAttempts: 3,
            sleep: fakeSleep,
        });

        expect(result).toBe('ok');
        expect(task).toHaveBeenCalledTimes(1);
        expect(sleepDelays).toEqual([]);
    });
});

describe('retry — max retry count', () => {
    it('calls the task exactly maxAttempts times and rejects with the last error', async () => {
        const fakeSleep = (_ms: number): Promise<void> => Promise.resolve();

        const lastError = new Error('still down');
        const task = jest.fn(async () => {
            throw lastError;
        });

        await expect(
            retryWithBackoff(task, {
                maxAttempts: 3,
                sleep: fakeSleep,
            }),
        ).rejects.toBe(lastError);

        expect(task).toHaveBeenCalledTimes(3);
    });

    it('honours maxAttempts=1 (no retries)', async () => {
        const sleepDelays: number[] = [];
        const fakeSleep = (ms: number): Promise<void> => {
            sleepDelays.push(ms);
            return Promise.resolve();
        };

        const error = new Error('boom');
        const task = jest.fn(async () => {
            throw error;
        });

        await expect(
            retryWithBackoff(task, { maxAttempts: 1, sleep: fakeSleep }),
        ).rejects.toBe(error);

        expect(task).toHaveBeenCalledTimes(1);
        expect(sleepDelays).toEqual([]); // no retry → no sleep
    });
});

describe('retry — give up after limit', () => {
    it('stops calling the task once maxAttempts is reached, even if it keeps failing', async () => {
        const fakeSleep = (_ms: number): Promise<void> => Promise.resolve();

        let calls = 0;
        const alwaysFails = jest.fn(async () => {
            calls += 1;
            throw new TypeError('Network request failed');
        });

        const onRetry = jest.fn();

        await expect(
            retryWithBackoff(alwaysFails, {
                maxAttempts: 3,
                baseDelayMs: 100,
                sleep: fakeSleep,
                onRetry,
            }),
        ).rejects.toThrow('Network request failed');

        expect(calls).toBe(3); // initial + 2 retries, then give up
        expect(onRetry).toHaveBeenCalledTimes(2); // onRetry fires BEFORE each backoff, not after the final failure
        // Verify the delays handed to onRetry match the exponential schedule.
        expect(onRetry.mock.calls.map(c => c[0].delayMs)).toEqual([100, 200]);
    });

    it('stops immediately when shouldRetry returns false (no retry on non-transient errors)', async () => {
        const sleepDelays: number[] = [];
        const fakeSleep = (ms: number): Promise<void> => {
            sleepDelays.push(ms);
            return Promise.resolve();
        };

        const authError = new Error('401 Unauthorized');
        const task = jest.fn(async () => {
            throw authError;
        });

        const shouldRetry = jest.fn(() => false);

        await expect(
            retryWithBackoff(task, {
                maxAttempts: 5,
                sleep: fakeSleep,
                shouldRetry,
            }),
        ).rejects.toBe(authError);

        expect(task).toHaveBeenCalledTimes(1); // gave up on first failure
        expect(shouldRetry).toHaveBeenCalledTimes(1);
        expect(sleepDelays).toEqual([]); // never slept → never retried
    });
});

describe('retry — computeBackoff + isNetworkError helpers', () => {
    it('caps backoff at maxDelayMs', () => {
        // 100 * 2^6 = 6400, capped to 2000.
        expect(computeBackoff(7, 100, 2000)).toBe(2000);
        // default cap of 5_000.
        expect(computeBackoff(20)).toBe(DEFAULT_MAX_DELAY_MS);
    });

    it('returns 0 for attempt < 1', () => {
        expect(computeBackoff(0)).toBe(0);
        expect(computeBackoff(-1)).toBe(0);
    });

    it('recognises common network failure shapes', () => {
        expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
        expect(isNetworkError(new Error('timeout exceeded'))).toBe(true);
        expect(isNetworkError(new Error('fetch failed'))).toBe(true);
        expect(isNetworkError({ name: 'AbortError' })).toBe(true);
        // Non-network errors should NOT be retried by isNetworkError alone.
        expect(isNetworkError(new Error('401 Unauthorized'))).toBe(false);
        expect(isNetworkError(new Error('JSON parse error'))).toBe(false);
    });
});