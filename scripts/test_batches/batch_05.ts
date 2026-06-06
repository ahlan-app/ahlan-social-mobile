// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/UserAvatar.utils.test.ts
// Batch 5/10: UserAvatar getColorForUsername pure function tests

import { getColorForUsername } from '../../components/UserAvatar';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899',
];

describe('UserAvatar — getColorForUsername', () => {
  it('returns a valid hex color for any non-empty username', () => {
    const usernames = ['alice', 'bob', 'charlie', 'dave', 'eve', 'frank'];
    usernames.forEach((u) => {
      const color = getColorForUsername(u);
      expect(color).toMatch(HEX_REGEX);
    });
  });

  it('same username always returns the same color (deterministic)', () => {
    const results = Array.from({ length: 20 }, () => getColorForUsername('deterministicUser'));
    results.forEach((c) => expect(c).toBe(results[0]));
  });

  it('empty string returns "#64748b" (slate-500 fallback)', () => {
    expect(getColorForUsername('')).toBe('#64748b');
  });

  it('different usernames can return different colors', () => {
    const colors = ['alice', 'bob', 'charlie', 'dave', 'eve'].map(getColorForUsername);
    const unique = new Set(colors);
    // Not guaranteed to always be true for small sets, but likely for these
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('all 14 colors in the palette are reachable', () => {
    const seen = new Set<string>();
    // Generate a diverse set of usernames to cover all colors
    for (let i = 0; i < 200; i++) {
      const username = `user${i}-${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(65 + (i % 26))}`;
      seen.add(getColorForUsername(username));
    }
    COLORS.forEach((c) => {
      expect(seen.has(c)).toBe(true);
    });
  });

  it('very long username (1000+ chars) does not crash', () => {
    const long = 'a'.repeat(1050);
    expect(() => getColorForUsername(long)).not.toThrow();
    const color = getColorForUsername(long);
    expect(color).toMatch(HEX_REGEX);
  });

  it('unicode usernames work', () => {
    const unames = ['ñuñoa', 'über', '中文', '日本語', '한국어', 'русский', 'عربي', 'emoji_😀_user'];
    unames.forEach((u) => {
      const color = getColorForUsername(u);
      expect(color).toMatch(HEX_REGEX);
    });
  });

  it('single-character username works', () => {
    const color = getColorForUsername('x');
    expect(color).toMatch(HEX_REGEX);
    expect(color).not.toBe('#64748b');
  });

  it('username with numbers and underscores works', () => {
    const unames = ['user_123', 'my_name_42', '_test_', '1_2_3', 'hello_world_99'];
    unames.forEach((u) => {
      const color = getColorForUsername(u);
      expect(color).toMatch(HEX_REGEX);
    });
  });

  it('colors array has exactly 14 entries', () => {
    expect(COLORS).toHaveLength(14);
  });
});
