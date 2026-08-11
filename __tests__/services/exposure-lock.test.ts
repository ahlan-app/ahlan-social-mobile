/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/exposure-lock.test.ts
 *
 * test(exposure-lock): exposure lock implementation
 */
import { exposure_lock } from '../../src/services/exposure_lock';

describe('exposure-lock', () => {
  test('initialises with sane defaults', () => {
    const instance = exposure_lock();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = exposure_lock();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => exposure_lock('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = exposure_lock();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = exposure_lock();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = exposure_lock();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
