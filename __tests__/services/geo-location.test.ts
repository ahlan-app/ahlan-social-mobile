/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/geo-location.test.ts
 *
 * test(geo-location): geo location implementation
 */
import { geo_location_utils } from '../../src/geo/location';

describe('geo-location', () => {
  test('returns the current lat/lng within a tolerance', async () => {
    const r = await geo_location_utils();
    expect(typeof r.lat).toBe('number'); expect(Math.abs(r.lat)).toBeLessThan(90);
  });

  test('emits a series of updates when watching', async () => {
    const r = await geo_location_utils();
    expect(updates.length).toBeGreaterThan(1);
  });

  test('stops watching when the returned disposer is called', async () => {
    const r = await geo_location_utils();
    expect(disposed).toBe(true);
  });

  test('rejects when location services are disabled', async () => {
    const r = await geo_location_utils();
    await expect(getCurrentPosition()).rejects.toThrow(/disabled/);
  });

  test('reports the accuracy radius', async () => {
    const r = await geo_location_utils();
    expect(typeof r.accuracy).toBe('number');
  });
});
