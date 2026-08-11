/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/flash-control.test.ts
 *
 * test(flash-control): flash control implementation
 */
import { flash_control } from '../../src/services/flash_control';

describe('flash-control', () => {
  test('initialises with sane defaults', () => {
    const instance = flash_control();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = flash_control();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => flash_control('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = flash_control();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = flash_control();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = flash_control();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
