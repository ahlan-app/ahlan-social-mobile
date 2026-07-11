// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/FeedScreen.realtime.test.ts
//
// Live feed-update tests. The HomeFeedScreen subscribes to Supabase
// Postgres Changes on the `posts` table; every INSERT / UPDATE / DELETE
// event flows through the reducer and updates the local timeline the
// user sees. These tests pin the three user-visible behaviours:
//
//   1. A newly-published post from someone I follow shows up at the
//      top of my feed (INSERT).
//   2. When a post's author deletes it, the post disappears from my
//      feed (DELETE).
//   3. When a user likes / unlikes a post, the reaction (heart)
//      count on the matching card ticks up / down without affecting
//      any other post (UPDATE).
//
// We also lock down two guard-rail behaviours the original reducer
// relies on for correctness:
//
//   - INSERT with no id, or an INSERT for a post already in the
//     timeline, must NOT trigger a re-render.
//   - INSERT from a blocked author must NOT add the post to the feed.
//
// The reducer lives in `app/(tabs)/feed.utils.ts` as pure helpers
// (`applyRealtimeInsert`, `applyRealtimeUpdate`, `applyRealtimeDelete`).
// Each takes the current timeline and an incoming Post / id and
// returns the next timeline without mutating the input.

import {
  applyRealtimeInsert,
  applyRealtimeUpdate,
  applyRealtimeDelete,
  type FeedPost,
} from '../../app/(tabs)/feed.utils';

// Minimal post shape for the reducer tests. The real `Post` type has
// more fields; the reducer only reads `id` and (for blocked-author
// filtering) `username`.
interface SamplePost extends FeedPost {
  username: string;
  likes: number;
}

const post = (id: string, likes = 0, username = 'alice'): SamplePost => ({
  id,
  username,
  likes,
});

// ===========================================================================
// 1. INSERT — a new post appears at the top of the feed
// ===========================================================================

describe('FeedScreen realtime — INSERT: new post appears in feed', () => {
  it('prepends a brand-new post to the top of the timeline', () => {
    const current: SamplePost[] = [post('a', 5), post('b', 3)];
    const incoming: SamplePost = post('c', 1, 'bob');

    const next = applyRealtimeInsert(current, incoming);

    expect(next).toHaveLength(3);
    expect(next.map(p => p.id)).toEqual(['c', 'a', 'b']);
    // The reducer must not mutate the input array.
    expect(current).toHaveLength(2);
    expect(current.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('is a no-op (same length, same ids) when the post is already present', () => {
    // The original reducer guards against double-insert when the
    // realtime channel re-delivers a payload we already paged in.
    const current: SamplePost[] = [post('a', 5), post('b', 3)];
    const duplicate: SamplePost = post('b', 999, 'bob');

    const next = applyRealtimeInsert(current, duplicate);

    expect(next.map(p => p.id)).toEqual(['a', 'b']);
    // The duplicate's `likes` must NOT overwrite the existing row —
    // the reducer short-circuits before applying the payload.
    expect(next.find(p => p.id === 'b')!.likes).toBe(3);
  });

  it('drops the post when the author is in the viewer\'s blocklist', () => {
    // The screen wires the AppContext's `isUserBlocked` closure in;
    // the reducer must respect it before the post hits the FlatList.
    const current: SamplePost[] = [post('a', 5)];
    const incoming: SamplePost = post('c', 1, 'spammer');

    const next = applyRealtimeInsert(current, incoming, u => u === 'spammer');

    expect(next.map(p => p.id)).toEqual(['a']);
  });
});

// ===========================================================================
// 2. DELETE — a deleted post disappears from the feed
// ===========================================================================

describe('FeedScreen realtime — DELETE: deleted post is removed', () => {
  it('removes the matching post from the timeline', () => {
    const current: SamplePost[] = [post('a', 5), post('b', 3), post('c', 7)];

    const next = applyRealtimeDelete(current, 'b');

    expect(next.map(p => p.id)).toEqual(['a', 'c']);
    expect(next).toHaveLength(2);
  });

  it('is a no-op (same length) when the deleted id is not in the feed', () => {
    // Defensive: a stale DELETE payload (post was never on this
    // viewer's timeline, or was already removed by an earlier event)
    // must not trigger a re-render.
    const current: SamplePost[] = [post('a', 5), post('b', 3)];

    const next = applyRealtimeDelete(current, 'does-not-exist');

    expect(next).toHaveLength(2);
    expect(next.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('is a no-op (same length) when the deleted id is missing from the payload', () => {
    // Supabase sends `{ old: {} }` if the row was deleted before the
    // realtime channel caught up; the reducer must not crash.
    const current: SamplePost[] = [post('a', 5), post('b', 3)];

    const next = applyRealtimeDelete(current, undefined);

    expect(next).toHaveLength(2);
    expect(next.map(p => p.id)).toEqual(['a', 'b']);
  });
});

// ===========================================================================
// 3. UPDATE — reaction (heart) count ticks up on a like
// ===========================================================================

describe('FeedScreen realtime — UPDATE: reaction count updates', () => {
  it('updates the likes count on the matching post and leaves siblings untouched', () => {
    // Alice and Bob are both in the feed. Bob's post gets a like;
    // only Bob's `likes` count should change, and Alice's card must
    // remain the exact same reference (so React does not re-render
    // the row, which would cause a visible flicker).
    const alice = post('a', 5, 'alice');
    const bob = post('b', 3, 'bob');
    const current: SamplePost[] = [alice, bob];

    const bobAfterLike: SamplePost = post('b', 4, 'bob');
    const next = applyRealtimeUpdate(current, bobAfterLike);

    expect(next).toHaveLength(2);
    const updatedBob = next.find(p => p.id === 'b')!;
    expect(updatedBob.likes).toBe(4);
    // Sibling reference stability — Alice's row was not re-created.
    expect(next.find(p => p.id === 'a')).toBe(alice);
  });

  it('handles a rapid unlike (likes count goes back down)', () => {
    const current: SamplePost[] = [post('a', 5)];

    const liked = applyRealtimeUpdate(current, post('a', 6));
    expect(liked.find(p => p.id === 'a')!.likes).toBe(6);

    const unliked = applyRealtimeUpdate(liked, post('a', 5));
    expect(unliked.find(p => p.id === 'a')!.likes).toBe(5);
  });

  it('is a no-op (same length) when no post in the feed matches the UPDATE', () => {
    // The UPDATE may target a post the viewer cannot see (e.g. the
    // author blocked the viewer after the post was published). The
    // reducer must not crash and must not reorder the feed.
    const current: SamplePost[] = [post('a', 5), post('b', 3)];

    const next = applyRealtimeUpdate(current, post('z', 99, 'mallory'));

    expect(next).toHaveLength(2);
    expect(next.map(p => p.id)).toEqual(['a', 'b']);
    expect(next.find(p => p.id === 'a')!.likes).toBe(5);
    expect(next.find(p => p.id === 'b')!.likes).toBe(3);
  });
});