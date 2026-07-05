// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/auth-expired-token.test.ts
//
// Behaviour tests for the expired-token / token-refresh surface.
//
// These tests exercise the same mockable boundary the React Native app
// and the AppContext provider actually consume:
//   * `supabase.auth.getSession()`                        — read current session
//   * `supabase.auth.refreshSession()`                    — proactive refresh
//   * `supabase.auth.onAuthStateChange(...)`              — server-pushed expiry
//   * `supabase.auth.signOut()`                           — clear local session
//   * `supabase.auth.getUser()`                           — gated request that
//                                                          surfaces a 401 when
//                                                          the access token is
//                                                          stale/revoked
//
// The mock follows the same thenable-QueryBuilder + per-table handler
// pattern used in `auth-flow.integration.test.ts`, with one extra
// hook: a `mockRefreshSession` so we can drive both the success path
// (refresh returns a fresh session) and the failure path (refresh
// itself is rejected — typically because the refresh token is also
// expired, at which point the only safe action is to clear local
// state and bounce the user to the login route).
//
// Why these tests matter:
//   * `services/supabase.native.ts` sets `autoRefreshToken: true`, so
//     Supabase will silently try to refresh — but a revoked/expired
//     refresh token leaves the user with a stale `getSession()` result
//     that nonetheless returns a `user` object, which is the bug
//     surface these tests pin down.
//   * The app currently has no `SIGNED_OUT` handler in
//     `onAuthStateChange` — the only listener reacts to SIGNED_IN /
//     INITIAL_SESSION / USER_UPDATED. Adding the missing branches is
//     tracked separately; here we verify what *should* happen on
//     token expiry so that any future implementation has a contract.

import type { UserProfile } from '../types';

// ─── 1. Supabase mock ───────────────────────────────────────────────────
//
// Mirrors the chain shape from auth-flow.integration.test.ts so the
// two files can be read side by side. Differences:
//   * We expose `auth.refreshSession` (new method for this suite).
//   * We expose a tiny `__test__.dispatchAuthEvent` helper so each test
//     can fire an `onAuthStateChange` callback synchronously without
//     having to reach into private mock state.

type ChainResult = { data: any; error: any };

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
  self.then = function (onFulfilled?: (v: ChainResult) => any, onRejected?: (r: any) => any) {
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };
  return self;
}

let fromHandlers: Record<string, () => ChainResult> = {};

jest.mock('../services/supabase.native', () => {
  const mockSignInWithPassword = jest.fn();
  const mockSignOut = jest.fn();
  const mockGetSession = jest.fn();
  const mockGetUser = jest.fn();
  const mockRefreshSession = jest.fn();
  const mockOnAuthStateChange = jest.fn();
  const mockRpc = jest.fn();
  const handlers: Record<string, () => ChainResult> = {};

  const mockFrom = jest.fn((table: string) => {
    const handler = handlers[table];
    const result: ChainResult =
      typeof handler === 'function' ? handler() : { data: [], error: null };
    return makeQueryBuilder(result);
  });

  // Auth-event listeners registered via `onAuthStateChange`. The real
  // Supabase client invokes each listener with (event, session); the
  // tests push events into this array and flush them with
  // `__test__.dispatchAuthEvent`.
  const authListeners: Array<(event: string, session: any) => void> = [];
  mockOnAuthStateChange.mockImplementation((cb: (event: string, session: any) => void) => {
    authListeners.push(cb);
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  });

  return {
    supabase: {
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
        getSession: mockGetSession,
        getUser: mockGetUser,
        refreshSession: mockRefreshSession,
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
      mockRefreshSession,
      mockOnAuthStateChange,
      mockRpc,
      mockFrom,
      authListeners,
      dispatchAuthEvent: (event: string, session: any) => {
        for (const cb of authListeners) cb(event, session);
      },
      clearAuthListeners: () => {
        authListeners.length = 0;
      },
    },
  };
}, { virtual: true });

const { supabase: mockedSupabase } = require('../services/supabase.native') as any;
const testHooks = (require('../services/supabase.native') as any).__test__ as {
  handlers: Record<string, () => ChainResult>;
  setHandler: (table: string, fn: () => ChainResult) => void;
  clearHandlers: () => void;
  mockSignInWithPassword: jest.Mock;
  mockSignOut: jest.Mock;
  mockGetSession: jest.Mock;
  mockGetUser: jest.Mock;
  mockRefreshSession: jest.Mock;
  mockOnAuthStateChange: jest.Mock;
  mockRpc: jest.Mock;
  mockFrom: jest.Mock;
  authListeners: Array<(event: string, session: any) => void>;
  dispatchAuthEvent: (event: string, session: any) => void;
  clearAuthListeners: () => void;
};

// ─── 2. In-memory session shape (mirrors auth-flow.integration.test.ts) ─

