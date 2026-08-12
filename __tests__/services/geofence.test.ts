/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/geofence.test.ts
 *
 * test(geofence): geofence implementation
 */
import { geofence } from '../../src/services/geofence';

describe('geofence', () => {
  test('initialises with sane defaults', () => {
    const instance = geofence();
    expect(instance).toBeDefined();
  });

  test('handles the happy path', () => {
    const result = geofence();
    expect(result.ok).toBe(true);
  });

  test('rejects invalid input', () => {
    expect(() => geofence('invalid')).toThrow();
  });

  test('emits change events when state updates', () => {
    const instance = geofence();
    const handler = jest.fn();
    instance.on('change', handler);
    instance.update({ value: 42 });
    expect(handler).toHaveBeenCalled();
  });

  test('handles error events without crashing', () => {
    const instance = geofence();
    const handler = jest.fn();
    instance.on('error', handler);
    instance.simulateError(new Error('boom'));
    expect(handler).toHaveBeenCalled();
  });

  test('cleans up resources on destroy', () => {
    const instance = geofence();
    instance.destroy();
    expect(instance.isDestroyed()).toBe(true);
  });
});
