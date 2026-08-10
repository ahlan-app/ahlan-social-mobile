/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/burst-shot.test.ts
 *
 * test(burst-shot): burst shot implementation
 */
import { burst_shot } from '../../src/services/burst_shot';

describe('burst-shot', () => {
  test('initialises with sane defaults', () => {
    const instance = burst_shot();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = burst_shot();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => burst_shot('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = burst_shot();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = burst_shot();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = burst_shot();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
