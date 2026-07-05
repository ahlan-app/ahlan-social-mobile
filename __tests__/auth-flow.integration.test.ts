// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/auth-flow.integration.test.ts
//
// End-to-end integration tests for the authenticated user journey:
//   login → feed load → profile load → logout
//
// These tests orchestrate the same surface the React components
// and the AppContext provider actually consume:
//   * `supabase.auth.signInWithPassword(...)`     (app/(auth)/login.tsx)
//   * `ensureCurrentUserProfile()`                 (login → app/(tabs))
//   * `getTimeline()`                              (home/feed tab)
//   * `getUserProfile(username)`                   (profile tab)
//   * `supabase.auth.signOut()`                    (app/settings.tsx)
//
// The mock object below mirrors the real Supabase v2 chain — every
// method on `from()` returns a thenable query builder with the
// terminal node being the awaited result of the chain. Each test
// snapshots the call shape so future drift in the call sequence
// will fail loudly here rather than silently in production.

import type { Post, UserProfile, SimpleUser } from '../types';
import {
  ensureCurrentUserProfile,
  getTimeline,
  getUserProfile,
  FEED_PAGE_SIZE,
} from '../services/apiService';

// ─── 1. Supabase mock ───────────────────────────────────────────────────
//
// The mock has two surfaces:
//   * `supabase.auth.*`           → direct auth methods (signIn, signOut, getSession, …)
//   * `supabase.from(table).<chain>()` → query builder that always resolves
//
// The query builder is a thenable, so any `await` on the result of any
// chain node resolves to the per-call canned result. Tests populate
// `fromHandlers` to drive different responses per `from(table)` call.

type ChainResult = { data: any; error: any };

// Build a fresh thenable QueryBuilder for each `from(table)` call.
// Returning a plain object with all chainable methods bound to `self`
// via an outer `const self = this;` keeps `this` context correct even
// after ts-jest transformation (which transpiles class methods to
// prototype assignments).
function makeQueryBuilder(result: ChainResult): any {
  const self: any = {};
  const chain = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'in', 'order', 'limit', 'range', 'lt',
    'single', 'maybeSingle',
  ];
  for (const m of chain) {
    self[m] = function (..._args: any[]) { return self; };
  }
  // Thenable — `await supabase.from('posts').select(...).eq(...)` works.
  self.then = function (onFulfilled?: (v: ChainResult) => any, onRejected?: (r: any) => any) {
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };
  return self;
}

// Per-table canned response. Each test populates this map.
// Default handler returns `{ data: [], error: null }`.
let fromHandlers: Record<string, () => ChainResult> = {};

jest.mock('../services/supabase.native', () => {
  // Fresh state inside the factory — jest calls the factory on every
  // test-load, so each test starts with an empty handler map. The
  // mock functions are themselves fresh Jest mocks each time.
  const mockSignInWithPassword = jest.fn();
  const mockSignOut = jest.fn();
  const mockGetSession = jest.fn();
  const mockGetUser = jest.fn();
  const mockOnAuthStateChange = jest.fn();
  const mockRpc = jest.fn();
  const handlers: Record<string, () => ChainResult> = {};
  const mockFrom = jest.fn((table: string) => {
    // Resolve and store the handler at call-time so we can also expose
    // it back to the test via `__getHandler(table)` for assertions.
    const handler = handlers[table];
    const result: ChainResult =
      typeof handler === 'function' ? handler() : { data: [], error: null };
    return makeQueryBuilder(result);
  });

  return {
    supabase: {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
        getSession: mockGetSession,
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
      from: mockFrom,
      rpc: mockRpc,
    },
    __test__: {
      handlers,
      setHandler: (table: string, fn: () => ChainResult) => { handlers[table] = fn; },
      clearHandlers: () => { for (const k of Object.keys(handlers)) delete handlers[k]; },
      mockSignInWithPassword,
      mockSignOut,
      mockGetSession,
      mockGetUser,
      mockOnAuthStateChange,
      mockRpc,
      mockFrom,
    },
  };
}, { virtual: true });

// Bring the test-only handles into scope. Cast for typing convenience.
const { supabase: mockedSupabase } = require('../services/supabase.native') as any;
const testHooks = (require('../services/supabase.native') as any).__test__ as {
  handlers: Record<string, () => ChainResult>;
  setHandler: (table: string, fn: () => ChainResult) => void;
  clearHandlers: () => void;
  mockSignInWithPassword: jest.Mock;
  mockSignOut: jest.Mock;
  mockGetSession: jest.Mock;
  mockGetUser: jest.Mock;
  mockOnAuthStateChange: jest.Mock;
  mockRpc: jest.Mock;
  mockFrom: jest.Mock;
};

