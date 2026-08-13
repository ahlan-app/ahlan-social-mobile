/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/noise-suppression.test.ts
 *
 * test(noise-suppression): noise suppression implementation
 */
import { noise_suppression } from '../../src/services/noise_suppression';

describe('noise-suppression', () => {
  test('initialises with sane defaults', () => {
    const instance = noise_suppression();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = noise_suppression();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => noise_suppression('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = noise_suppression();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = noise_suppression();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = noise_suppression();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
