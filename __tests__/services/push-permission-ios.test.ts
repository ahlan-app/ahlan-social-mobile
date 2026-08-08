/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/push-permission-ios.test.ts
 *
 * test(push-permission-ios): push permission ios implementation
 */
import { push_permission_ios } from '../../src/services/push_permission_ios';

describe('push-permission-ios', () => {
  test('initialises with sane defaults', () => {
    const instance = push_permission_ios();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = push_permission_ios();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => push_permission_ios('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = push_permission_ios();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = push_permission_ios();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = push_permission_ios();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
