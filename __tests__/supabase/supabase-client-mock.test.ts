// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/supabase/supabase-client-mock.test.ts
//
// Verifies the Supabase client mock contract used across the test suite.
//
// Three surfaces are pinned down here:
//
//   1. Query builder (`supabase.from(...)`) — the thenable chain shape
//      (select / insert / update / upsert / delete / eq / in / order /
//      limit / range / single / maybeSingle) and the awaited
//      `{ data, error }` resolution per-table.
//
//   2. Auth (`supabase.auth.*`) — signInWithPassword, signOut,
//      getSession, getUser, refreshSession, onAuthStateChange.
//
//   3. Storage (`supabase.storage.from(...).upload(...)`) — bucket
//      dispatch and the upload result envelope.
//
// The mock itself lives inside this file (jest.mock with `virtual: true`
// so the project does not need to import the real Supabase client at
// test time) and is exercised directly via `require(...)` to avoid
// coupling these assertions to any specific app module.

// ---------------------------------------------------------------------------
// 1. Shared chain helper
// ---------------------------------------------------------------------------

type ChainResult<T = unknown> = { data: T; error: unknown };

function makeQueryBuilder<T = unknown>(result: ChainResult<T>): any {
  const self: any = {};
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'match',
    'order', 'limit', 'range',
    'single', 'maybeSingle',
  ];
  for (const m of chainMethods) {
    self[m] = function (..._args: any[]) { return self; };
  }
  // Thenable — the real Postgrest builder is awaitable.
  self.then = function (
    onFulfilled?: (v: ChainResult<T>) => any,
    onRejected?: (r: any) => any,
  ) {
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };
  return self;
}

// ---------------------------------------------------------------------------
// 2. Mock module
// ---------------------------------------------------------------------------

const handlers: Record<string, () => ChainResult> = {};
const storageHandlers: Record<string, (path: string, body: unknown, opts?: unknown) => ChainResult> = {};

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignUp = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockStorageFrom = jest.fn();
const mockStorageUpload = jest.fn();
const mockStorageGetPublicUrl = jest.fn();
const mockStorageRemove = jest.fn();

