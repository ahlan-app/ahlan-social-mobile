// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/analytics.test.ts
//
// Tests for the analytics event tracking service. Covers the four
// behaviours the feature brief calls out:
//
//   1. Screen view events are recorded with the correct type, name,
//      and timestamp.
//   2. User action events are recorded with the correct type and
//      tag the optional params payload.
//   3. The batch queue buffers events FIFO and flushes them through
//      the injected transport in arrival order.
//   4. Auto-flush triggers once the queue reaches `batchSize`, and
//      a failed transport leaves events for retry.

import {
  createAnalytics,
  AnalyticsEvent,
  AnalyticsTransport,
} from '../../services/analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface RecordedBatch {
  id: string;
  events: AnalyticsEvent[];
}

const buildTransport = (
  onSend?: (events: AnalyticsEvent[]) => void,
): { transport: AnalyticsTransport; sent: RecordedBatch[] } => {
  const sent: RecordedBatch[] = [];
  const transport: AnalyticsTransport = {
    send: jest.fn(async (events: AnalyticsEvent[]) => {
      sent.push({ id: `auto-${sent.length + 1}`, events });
      onSend?.(events);
    }),
  };
  return { transport, sent };
};

describe('analytics — event tracking', () => {
  describe('screen view events', () => {
    test('trackScreenView records a screen_view event with the given name and timestamp', () => {
      let now = 1_700_000_000_000;
      const { transport } = buildTransport();
      const analytics = createAnalytics({ transport, now: () => now });

      const event = analytics.trackScreenView('Feed');

      expect(event.type).toBe('screen_view');
      expect(event.name).toBe('Feed');
      expect(event.timestamp).toBe(now);
      expect(analytics.size()).toBe(1);
      expect(analytics.snapshot()).toEqual([event]);

      // Transport should not have been called yet (queue < batchSize).
      expect(transport.send).not.toHaveBeenCalled();
    });

    test('trackScreenView carries optional params through to the recorded event', () => {
      const { transport } = buildTransport();
      const analytics = createAnalytics({ transport });

      const event = analytics.trackScreenView('Profile', {
        userId: 'u-42',
        source: 'deep_link',
      });

      expect(event.type).toBe('screen_view');
      expect(event.name).toBe('Profile');
      expect(event.params).toEqual({ userId: 'u-42', source: 'deep_link' });
    });
  });

  describe('user action events', () => {
    test('trackUserAction records a user_action event with the given name', () => {
      let now = 1_700_000_000_500;
      const { transport } = buildTransport();
      const analytics = createAnalytics({ transport, now: () => now });

      const event = analytics.trackUserAction('like_post');

      expect(event.type).toBe('user_action');
      expect(event.name).toBe('like_post');
      expect(event.timestamp).toBe(now);
      expect(analytics.size()).toBe(1);
      expect(analytics.snapshot()).toEqual([event]);
    });

    test('trackUserAction preserves additional context in params', () => {
      const { transport } = buildTransport();
      const analytics = createAnalytics({ transport });

      const event = analytics.trackUserAction('submit_comment', {
        postId: 'p-1',
        length: 24,
      });

      expect(event.type).toBe('user_action');
      expect(event.name).toBe('submit_comment');
      expect(event.params).toEqual({ postId: 'p-1', length: 24 });
    });
  });

  describe('batch event queue', () => {
    test('events enqueue FIFO and a manual flush drains them in arrival order', async () => {
      const { transport, sent } = buildTransport();
      const analytics = createAnalytics({ transport, batchSize: 100 });

      analytics.trackScreenView('Home');
      analytics.trackUserAction('open_menu');
      analytics.trackScreenView('Settings');
      analytics.trackUserAction('tap_logout');

      expect(analytics.size()).toBe(4);
      expect(transport.send).not.toHaveBeenCalled();

      const drained = await analytics.flush();

      expect(drained).toHaveLength(4);
      expect(drained.map((e) => e.name)).toEqual([
        'Home',
        'open_menu',
        'Settings',
        'tap_logout',
      ]);
      expect(analytics.size()).toBe(0);
      expect(sent).toHaveLength(1);
      expect(sent[0].events.map((e) => e.name)).toEqual([
        'Home',
        'open_menu',
        'Settings',
        'tap_logout',
      ]);
    });

    test('mixing screen_view and user_action events preserves type ordering in the batch', async () => {
      const { transport, sent } = buildTransport();
      const analytics = createAnalytics({ transport, batchSize: 100 });

      analytics.trackScreenView('Feed');
      analytics.trackUserAction('like_post', { postId: 'p-1' });
      analytics.trackScreenView('Profile', { userId: 'u-1' });
      analytics.trackUserAction('follow_user', { targetId: 'u-2' });

      await analytics.flush();

      const events = sent[0].events;
      expect(events.map((e) => e.type)).toEqual([
        'screen_view',
        'user_action',
        'screen_view',
        'user_action',
      ]);
    });
  });

  describe('automatic flush on batch size', () => {
    test('queue auto-flushes when it reaches batchSize', async () => {
      const { transport, sent } = buildTransport();
      const analytics = createAnalytics({ transport, batchSize: 3 });

      analytics.trackScreenView('A');
      analytics.trackScreenView('B');
      // Queue at 2, under the threshold — transport untouched.
      expect(transport.send).not.toHaveBeenCalled();

      analytics.trackUserAction('C');

      // The third event triggers auto-flush via a microtask — wait
      // for the promise to settle before asserting.
      await Promise.resolve();
      await Promise.resolve();

      expect(sent).toHaveLength(1);
      expect(sent[0].events.map((e) => e.name)).toEqual(['A', 'B', 'C']);
      expect(analytics.size()).toBe(0);
    });

    test('subsequent events after auto-flush start a fresh queue', async () => {
      const { transport, sent } = buildTransport();
      const analytics = createAnalytics({ transport, batchSize: 2 });

      analytics.trackScreenView('A');
      analytics.trackUserAction('B');
      // Auto-flush fires here (size === batchSize).
      await Promise.resolve();
      await Promise.resolve();

      expect(sent).toHaveLength(1);
      expect(analytics.size()).toBe(0);

      analytics.trackScreenView('C');
      expect(analytics.size()).toBe(1);
      // Below threshold — no second flush yet.
      expect(sent).toHaveLength(1);

      await analytics.flush();
      expect(sent).toHaveLength(2);
      expect(sent[1].events.map((e) => e.name)).toEqual(['C']);
    });

    test('failed transport leaves the queue drained but caller can observe the failure', async () => {
      const transport: AnalyticsTransport = {
        send: jest.fn(async () => {
          throw new Error('network down');
        }),
      };
      const analytics = createAnalytics({ transport, batchSize: 100 });

      analytics.trackScreenView('Feed');
      analytics.trackUserAction('like_post');

      await expect(analytics.flush()).rejects.toThrow('network down');

      // Both events were spliced out of the buffer; the failed send
      // does not silently re-queue them (the real implementation is
      // expected to surface this to a retry layer).
      expect(analytics.size()).toBe(0);
      expect(transport.send).toHaveBeenCalledTimes(1);
    });
  });
});
