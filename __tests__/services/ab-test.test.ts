/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/ab-test.test.ts
 *
 * test(ab-test): ab test implementation
 */
import { ab_test } from '../../src/services/ab_test';

describe('ab-test', () => {
  test('initialises with sane defaults', () => {
    const instance = ab_test();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = ab_test();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => ab_test('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = ab_test();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = ab_test();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = ab_test();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
