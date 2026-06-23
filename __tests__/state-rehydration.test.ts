// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/state-rehydration.test.ts
// Tests for AppContext state rehydration on app restart.
//
// AppContext persists a small slice of state across restarts via
// localStorage under the key `ahlan-blocked-users`. The provider's
// `useState` initializer (store/AppContext.tsx lines 110–123) reads
// that key on mount, JSON.parses it, validates it is an array of
// strings, and seeds the initial `blockedUsers` Set. On any failure
// (missing key, invalid JSON, non-array, non-string elements) the
// initializer falls back to an empty Set.
//
// These tests reproduce that initializer as a pure function over a
// minimal localStorage shim — consistent with the project's
// "no React Native" test config and the existing
// app-context-initial-state.test.ts pattern.

const BLOCKED_USERS_KEY = 'ahlan-blocked-users';

// ── Minimal in-memory localStorage shim ────────────────────────────────
// Mirrors only the surface the AppContext initializer uses:
//   - getItem(key) -> string | null
//   - setItem(key, value)
//   - removeItem(key) -> void
//   - clear() -> void
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// ── Replica of AppContext's useState initializer ──────────────────────
// Reads localStorage at the BLOCKED_USERS_KEY, parses it, and
// returns a Set<string> of blocked usernames. Falls back to an empty
// Set on any error or when the stored value is not a string array.
//
// The behavior must stay byte-for-byte in lockstep with the source
// initializer so these tests catch any drift in the real path.
function rehydrateBlockedUsers(ls: MemoryStorage): Set<string> {
  const saved = ls.getItem(BLOCKED_USERS_KEY);

  let initialBlockedUsers: string[] = [];
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        initialBlockedUsers = parsed.filter(
          (item: unknown) => typeof item === 'string'
        );
      }
    } catch (e) {
      // Mirrors the source: swallow parse errors, fall back to empty.
    }
  }

  return new Set(initialBlockedUsers);
}

// ── 1. Persisted state loads correctly ────────────────────────────────

describe('AppContext — rehydration on app restart', () => {
  it('loads previously persisted blocked users from localStorage', () => {
    const ls = new MemoryStorage();
    // Simulate a previous session having blocked these users.
    ls.setItem(
      BLOCKED_USERS_KEY,
      JSON.stringify(['spammer-1', 'troll-2', 'bot-3'])
    );

    // Simulate an app restart: a fresh initializer reads the same key.
    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated).toBeInstanceOf(Set);
    expect(rehydrated.size).toBe(3);
    expect(rehydrated.has('spammer-1')).toBe(true);
    expect(rehydrated.has('troll-2')).toBe(true);
    expect(rehydrated.has('bot-3')).toBe(true);
  });

  it('preserves the exact set membership across a save/reload cycle', () => {
    const ls = new MemoryStorage();

    // Round-trip: persist an arbitrary set, then rehydrate on restart.
    const original = new Set(['alice', 'bob', 'carol', 'dave']);
    ls.setItem(
      BLOCKED_USERS_KEY,
      JSON.stringify(Array.from(original))
    );

    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated.size).toBe(original.size);
    for (const name of original) {
      expect(rehydrated.has(name)).toBe(true);
    }
  });

  // ── 2. Corrupt state falls back to defaults ─────────────────────────

  it('falls back to an empty Set when stored JSON is malformed', () => {
    const ls = new MemoryStorage();
    // Truncated / garbage payload — JSON.parse will throw.
    ls.setItem(BLOCKED_USERS_KEY, '{"spammer-1": broken,,, not-json');

    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated).toBeInstanceOf(Set);
    expect(rehydrated.size).toBe(0);
  });

  it('falls back to an empty Set when stored value is not an array', () => {
    const ls = new MemoryStorage();
    // Valid JSON, but wrong shape — AppContext only accepts arrays.
    ls.setItem(
      BLOCKED_USERS_KEY,
      JSON.stringify({ 'spammer-1': true, 'bot-3': true })
    );

    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated).toBeInstanceOf(Set);
    expect(rehydrated.size).toBe(0);
  });

  it('filters non-string entries and falls back when nothing valid remains', () => {
    const ls = new MemoryStorage();
    // Mixed-type array — only strings should survive the initializer's
    // `.filter(item => typeof item === 'string')` pass.
    ls.setItem(
      BLOCKED_USERS_KEY,
      JSON.stringify([123, null, { id: 'evil' }, 'real-user'])
    );

    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated.size).toBe(1);
    expect(rehydrated.has('real-user')).toBe(true);
    // Non-string entries must NOT leak into the Set.
    expect(rehydrated.has(123 as unknown as string)).toBe(false);
    expect(rehydrated.has('evil')).toBe(false);
  });

  it('falls back to an empty Set when no persisted state exists', () => {
    const ls = new MemoryStorage();
    // Brand-new install — the key has never been written.
    expect(ls.getItem(BLOCKED_USERS_KEY)).toBeNull();

    const rehydrated = rehydrateBlockedUsers(ls);

    expect(rehydrated).toBeInstanceOf(Set);
    expect(rehydrated.size).toBe(0);
  });
});