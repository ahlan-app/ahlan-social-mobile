/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/low-ram-mode.test.ts
 *
 * test(low-ram-mode): low ram mode implementation
 */
import { low_ram_mode } from '../../src/services/low_ram_mode';

describe('low-ram-mode', () => {
  test('initialises with sane defaults', () => {
    const instance = low_ram_mode();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = low_ram_mode();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => low_ram_mode('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = low_ram_mode();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = low_ram_mode();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = low_ram_mode();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
