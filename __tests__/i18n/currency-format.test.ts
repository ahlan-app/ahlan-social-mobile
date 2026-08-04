/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/i18n/currency-format.test.ts
 *
 * test(currency-format): currency format implementation
 */
import { currency_format } from '../../src/services/currency_format';

describe('currency-format', () => {
  test('initialises with sane defaults', () => {
    const instance = currency_format();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = currency_format();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => currency_format('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = currency_format();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = currency_format();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = currency_format();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