jest.mock('../../services/supabase.native', () => {
  // Closure-scoped "current bucket" so upload/getPublicUrl/remove can
  // resolve back to the bucket the caller selected via `.from(bucket)`.
  let currentBucket: string | null = null;

  // from(table) → thenable chain
  mockFrom.mockImplementation((table: string) => {
    const handler = handlers[table];
    const result: ChainResult =
      typeof handler === 'function' ? handler() : { data: [], error: null };
    return makeQueryBuilder(result);
  });

  // storage.from(bucket).upload(path, body, options)
  // The handlers[table]-style registry is keyed by bucket, so multiple
  // tests can configure different buckets independently.
  mockStorageUpload.mockImplementation((path: string, _body: unknown, _opts: unknown) => {
    const handler = currentBucket ? storageHandlers[currentBucket] : undefined;
    if (handler) {
      return Promise.resolve(handler(path, _body, _opts));
    }
    return Promise.resolve({
      data: { path },
      error: null,
    });
  });

  mockStorageGetPublicUrl.mockImplementation((path: string) => ({
    data: {
      publicUrl: `https://example.supabase.co/storage/v1/object/public/${currentBucket}/${path}`,
    },
  }));

  mockStorageRemove.mockImplementation((paths: string[]) => ({
    data: paths.map((p) => ({ name: p })),
    error: null,
  }));

  mockStorageFrom.mockImplementation((bucket: string) => {
    currentBucket = bucket;
    return {
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl,
      remove: mockStorageRemove,
      _bucket: bucket,
    };
  });

  // onAuthStateChange(listener) → { data: { subscription } }
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
        signUp: mockSignUp,
        resetPasswordForEmail: mockResetPasswordForEmail,
        updateUser: mockUpdateUser,
      },
      from: mockFrom,
      rpc: mockRpc,
      storage: {
        from: mockStorageFrom,
      },
    },
    __test__: {
      handlers,
      setHandler: (table: string, fn: () => ChainResult) => {
        handlers[table] = fn;
      },
      clearHandlers: () => {
        for (const k of Object.keys(handlers)) delete handlers[k];
      },
      storageHandlers,
      setStorageHandler: (
        bucket: string,
        fn: (path: string, body: unknown, opts?: unknown) => ChainResult,
      ) => {
        storageHandlers[bucket] = fn;
      },
      clearStorageHandlers: () => {
        for (const k of Object.keys(storageHandlers)) delete storageHandlers[k];
      },
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

// Imports resolved AFTER the mock above is hoisted.
import { supabase } from '../../services/supabase.native';

const testHooks = (require('../../services/supabase.native') as any).__test__;

beforeEach(() => {
  jest.clearAllMocks();
  testHooks.clearHandlers();
  testHooks.clearStorageHandlers();
  testHooks.clearAuthListeners();

  // After clearAllMocks() wipes implementations, rebind the storage
  // chain so that `currentBucket` closure scoping keeps working and
  // the default fallback behaviour is restored.
  let currentBucket: string | null = null;
  mockStorageFrom.mockImplementation((bucket: string) => {
    currentBucket = bucket;
    return {
      upload: mockStorageUpload,
      getPublicUrl: mockStorageGetPublicUrl,
      remove: mockStorageRemove,
      _bucket: bucket,
    };
  });
  mockStorageUpload.mockImplementation((path: string, _body: unknown, _opts: unknown) => {
    const handler = currentBucket ? storageHandlers[currentBucket] : undefined;
    if (handler) {
      return Promise.resolve(handler(path, _body, _opts));
    }
    return Promise.resolve({ data: { path }, error: null });
  });
  mockStorageGetPublicUrl.mockImplementation((path: string) => ({
    data: {
      publicUrl: `https://example.supabase.co/storage/v1/object/public/${currentBucket}/${path}`,
    },
  }));
  mockStorageRemove.mockImplementation((paths: string[]) => ({
    data: paths.map((p) => ({ name: p })),
    error: null,
  }));
});

// ===========================================================================
// Test 1 — mock query builder
// ===========================================================================

describe('mock query builder (supabase.from)', () => {
  it('returns a thenable chain that resolves to { data, error }', async () => {
    testHooks.setHandler('posts', () => ({
      data: [{ id: 'p1', content: 'hello' }],
      error: null,
    }));

    const result = await supabase.from('posts').select('*').eq('id', 'p1').single();

    expect(mockFrom).toHaveBeenCalledWith('posts');
    expect(result.data).toEqual([{ id: 'p1', content: 'hello' }]);
    expect(result.error).toBeNull();
  });

  it('supports chained filters before await (eq → order → limit)', async () => {
    testHooks.setHandler('posts', () => ({
      data: [{ id: 'a' }, { id: 'b' }],
      error: null,
    }));

    const chain = supabase
      .from('posts')
      .select('id, created_at')
      .eq('user_id', 'u1')
      .order('created_at', { ascending: false })
      .limit(10);

    // Each link in the chain returns a thenable.
    expect(typeof chain.then).toBe('function');
    const result = await chain;
    expect(result.data).toHaveLength(2);
    expect(result.error).toBeNull();
  });

  it('surfaces per-table error envelopes', async () => {
    testHooks.setHandler('profiles', () => ({
      data: null,
      error: { message: 'row not found', code: 'PGRST116' },
    }));

    const { data, error } = await supabase.from('profiles').select('*').single();
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'row not found', code: 'PGRST116' });
  });

  it('returns an empty array by default when no handler is registered', async () => {
    const { data, error } = await supabase.from('unknown_table').select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ===========================================================================
// Test 2 — mock auth methods
// ===========================================================================

describe('mock auth methods (supabase.auth.*)', () => {
  it('signInWithPassword returns the configured session payload', async () => {
    const session = {
      user: { id: 'u-1', email: 'user@example.com' },
      access_token: 'tk',
    };
    mockSignInWithPassword.mockResolvedValueOnce({ data: { session }, error: null });

    const result = (await supabase.auth.signInWithPassword({
      email: 'user@example.com',
      password: 'hunter2',
    })) as any;

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hunter2',
    });
    expect(result.data.session.user.email).toBe('user@example.com');
    expect(result.error).toBeNull();
  });

  it('signOut resolves and the app can clear local state on SIGNED_OUT', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    await expect(supabase.auth.signOut()).resolves.toEqual({ error: null });
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Auth-state listener contract — pushing SIGNED_OUT must reach every
    // listener registered via `onAuthStateChange`.
    let observed: any = 'sentinel';
    supabase.auth.onAuthStateChange((event, session) => {
      observed = { event, session };
    });
    testHooks.dispatchAuthEvent('SIGNED_OUT', null);
    expect(observed).toEqual({ event: 'SIGNED_OUT', session: null });
  });

  it('getSession and getUser reflect the configured session', async () => {
    const user = { id: 'u-2', email: 'a@b.c' };
    const session = { user, access_token: 'tk2' };
    mockGetSession.mockResolvedValueOnce({ data: { session }, error: null });
    mockGetUser.mockResolvedValueOnce({ data: { user }, error: null });

    const sess = (await supabase.auth.getSession()) as any;
    const usr = (await supabase.auth.getUser()) as any;

    expect(sess.data.session).toBe(session);
    expect(usr.data.user.id).toBe('u-2');
  });

  it('refreshSession swaps in a fresh session on success', async () => {
    const fresh = {
      user: { id: 'u-2', email: 'a@b.c' },
      access_token: 'tk-new',
      refresh_token: 'rt-new',
    };
    mockRefreshSession.mockResolvedValueOnce({ data: { session: fresh }, error: null });

    const result = (await supabase.auth.refreshSession()) as any;
    expect(result.error).toBeNull();
    expect(result.data.session.access_token).toBe('tk-new');
  });

  it('refreshSession surfaces a failure when the refresh token is expired', async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'refresh_token_expired', code: 'refresh_token_expired' },
    });

    const result = (await supabase.auth.refreshSession()) as any;
    expect(result.data.session).toBeNull();
    expect(result.error.code).toBe('refresh_token_expired');
  });
});

