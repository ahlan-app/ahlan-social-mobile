// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/FeedScreen.live-feed-updates.test.ts
//
// Live-feed-update integration tests for the realtime feed pipeline.
//
// The HomeFeedScreen (`app/(tabs)/index.tsx`) subscribes to Supabase
// Postgres Changes on the `posts` table. Every INSERT / UPDATE / DELETE
// payload is delivered to `handlePostUpdates`, which delegates the
// pure state-transition work to the reducer helpers in
// `app/(tabs)/feed.utils.ts`:
//
//   - `applyRealtimeInsert(current, incoming, isBlocked?)`
//   - `applyRealtimeUpdate(current, incoming)`
//   - `applyRealtimeDelete(current, deletedId)`
//
// This file wires the realtime subscription helper (`subscribe` from
// `services/realtime.ts`) to the reducer and asserts the three
// user-visible behaviours:
//
//   1. A newly-published post from someone the viewer follows shows up
//      at the top of the feed (INSERT), and a post from a blocked
//      author is dropped before it hits the FlatList.
//   2. When a post's author deletes it, the post disappears from the
//      feed (DELETE); a stale DELETE for an unknown id is a no-op.
//   3. When another user likes / unlikes a post, the reaction (heart)
//      count on the matching card ticks up / down without reordering
//      the feed (UPDATE), and sibling rows keep their reference
//      identity so the FlatList does not flicker.
//
// The reducer is pure and framework-agnostic, so we exercise the
// pipeline with mocked Supabase channels (no React Native, no
// expo-router). Each test resets the realtime helper's internal
// channel map via the `__resetForTests()` hook so the suite stays
// hermetic.

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const removeChannel = jest.fn();
const subscribeFn = jest.fn();

interface FakeChannel {
  name: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  // Captures the postgres_changes handler so the test can dispatch
  // synthetic payloads to it, simulating Supabase realtime delivery.
  changeHandler: ((payload: any) => void) | null;
}

const channelsCreated: FakeChannel[] = [];

jest.mock('../../services/supabase.native', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}), { virtual: true });

import { supabase } from '../../services/supabase.native';
import {
  subscribe,
  activeSubscriptionCount,
  __resetForTests,
  type ChangePayload,
} from '../../services/realtime';
import {
  applyRealtimeInsert,
  applyRealtimeUpdate,
  applyRealtimeDelete,
  type FeedPost,
} from '../../app/(tabs)/feed.utils';

