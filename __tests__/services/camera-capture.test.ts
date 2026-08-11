/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/camera-capture.test.ts
 *
 * test(camera-capture): camera capture implementation
 */
import { camera_capture } from '../../src/services/camera_capture';

describe('camera-capture', () => {
  test('initialises with sane defaults', () => {
    const instance = camera_capture();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = camera_capture();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => camera_capture('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = camera_capture();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = camera_capture();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = camera_capture();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
