/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/biometric-reauth.test.ts
 *
 * test(biometric-reauth): biometric reauth implementation
 */
import { biometric_reauth } from '../../src/services/biometric_reauth';

describe('biometric-reauth', () => {
  test('initialises with sane defaults', () => {
    const instance = biometric_reauth();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = biometric_reauth();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => biometric_reauth('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = biometric_reauth();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = biometric_reauth();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = biometric_reauth();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
