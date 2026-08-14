/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/playback-rate.test.ts
 *
 * test(playback-rate): playback rate implementation
 */
import { playback_rate } from '../../src/services/playback_rate';

describe('playback-rate', () => {
  test('initialises with sane defaults', () => {
    const instance = playback_rate();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = playback_rate();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => playback_rate('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = playback_rate();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = playback_rate();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = playback_rate();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
