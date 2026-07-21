/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/tokenRefresh.test.ts
 *
 * Token refresh service tests: rotation, expiry handling, single-flight refresh, and concurrency.
 */

import { refreshAccessToken, getAccessToken } from '../../src/services/tokenRefresh';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { supabase } from '../../src/services/supabase';

describe('refreshAccessToken', () => {
  test('returns the new access token on successful rotation', async () => {
    (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'new-tok', expires_at: 9_999_999_999 } },
      error: null,
    });
    const result = await refreshAccessToken();
    expect(result.accessToken).toBe('new-tok');
  });

  test('throws when the refresh session returns an error', async () => {
    (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: { message: 'refresh_token_expired' },
    });
    await expect(refreshAccessToken()).rejects.toThrow(/refresh_token_expired/);
  });

  test('coalesces concurrent refresh calls into a single network round-trip', async () => {
    let resolveFn!: (v: unknown) => void;
    (supabase.auth.refreshSession as jest.Mock).mockReturnValue(
      new Promise(resolve => { resolveFn = resolve; }),
    );

    const p1 = refreshAccessToken();
    const p2 = refreshAccessToken();
    const p3 = refreshAccessToken();
    resolveFn({ data: { session: { access_token: 'x' } }, error: null });
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1.accessToken).toBe('x');
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });
});

describe('getAccessToken', () => {
  test('returns the current access token from the cached session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'cached' } },
    });
    expect(await getAccessToken()).toBe('cached');
  });
});
