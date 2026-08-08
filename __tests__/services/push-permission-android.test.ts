/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/push-permission-android.test.ts
 *
 * test(push-permission-android): push permission android implementation
 */
import { push_permission_android } from '../../src/services/push_permission_android';

describe('push-permission-android', () => {
  test('initialises with sane defaults', () => {
    const instance = push_permission_android();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = push_permission_android();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => push_permission_android('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = push_permission_android();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = push_permission_android();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = push_permission_android();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
