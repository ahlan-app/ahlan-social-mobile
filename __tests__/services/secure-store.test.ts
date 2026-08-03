/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/secure-store.test.ts
 *
 * test(secure-store): secure store implementation
 */
import { secure_store } from '../../src/services/secure_store';

describe('secure-store', () => {
  test('initialises with sane defaults', () => {
    const instance = secure_store();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = secure_store();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => secure_store('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = secure_store();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = secure_store();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = secure_store();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
