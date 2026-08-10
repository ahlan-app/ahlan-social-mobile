/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/self-timer.test.ts
 *
 * test(self-timer): self timer implementation
 */
import { self_timer } from '../../src/services/self_timer';

describe('self-timer', () => {
  test('initialises with sane defaults', () => {
    const instance = self_timer();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = self_timer();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => self_timer('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = self_timer();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = self_timer();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = self_timer();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
