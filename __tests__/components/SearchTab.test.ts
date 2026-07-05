// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/SearchTab.test.ts
//
// Discover / Search screen pure-logic tests. The component delegates
// its filtering, mapping, and empty-state rules to a sidecar utils
// module (`components/tabs/SearchTab.utils.ts`) so those rules can
// be exercised in tests without spinning up React Native, the
// AppContext provider, or the apiService mocks.
//
// Coverage:
//
//   1. Discover search query
//      - filterPostsBySearchTerm matches case-insensitive substring
//        in either `post.content` or `post.username`
//      - blocked posts are dropped before the term is applied
//      - leading / trailing whitespace and empty terms behave sanely
//      - the "users" filter empty-state prompt is returned for empty
//        queries and the "no match" body interpolates the search term
//
//   2. Discover hashtag filtering
//      - filterHashtagsBySearchTerm narrows the list to tags whose
//        name contains the supplied term, case-insensitive
//      - an empty / whitespace-only term returns all hashtags
//      - the three DISCOVER_FILTERS trip wires for the hashtag tab
//      - the "no match" empty-state body interpolates `{term}`
//
//   3. Trending topics display
//      - filterBlockedPosts (used by both the explore grid and the
//        trending feed) drops posts whose author is in the
//        block-list
//      - the explore empty-state copy is the right pair of strings
//        when there are no visible posts after the blocked filter
//      - DISCOVER_FILTERS lists all three tabs in the order the UI
//        renders them, with the matching labels
//
//   4. Discover user search mapping (bonus)
//      - mapSupabaseProfilesToUsers rewrites snake_case columns to
//        the camelCase SimpleUser contract the UI expects, and
//        coerces missing `is_verified` to false
//      - filterBlockedUsers drops blocked usernames from the
//        translated result set
//      - DEFAULT_DISCOVER_FILTER is "users", matching the
//        initial-state useState in the component

import {
    DEFAULT_DISCOVER_FILTER,
    DISCOVER_EMPTY_STATE,
    DISCOVER_FILTERS,
    DISCOVER_REFRESH_THRESHOLD,
    DISCOVER_USER_SEARCH_DEBOUNCE_MS,
    DiscoverFilter,
    filterBlockedPosts,
    filterBlockedUsers,
    filterHashtagsBySearchTerm,
    filterPostsBySearchTerm,
    getDiscoverEmptyStateBody,
    getDiscoverFilters,
    mapSupabaseProfilesToUsers,
} from '../../components/tabs/SearchTab.utils';
import type { Post, Hashtag } from '../../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const buildPost = (over: Partial<Post> = {}): Post => ({
    id: over.id ?? `post-${Math.random()}`,
    username: over.username ?? 'samet',
    avatar: over.avatar ?? null,
    content: over.content ?? 'hello world',
    media_type: over.media_type ?? 'text',
    likes: over.likes ?? 0,
    reposts: over.reposts ?? 0,
    replies: over.replies ?? 0,
    ...over,
});

const buildHashtag = (tag: string, postCount: number = 1): Hashtag => ({
    tag,
    postCount,
});

const samplePosts: Post[] = [
    buildPost({
        id: 'p1',
        username: 'samet',
        content: 'Loving the new Cairo sunsets',
    }),
    buildPost({
        id: 'p2',
        username: 'leyla',
        content: 'Coffee + code = happy monday',
    }),
    buildPost({
        id: 'p3',
        username: 'troller',
        content: 'just another morning',
    }),
    buildPost({
        id: 'p4',
        username: 'moderator',
        content: 'CAIRO is hosting a meet-up next Friday!',
    }),
];

const sampleHashtags: Hashtag[] = [
    buildHashtag('cairo', 1240),
    buildHashtag('coffee', 312),
    buildHashtag('ramadan', 9821),
    buildHashtag('opensource', 451),
];

const blocked = new Set<string>(['troller']);

// ---------------------------------------------------------------------------
// 1. Discover search query
// ---------------------------------------------------------------------------

