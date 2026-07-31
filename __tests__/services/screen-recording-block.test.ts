/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/screen-recording-block.test.ts
 *
 * test(screen-recording-block): screen recording block implementation
 */
import { screen_recording_block } from '../../src/services/screen_recording_block';

describe('screen-recording-block', () => {
  test('initialises with sane defaults', () => {
    const instance = screen_recording_block();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = screen_recording_block();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => screen_recording_block('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = screen_recording_block();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = screen_recording_block();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = screen_recording_block();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
