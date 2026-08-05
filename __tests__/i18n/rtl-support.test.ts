/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/i18n/rtl-support.test.ts
 *
 * test(rtl-support): rtl support implementation
 */
import { rtl_support } from '../../src/services/rtl_support';

describe('rtl-support', () => {
  test('initialises with sane defaults', () => {
    const instance = rtl_support();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = rtl_support();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => rtl_support('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = rtl_support();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = rtl_support();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = rtl_support();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
