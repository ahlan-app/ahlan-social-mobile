/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/kill-switch.test.ts
 *
 * test(kill-switch): kill switch implementation
 */
import { kill_switch } from '../../src/services/kill_switch';

describe('kill-switch', () => {
  test('initialises with sane defaults', () => {
    const instance = kill_switch();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = kill_switch();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => kill_switch('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = kill_switch();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = kill_switch();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = kill_switch();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
