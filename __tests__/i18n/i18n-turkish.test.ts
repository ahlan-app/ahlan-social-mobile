/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/i18n/i18n-turkish.test.ts
 *
 * test(i18n-turkish): i18n turkish implementation
 */
import { i18n_turkish } from '../../src/services/i18n_turkish';

describe('i18n-turkish', () => {
  test('initialises with sane defaults', () => {
    const instance = i18n_turkish();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = i18n_turkish();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => i18n_turkish('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = i18n_turkish();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = i18n_turkish();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = i18n_turkish();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
