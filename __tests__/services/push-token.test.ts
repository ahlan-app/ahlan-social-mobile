/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/push-token.test.ts
 *
 * test(push-token): push token implementation
 */
import { push_token } from '../../src/services/push_token';

describe('push-token', () => {
  test('initialises with sane defaults', () => {
    const instance = push_token();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = push_token();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => push_token('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = push_token();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = push_token();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = push_token();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
