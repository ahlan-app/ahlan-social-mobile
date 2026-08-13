/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/background-playback.test.ts
 *
 * test(background-playback): background playback implementation
 */
import { background_playback } from '../../src/services/background_playback';

describe('background-playback', () => {
  test('initialises with sane defaults', () => {
    const instance = background_playback();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = background_playback();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => background_playback('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = background_playback();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = background_playback();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = background_playback();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