// ===========================================================================
// Test 3 — mock storage upload
// ===========================================================================

describe('mock storage upload (supabase.storage.from(...).upload)', () => {
  it('uploads to the requested bucket and returns the storage path', async () => {
    const file = { uri: 'file:///avatar.png', name: 'avatar.png', type: 'image/png' } as any;

    const result = (await supabase.storage
      .from('avatars')
      .upload('user-1/avatar.png', file, { contentType: 'image/png' })) as any;

    expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
    expect(mockStorageUpload).toHaveBeenCalledWith(
      'user-1/avatar.png',
      file,
      { contentType: 'image/png' },
    );
    expect(result.data.path).toBe('user-1/avatar.png');
    expect(result.error).toBeNull();
  });

  it('routes per-bucket through the storageHandlers registry', async () => {
    testHooks.setStorageHandler('post-media', (path: string, _body: unknown, _opts: unknown) => ({
      data: { path, id: `obj_${path.replace(/[^a-z0-9]/gi, '_')}` },
      error: null,
    }));

    const result = (await supabase.storage
      .from('post-media')
      .upload('posts/42/cover.jpg', { uri: 'file:///cover.jpg' } as any)) as any;

    expect(result.error).toBeNull();
    expect(result.data.path).toBe('posts/42/cover.jpg');
    expect(result.data.id).toBe('obj_posts_42_cover_jpg');
  });

  it('returns an error envelope when the storage handler rejects', async () => {
    testHooks.setStorageHandler('avatars', () => ({
      data: null,
      error: { message: 'payload too large', statusCode: '413' },
    }));

    const big = { uri: 'file:///big.png' } as any;
    const result = (await supabase.storage
      .from('avatars')
      .upload('user-1/big.png', big)) as any;

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('payload too large');
  });

  it('getPublicUrl composes a public URL for the stored object', async () => {
    const { data } = supabase.storage.from('avatars').getPublicUrl('user-1/avatar.png');
    expect((data as any).publicUrl).toContain('/storage/v1/object/public/avatars/user-1/avatar.png');
  });

  it('remove deletes a list of paths and reports them back', async () => {
    const result = (await supabase.storage
      .from('avatars')
      .remove(['user-1/a.png', 'user-1/b.png'])) as any;

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { name: 'user-1/a.png' },
      { name: 'user-1/b.png' },
    ]);
  });
});

// ===========================================================================
// Test 4 — rpc passthrough (covers the third "client" surface beyond from/auth/storage)
// ===========================================================================

describe('mock rpc (supabase.rpc)', () => {
  it('forwards the function name and args and returns the envelope', async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: true, value: 42 }, error: null });

    const result = await supabase.rpc('compute_score', { user_id: 'u-1' });

    expect(mockRpc).toHaveBeenCalledWith('compute_score', { user_id: 'u-1' });
    expect(result.data).toEqual({ ok: true, value: 42 });
    expect(result.error).toBeNull();
  });
});

// ===========================================================================
// Test 5 — isolation between tests
// ===========================================================================

describe('mock isolation', () => {
  it('does not leak handlers or auth listeners across tests', () => {
    expect(Object.keys(testHooks.handlers)).toHaveLength(0);
    expect(Object.keys(testHooks.storageHandlers)).toHaveLength(0);
    expect(testHooks.authListeners).toHaveLength(0);
  });
});