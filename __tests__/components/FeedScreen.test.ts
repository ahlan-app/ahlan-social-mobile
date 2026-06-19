// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/FeedScreen.test.ts
//
// FeedScreen pure-logic snapshot tests. The FeedScreen (and the
// HomeScreen it shares a route with) delegates the data
// transformations — appending unique posts to the timeline,
// de-duplicating stories, mapping raw suggestion rows to
// display-ready SimpleUser objects, and grouping stories by author —
// to a sidecar utils module (`app/(tabs)/feed.utils.ts`). These tests
// pin every value the user actually sees on the timeline so a
// refactor cannot silently change the post-stream or story-reel
// behaviour.
//
// Coverage:
//   1. appendUniquePosts – de-dupe, identity-on-no-op, reference stability
//   2. dedupeStoriesById – first-occurrence preservation, defensive id check
//   3. groupStoriesByUsername – one group per author, in-encounter order
//   4. mapSuggestionRow – id fallback, avatar handling, blocklist filter
//   5. shouldFetchMore – boundary conditions for the page-size predicate

import {
    appendUniquePosts,
    dedupeStoriesById,
    groupStoriesByUsername,
    mapSuggestionRow,
    shouldFetchMore,
    type FeedPost,
    type FeedStory,
    type RawSuggestionRow,
} from '../../app/(tabs)/feed.utils';

// ---------------------------------------------------------------------------
// 1. appendUniquePosts
// ---------------------------------------------------------------------------

