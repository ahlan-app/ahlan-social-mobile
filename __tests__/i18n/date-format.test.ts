/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/i18n/date-format.test.ts
 *
 * test(date-format): date format implementation
 */
import { date_format } from '../../src/services/date_format';

describe('date-format', () => {
  test('initialises with sane defaults', () => {
    const instance = date_format();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = date_format();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => date_format('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = date_format();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = date_format();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = date_format();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
