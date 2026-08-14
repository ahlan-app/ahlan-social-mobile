/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/audio-trim.test.ts
 *
 * test(audio-trim): audio trim implementation
 */
import { audio_trim } from '../../src/services/audio_trim';

describe('audio-trim', () => {
  test('initialises with sane defaults', () => {
    const instance = audio_trim();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = audio_trim();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => audio_trim('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = audio_trim();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = audio_trim();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = audio_trim();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