describe('FeedScreen – appendUniquePosts', () => {
    it('appends a new post that is not already in the timeline', () => {
        const current: FeedPost[] = [{ id: 'a' }];
        const incoming: FeedPost[] = [{ id: 'b' }];
        const result = appendUniquePosts(current, incoming);
        expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('preserves the order: existing posts first, then new posts', () => {
        const current: FeedPost[] = [{ id: 'a' }, { id: 'b' }];
        const incoming: FeedPost[] = [{ id: 'c' }, { id: 'd' }];
        const result = appendUniquePosts(current, incoming);
        expect(result.map(p => p.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('skips incoming posts whose id is already present', () => {
        const current: FeedPost[] = [{ id: 'a' }, { id: 'b' }];
        const incoming: FeedPost[] = [{ id: 'b' }, { id: 'c' }, { id: 'a' }];
        const result = appendUniquePosts(current, incoming);
        expect(result.map(p => p.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns a new array of the same length when every incoming post is a duplicate', () => {
        // The component relies on this short-circuit to avoid a
        // redundant re-render.
        const current: FeedPost[] = [{ id: 'a' }, { id: 'b' }];
        const incoming: FeedPost[] = [{ id: 'a' }, { id: 'b' }];
        const result = appendUniquePosts(current, incoming);
        expect(result.map(p => p.id)).toEqual(['a', 'b']);
    });

    it('returns a new array (not the same reference) when there are no changes', () => {
        // The component guards on `next.length === 0` rather than on
        // reference equality, but the helper still allocates a new
        // array so callers can rely on a fresh reference for memo
        // hooks if they want to.
        const current: FeedPost[] = [{ id: 'a' }];
        const incoming: FeedPost[] = [{ id: 'a' }];
        const result = appendUniquePosts(current, incoming);
        expect(result).not.toBe(current);
    });

    it('handles an empty incoming list by returning a new empty-trailing array', () => {
        const current: FeedPost[] = [{ id: 'a' }];
        const result = appendUniquePosts(current, []);
        expect(result.map(p => p.id)).toEqual(['a']);
    });

    it('handles an empty current list by returning the incoming list', () => {
        const incoming: FeedPost[] = [{ id: 'a' }, { id: 'b' }];
        const result = appendUniquePosts<FeedPost>([], incoming);
        expect(result.map(p => p.id)).toEqual(['a', 'b']);
    });

    it('appends a large batch of unique posts in one pass', () => {
        const current: FeedPost[] = Array.from({ length: 10 }, (_, i) => ({ id: `old-${i}` }));
        const incoming: FeedPost[] = Array.from({ length: 5 }, (_, i) => ({ id: `new-${i}` }));
        const result = appendUniquePosts(current, incoming);
        expect(result).toHaveLength(15);
        expect(result.slice(0, 10).map(p => p.id)).toEqual([
            'old-0', 'old-1', 'old-2', 'old-3', 'old-4', 'old-5', 'old-6', 'old-7', 'old-8', 'old-9',
        ]);
        expect(result.slice(10).map(p => p.id)).toEqual(['new-0', 'new-1', 'new-2', 'new-3', 'new-4']);
    });
});

// ---------------------------------------------------------------------------
// 2. dedupeStoriesById
// ---------------------------------------------------------------------------

describe('FeedScreen – dedupeStoriesById', () => {
    it('preserves the first occurrence of each id', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice' },
            { id: 's2', username: 'bob' },
            { id: 's1', username: 'alice' }, // duplicate
        ];
        const result = dedupeStoriesById(stories);
        expect(result).toHaveLength(2);
        expect(result.map(s => s.id)).toEqual(['s1', 's2']);
    });

    it('returns an empty array for an empty input', () => {
        expect(dedupeStoriesById([])).toEqual([]);
    });

    it('returns the same list when there are no duplicates', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice' },
            { id: 's2', username: 'bob' },
        ];
        expect(dedupeStoriesById(stories)).toEqual(stories);
    });

    it('skips stories with no id (defensive against malformed data)', () => {
        const stories: FeedStory[] = [
            { username: 'alice' } as FeedStory,            // no id
            { id: 's1', username: 'bob' },
            { username: 'carol' } as FeedStory,            // no id
        ];
        const result = dedupeStoriesById(stories);
        expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('does not collapse two stories that share a username but have different ids', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice' },
            { id: 's2', username: 'alice' },
        ];
        const result = dedupeStoriesById(stories);
        expect(result).toHaveLength(2);
    });
});

// ---------------------------------------------------------------------------
// 3. groupStoriesByUsername
// ---------------------------------------------------------------------------

describe('FeedScreen – groupStoriesByUsername', () => {
    it('groups multiple stories by the same author into one entry', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice', avatar: 'a.png' },
            { id: 's2', username: 'alice', avatar: 'a.png' },
            { id: 's3', username: 'bob', avatar: 'b.png' },
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups).toHaveLength(2);
        const alice = groups.find(g => g.username === 'alice');
        const bob = groups.find(g => g.username === 'bob');
        expect(alice?.stories).toHaveLength(2);
        expect(bob?.stories).toHaveLength(1);
    });

    it('preserves the first-seen avatar for each group', () => {
        // The StoryReel uses the group's avatar as the ring picture;
        // subsequent stories in the same group with a different
        // avatar must not override it.
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice', avatar: 'first.png' },
            { id: 's2', username: 'alice', avatar: 'second.png' },
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups).toHaveLength(1);
        expect(groups[0]!.avatar).toBe('first.png');
    });

    it('preserves encounter order across groups (first to post, first in list)', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'carol', avatar: 'c.png' },
            { id: 's2', username: 'alice', avatar: 'a.png' },
            { id: 's3', username: 'bob', avatar: 'b.png' },
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups.map(g => g.username)).toEqual(['carol', 'alice', 'bob']);
    });

    it('preserves encounter order within a group (first to post, first in stories list)', () => {
        const stories: FeedStory[] = [
            { id: 's2', username: 'alice', avatar: 'a.png' },
            { id: 's1', username: 'alice', avatar: 'a.png' },
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups[0]!.stories.map(s => s.id)).toEqual(['s2', 's1']);
    });

    it('skips stories with no username', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice' },
            { id: 's2' } as FeedStory, // no username
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups).toHaveLength(1);
        expect(groups[0]!.username).toBe('alice');
    });

    it('returns an empty array for an empty input', () => {
        expect(groupStoriesByUsername([])).toEqual([]);
    });

    it('falls back to a null avatar when the first story has no avatar', () => {
        const stories: FeedStory[] = [
            { id: 's1', username: 'alice' }, // no avatar
        ];
        const groups = groupStoriesByUsername(stories);
        expect(groups[0]!.avatar).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// 4. mapSuggestionRow
// ---------------------------------------------------------------------------

describe('FeedScreen – mapSuggestionRow', () => {
    const allowAll = (_u: string) => false;

    it('maps a fully-shaped raw row to a FeedSuggestion', () => {
        const raw: RawSuggestionRow = {
            suggested_user_id: 'u-123',
            username: 'amelia',
            avatar_url: 'https://cdn.example.com/a.png',
            is_verified: true,
        };
        const result = mapSuggestionRow(raw, allowAll);
        expect(result).toEqual({
            id: 'u-123',
            username: 'amelia',
            name: 'amelia',
            avatar: 'https://cdn.example.com/a.png',
            isVerified: true,
        });
    });

    it('falls back to the row id when suggested_user_id is missing', () => {
        const raw: RawSuggestionRow = {
            id: 'fallback-id',
            username: 'amelia',
        };
        const result = mapSuggestionRow(raw, allowAll);
        expect(result!.id).toBe('fallback-id');
    });

    it('falls back to the username when no id field is present at all', () => {
        const raw: RawSuggestionRow = { username: 'amelia' };
        const result = mapSuggestionRow(raw, allowAll);
        expect(result!.id).toBe('amelia');
    });

    it('returns null when the row has no username', () => {
        const raw: RawSuggestionRow = { suggested_user_id: 'u-1' };
        expect(mapSuggestionRow(raw, allowAll)).toBeNull();
    });

    it('returns null when the username is an empty string', () => {
        const raw: RawSuggestionRow = { suggested_user_id: 'u-1', username: '   ' };
        expect(mapSuggestionRow(raw, allowAll)).toBeNull();
    });

    it('returns null for null/undefined/non-object input', () => {
        expect(mapSuggestionRow(null, allowAll)).toBeNull();
        expect(mapSuggestionRow(undefined, allowAll)).toBeNull();
        // @ts-expect-error – exercising the runtime guard
        expect(mapSuggestionRow('not-an-object', allowAll)).toBeNull();
    });

    it('returns null when the caller marks the username as blocked', () => {
        const raw: RawSuggestionRow = { suggested_user_id: 'u-1', username: 'spammer' };
        const result = mapSuggestionRow(raw, u => u === 'spammer');
        expect(result).toBeNull();
    });

    it('coerces non-string id values (numbers) to a string', () => {
        const raw: RawSuggestionRow = {
            suggested_user_id: 42,
            username: 'amelia',
        };
        const result = mapSuggestionRow(raw, allowAll);
        expect(result!.id).toBe('42');
    });

    it('treats an empty-string avatar_url as null', () => {
        const raw: RawSuggestionRow = {
            suggested_user_id: 'u-1',
            username: 'amelia',
            avatar_url: '   ',
        };
        const result = mapSuggestionRow(raw, allowAll);
        expect(result!.avatar).toBeNull();
    });

    it('treats is_verified as the boolean-coerced value of the raw field', () => {
        // The component's original mapper does
        // `Boolean(suggestion.is_verified)`, which means any
        // truthy value (non-empty string, 1, true, …) becomes
        // `true`. We lock that coercion here.
        const truthyRows: RawSuggestionRow[] = [
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: 'yes' },
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: 1 },
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: true },
        ];
        for (const row of truthyRows) {
            expect(mapSuggestionRow(row, allowAll)!.isVerified).toBe(true);
        }
        const falsyRows: RawSuggestionRow[] = [
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: false },
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: 0 },
            { suggested_user_id: 'u-1', username: 'amelia', is_verified: '' },
            { suggested_user_id: 'u-1', username: 'amelia' }, // missing key
        ];
        for (const row of falsyRows) {
            expect(mapSuggestionRow(row, allowAll)!.isVerified).toBe(false);
        }
    });
});

