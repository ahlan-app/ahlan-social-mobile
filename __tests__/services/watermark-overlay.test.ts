/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/watermark-overlay.test.ts
 *
 * test(watermark-overlay): watermark overlay implementation
 */
import { watermark_overlay } from '../../src/services/watermark_overlay';

describe('watermark-overlay', () => {
  test('initialises with sane defaults', () => {
    const instance = watermark_overlay();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = watermark_overlay();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => watermark_overlay('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = watermark_overlay();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = watermark_overlay();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = watermark_overlay();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
