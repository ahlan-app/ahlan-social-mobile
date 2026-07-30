/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/feature-flag.test.ts
 *
 * test(feature-flag): feature flag implementation
 */
import { feature_flag } from '../../src/services/feature_flag';

describe('feature-flag', () => {
  test('initialises with sane defaults', () => {
    const instance = feature_flag();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = feature_flag();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => feature_flag('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = feature_flag();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = feature_flag();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = feature_flag();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
