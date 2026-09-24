// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Two-way block sets. Pure helpers (no imports) so they can be unit tested.
// "blocked" = I blocked them, "blockedBy" = they blocked me. Content from
// either side is hidden; only blocks I made can be undone from my account.

export interface BlockRelationRow {
  user_id: string;
  username: string | null;
  blocked_by_me: boolean;
  blocked_me: boolean;
}

export interface BlockSets {
  blockedIds: Set<string>;
  blockedUsernames: Set<string>;
  blockedByIds: Set<string>;
  blockedByUsernames: Set<string>;
}

export const normalizeUsername = (username?: string | null): string =>
  typeof username === 'string' ? username.trim().toLowerCase() : '';

export const emptyBlockSets = (): BlockSets => ({
  blockedIds: new Set(),
  blockedUsernames: new Set(),
  blockedByIds: new Set(),
  blockedByUsernames: new Set(),
});

export function buildBlockSets(
  rows: BlockRelationRow[] | null | undefined,
  legacyUsernames: Iterable<string> = [],
): BlockSets {
  const sets = emptyBlockSets();
  for (const row of rows || []) {
    if (!row || typeof row.user_id !== 'string' || !row.user_id) continue;
    const name = normalizeUsername(row.username);
    if (row.blocked_by_me) {
      sets.blockedIds.add(row.user_id);
      if (name) sets.blockedUsernames.add(name);
    }
    if (row.blocked_me) {
      sets.blockedByIds.add(row.user_id);
      if (name) sets.blockedByUsernames.add(name);
    }
  }
  for (const legacy of Array.from(legacyUsernames)) {
    const name = normalizeUsername(legacy);
    if (name) sets.blockedUsernames.add(name);
  }
  return sets;
}

export function withLegacyUsernames(base: BlockSets, legacy: Iterable<string>): BlockSets {
  const blockedUsernames = new Set(base.blockedUsernames);
  for (const username of Array.from(legacy)) {
    const name = normalizeUsername(username);
    if (name) blockedUsernames.add(name);
  }
  return { ...base, blockedUsernames };
}

/** True when there is a block in either direction with this username. */
export const isHiddenUsername = (sets: BlockSets, username?: string | null): boolean => {
  const name = normalizeUsername(username);
  return name.length > 0 && (sets.blockedUsernames.has(name) || sets.blockedByUsernames.has(name));
};

/** True when there is a block in either direction with this user id. */
export const isHiddenUserId = (sets: BlockSets, id?: string | null): boolean =>
  typeof id === 'string' && id.length > 0 && (sets.blockedIds.has(id) || sets.blockedByIds.has(id));

const sameSet = (a: Set<string>, b: Set<string>): boolean =>
  a.size === b.size && Array.from(a).every((v) => b.has(v));

export const sameBlockSets = (a: BlockSets, b: BlockSets): boolean =>
  sameSet(a.blockedIds, b.blockedIds) &&
  sameSet(a.blockedUsernames, b.blockedUsernames) &&
  sameSet(a.blockedByIds, b.blockedByIds) &&
  sameSet(a.blockedByUsernames, b.blockedByUsernames);
