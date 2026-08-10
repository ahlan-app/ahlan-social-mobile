/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/hdr-mode.test.ts
 *
 * test(hdr-mode): hdr mode implementation
 */
import { hdr_mode } from '../../src/services/hdr_mode';

describe('hdr-mode', () => {
  test('initialises with sane defaults', () => {
    const instance = hdr_mode();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = hdr_mode();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => hdr_mode('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = hdr_mode();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = hdr_mode();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = hdr_mode();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
