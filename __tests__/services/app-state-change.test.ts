/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/app-state-change.test.ts
 *
 * test(app-state-change): app state change implementation
 */
import { app_state_change } from '../../src/services/app_state_change';

describe('app-state-change', () => {
  test('initialises with sane defaults', () => {
    const instance = app_state_change();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = app_state_change();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => app_state_change('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = app_state_change();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = app_state_change();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = app_state_change();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
