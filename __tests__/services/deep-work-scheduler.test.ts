/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/deep-work-scheduler.test.ts
 *
 * test(deep-work-scheduler): deep work scheduler implementation
 */
import { deep_work_scheduler } from '../../src/services/deep_work_scheduler';

describe('deep-work-scheduler', () => {
  test('initialises with sane defaults', () => {
    const instance = deep_work_scheduler();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = deep_work_scheduler();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => deep_work_scheduler('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = deep_work_scheduler();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = deep_work_scheduler();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = deep_work_scheduler();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