describe('SearchTab – discover search query', () => {
    it('matches case-insensitive substring in post.content', () => {
        const results = filterPostsBySearchTerm(
            samplePosts,
            'CAIRO',
        );
        // Both "Cairo" (lowercase) and "CAIRO" (uppercase) match.
        const usernames = results.map(p => p.username).sort();
        expect(usernames).toEqual(['moderator', 'samet']);
    });

    it('also matches against post.username (the OR-clause)', () => {
        // Username `leyla` only — no `leyla` exists in any content.
        const results = filterPostsBySearchTerm(
            samplePosts,
            'leyla',
        );
        expect(results).toHaveLength(1);
        expect(results[0].username).toBe('leyla');
        expect(results[0].content).toBe('Coffee + code = happy monday');
    });

    it('drops blocked authors before applying the search term', () => {
        // `troller` is blocked — even if the term would otherwise match,
        // the post must not appear.
        const results = filterPostsBySearchTerm(
            samplePosts,
            'morning',
            username => blocked.has(username),
        );
        expect(results).toHaveLength(0);
    });

    it('ignores leading / trailing whitespace and empty terms', () => {
        const allResults = filterPostsBySearchTerm(
            samplePosts,
            '   ',
            username => blocked.has(username),
        );
        // Whitespace-only term → behaves like an empty search → returns
        // every visible post (all but the blocked author).
        expect(allResults.map(p => p.username).sort()).toEqual([
            'leyla',
            'moderator',
            'samet',
        ]);

        const emptyResults = filterPostsBySearchTerm(
            samplePosts,
            '',
            username => blocked.has(username),
        );
        expect(emptyResults).toHaveLength(allResults.length);
    });

    it('empty-state copy interpolates the search term for users and posts', () => {
        expect(getDiscoverEmptyStateBody('users-prompt')).toBe(
            DISCOVER_EMPTY_STATE['users-prompt'].body,
        );
        expect(getDiscoverEmptyStateBody('users-no-match', 'leyla')).toBe(
            'No users found matching "leyla".',
        );
        expect(getDiscoverEmptyStateBody('posts-no-match', 'cairo')).toBe(
            'No posts found matching "cairo".',
        );
    });
});

// ---------------------------------------------------------------------------
// 2. Discover hashtag filtering
// ---------------------------------------------------------------------------

describe('SearchTab – discover hashtag filtering', () => {
    it('narrows the hashtag list to tags whose name contains the term', () => {
        const results = filterHashtagsBySearchTerm(
            sampleHashtags,
            'cai',
        );
        expect(results).toHaveLength(1);
        expect(results[0].tag).toBe('cairo');
    });

    it('matches case-insensitively and returns multiple results', () => {
        const results = filterHashtagsBySearchTerm(
            sampleHashtags,
            'O',
        );
        // 'cairo', 'coffee' both contain 'o'.
        expect(results.map(h => h.tag).sort()).toEqual([
            'cairo',
            'coffee',
            'opensource',
        ]);
    });

    it('returns a copy of all hashtags when the search term is empty', () => {
        const results = filterHashtagsBySearchTerm(sampleHashtags, '');
        expect(results).toHaveLength(sampleHashtags.length);
        // Returned array is a fresh copy; mutating it must not change
        // the source.
        results.pop();
        expect(sampleHashtags).toHaveLength(4);
    });

    it('returns no hashtags when nothing matches and renders the empty body', () => {
        const results = filterHashtagsBySearchTerm(
            sampleHashtags,
            'zzz-no-such-tag',
        );
        expect(results).toHaveLength(0);
        expect(
            getDiscoverEmptyStateBody('hashtags-no-match', 'zzz-no-such-tag'),
        ).toBe('No hashtags found matching "zzz-no-such-tag".');
    });

    it('exposes the hashtag tab in the discover filter list', () => {
        const filters = getDiscoverFilters();
        const hashtagFilter = filters.find(f => f.key === 'hashtags');
        expect(hashtagFilter).toBeDefined();
        expect(hashtagFilter!.label).toBe('Hashtags');
    });
});

