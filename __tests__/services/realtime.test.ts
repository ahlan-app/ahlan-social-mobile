// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Tests for the realtime subscription helper.
// Covers: subscribe/unsubscribe lifecycle, cleanup on unmount semantics,
// idempotent unsubscription, and the full-session teardown path.
//
// The helper keeps a module-scoped Map of active channels for dedupe and
// introspection. We clear that Map between tests via the test-only
// `__resetForTests()` hook (which does NOT call supabase.removeChannel,
// so it cannot pollute mock-call counts).

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const removeChannel = jest.fn();
const subscribeFn = jest.fn();

interface FakeChannel {
  name: string;
  on: jest.Mock;
  subscribe: jest.Mock;
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
  unsubscribe,
  unsubscribeAll,
  activeSubscriptionCount,
  __resetForTests,
  type ChangePayload,
} from '../../services/realtime';

const channelMock = supabase.channel as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  channelsCreated.length = 0;
  // Drop the live-channel map without firing removeChannel.
  __resetForTests();

  channelMock.mockImplementation((name: string) => {
    const ch: FakeChannel = {
      name,
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockImplementation(() => {
        subscribeFn(name);
        return ch;
      }),
    };
    channelsCreated.push(ch);
    return ch;
  });
});

// ===========================================================================
// subscribe / unsubscribe lifecycle
// ===========================================================================

describe('realtime subscribe / unsubscribe lifecycle', () => {
  it('creates a Supabase channel with the given name and subscribes to it', () => {
    const onChange = jest.fn();

    const handle = subscribe('posts-feed', 'posts', 'user_id=eq.u1', onChange);

    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(channelMock).toHaveBeenCalledWith('posts-feed');

    const channel = channelsCreated[0];
    expect(channel.on).toHaveBeenCalledTimes(1);
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts', filter: 'user_id=eq.u1' },
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribeFn).toHaveBeenCalledWith('posts-feed');

    expect(handle.channelName).toBe('posts-feed');
    expect(activeSubscriptionCount()).toBe(1);
  });

  it('returns the existing handle when subscribing twice to the same channel name', () => {
    const onChangeA = jest.fn();
    const onChangeB = jest.fn();

    const first = subscribe('dup', 'likes', 'user_id=eq.u1', onChangeA);
    const second = subscribe('dup', 'likes', 'user_id=eq.u1', onChangeB);

    expect(first).toBe(second);
    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(activeSubscriptionCount()).toBe(1);
  });

  it('removeChannel is called and the handle is dropped on unsubscribe', () => {
    const onChange = jest.fn();
    const handle = subscribe('clean', 'notifications', 'receiver_id=eq.u2', onChange);

    expect(activeSubscriptionCount()).toBe(1);

    unsubscribe(handle);

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(handle.channel);
    expect(activeSubscriptionCount()).toBe(0);
  });

  it('unsubscribe is idempotent — calling it twice is a safe no-op', () => {
    const onChange = jest.fn();
    const handle = subscribe('idem', 'posts', 'user_id=eq.u3', onChange);

    unsubscribe(handle);
    unsubscribe(handle);
    unsubscribe(handle);

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(activeSubscriptionCount()).toBe(0);
  });
});

// ===========================================================================
// Cleanup on unmount — simulate React useEffect cleanup semantics
// ===========================================================================

describe('realtime cleanup on unmount', () => {
  it('simulating useEffect mount/unmount: subscribes on mount, removes on unmount', () => {
    const onChange = jest.fn();

    // --- mount ---
    const handle = subscribe('mount-unmount', 'messages', 'sender_id=eq.u4', onChange);
    expect(activeSubscriptionCount()).toBe(1);
    expect(removeChannel).not.toHaveBeenCalled();

    // --- unmount: effect cleanup runs unsubscribe ---
    unsubscribe(handle);

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(activeSubscriptionCount()).toBe(0);
    // After unmount, a fresh mount with the same channel name must allocate a
    // new Supabase channel rather than reuse the torn-down one.
    const beforeCount = channelMock.mock.calls.length;
    const second = subscribe('mount-unmount', 'messages', 'sender_id=eq.u4', onChange);
    expect(channelMock.mock.calls.length).toBe(beforeCount + 1);
    expect(activeSubscriptionCount()).toBe(1);
    expect(second).not.toBe(handle);
  });

  it('multiple mounts: each handle cleans up independently', () => {
    const a = subscribe('multi-a', 'posts', 'user_id=eq.a', jest.fn());
    const b = subscribe('multi-b', 'likes', 'user_id=eq.b', jest.fn());
    const c = subscribe('multi-c', 'comments', 'post_id=eq.c', jest.fn());

    expect(activeSubscriptionCount()).toBe(3);

    // Tear down the middle one first.
    unsubscribe(b);
    expect(activeSubscriptionCount()).toBe(2);
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenLastCalledWith(b.channel);

    unsubscribe(a);
    unsubscribe(c);
    expect(activeSubscriptionCount()).toBe(0);
    expect(removeChannel).toHaveBeenCalledTimes(3);
  });

  it('unsubscribeAll clears every active subscription in one call', () => {
    subscribe('all-1', 'posts', 'user_id=eq.1', jest.fn());
    subscribe('all-2', 'likes', 'user_id=eq.2', jest.fn());
    subscribe('all-3', 'comments', 'post_id=eq.3', jest.fn());

    expect(activeSubscriptionCount()).toBe(3);

    unsubscribeAll();

    expect(removeChannel).toHaveBeenCalledTimes(3);
    expect(activeSubscriptionCount()).toBe(0);
  });

  it('payloads from Supabase are normalized to the public ChangePayload shape', () => {
    const onChange = jest.fn();
    subscribe('payload', 'posts', 'user_id=eq.u5', onChange);

    // Pull the registered postgres_changes handler and feed it a Supabase-shaped
    // event to confirm we map eventType/schema/table/new/old correctly.
    const channel = channelsCreated[0];
    const pgHandler = channel.on.mock.calls[0][2];

    const supabaseEvent = {
      eventType: 'INSERT',
      schema: 'public',
      table: 'posts',
      new: { id: 'p1', content: 'hello' },
      old: null,
    };
    pgHandler(supabaseEvent);

    expect(onChange).toHaveBeenCalledTimes(1);
    const received: ChangePayload = onChange.mock.calls[0][0];
    expect(received).toEqual({
      eventType: 'INSERT',
      schema: 'public',
      table: 'posts',
      new: { id: 'p1', content: 'hello' },
      old: null,
    });
  });
});
