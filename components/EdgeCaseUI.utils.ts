// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from the HomeTab / SearchTab / apiService code paths
// so the empty-feed, no-results, and network-error fallback behaviours can
// be exercised in tests without rendering React Native components or
// pulling in the Supabase client.
//
// The functions here mirror the decision branches the screens use today
// (HomeTab.tsx:138-148, 354-360; SearchTab.tsx; apiService.ts:106, 112-113,
// 698-712, 1741-1748). Keeping them in one place means the UI and the
// test suite agree on the exact rule.

/**
 * Whether the HomeTab should show the "new user / no posts" empty state.
 *
 * The screen renders the welcome CTA + UserSuggestions only when the
 * current user follows nobody AND there are no timeline posts AND the
 * initial fetch has finished.
 */
export const shouldShowNewUserEmptyFeed = (params: {
  followedUsernamesSize: number;
  visiblePostsCount: number;
  isLoading: boolean;
}): boolean => {
  const { followedUsernamesSize, visiblePostsCount, isLoading } = params;
  if (typeof followedUsernamesSize !== 'number' || followedUsernamesSize < 0) {
    return false;
  }
  if (typeof visiblePostsCount !== 'number' || visiblePostsCount < 0) {
    return false;
  }
  if (typeof isLoading !== 'boolean') {
    return false;
  }
  return followedUsernamesSize === 0 && visiblePostsCount === 0 && !isLoading;
};

/**
 * The two empty-feed copy variants shown by HomeTab. Encoded here so the
 * test and the component share one source of truth.
 */
export const emptyFeedMessage = (params: {
  followedUsernamesSize: number;
}): string => {
  const { followedUsernamesSize } = params;
  if (typeof followedUsernamesSize !== 'number') {
    return "Welcome! Follow some users to see their posts here.";
  }
  return followedUsernamesSize > 0
    ? "Your feed is empty. The people you follow haven't posted yet."
    : "Welcome! Follow some users to see their posts here.";
};

/**
 * Whether the SearchTab should render its "no results" fallback panel.
 *
 * A query is considered "submitted" when the user has typed at least one
 * non-whitespace character and pressed search. Empty / whitespace queries
 * are treated as "idle" and never show the no-results panel.
 */
export const shouldShowNoResults = (params: {
  query: string;
  resultsCount: number;
  hasSearched: boolean;
  isLoading: boolean;
  isError?: boolean;
}): boolean => {
  const { query, resultsCount, hasSearched, isLoading, isError } = params;
  if (typeof query !== 'string') return false;
  if (typeof hasSearched !== 'boolean') return false;
  if (typeof resultsCount !== 'number' || resultsCount < 0) return false;
  if (typeof isLoading !== 'boolean') return false;
  if (isError === true) return false; // error fallback takes precedence

  const trimmed = query.trim();
  if (trimmed.length === 0) return false;
  if (!hasSearched) return false;
  if (isLoading) return false;
  return resultsCount === 0;
};

/**
 * The headline copy used by the SearchTab's "no results" panel. Keeping
 * it as a constant lets the test pin the wording without rendering.
 */
export const NO_RESULTS_TITLE = 'No results found';
export const noResultsBody = (query: string): string => {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed.length === 0) return 'Try a different search.';
  return `No matches for "${trimmed}". Try a different search.`;
};

/**
 * Resolves the network-error fallback state for any data-fetching screen.
 *
 * The UI shows a retry banner when the fetch threw AND we don't have any
 * cached data to fall back on. If cached data is present, the UI keeps
 * rendering it but exposes a smaller "stale" indicator.
 */
export type NetworkFallbackState =
  | { kind: 'ok' }
  | { kind: 'retry'; message: string }
  | { kind: 'stale'; message: string };

const DEFAULT_RETRY_MESSAGE = "Couldn't reach the network. Tap to retry.";
const DEFAULT_STALE_MESSAGE = 'Showing cached results — network unavailable.';

export const resolveNetworkFallback = (params: {
  error: unknown;
  hasCachedData: boolean;
  isErrorMessage?: (msg: string) => boolean;
}): NetworkFallbackState => {
  const { error, hasCachedData } = params;
  const isErrorMessage =
    params.isErrorMessage ?? ((m: string) => /network|fetch|timeout|ENOTFOUND|ETIMEDOUT|5\d\d/i.test(m));

  if (error === null || error === undefined) {
    return { kind: 'ok' };
  }

  const message =
    typeof error === 'string'
      ? error
      : typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message: string }).message)
        : '';

  if (!isErrorMessage(message)) {
    return { kind: 'ok' };
  }

  if (hasCachedData) {
    return { kind: 'stale', message: DEFAULT_STALE_MESSAGE };
  }
  return { kind: 'retry', message: DEFAULT_RETRY_MESSAGE };
};

/**
 * Small helper used by the screens to decide whether a thrown value
 * counts as a network failure. Exposed so SearchTab and HomeTab share
 * one definition of "network error".
 */
export const isNetworkErrorMessage = (message: unknown): boolean => {
  if (typeof message !== 'string' || message.length === 0) return false;
  return /network|fetch|fetch failed|timeout|ENOTFOUND|ETIMEDOUT|ECONNRESET|5\d\d|aborted/i.test(
    message,
  );
};