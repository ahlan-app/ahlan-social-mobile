/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/reverse-geocode.test.ts
 *
 * test(reverse-geocode): reverse geocode implementation
 */
import { reverse_geocode } from '../../src/services/reverse_geocode';

describe('reverse-geocode', () => {
  test('initialises with sane defaults', () => {
    const instance = reverse_geocode();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = reverse_geocode();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => reverse_geocode('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = reverse_geocode();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = reverse_geocode();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = reverse_geocode();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
