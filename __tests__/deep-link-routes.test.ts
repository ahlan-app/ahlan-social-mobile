// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/deep-link-routes.test.ts
// Tests for deep link / universal link route parsing used by expo-router.
// Verifies that `ahlan://` custom-scheme URLs and `https://ahlan.social/`
// universal links are correctly translated into (route, params) pairs that
// match the file-based routing in `app/post/[id].tsx` and `app/user/[username].tsx`.

const SCHEME = 'ahlan';
const UNIVERSAL_HOST = 'ahlan.social';

// Pure parser modeled after what `expo-linking` + expo-router produces when a
// deep link arrives. Keeping it dependency-free so it runs under ts-jest in
// node environment (the existing jest.config.js preset).
type ParsedDeepLink =
  | { route: '/post/[id]'; params: { id: string } }
  | { route: '/user/[username]'; params: { username: string } }
  | { route: '/(tabs)'; params: Record<string, never> }
  | { route: null; params: Record<string, never>; reason: string };

type FailedParse = Extract<ParsedDeepLink, { route: null }>;

const parseDeepLink = (url: string): ParsedDeepLink => {
  if (typeof url !== 'string' || url.length === 0) {
    return { route: null, params: {}, reason: 'empty-url' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { route: null, params: {}, reason: 'invalid-url' };
  }

  // Accept both the custom scheme `ahlan://...` and universal `https://ahlan.social/...`
  const isCustomScheme = parsed.protocol === `${SCHEME}:`;
  const isUniversal = parsed.protocol === 'https:' && parsed.hostname === UNIVERSAL_HOST;
  if (!isCustomScheme && !isUniversal) {
    return { route: null, params: {}, reason: 'untrusted-host' };
  }

  // For `ahlan://post/abc`, the URL API yields host="post", pathname="/abc".
  // For `https://ahlan.social/post/abc`, host="ahlan.social", pathname="/post/abc".
  // Normalize so both shapes produce the same segments.
  const segments: string[] = isCustomScheme
    ? [parsed.hostname, ...parsed.pathname.split('/')].filter(Boolean)
    : parsed.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { route: '/(tabs)', params: {} };
  }

  const [head, tail] = segments;

  if (head === 'post' && tail) {
    return { route: '/post/[id]', params: { id: tail } };
  }

  if (head === 'user' && tail) {
    return { route: '/user/[username]', params: { username: tail } };
  }

  return { route: null, params: {}, reason: 'no-route-match' };
};

describe('deep-link route parsing — post/:id', () => {
  it('parses ahlan://post/<uuid> into /post/[id] with the id', () => {
    const result = parseDeepLink('ahlan://post/8f1c2b9a-1234-4abc-9def-0123456789ab');
    expect(result).toEqual({
      route: '/post/[id]',
      params: { id: '8f1c2b9a-1234-4abc-9def-0123456789ab' },
    });
  });

  it('parses https://ahlan.social/post/<numeric-id> into /post/[id]', () => {
    const result = parseDeepLink('https://ahlan.social/post/42');
    expect(result).toEqual({
      route: '/post/[id]',
      params: { id: '42' },
    });
  });
});

describe('deep-link route parsing — profile/:username', () => {
  it('parses ahlan://user/<username> into /user/[username]', () => {
    const result = parseDeepLink('ahlan://user/ahlan_dev');
    expect(result).toEqual({
      route: '/user/[username]',
      params: { username: 'ahlan_dev' },
    });
  });

  it('parses https://ahlan.social/user/<username> into /user/[username]', () => {
    const result = parseDeepLink('https://ahlan.social/user/sara.ahlan');
    expect(result).toEqual({
      route: '/user/[username]',
      params: { username: 'sara.ahlan' },
    });
  });
});

describe('deep-link route parsing — edge cases', () => {
  it('rejects an empty url', () => {
    expect(parseDeepLink('')).toEqual({ route: null, params: {}, reason: 'empty-url' });
  });

  it('rejects an untrusted host', () => {
    const result = parseDeepLink('https://evil.example.com/post/1') as FailedParse;
    expect(result.route).toBeNull();
    expect(result.reason).toBe('untrusted-host');
  });
});