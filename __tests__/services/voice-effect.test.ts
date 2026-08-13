/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/voice-effect.test.ts
 *
 * test(voice-effect): voice effect implementation
 */
import { voice_effect } from '../../src/services/voice_effect';

describe('voice-effect', () => {
  test('initialises with sane defaults', () => {
    const instance = voice_effect();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = voice_effect();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => voice_effect('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = voice_effect();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = voice_effect();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = voice_effect();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
