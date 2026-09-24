// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/blockRelations.ts, app/user/[username].tsx, app/(tabs)/search.tsx
// Blocks hide content in both directions, and block/unblock must not swap
// FlatLists with different numColumns (that crashed the app).

import * as fs from 'fs';
import * as path from 'path';
import {
  buildBlockSets,
  emptyBlockSets,
  isHiddenUserId,
  isHiddenUsername,
  sameBlockSets,
  withLegacyUsernames,
} from '../services/blockRelations';

const rows = [
  { user_id: 'b', username: 'Bob', blocked_by_me: true, blocked_me: false },
  { user_id: 'c', username: 'carol', blocked_by_me: false, blocked_me: true },
];

describe('two-way block sets', () => {
  it('hides users I blocked and users who blocked me', () => {
    const sets = buildBlockSets(rows);
    expect(isHiddenUsername(sets, 'BOB')).toBe(true);
    expect(isHiddenUsername(sets, 'carol')).toBe(true);
    expect(isHiddenUserId(sets, 'b')).toBe(true);
    expect(isHiddenUserId(sets, 'c')).toBe(true);
    expect(isHiddenUsername(sets, 'dave')).toBe(false);
  });

  it('only lists my own blocks as undoable', () => {
    const sets = buildBlockSets(rows);
    expect(sets.blockedUsernames.has('bob')).toBe(true);
    expect(sets.blockedUsernames.has('carol')).toBe(false);
    expect(sets.blockedByUsernames.has('carol')).toBe(true);
  });

  it('ignores empty input', () => {
    const sets = buildBlockSets(null);
    expect(isHiddenUsername(sets, undefined)).toBe(false);
    expect(isHiddenUserId(sets, null)).toBe(false);
  });

  it('merges legacy device-only usernames', () => {
    const sets = withLegacyUsernames(emptyBlockSets(), [' Eve ']);
    expect(isHiddenUsername(sets, 'eve')).toBe(true);
    expect(buildBlockSets([], ['Zed']).blockedUsernames.has('zed')).toBe(true);
  });

  it('compares sets by value', () => {
    expect(sameBlockSets(buildBlockSets(rows), buildBlockSets(rows))).toBe(true);
    expect(sameBlockSets(buildBlockSets(rows), emptyBlockSets())).toBe(false);
  });
});

describe('no numColumns swap on block/unblock', () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

  it('profile screen renders a single FlatList with constant numColumns', () => {
    const src = read('app/user/[username].tsx');
    expect((src.match(/<FlatList\b/g) || []).length).toBe(1);
    expect(src).toContain('numColumns={NUM_COLUMNS}');
  });

  it('every FlatList in the search screen has its own key', () => {
    const src = read('app/(tabs)/search.tsx');
    const lists = src.split(/<FlatList\b/).slice(1);
    expect(lists.length).toBeGreaterThan(0);
    for (const chunk of lists) {
      expect(chunk.trimStart().startsWith('key=')).toBe(true);
    }
  });
});