const channelMock = supabase.channel as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  channelsCreated.length = 0;
  __resetForTests();

  channelMock.mockImplementation((name: string) => {
    const ch: FakeChannel = {
      name,
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation(() => {
        subscribeFn(name);
        return ch;
      }),
      changeHandler: null,
    };
    // Capture the postgres_changes handler registered via `channel.on(...)`.
    ch.on.mockImplementation(
      (_event: string, _filter: unknown, handler: (payload: any) => void) => {
        ch.changeHandler = handler;
        return ch;
      },
    );
    channelsCreated.push(ch);
    return ch;
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface LivePost extends FeedPost {
  username: string;
  likes: number;
}

const post = (id: string, likes = 0, username = 'alice'): LivePost => ({
  id,
  username,
  likes,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wires `applyRealtimeInsert/Update/Delete` to the realtime
 * subscription so a synthetic `ChangePayload` triggers the matching
 * reducer. Mirrors what `HomeFeedScreen.handlePostUpdates` does:
 * INSERT prepends (with blocklist filter), UPDATE replaces by id,
 * DELETE drops by id.
 */
function createLiveFeed(
  initial: LivePost[],
  blocked?: (u: string | undefined) => boolean,
) {
  let timeline: LivePost[] = initial.slice();
  const listener = (payload: ChangePayload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      timeline = applyRealtimeInsert(
        timeline,
        payload.new as unknown as LivePost,
        blocked,
      );
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      timeline = applyRealtimeUpdate(
        timeline,
        payload.new as unknown as LivePost,
      );
    } else if (payload.eventType === 'DELETE') {
      const oldId = (payload.old as { id?: string } | null)?.id;
      timeline = applyRealtimeDelete(timeline, oldId);
    }
  };
  const handle = subscribe('live-feed-posts', 'posts', '', listener);
  return {
    handle,
    // The dispatcher accepts a loosely-typed payload because the
    // `ChangePayload.new/old` fields are typed as `Record<string,
    // unknown>` but our fixture posts are richer objects. The cast
    // mirrors how the realtime helper itself normalises incoming
    // payloads in production.
    dispatch: (payload: Record<string, unknown>) => {
      const ch = channelsCreated[channelsCreated.length - 1];
      expect(ch.changeHandler).toBeTruthy();
      ch.changeHandler!(payload);
    },
    getTimeline: () => timeline,
  };
}

// ===========================================================================
// 1. INSERT — a new post appears at the top of the feed
// ===========================================================================

describe('Live feed — INSERT: new post appears in feed', () => {
  it('prepends a newly-published post to the top of the timeline and drops blocked authors', () => {
    // Two feeds side-by-side: one with no blocklist, one with a
    // blocklist for the spammer. Both share the same initial
    // timeline so we can assert the prepend / drop behaviours in
    // a single test.
    const openFeed = createLiveFeed([post('a', 5), post('b', 3)]);
    const filteredFeed = createLiveFeed(
      [post('a', 5)],
      u => u === 'spammer',
    );

    openFeed.dispatch({
      eventType: 'INSERT',
      schema: 'public',
      table: 'posts',
      new: post('c', 1, 'bob'),
      old: null,
    });
    expect(openFeed.getTimeline().map(p => p.id)).toEqual(['c', 'a', 'b']);
    expect(openFeed.getTimeline()[0].username).toBe('bob');

    filteredFeed.dispatch({
      eventType: 'INSERT',
      schema: 'public',
      table: 'posts',
      new: post('c', 1, 'spammer'),
      old: null,
    });
    // The blocked post must never reach the rendered feed.
    expect(filteredFeed.getTimeline().map(p => p.id)).toEqual(['a']);
  });
});

// ===========================================================================
// 2. DELETE — a deleted post is removed from the feed
// ===========================================================================

describe('Live feed — DELETE: deleted post is removed', () => {
  it('removes the matching post from the timeline and is a no-op for unknown ids', () => {
    const feed = createLiveFeed([post('a', 5), post('b', 3), post('c', 7)]);

    feed.dispatch({
      eventType: 'DELETE',
      schema: 'public',
      table: 'posts',
      new: null,
      old: { id: 'b' },
    });
    expect(feed.getTimeline().map(p => p.id)).toEqual(['a', 'c']);
    expect(feed.getTimeline()).toHaveLength(2);

    // Stale DELETE (e.g. the post was already gone from this
    // viewer's timeline) must not reorder the feed or change counts.
    feed.dispatch({
      eventType: 'DELETE',
      schema: 'public',
      table: 'posts',
      new: null,
      old: { id: 'never-existed' },
    });
    expect(feed.getTimeline().map(p => p.id)).toEqual(['a', 'c']);
  });
});

// ===========================================================================
// 3. UPDATE — reaction (heart) count ticks up / down on a like / unlike
// ===========================================================================

describe('Live feed — UPDATE: reaction count updates', () => {
  it('ticks the heart count up by exactly the delta and keeps sibling references stable', () => {
    const alice = post('a', 5, 'alice');
    const bob = post('b', 3, 'bob');
    const feed = createLiveFeed([alice, bob]);

    // Some user likes Bob's post; Supabase emits an UPDATE with the
    // refreshed `likes` count.
    feed.dispatch({
      eventType: 'UPDATE',
      schema: 'public',
      table: 'posts',
      new: post('b', 4, 'bob'),
      old: { id: 'b' },
    });

    const timeline = feed.getTimeline();
    expect(timeline.find(p => p.id === 'b')!.likes).toBe(4);
    // Alice's card must not be re-created — reference stability keeps
    // the FlatList from re-rendering unrelated rows.
    expect(timeline.find(p => p.id === 'a')).toBe(alice);
    expect(timeline.find(p => p.id === 'a')!.likes).toBe(5);
  });

  it('handles a rapid like-then-unlike sequence (heart count round-trips)', () => {
    const feed = createLiveFeed([post('a', 5)]);

    feed.dispatch({
      eventType: 'UPDATE',
      schema: 'public',
      table: 'posts',
      new: post('a', 6),
      old: { id: 'a' },
    });
    expect(feed.getTimeline().find(p => p.id === 'a')!.likes).toBe(6);

    feed.dispatch({
      eventType: 'UPDATE',
      schema: 'public',
      table: 'posts',
      new: post('a', 5),
      old: { id: 'a' },
    });
    expect(feed.getTimeline().find(p => p.id === 'a')!.likes).toBe(5);
  });
});

// ===========================================================================
// 4. Subscription lifecycle — the live feed channel is cleaned up
// ===========================================================================

describe('Live feed — subscription lifecycle', () => {
  it('registers exactly one channel for the feed stream and removes it on unsubscribe', () => {
    const feed = createLiveFeed([post('a', 5)]);
    expect(activeSubscriptionCount()).toBe(1);
    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(channelsCreated[0].name).toBe('live-feed-posts');

    feed.handle.unsubscribe();

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(activeSubscriptionCount()).toBe(0);
  });
});