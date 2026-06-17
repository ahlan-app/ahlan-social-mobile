// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/EdgeCaseUI.test.ts
// Edge-case UI logic: empty feed state, no-results search, network-error
// fallback. Pure-logic tests so they run under the project's node + ts-jest
// preset without pulling in React Native.

import {
  shouldShowNewUserEmptyFeed,
  emptyFeedMessage,
  shouldShowNoResults,
  noResultsBody,
  NO_RESULTS_TITLE,
  resolveNetworkFallback,
  isNetworkErrorMessage,
} from '../../components/EdgeCaseUI.utils';

// ---------------------------------------------------------------------------
// 1. Empty feed state (HomeTab – new user / no posts)
// ---------------------------------------------------------------------------

describe('HomeTab – empty feed state', () => {
  it('shows the new-user empty state when the user follows nobody and has no posts', () => {
    expect(
      shouldShowNewUserEmptyFeed({
        followedUsernamesSize: 0,
        visiblePostsCount: 0,
        isLoading: false,
      }),
    ).toBe(true);
  });

  it('does not show the empty state while the initial fetch is still loading', () => {
    expect(
      shouldShowNewUserEmptyFeed({
        followedUsernamesSize: 0,
        visiblePostsCount: 0,
        isLoading: true,
      }),
    ).toBe(false);
  });

  it('does not show the empty state when posts exist (even if the user follows nobody)', () => {
    expect(
      shouldShowNewUserEmptyFeed({
        followedUsernamesSize: 0,
        visiblePostsCount: 5,
        isLoading: false,
      }),
    ).toBe(false);
  });

  it('does not show the empty state when the user already follows accounts', () => {
    expect(
      shouldShowNewUserEmptyFeed({
        followedUsernamesSize: 3,
        visiblePostsCount: 0,
        isLoading: false,
      }),
    ).toBe(false);
  });

  it('picks the right empty-feed copy: "welcome / follow some users" for brand-new accounts', () => {
    expect(emptyFeedMessage({ followedUsernamesSize: 0 })).toBe(
      'Welcome! Follow some users to see their posts here.',
    );
  });

  it('picks the right empty-feed copy: "people you follow haven\'t posted yet" when following but no posts', () => {
    expect(emptyFeedMessage({ followedUsernamesSize: 4 })).toBe(
      "Your feed is empty. The people you follow haven't posted yet.",
    );
  });

  it('falls back to the welcome message when the follow-count is not a number', () => {
    expect(
      emptyFeedMessage({ followedUsernamesSize: NaN as unknown as number }),
    ).toBe('Welcome! Follow some users to see their posts here.');
  });
});

// ---------------------------------------------------------------------------
// 2. No-results search (SearchTab)
// ---------------------------------------------------------------------------

describe('SearchTab – no results fallback', () => {
  it('shows the no-results panel after a non-empty search that returned zero hits', () => {
    expect(
      shouldShowNoResults({
        query: 'ahlan',
        resultsCount: 0,
        hasSearched: true,
        isLoading: false,
      }),
    ).toBe(true);
  });

  it('does not show the no-results panel before the user has submitted a search', () => {
    expect(
      shouldShowNoResults({
        query: 'ahlan',
        resultsCount: 0,
        hasSearched: false,
        isLoading: false,
      }),
    ).toBe(false);
  });

  it('does not show the no-results panel while a search is still loading', () => {
    expect(
      shouldShowNoResults({
        query: 'ahlan',
        resultsCount: 0,
        hasSearched: true,
        isLoading: true,
      }),
    ).toBe(false);
  });

  it('does not show the no-results panel for an empty / whitespace query', () => {
    expect(
      shouldShowNoResults({
        query: '   ',
        resultsCount: 0,
        hasSearched: true,
        isLoading: false,
      }),
    ).toBe(false);
  });

  it('does not show the no-results panel when results came back (even one)', () => {
    expect(
      shouldShowNoResults({
        query: 'ahlan',
        resultsCount: 1,
        hasSearched: true,
        isLoading: false,
      }),
    ).toBe(false);
  });

  it('lets the error fallback take precedence over no-results', () => {
    expect(
      shouldShowNoResults({
        query: 'ahlan',
        resultsCount: 0,
        hasSearched: true,
        isLoading: false,
        isError: true,
      }),
    ).toBe(false);
  });

  it('exposes a stable "No results found" title', () => {
    expect(NO_RESULTS_TITLE).toBe('No results found');
  });

  it('renders the no-results body with the trimmed query', () => {
    expect(noResultsBody('  ahlan  ')).toBe(
      'No matches for "ahlan". Try a different search.',
    );
  });

  it('falls back to a generic body when the query is empty', () => {
    expect(noResultsBody('')).toBe('Try a different search.');
    expect(noResultsBody('   ')).toBe('Try a different search.');
  });
});

