/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/gradual-rollout.test.ts
 *
 * test(gradual-rollout): gradual rollout implementation
 */
import { gradual_rollout } from '../../src/services/gradual_rollout';

describe('gradual-rollout', () => {
  test('initialises with sane defaults', () => {
    const instance = gradual_rollout();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = gradual_rollout();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => gradual_rollout('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = gradual_rollout();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = gradual_rollout();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = gradual_rollout();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
