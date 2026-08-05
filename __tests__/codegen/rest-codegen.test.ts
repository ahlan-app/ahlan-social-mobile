/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/codegen/rest-codegen.test.ts
 *
 * test(rest-codegen): rest codegen implementation
 */
import { rest_codegen } from '../../src/services/rest_codegen';

describe('rest-codegen', () => {
  test('initialises with sane defaults', () => {
    const instance = rest_codegen();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = rest_codegen();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => rest_codegen('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = rest_codegen();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = rest_codegen();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = rest_codegen();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