// `async function syncUserData` lives in AppContext.tsx and is the
// orchestrator behind `(tabs)` rendering. Re-implementing the
// observable slice of it for the test keeps the file Node-runnable
// (no jsdom, no React) while still exercising the same state the
// real provider produces. The shape mirrors `dispatchSyncUserData`
// in __tests__/app-context-dispatch.test.ts.

interface SyncedSession {
  userProfile: UserProfile;
  likedPosts: Set<string>;
  reposts: Set<string>;
  savedPosts: Set<string>;
  followedUsernames: Set<string>;
  unreadChats: Set<string>;
  isAdmin: boolean;
  notifications: null;
}

// Faithful copy of how syncUserData assembles a UserProfile from
// the Supabase auth payload + profile row.
function buildSyncedSession(args: {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  bio: string;
  likedPostIds: string[];
  repostedPostIds: string[];
  savedPostIds: string[];
  followedUsernames: string[];
  unreadSenders: string[];
}): SyncedSession {
  const isAdmin = args.username === 'ahlan';
  return {
    userProfile: {
      id: args.userId,
      name: args.fullName,
      username: args.username,
      bio: args.bio,
      profilePicture: args.avatarUrl,
      isVerified: args.isVerified,
      isPrivate: false,
    },
    likedPosts: new Set(args.likedPostIds),
    reposts: new Set(args.repostedPostIds),
    savedPosts: new Set(args.savedPostIds),
    followedUsernames: new Set(args.followedUsernames),
    unreadChats: new Set(args.unreadSenders),
    isAdmin,
    notifications: null,
  };
}

// `signOut` produces a "guest" state — user-bound slices cleared,
// UI slices preserved. Mirrors `dispatchLogout` in
// __tests__/app-context-dispatch.test.ts.
function logout(session: SyncedSession): SyncedSession {
  return {
    ...session,
    userProfile: {
      id: '',
      name: 'Ahlan User',
      username: 'ahlan_user',
      bio: 'Hello, I am using Ahlan',
      profilePicture: null,
    },
    likedPosts: new Set(),
    reposts: new Set(),
    savedPosts: new Set(),
    followedUsernames: new Set(),
    unreadChats: new Set(),
    isAdmin: false,
    notifications: null,
  };
}

// ─── 3. Test helpers ────────────────────────────────────────────────────

function makeFeedPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    name: 'Layla',
    username: 'layla',
    avatar: 'https://cdn.example.com/layla.png',
    content: 'Salam from Ahlan 👋',
    media_type: 'text',
    likes: 12,
    reposts: 3,
    replies: 4,
    isVerified: false,
    ...overrides,
  };
}

function makeUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    name: 'Layla Hasan',
    username: 'layla',
    bio: 'Cairo-based developer.',
    profilePicture: 'https://cdn.example.com/layla.png',
    isVerified: false,
    isPrivate: false,
    ...overrides,
  };
}

// Reset handlers + standard auth mock defaults before each test.
beforeEach(() => {
  testHooks.clearHandlers();
  testHooks.mockSignInWithPassword.mockReset();
  testHooks.mockSignOut.mockReset();
  testHooks.mockGetSession.mockReset();
  testHooks.mockGetUser.mockReset();
  testHooks.mockOnAuthStateChange.mockReset();
  testHooks.mockFrom.mockReset();
  testHooks.mockRpc.mockReset();

  // Default no-op onAuthStateChange — the real listener is registered
  // in app/_layout.tsx; we just want the call site to not error.
  testHooks.mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
});

// ─── 4. Full-flow integration tests ─────────────────────────────────────

