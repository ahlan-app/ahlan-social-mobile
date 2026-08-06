/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/request-merge.test.ts
 *
 * test(request-merge): request merge implementation
 */
import { request_merge } from '../../src/services/request_merge';

describe('request-merge', () => {
  test('initialises with sane defaults', () => {
    const instance = request_merge();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = request_merge();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => request_merge('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = request_merge();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = request_merge();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = request_merge();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