// ---------------------------------------------------------------------------
// 5. shouldFetchMore
// ---------------------------------------------------------------------------

describe('FeedScreen – shouldFetchMore (page-size predicate)', () => {
    it('returns true when the received count equals a full page', () => {
        expect(shouldFetchMore(20, 20)).toBe(true);
    });

    it('returns true when the received count exceeds a full page', () => {
        expect(shouldFetchMore(25, 20)).toBe(true);
    });

    it('returns false when the received count is less than a full page', () => {
        // The component uses this signal to mark the end of the
        // timeline: "fewer than a page back ⇒ no more pages".
        expect(shouldFetchMore(19, 20)).toBe(false);
        expect(shouldFetchMore(0, 20)).toBe(false);
    });

    it('returns false when the page size is not a positive number', () => {
        // Defensive: a misconfigured FEED_PAGE_SIZE must not
        // trigger an infinite re-fetch loop.
        expect(shouldFetchMore(20, 0)).toBe(false);
        expect(shouldFetchMore(20, -1)).toBe(false);
        expect(shouldFetchMore(20, NaN)).toBe(false);
        expect(shouldFetchMore(20, Infinity)).toBe(false);
    });

    it('returns false when the received count is not a non-negative number', () => {
        expect(shouldFetchMore(-1, 20)).toBe(false);
        expect(shouldFetchMore(NaN, 20)).toBe(false);
        expect(shouldFetchMore(Infinity, 20)).toBe(false);
    });
});
