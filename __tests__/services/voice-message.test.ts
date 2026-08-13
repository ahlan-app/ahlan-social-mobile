/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/voice-message.test.ts
 *
 * test(voice-message): voice message implementation
 */
import { voice_message } from '../../src/services/voice_message';

describe('voice-message', () => {
  test('initialises with sane defaults', () => {
    const instance = voice_message();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = voice_message();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => voice_message('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = voice_message();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = voice_message();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = voice_message();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
