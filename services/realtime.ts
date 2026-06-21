// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Realtime subscription helper for Supabase Postgres Changes / Broadcast.
//
// Wraps `supabase.channel()` with a small, well-defined lifecycle:
//   subscribe(channelName, filter, onChange)  -> subscription handle
//   unsubscribe(handle)                        -> removes channel + clears handle
//
// The helper is intentionally framework-agnostic so it can be used from
// React effects (cleanup on unmount), plain event handlers, or background
// watchers. Each handle tracks the underlying channel so cleanup is
// deterministic — calling unsubscribe twice is a safe no-op.

import { supabase } from './supabase.native';

export type ChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export type ChangeHandler = (payload: ChangePayload) => void;

export type RealtimeSubscription = {
  channelName: string;
  channel: ReturnType<typeof supabase.channel>;
  unsubscribe: () => void;
};

// Active channels keyed by channel name — prevents accidental double-subscribe
// on the same logical stream within a single session.
const activeChannels = new Map<string, RealtimeSubscription>();

/**
 * Subscribe to Postgres Changes on `table` filtered by an equality clause
 * (e.g. `user_id=eq.abc`). Returns a handle whose `unsubscribe()` removes the
 * channel from Supabase's realtime manager.
 */
export function subscribe(
  channelName: string,
  table: string,
  filter: string,
  onChange: ChangeHandler,
): RealtimeSubscription {
  // If a channel with this name already exists, return the existing handle
  // rather than leaking a second channel that would receive duplicate events.
  const existing = activeChannels.get(channelName);
  if (existing) return existing;

  const channel = supabase.channel(channelName);

  channel.on(
    'postgres_changes' as any,
    { event: '*', schema: 'public', table, filter } as any,
    (payload: any) => {
      onChange({
        eventType: payload.eventType,
        schema: payload.schema,
        table: payload.table,
        new: payload.new ?? null,
        old: payload.old ?? null,
      });
    },
  );

  channel.subscribe();

  const handle: RealtimeSubscription = {
    channelName,
    channel,
    unsubscribe: () => {
      if (!activeChannels.has(channelName)) return;
      supabase.removeChannel(channel);
      activeChannels.delete(channelName);
    },
  };

  activeChannels.set(channelName, handle);
  return handle;
}

/**
 * Unsubscribe and clean up a subscription handle. Safe to call multiple
 * times — subsequent calls are no-ops.
 */
export function unsubscribe(handle: RealtimeSubscription): void {
  handle.unsubscribe();
}

/**
 * Remove every active subscription. Intended for tests and full-session
 * teardown (e.g. on logout).
 */
export function unsubscribeAll(): void {
  for (const handle of Array.from(activeChannels.values())) {
    handle.unsubscribe();
  }
  activeChannels.clear();
}

/**
 * Test/dev introspection — number of live channels.
 */
export function activeSubscriptionCount(): number {
  return activeChannels.size;
}

/**
 * Test-only reset. Drops the live-channel map WITHOUT notifying Supabase.
 * Used by the realtime test suite to keep tests hermetic — production code
 * should always go through `unsubscribe()` / `unsubscribeAll()`.
 */
export function __resetForTests(): void {
  activeChannels.clear();
}