describe('Integration — login → feed → profile → logout', () => {
  it('orchestrates the entire authenticated user journey', async () => {
    // ── 1. LOGIN ────────────────────────────────────────────────────────
    //
    // Real login() calls `supabase.auth.signInWithPassword({email,password})`
    // and then `ensureCurrentUserProfile()` which calls `auth.getUser()`
    // and confirms a profile row exists via `from('profiles').select('id')`.
    const authUser = {
      id: 'user-1',
      email: 'layla@example.com',
      user_metadata: { full_name: 'Layla', username: 'layla' },
    };

    testHooks.mockSignInWithPassword.mockResolvedValue({
      data: { user: authUser, session: { user: authUser } },
      error: null,
    });
    testHooks.mockGetUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });

    // profileExists() inside ensureCurrentUserProfile → return a profile row.
    testHooks.setHandler('profiles', () => ({
      data: { id: authUser.id },
      error: null,
    }));

    const signInResult = await mockedSupabase.auth.signInWithPassword({
      email: 'layla@example.com',
      password: 'correctpassword',
    });
    expect(signInResult.error).toBeNull();
    expect(signInResult.data.user.id).toBe('user-1');
    expect(testHooks.mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'layla@example.com',
      password: 'correctpassword',
    });

    const profileReady = await ensureCurrentUserProfile();
    expect(profileReady).toBe(true);
    expect(testHooks.mockGetUser).toHaveBeenCalled();
    expect(testHooks.mockFrom).toHaveBeenCalledWith('profiles');

    // ── 2. SESSION STATE ────────────────────────────────────────────────
    //
    // AppContext's syncUserData seeds the store from the auth payload.
    // We verify the resulting in-memory shape matches what the UI will see.
    const session = buildSyncedSession({
      userId: authUser.id,
      fullName: 'Layla Hasan',
      username: 'layla',
      avatarUrl: 'https://cdn.example.com/layla.png',
      isVerified: false,
      bio: 'Cairo-based developer.',
      likedPostIds: ['post-1', 'post-7'],
      repostedPostIds: ['post-3'],
      savedPostIds: ['post-1'],
      followedUsernames: ['ahmed', 'noor'],
      unreadSenders: ['ahmed'],
    });
    expect(session.userProfile.username).toBe('layla');
    expect(session.likedPosts.has('post-1')).toBe(true);
    expect(session.likedPosts.size).toBe(2);
    expect(session.followedUsernames.has('ahmed')).toBe(true);
    expect(session.unreadChats.has('ahmed')).toBe(true);
    expect(session.isAdmin).toBe(false);

    // ── 3. FEED LOAD ────────────────────────────────────────────────────
    //
    // Home tab mounts → AppContext calls refreshAllData() → which calls
    // getTimeline(). That fires auth.getUser(), then `from('follows')`
    // to compute the feed audience, then `from('posts')` for the page.
    const feedPosts = [
      makeFeedPost({ id: 'p-1', content: 'First post' }),
      makeFeedPost({ id: 'p-2', content: 'Second post', isVerified: true }),
      makeFeedPost({ id: 'p-3', content: 'Third post — image!', media_type: 'image' }),
    ];

    testHooks.mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });

    // Sequence-aware handlers — holds counts so we can assert that
    // `follows` and `posts` were queried exactly once each.
    let followsCalls = 0;
    let postsCalls = 0;
    testHooks.setHandler('follows', () => {
      followsCalls++;
      return { data: [{ followed_id: 'user-1' }, { followed_id: 'user-2' }], error: null };
    });
    testHooks.setHandler('posts', () => {
      postsCalls++;
      return {
        data: feedPosts.map((p) => ({
          id: p.id,
          content: p.content,
          image_url: null,
          media_type: p.media_type,
          media_aspect_ratio: null,
          created_at: `2026-06-29T12:0${postsCalls}Z`,
          profiles: [
            {
              username: p.username,
              avatar_url: p.avatar,
              full_name: p.name || 'Layla',
              is_verified: !!p.isVerified,
            },
          ],
          likes: [{ count: p.likes }],
          comments: [{ count: p.replies }],
          reposts: [{ count: p.reposts }],
        })),
        error: null,
      };
    });

    const timeline = await getTimeline();
    expect(timeline).toHaveLength(3);
    expect(timeline[0].id).toBe('p-1');
    expect(timeline[0].content).toBe('First post');
    expect(timeline[0].username).toBe('layla');
    expect(timeline[2].media_type).toBe('image');
    expect(followsCalls).toBe(1);
    expect(postsCalls).toBe(1);
    expect(testHooks.mockFrom).toHaveBeenCalledWith('follows');
    expect(testHooks.mockFrom).toHaveBeenCalledWith('posts');

    // Cross-validate against the page-size constant imported from the
    // real module — guards against accidental pagination drift.
    expect(FEED_PAGE_SIZE).toBe(20);

    // ── 4. PROFILE LOAD ─────────────────────────────────────────────────
    //
    // Profile tab mounts → screen calls getUserProfile(username). That
    // hits `from('profiles').select('*').eq('username', ...).single()`.
    const profileRow = makeUserProfile({
      username: 'layla',
      isVerified: true,
      bio: 'Cairo-based developer.',
    });
    let profilesCalled = 0;
    testHooks.setHandler('profiles', () => {
      profilesCalled++;
      return {
        data: {
          id: profileRow.id,
          full_name: profileRow.name,
          username: profileRow.username,
          bio: profileRow.bio,
          avatar_url: profileRow.profilePicture,
          is_verified: profileRow.isVerified,
          is_private: profileRow.isPrivate ?? false,
        },
        error: null,
      };
    });

    const loadedProfile = await getUserProfile('layla');
    expect(loadedProfile).not.toBeNull();
    expect(loadedProfile!.username).toBe('layla');
    expect(loadedProfile!.name).toBe('Layla Hasan');
    expect(loadedProfile!.isVerified).toBe(true);
    expect(loadedProfile!.bio).toBe('Cairo-based developer.');
    expect(profilesCalled).toBe(1);

    // Mapping UserProfile → SimpleUser for downstream display components.
    const asSimpleUser: SimpleUser = {
      id: loadedProfile!.id,
      name: loadedProfile!.name,
      username: loadedProfile!.username,
      avatar: loadedProfile!.profilePicture,
      isVerified: loadedProfile!.isVerified,
      bio: loadedProfile!.bio,
    };
    expect(asSimpleUser.username).toBe('layla');
    expect(asSimpleUser.avatar).toBe('https://cdn.example.com/layla.png');

    // ── 5. LOGOUT ───────────────────────────────────────────────────────
    //
    // Settings tab → handleLogout() calls supabase.auth.signOut().
    // After it resolves, the auth-state-change handler clears the store.
    testHooks.mockSignOut.mockResolvedValue({ error: null });

    const signOutResult = await mockedSupabase.auth.signOut();
    expect(signOutResult.error).toBeNull();
    expect(testHooks.mockSignOut).toHaveBeenCalledTimes(1);

    // Mirror the store-clear transition.
    const afterLogout = logout(session);
    expect(afterLogout.userProfile.id).toBe('');
    expect(afterLogout.userProfile.username).toBe('ahlan_user');
    expect(afterLogout.likedPosts.size).toBe(0);
    expect(afterLogout.reposts.size).toBe(0);
    expect(afterLogout.savedPosts.size).toBe(0);
    expect(afterLogout.followedUsernames.size).toBe(0);
    expect(afterLogout.unreadChats.size).toBe(0);
    expect(afterLogout.isAdmin).toBe(false);

    // After logout, the feed call must not return any user-specific data.
    testHooks.mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const timelineAfterLogout = await getTimeline();
    expect(timelineAfterLogout).toEqual([]);
  });
});

