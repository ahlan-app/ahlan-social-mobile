// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from components/tabs/SearchTab.tsx (the
// Discover / Search screen) so the search and filtering contract
// can be exercised in tests without spinning up React Native,
// AppContext, or the apiService mocks.
//
// The screen renders two distinct content panels — the explore grid
// (when not searching) and the filtered result list (when searching).
// Both panels depend on three derived arrays:
//
//   1. `visibleExplorePosts` — trending posts with blocked authors
//      removed, rendered as a 3-column tile grid.
//   2. `filteredPosts`        — trending posts whose content or
//      username contains the search term (case-insensitive), with
//      blocked authors removed.
//   3. `filteredHashtags`     — hashtags whose tag contains the
//      search term (case-insensitive).
//
// Centralising those three derivations — and the four user-search
// mapping rules that translate the Supabase row shape into the
// `SimpleUser` shape the UI consumes — keeps the visible behaviour
// stable across refactors and makes the debounced user search
// independently testable.

import type { Post, SimpleUser, Hashtag } from '../../types';

/**
 * The three filter tabs the search panel exposes.
 */
export type DiscoverFilter = 'users' | 'posts' | 'hashtags';

/**
 * Default filter selected when the search panel first opens.
 * Mirrors the `useState<FilterType>('users')` initial value in
 * `SearchTab.tsx`.
 */
export const DEFAULT_DISCOVER_FILTER: DiscoverFilter = 'users';

/**
 * Supabase `profiles` row shape consumed by `searchUsers`. The
 * column names follow snake_case because that is what the
 * PostgreSQL schema uses; the mapper translates them into the
 * camelCase `SimpleUser` contract the UI consumes.
 */
export interface SupabaseProfileRow {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
}

/**
 * Maps an array of raw Supabase `profiles` rows into the
 * `SimpleUser` shape the search UI renders.
 *
 * The mapping rules are:
 *   - `id`            → `id`              (passthrough)
 *   - `full_name`     → `name`            (snake → camel rename)
 *   - `username`      → `username`        (passthrough)
 *   - `avatar_url`    → `avatar`          (snake → camel rename,
 *                                          null allowed)
 *   - `is_verified`   → `isVerified`      (snake → camel rename;
 *                                          `undefined` is coerced
 *                                          to `false` so the typed
 *                                          shape is always complete)
 *
 * This intentionally mirrors the `usersFromApi.map(u => ({ ... }))`
 * block inside `SearchTab.tsx` so the two implementations cannot
 * drift apart.
 */
export const mapSupabaseProfilesToUsers = (
    rows: SupabaseProfileRow[],
): SimpleUser[] =>
    rows.map(row => ({
        id: row.id,
        name: row.full_name,
        username: row.username,
        avatar: row.avatar_url,
        isVerified: Boolean(row.is_verified),
    }));

/**
 * Drops user results whose `username` appears in the supplied
 * block-list predicate. The component calls this with
 * `isUserBlocked` from the AppContext; in tests we accept a
 * predicate so the behaviour can be pinned without pulling in
 * the provider.
 */
export const filterBlockedUsers = (
    users: SimpleUser[],
    isBlocked: (username: string) => boolean,
): SimpleUser[] => users.filter(u => !isBlocked(u.username));

/**
 * Drops posts whose `username` is in the block-list. Used both by
 * the explore grid (`visibleExplorePosts`) and the post search
 * result list (`filteredPosts`) so the same filter rule lives in
 * exactly one place.
 */
export const filterBlockedPosts = (
    posts: Post[],
    isBlocked: (username: string) => boolean,
): Post[] => posts.filter(p => !isBlocked(p.username));

/**
 * Filters a list of trending posts against a user-supplied search
 * term. The match is case-insensitive and matches if the term
 * appears in either `post.content` *or* `post.username` — the
 * same OR clause the `useMemo` inside the component uses.
 *
 * The blocked-author filter is applied first so blocked users
 * never appear in the results even if their content contains the
 * term. The function trims the search term before matching so a
 * stray space does not cause an empty result set.
 */
