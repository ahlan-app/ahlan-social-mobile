/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/background-task.test.ts
 *
 * test(background-task): background task implementation
 */
import { background_task } from '../../src/services/background_task';

describe('background-task', () => {
  test('initialises with sane defaults', () => {
    const instance = background_task();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = background_task();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => background_task('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = background_task();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = background_task();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = background_task();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
