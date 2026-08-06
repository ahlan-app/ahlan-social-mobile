/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/request-dedupe.test.ts
 *
 * test(request-dedupe): request dedupe implementation
 */
import { request_dedupe } from '../../src/services/request_dedupe';

describe('request-dedupe', () => {
  test('initialises with sane defaults', () => {
    const instance = request_dedupe();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = request_dedupe();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => request_dedupe('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = request_dedupe();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = request_dedupe();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = request_dedupe();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
