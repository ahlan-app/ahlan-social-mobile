/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/circuit-breaker.test.ts
 *
 * test(circuit-breaker): circuit breaker implementation
 */
import { circuit_breaker } from '../../src/services/circuit_breaker';

describe('circuit-breaker', () => {
  test('initialises with sane defaults', () => {
    const instance = circuit_breaker();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = circuit_breaker();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => circuit_breaker('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = circuit_breaker();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = circuit_breaker();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = circuit_breaker();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