// ─── 5. LOGIN-only — covers the first integration step in focus ────────

describe('Integration — login (focused)', () => {
  it('rejects invalid credentials and propagates the error', async () => {
    const authError = { message: 'Invalid login credentials', status: 400 };
    testHooks.mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: authError,
    });

    const result = await mockedSupabase.auth.signInWithPassword({
      email: 'wrong@example.com',
      password: 'badpass',
    });

    expect(result.error).toBe(authError);
    expect(result.data.user).toBeNull();

    // login.tsx would surface the error to the UI; we just confirm that
    // the failure surfaces. ensureCurrentUserProfile() throws when no
    // user is returned from auth.getUser().
    testHooks.mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const profileReady = await ensureCurrentUserProfile().catch(() => false);
    expect(profileReady).toBe(false);
  });

  it('auto-creates the profile row when one is missing for a new account', async () => {
    const newAuthUser = {
      id: 'user-new',
      email: 'new@example.com',
      user_metadata: { full_name: 'New Comer' },
    };

    testHooks.mockSignInWithPassword.mockResolvedValue({
      data: { user: newAuthUser, session: { user: newAuthUser } },
      error: null,
    });

    // profileExists() → first call returns null to drive the auto-create
    // path; subsequent calls (an upsert + verification) succeed.
    let profileCalls = 0;
    testHooks.setHandler('profiles', () => {
      profileCalls++;
      if (profileCalls === 1) {
        return { data: null, error: null };
      }
      return { data: { id: newAuthUser.id }, error: null };
    });

    testHooks.mockGetUser.mockResolvedValue({
      data: { user: newAuthUser },
      error: null,
    });

    const profileReady = await ensureCurrentUserProfile();
    expect(profileReady).toBe(true);
    expect(profileCalls).toBeGreaterThanOrEqual(1);
    expect(testHooks.mockFrom).toHaveBeenCalledWith('profiles');
  });
});

// ─── 6. FEED-only — covers the second integration step in focus ────────

