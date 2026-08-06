/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/rate-limit.test.ts
 *
 * test(rate-limit): rate limit implementation
 */
import { rate_limit } from '../../src/services/rate_limit';

describe('rate-limit', () => {
  test('initialises with sane defaults', () => {
    const instance = rate_limit();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = rate_limit();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => rate_limit('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = rate_limit();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = rate_limit();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = rate_limit();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