export const filterPostsBySearchTerm = (
    posts: Post[],
    searchTerm: string,
    isBlocked: (username: string) => boolean = () => false,
): Post[] => {
    const visible = filterBlockedPosts(posts, isBlocked);
    const needle = searchTerm.trim().toLowerCase();
    if (needle.length === 0) return visible;
    return visible.filter(
        p =>
            p.content.toLowerCase().includes(needle) ||
            p.username.toLowerCase().includes(needle),
    );
};

/**
 * Filters a hashtag list against a user-supplied search term. The
 * match is case-insensitive substring on `hashtag.tag` only — the
 * component does not match on `postCount` and neither does this
 * helper.
 */
export const filterHashtagsBySearchTerm = (
    hashtags: Hashtag[],
    searchTerm: string,
): Hashtag[] => {
    const needle = searchTerm.trim().toLowerCase();
    if (needle.length === 0) return hashtags.slice();
    return hashtags.filter(h => h.tag.toLowerCase().includes(needle));
};

/**
 * The three filters the discover screen exposes, in the order they
 * are rendered (Users, Posts, Hashtags). Centralised here so the
 * test can pin the exact ordering and labels the UI uses — the
 * component spreads this array into its filter row.
 */
export const DISCOVER_FILTERS: ReadonlyArray<{
    key: DiscoverFilter;
    label: string;
}> = [
    { key: 'users', label: 'Users' },
    { key: 'posts', label: 'Posts' },
    { key: 'hashtags', label: 'Hashtags' },
];

/**
 * Returns the ordered list of filters the discover screen should
 * render. Always returns the same triple regardless of which
 * filter is currently active — the active filter is rendered as a
 * styled highlight in the component, not omitted from the list.
 */
export const getDiscoverFilters = () => DISCOVER_FILTERS.slice();

/**
 * The four categories of empty-state copy the search panel can
 * show. Mirrors the four `<p className="text-center text-gray-500">`
 * branches the component renders for each filter.
 */
export type DiscoverEmptyStateKey =
    | 'posts-no-match'
    | 'users-prompt'
    | 'users-no-match'
    | 'hashtags-no-match'
    | 'explore-nothing-yet';

/**
 * Empty-state copy table. Centralising the literal strings keeps
 * `SearchTab.tsx` and the test in sync — a regression that rewrites
 * "No users found" to "No accounts found" must also update this
 * module, and the test will fail until they agree.
 */
export const DISCOVER_EMPTY_STATE: Record<
    DiscoverEmptyStateKey,
    { title: string; body: string }
> = {
    'posts-no-match': {
        title: '',
        body: 'No posts found matching "{term}".',
    },
    'users-prompt': {
        title: '',
        body: 'Start typing to search for users.',
    },
    'users-no-match': {
        title: '',
        body: 'No users found matching "{term}".',
    },
    'hashtags-no-match': {
        title: '',
        body: 'No hashtags found matching "{term}".',
    },
    'explore-nothing-yet': {
        title: 'Nothing to Explore Yet',
        body: 'As more posts are created, they will appear here.',
    },
};

/**
 * Returns the empty-state body string for the given key, with the
 * `{term}` placeholder substituted by the supplied search term. The
 * `explore-nothing-yet` key has no `{term}` placeholder, so the
 * `searchTerm` argument is ignored for it.
 */
export const getDiscoverEmptyStateBody = (
    key: DiscoverEmptyStateKey,
    searchTerm: string = '',
): string => {
    const template = DISCOVER_EMPTY_STATE[key].body;
    return template.replace('{term}', searchTerm);
};

/**
 * Pull-to-refresh threshold in CSS pixels. The component compares
 * the live `pullPosition` against this constant and only invokes
 * `handleRefresh` when the threshold is exceeded. The exponent
 * `0.85` applied to the raw drag distance lives in the component
 * — only the threshold is exposed for testing.
 */
export const DISCOVER_REFRESH_THRESHOLD = 80;

/**
 * Debounce window (milliseconds) for the user-search effect. The
 * component sets a 300 ms `setTimeout` before calling
 * `searchUsers`; this constant is the single source of truth so
 * a refactor cannot silently regress the debounce.
 */
export const DISCOVER_USER_SEARCH_DEBOUNCE_MS = 300;
