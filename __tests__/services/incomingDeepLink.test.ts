/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/incomingDeepLink.test.ts
 *
 * Incoming deep-link routing tests: auth-gate, post / profile / comment targets and unknown URL handling.
 */

import { resolveDeepLink } from '../../src/services/incomingDeepLink';

describe('resolveDeepLink', () => {
  test('routes ahlan://post/<id> targets', () => {
    expect(resolveDeepLink('ahlan://post/abc123')).toEqual({
      kind: 'post',
      id: 'abc123',
      requiresAuth: true,
    });
  });

  test('routes ahlan://user/<handle> targets', () => {
    expect(resolveDeepLink('ahlan://user/samet')).toEqual({
      kind: 'profile',
      id: 'samet',
      requiresAuth: true,
    });
  });

  test('routes https://ahlan.app/p/<id> the same as ahlan://post/<id>', () => {
    expect(resolveDeepLink('https://ahlan.app/p/abc123')).toEqual({
      kind: 'post',
      id: 'abc123',
      requiresAuth: true,
    });
  });

  test('returns unknown for unrecognised URLs', () => {
    expect(resolveDeepLink('https://example.com/something')).toEqual({ kind: 'unknown' });
  });

  test('marks the auth callback flow', () => {
    const result = resolveDeepLink('ahlan://auth/callback?token=xyz');
    expect(result.kind).toBe('auth_callback');
    expect(result.requiresAuth).toBe(false);
  });
});