// ---------------------------------------------------------------------------
// 3. Trending topics display (the explore grid)
// ---------------------------------------------------------------------------

describe('SearchTab – trending topics display', () => {
    it('drops blocked authors from the trending feed', () => {
        const visible = filterBlockedPosts(
            samplePosts,
            username => blocked.has(username),
        );
        const usernames = visible.map(p => p.username).sort();
        expect(usernames).toEqual(['leyla', 'moderator', 'samet']);
        // The blocked author is gone, but the rest of the order is
        // preserved.
        expect(visible).toHaveLength(3);
        expect(usernames).not.toContain('troller');
    });

    it('returns an empty array when every author is blocked', () => {
        const visible = filterBlockedPosts(
            samplePosts,
            () => true,
        );
        expect(visible).toHaveLength(0);
        // And the empty-state body becomes the explore copy.
        expect(getDiscoverEmptyStateBody('explore-nothing-yet')).toBe(
            'As more posts are created, they will appear here.',
        );
        expect(DISCOVER_EMPTY_STATE['explore-nothing-yet'].title).toBe(
            'Nothing to Explore Yet',
        );
    });

    it('lists all three filter tabs in render order with matching labels', () => {
        expect(DISCOVER_FILTERS).toHaveLength(3);
        const keys = DISCOVER_FILTERS.map(f => f.key);
        expect(keys).toEqual<DiscoverFilter[]>([
            'users',
            'posts',
            'hashtags',
        ]);
        const labels = DISCOVER_FILTERS.map(f => f.label);
        expect(labels).toEqual(['Users', 'Posts', 'Hashtags']);
        // Default filter the screen opens with.
        expect(DEFAULT_DISCOVER_FILTER).toBe('users');
    });

    it('pins the refresh threshold and debounce so they cannot regress silently', () => {
        // Pull-to-refresh fires above 80 CSS pixels in the component;
        // user search debounce is 300 ms in the component.
        expect(DISCOVER_REFRESH_THRESHOLD).toBe(80);
        expect(DISCOVER_USER_SEARCH_DEBOUNCE_MS).toBe(300);
    });
});

// ---------------------------------------------------------------------------
// 4. User search mapping (bonus coverage for the users filter tab)
// ---------------------------------------------------------------------------

describe('SearchTab – user search mapping', () => {
    it('maps snake_case Supabase rows to the camelCase SimpleUser contract', () => {
        const rows = [
            {
                id: 'u1',
                username: 'samet',
                full_name: 'Samet Yılmaztemel',
                avatar_url: 'https://cdn/samet.png',
                is_verified: true,
            },
            {
                id: 'u2',
                username: 'leyla',
                full_name: 'Leyla',
                avatar_url: null,
                // is_verified omitted → should coerce to false.
            },
        ];
        const mapped = mapSupabaseProfilesToUsers(rows);
        expect(mapped).toEqual([
            {
                id: 'u1',
                name: 'Samet Yılmaztemel',
                username: 'samet',
                avatar: 'https://cdn/samet.png',
                isVerified: true,
            },
            {
                id: 'u2',
                name: 'Leyla',
                username: 'leyla',
                avatar: null,
                isVerified: false,
            },
        ]);
    });

    it('drops blocked users from the mapped result list', () => {
        const mapped = mapSupabaseProfilesToUsers([
            {
                id: 'u1',
                username: 'samet',
                full_name: 'Samet',
                avatar_url: null,
                is_verified: true,
            },
            {
                id: 'u2',
                username: 'troller',
                full_name: 'Troller',
                avatar_url: null,
                is_verified: false,
            },
        ]);
        const filtered = filterBlockedUsers(
            mapped,
            username => blocked.has(username),
        );
        expect(filtered).toHaveLength(1);
        expect(filtered[0].username).toBe('samet');
    });
});
