/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/retry-policy.test.ts
 *
 * test(retry-policy): retry policy implementation
 */
import { retry_policy } from '../../src/services/retry_policy';

describe('retry-policy', () => {
  test('initialises with sane defaults', () => {
    const instance = retry_policy();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = retry_policy();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => retry_policy('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = retry_policy();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = retry_policy();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = retry_policy();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
