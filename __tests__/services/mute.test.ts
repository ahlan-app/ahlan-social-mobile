/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/mute.test.ts
 *
 * Mute service tests: mute user, mute hashtag, mute expiry, visibility filters and persistence.
 */

import { muteUser, muteHashtag, isMuted, filterVisibleItems } from '../../src/services/mute';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('muteUser', () => {
  test('persists the mute entry', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await muteUser('u1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('mute:user:u1'),
      expect.any(String),
    );
  });

  test('expires the mute after the configured duration', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-23T12:00:00Z'));
    await muteUser('u1', { expiresInMs: 60_000 });
    expect(await isMuted('u1')).toBe(true);
    jest.advanceTimersByTime(120_000);
    expect(await isMuted('u1')).toBe(false);
    jest.useRealTimers();
  });
});

describe('muteHashtag', () => {
  test('stores the muted hashtag', async () => {
    await muteHashtag('cats');
    expect(await isMuted('hashtag:cats')).toBe(true);
  });
});

describe('filterVisibleItems', () => {
  test('removes posts whose author is muted', () => {
    const items = [
      { id: 'p1', authorId: 'u1' },
      { id: 'p2', authorId: 'u2' },
    ];
    const muted = new Set(['u1']);
    expect(filterVisibleItems(items, muted).map(i => i.id)).toEqual(['p2']);
  });
});