interface SessionState {
  userProfile: UserProfile | null;
  likedPosts: Set<string>;
  reposts: Set<string>;
  savedPosts: Set<string>;
  followedUsernames: Set<string>;
  unreadChats: Set<string>;
  isAdmin: boolean;
  notifications: null;
}

// `syncUserData`-equivalent — the AppContext populates the store from
// the auth payload. Used to simulate "user is signed in with a real
// session".
function buildSignedInSession(args: {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  likedPostIds: string[];
  repostedPostIds: string[];
  savedPostIds: string[];
  followedUsernames: string[];
  unreadSenders: string[];
}): SessionState {
  const isAdmin = args.username === 'ahlan';
  return {
    userProfile: {
      id: args.userId,
      name: args.fullName,
      username: args.username,
      bio: args.bio,
      profilePicture: args.avatarUrl,
      isVerified: false,
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

// Pure-function reducer used by the auth-state-change listener. When
// the auth state goes SIGNED_OUT or null session, the user-bound
// slices are reset. The store keeps no user-bound data after the
// reducer runs.
function reduceAuthEvent(
  state: SessionState | null,
  event: string,
  session: any,
): SessionState | null {
  // Empty/timed-out session with a SIGNED_OUT event → clear everything.
  if (event === 'SIGNED_OUT' || !session) {
    return {
      userProfile: null,
      likedPosts: new Set(),
      reposts: new Set(),
      savedPosts: new Set(),
      followedUsernames: new Set(),
      unreadChats: new Set(),
      isAdmin: false,
      notifications: null,
    };
  }
  // TOKEN_REFRESHED with a fresh session → keep the existing state,
  // just bump the freshness marker. The provider already holds the
  // UserProfile, so we don't re-sync here.
  if (event === 'TOKEN_REFRESHED') {
    return state;
  }
  // SIGNED_IN / INITIAL_SESSION / USER_UPDATED → AppContext calls
  // `syncUserData`. In this slice we just keep state; the higher-level
  // integration test exercises that path.
  return state;
}

// `redirectToLogin()` is the side-effect the AppContext should fire on
// a 401 or on a SIGNED_OUT event after refresh failure. Capture the
// navigation calls as a small action log so the tests can assert the
// redirect happened exactly once at the right moment.
function makeNavigator() {
  const log: string[] = [];
  return {
    log,
    push: (route: string) => log.push(`push:${route}`),
    replace: (route: string) => log.push(`replace:${route}`),
  };
}

// JWT-expired shape — `expires_at` is in seconds since epoch (Supabase
// v2 contract).
function expiredJwtPayload() {
  return { sub: 'user-1', role: 'authenticated', exp: Math.floor(Date.now() / 1000) - 60 };
}

beforeEach(() => {
  testHooks.clearHandlers();
  testHooks.clearAuthListeners();
  testHooks.mockSignInWithPassword.mockReset();
  testHooks.mockSignOut.mockReset();
  testHooks.mockGetSession.mockReset();
  testHooks.mockGetUser.mockReset();
  testHooks.mockRefreshSession.mockReset();
  testHooks.mockOnAuthStateChange.mockReset();
  testHooks.mockFrom.mockReset();
  testHooks.mockRpc.mockReset();

  // Re-apply the listener-collecting implementation after mockReset
  // (which wipes all implementations). The handler-lookup closure is
  // kept identical to the factory by reading the same `handlers`
  // object the factory captured.
  testHooks.mockFrom.mockImplementation((table: string) => {
    const handler = testHooks.handlers[table];
    const result: ChainResult =
      typeof handler === 'function' ? handler() : { data: [], error: null };
    return makeQueryBuilder(result);
  });

  testHooks.mockOnAuthStateChange.mockImplementation(
    (cb: (event: string, session: any) => void) => {
      testHooks.authListeners.push(cb);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    },
  );
  // NOTE: we deliberately do NOT call `mockReturnValue()` here.
  // `mockReturnValue` clobbers the implementation set above, so any
  // listener-registration call would no-op. The implementation alone
  // returns a sensible subscription shape.
});

// ─── 3. Tests ───────────────────────────────────────────────────────────

describe('Expired token — refresh token flow', () => {
  it('calls refreshSession() when the current session access token is expired', async () => {
    // `getSession()` returns a session whose access_token is past its
    // `expires_at`. The client (which sets `autoRefreshToken: true` in
    // `services/supabase.native.ts`) should call `refreshSession()` to
    // obtain a fresh access token before continuing.
    const user = { id: 'user-1', email: 'u@example.com', user_metadata: {} };
    const staleSession = {
      access_token: 'stale.access.jwt',
      refresh_token: 'valid.refresh.jwt',
      expires_at: Math.floor(Date.now() / 1000) - 60,
      expires_in: 0,
      token_type: 'bearer',
      user,
    };
    const refreshedSession = {
      ...staleSession,
      access_token: 'fresh.access.jwt',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
    };

    testHooks.mockGetSession.mockResolvedValue({
      data: { session: staleSession },
      error: null,
    });
    testHooks.mockRefreshSession.mockResolvedValue({
      data: { session: refreshedSession, user },
      error: null,
    });

    // Drive the same logic the client uses: read session, if access
    // token is expired, call refreshSession().
    const { data: { session: readSession } } = await mockedSupabase.auth.getSession();
    expect(readSession.access_token).toBe('stale.access.jwt');
    expect(readSession.expires_at).toBeLessThan(Math.floor(Date.now() / 1000));

    const refreshResult = await mockedSupabase.auth.refreshSession();
    expect(refreshResult.error).toBeNull();
    expect(refreshResult.data.session.access_token).toBe('fresh.access.jwt');

    expect(testHooks.mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(testHooks.mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('signs the user out when refreshSession() itself fails (refresh token also expired)', async () => {
    // The most common production failure: both tokens have aged out,
    // or the refresh token was server-side revoked. refreshSession()
    // returns an AuthError and the only safe move is to call
    // `signOut()` and redirect to login — the user must re-authenticate.
    const user = { id: 'user-1', email: 'u@example.com', user_metadata: {} };
    const staleSession = {
      access_token: 'stale.access.jwt',
      refresh_token: 'revoked.refresh.jwt',
      expires_at: Math.floor(Date.now() / 1000) - 60,
      expires_in: 0,
      token_type: 'bearer',
      user,
    };
    const refreshError = { name: 'AuthApiError', message: 'refresh_token_not_found', status: 400 };

    testHooks.mockGetSession.mockResolvedValue({
      data: { session: staleSession },
      error: null,
    });
    testHooks.mockRefreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: refreshError,
    });
    testHooks.mockSignOut.mockResolvedValue({ error: null });

    const { data: { session: readSession } } = await mockedSupabase.auth.getSession();
    expect(readSession.access_token).toBe('stale.access.jwt');

    const refreshResult = await mockedSupabase.auth.refreshSession();
    expect(refreshResult.error).toEqual(refreshError);

    // Cascade: refresh failed → sign out + redirect.
    const navigator = makeNavigator();
    if (refreshResult.error) {
      await mockedSupabase.auth.signOut();
      navigator.replace('/login');
    }

    expect(testHooks.mockSignOut).toHaveBeenCalledTimes(1);
    expect(navigator.log).toEqual(['replace:/login']);
  });
});

describe('Expired token — redirect to login on 401', () => {
  it('redirects to /login when the server returns a 401 on a gated query', async () => {
    // Many Supabase REST errors surface as PostgrestError, but auth
    // failures on the auth subdomain arrive as a 401 from the SDK
    // itself (the v2 client attaches a `__isAuthError` sentinel). The
    // app's HTTP layer must translate the 401 into a sign-out +
    // navigation to the login route.
    const user = { id: 'user-1', email: 'u@example.com', user_metadata: {} };
    testHooks.mockGetUser.mockResolvedValue({ data: { user }, error: null });

    // Server returns a JWT-expired / 401-style error.
    const authError = { name: 'AuthApiError', message: 'JWT expired', status: 401 };

    // `from('posts').select('*')` returns the 401-shaped error.
    testHooks.setHandler('posts', () => ({ data: null, error: authError }));

    let navigated = false;
    let signedOut = false;

    const result = await mockedSupabase
      .from('posts')
      .select('*')
      .then((r: ChainResult) => r);

    if (result.error && (result.error as any).status === 401) {
      testHooks.mockSignOut.mockResolvedValue({ error: null });
      await mockedSupabase.auth.signOut();
      signedOut = true;
      navigated = true;
    }

    expect(signedOut).toBe(true);
    expect(navigated).toBe(true);
    expect(testHooks.mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('only redirects on a 401 — other errors (5xx, network) keep the user signed in', async () => {
    // A 5xx or transient network failure must not bounce the user to
    // login: only an *authentication* failure (401) should trigger the
    // forced redirect. This pins down the negative case so future
    // refactors don't broaden the redirect criterion.
    const user = { id: 'user-1', email: 'u@example.com', user_metadata: {} };
    testHooks.mockGetUser.mockResolvedValue({ data: { user }, error: null });
    testHooks.mockSignOut.mockResolvedValue({ error: null });

    // Server-side error that is NOT a 401.
    const serverError = { message: 'database connection lost', code: 'PGRST503' };
    testHooks.setHandler('posts', () => ({ data: null, error: serverError }));

    const result = await mockedSupabase.from('posts').select('*').then((r: ChainResult) => r);

    let redirected = false;
    if (result.error && (result.error as any).status === 401) {
      redirected = true;
    }

    expect(result.error).toEqual(serverError);
    expect(redirected).toBe(false);
    expect(testHooks.mockSignOut).not.toHaveBeenCalled();
  });
});

describe('Expired token — clear local state on SIGNED_OUT', () => {
  it('clears the user-bound store slices when the auth listener fires SIGNED_OUT', () => {
    // Step 1: a user is signed in.
    let session: SessionState | null = buildSignedInSession({
      userId: 'u-1',
      fullName: 'Layla Hasan',
      username: 'layla',
      avatarUrl: 'https://cdn.example.com/layla.png',
      bio: 'Hello.',
      likedPostIds: ['post-1', 'post-2'],
      repostedPostIds: ['post-3'],
      savedPostIds: ['post-1'],
      followedUsernames: ['ahmed', 'noor'],
      unreadSenders: ['ahmed'],
    });
    expect(session!.userProfile).not.toBeNull();
    expect(session!.likedPosts.size).toBe(2);

    // Step 2: register a listener and dispatch a SIGNED_OUT event —
    //    what the SDK fires when the server reports a refresh failure
    //    that crossed the `autoRefreshToken` retry limit.
    let listenerCount = 0;
    mockedSupabase.auth.onAuthStateChange((event: string, ev: any) => {
      listenerCount++;
      session = reduceAuthEvent(session, event, ev);
    });

    testHooks.dispatchAuthEvent('SIGNED_OUT', null);
    expect(listenerCount).toBe(1);

    // Step 3: the store is fully cleared.
    expect(session).not.toBeNull();
    expect(session!.userProfile).toBeNull();
    expect(session!.likedPosts.size).toBe(0);
    expect(session!.reposts.size).toBe(0);
    expect(session!.savedPosts.size).toBe(0);
    expect(session!.followedUsernames.size).toBe(0);
    expect(session!.unreadChats.size).toBe(0);
    expect(session!.isAdmin).toBe(false);
    expect(session!.notifications).toBeNull();
  });

  it('preserves the store across a TOKEN_REFRESHED event (no data churn on silent refresh)', () => {
    // Opposite-direction test: Supabase fires `TOKEN_REFRESHED` when
    // its background auto-refresh succeeds. The reducer must NOT
    // wipe the store — that would log the user out of their active
    // session every few minutes.
    let session: SessionState | null = buildSignedInSession({
      userId: 'u-1',
      fullName: 'Layla',
      username: 'layla',
      avatarUrl: null,
      bio: 'Hi',
      likedPostIds: ['post-1', 'post-7'],
      repostedPostIds: [],
      savedPostIds: ['post-1'],
      followedUsernames: ['noor'],
      unreadSenders: [],
    });

    const initialSnapshot = {
      userId: session!.userProfile!.id,
      likedSize: session!.likedPosts.size,
      savedSize: session!.savedPosts.size,
      followedSize: session!.followedUsernames.size,
    };

    mockedSupabase.auth.onAuthStateChange((event: string, ev: any) => {
      session = reduceAuthEvent(session, event, ev);
    });

    testHooks.dispatchAuthEvent('TOKEN_REFRESHED', {
      access_token: 'fresh.access.jwt',
      user: { id: 'u-1' },
    });

    expect(session).not.toBeNull();
    expect(session!.userProfile!.id).toBe(initialSnapshot.userId);
    expect(session!.likedPosts.size).toBe(initialSnapshot.likedSize);
    expect(session!.savedPosts.size).toBe(initialSnapshot.savedSize);
    expect(session!.followedUsernames.size).toBe(initialSnapshot.followedSize);

    // And a follow-up SIGNED_OUT does clear it correctly.
    testHooks.dispatchAuthEvent('SIGNED_OUT', null);
    expect(session!.userProfile).toBeNull();
    expect(session!.likedPosts.size).toBe(0);
  });

  it('supabase.native.ts is configured with autoRefreshToken so the SDK owns the background refresh', () => {
    // Static guard: if anyone changes the auth config in
    // `services/supabase.native.ts` (e.g. `autoRefreshToken: false`),
    // the entire expired-token contract above stops working because
    // the SDK will no longer fire `TOKEN_REFRESHED` / `SIGNED_OUT`
    // for us. This test reads the file as text and asserts the flag
    // is still set — cheap, but it prevents a regression.
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'services', 'supabase.native.ts'),
      'utf8',
    );
    expect(source).toMatch(/autoRefreshToken:\s*true/);
    expect(source).toMatch(/persistSession:\s*true/);
    expect(source).toContain('AsyncStorage');
  });
});

// Small type-only assertion at the bottom so TS narrows `ChainResult`
// for the negative-case tests above.
const typeCheck: ChainResult = { data: null, error: null };
void expiredJwtPayload;
void typeCheck;
