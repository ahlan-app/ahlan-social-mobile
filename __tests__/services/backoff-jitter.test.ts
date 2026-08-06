/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/backoff-jitter.test.ts
 *
 * test(backoff-jitter): backoff jitter implementation
 */
import { backoff_jitter } from '../../src/services/backoff_jitter';

describe('backoff-jitter', () => {
  test('initialises with sane defaults', () => {
    const instance = backoff_jitter();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = backoff_jitter();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => backoff_jitter('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = backoff_jitter();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = backoff_jitter();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = backoff_jitter();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
