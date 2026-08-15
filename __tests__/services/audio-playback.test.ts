/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/audio-playback.test.ts
 *
 * test(audio-playback): audio playback implementation
 */
import { audio_playback } from '../../src/services/audio_playback';

describe('audio-playback', () => {
  test('initialises with sane defaults', () => {
    const instance = audio_playback();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = audio_playback();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => audio_playback('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = audio_playback();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = audio_playback();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = audio_playback();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