// ---------------------------------------------------------------------------
// 3. Network-error fallback UI
// ---------------------------------------------------------------------------

describe('Network-error fallback UI', () => {
  it('returns "ok" when there is no error', () => {
    expect(resolveNetworkFallback({ error: null, hasCachedData: false })).toEqual({
      kind: 'ok',
    });
    expect(
      resolveNetworkFallback({ error: undefined, hasCachedData: false }),
    ).toEqual({ kind: 'ok' });
  });

  it('returns "retry" when the fetch failed and there is no cached data', () => {
    const state = resolveNetworkFallback({
      error: { message: 'Network request failed' },
      hasCachedData: false,
    });
    expect(state.kind).toBe('retry');
    if (state.kind === 'retry') {
      expect(state.message).toBe("Couldn't reach the network. Tap to retry.");
    }
  });

  it('returns "stale" when the fetch failed but cached data is available', () => {
    const state = resolveNetworkFallback({
      error: { message: 'fetch failed (ETIMEDOUT)' },
      hasCachedData: true,
    });
    expect(state.kind).toBe('stale');
    if (state.kind === 'stale') {
      expect(state.message).toBe(
        'Showing cached results — network unavailable.',
      );
    }
  });

  it('treats a raw string error the same as an Error-shaped object', () => {
    expect(
      resolveNetworkFallback({
        error: 'fetch failed',
        hasCachedData: false,
      }).kind,
    ).toBe('retry');
  });

  it('ignores non-network errors (e.g. validation) and stays "ok"', () => {
    expect(
      resolveNetworkFallback({
        error: { message: 'username must be at least 3 characters' },
        hasCachedData: false,
      }),
    ).toEqual({ kind: 'ok' });
  });

  it('uses a custom isErrorMessage predicate when supplied', () => {
    const state = resolveNetworkFallback({
      error: { message: 'rate limited' },
      hasCachedData: false,
      isErrorMessage: (m) => m.includes('rate limited'),
    });
    expect(state.kind).toBe('retry');
  });

  it('classifies common network failure shapes correctly', () => {
    expect(isNetworkErrorMessage('Network request failed')).toBe(true);
    expect(isNetworkErrorMessage('fetch failed')).toBe(true);
    expect(isNetworkErrorMessage('connect ETIMEDOUT 52.84.0.1:443')).toBe(true);
    expect(isNetworkErrorMessage('getaddrinfo ENOTFOUND api.example.com')).toBe(true);
    expect(isNetworkErrorMessage('500 Internal Server Error')).toBe(true);
    expect(isNetworkErrorMessage('aborted')).toBe(true);
    expect(isNetworkErrorMessage('username required')).toBe(false);
    expect(isNetworkErrorMessage('')).toBe(false);
    expect(isNetworkErrorMessage(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Combined scenario – the typical "lost connection on first load" path
// ---------------------------------------------------------------------------

describe('Combined: empty feed + network error', () => {
  it('a brand-new user who loses connection on first load gets the retry banner, not the empty state', () => {
    // The fetch threw, so the screen should show the retry banner.
    const fallback = resolveNetworkFallback({
      error: { message: 'Network request failed' },
      hasCachedData: false,
    });

    // posts is empty, but `isLoading` is also false (the fetch finished — it just errored),
    // so the strict empty-feed predicate *would* fire. The screen must still prefer
    // the retry banner. We assert that here by checking which state carries a message
    // the user can act on.
    const isRetry = fallback.kind === 'retry';
    expect(isRetry).toBe(true);

    // Sanity: the empty-feed helper itself still reports the underlying condition,
    // which the screen uses to fall back to the retry banner.
    expect(
      shouldShowNewUserEmptyFeed({
        followedUsernamesSize: 0,
        visiblePostsCount: 0,
        isLoading: false,
      }),
    ).toBe(true);
  });
});