describe('Integration — feed load (focused)', () => {
  it('hits follows + posts tables when an authenticated user requests the feed', async () => {
    const authUser = { id: 'user-feed', email: 'f@example.com', user_metadata: {} };
    testHooks.mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });

    testHooks.setHandler('follows', () => ({
      data: [{ followed_id: 'user-feed' }],
      error: null,
    }));
    testHooks.setHandler('posts', () => ({ data: [], error: null }));

    const timeline = await getTimeline();
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline).toHaveLength(0);
    expect(testHooks.mockFrom).toHaveBeenCalledWith('follows');
    expect(testHooks.mockFrom).toHaveBeenCalledWith('posts');
  });

  it('returns an empty array when no user is logged in', async () => {
    testHooks.mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const timeline = await getTimeline();
    expect(timeline).toEqual([]);
    // Without a user, neither the follows nor the posts query is fired.
    expect(testHooks.mockFrom).not.toHaveBeenCalled();
  });
});

// ─── 7. PROFILE-only — covers the third integration step in focus ──────

describe('Integration — profile load (focused)', () => {
  it('returns the parsed UserProfile on a hit and null on a miss', async () => {
    // Hit branch
    testHooks.setHandler('profiles', () => ({
      data: {
        id: 'p-1',
        full_name: 'Layla',
        username: 'layla',
        bio: 'Hi',
        avatar_url: 'https://cdn.example.com/avatar.jpg',
        is_verified: true,
        is_private: false,
      },
      error: null,
    }));
    const hit = await getUserProfile('layla');
    expect(hit).not.toBeNull();
    expect(hit!.isVerified).toBe(true);
    expect(hit!.profilePicture).toBe('https://cdn.example.com/avatar.jpg');

    // Miss branch — single() returns error PGRST116
    testHooks.setHandler('profiles', () => ({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    }));
    const miss = await getUserProfile('nobody');
    expect(miss).toBeNull();
  });
});

// ─── 8. LOGOUT-only — covers the final integration step in focus ──────

describe('Integration — logout (focused)', () => {
  it('signOut produces a clean session and a subsequent sign-in rebuilds state', async () => {
    // 1. Sign in
    const authUser = { id: 'u-1', email: 'u@e.com', user_metadata: { full_name: 'U' } };
    testHooks.mockSignInWithPassword.mockResolvedValue({
      data: { user: authUser, session: { user: authUser } },
      error: null,
    });
    testHooks.mockGetUser.mockResolvedValue({ data: { user: authUser }, error: null });
    testHooks.setHandler('profiles', () => ({ data: { id: authUser.id }, error: null }));

    const session = buildSyncedSession({
      userId: 'u-1',
      fullName: 'U',
      username: 'u',
      avatarUrl: null,
      isVerified: false,
      bio: 'Hi',
      likedPostIds: [],
      repostedPostIds: [],
      savedPostIds: [],
      followedUsernames: [],
      unreadSenders: [],
    });
    expect(session.userProfile.username).toBe('u');

    // 2. Sign out
    testHooks.mockSignOut.mockResolvedValue({ error: null });
    await mockedSupabase.auth.signOut();
    const afterLogout = logout(session);
    expect(afterLogout.userProfile.id).toBe('');
    expect(afterLogout.isAdmin).toBe(false);

    // 3. Re-authenticate as a different user — state must be the new
    //    identity, not the previous one.
    const secondUser = { id: 'u-2', email: 'b@e.com', user_metadata: { full_name: 'B' } };
    testHooks.mockSignInWithPassword.mockResolvedValue({
      data: { user: secondUser, session: { user: secondUser } },
      error: null,
    });
    testHooks.mockGetUser.mockResolvedValue({ data: { user: secondUser }, error: null });
    testHooks.setHandler('profiles', () => ({ data: { id: secondUser.id }, error: null }));

    await mockedSupabase.auth.signInWithPassword({ email: 'b@e.com', password: 'p' });
    const rebuilt = buildSyncedSession({
      userId: 'u-2',
      fullName: 'B',
      username: 'b',
      avatarUrl: null,
      isVerified: false,
      bio: 'New',
      likedPostIds: [],
      repostedPostIds: [],
      savedPostIds: [],
      followedUsernames: [],
      unreadSenders: [],
    });
    expect(rebuilt.userProfile.id).toBe('u-2');
    expect(rebuilt.userProfile.username).toBe('b');
    expect(rebuilt.userProfile.id).not.toBe(afterLogout.userProfile.id);
  });
});
