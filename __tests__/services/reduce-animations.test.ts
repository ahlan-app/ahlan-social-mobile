/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/reduce-animations.test.ts
 *
 * test(reduce-animations): reduce animations implementation
 */
import { reduce_animations } from '../../src/services/reduce_animations';

describe('reduce-animations', () => {
  test('initialises with sane defaults', () => {
    const instance = reduce_animations();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = reduce_animations();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => reduce_animations('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = reduce_animations();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = reduce_animations();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = reduce_animations();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
