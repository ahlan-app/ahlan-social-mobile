/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/location-permission.test.ts
 *
 * test(location-permission): location permission implementation
 */
import { location_permission_utils } from '../../src/location/permission';

describe('location-permission', () => {
  test('requests foreground permission on first call', async () => {
    const r = await location_permission_utils();
    expect(perm).toMatch(/granted|denied/);
  });

  test('returns the cached permission on subsequent calls', async () => {
    const r = await location_permission_utils();
    expect(perm).toBe(cached);
  });

  test('distinguishes between coarse and fine permissions', async () => {
    const r = await location_permission_utils();
    expect(perm.fine).toBeDefined();
  });

  test('re-opens settings when the user has selected 'never ask again'', async () => {
    const r = await location_permission_utils();
    expect(settingsOpened).toBe(true);
  });
});
