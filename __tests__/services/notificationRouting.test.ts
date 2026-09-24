// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/notificationRouting.ts
// Launcher icon taps must not be treated as notification taps.

import {
  DEFAULT_ACTION_IDENTIFIER,
  getGenuineResponseId,
  routeForNotificationData,
  resolveRoutePath,
} from '../../services/notificationRouting';

const response = (identifier: string | null, data: unknown, action = DEFAULT_ACTION_IDENTIFIER) => ({
  actionIdentifier: action,
  notification: { request: { identifier, content: { data } } },
});

describe('getGenuineResponseId', () => {
  it('rejects fake responses built from OEM launcher extras', () => {
    expect(getGenuineResponseId(response(null, { anim_not_finish: false }))).toBeNull();
    expect(getGenuineResponseId(response('', { anim_not_finish: false }))).toBeNull();
  });

  it('rejects action-button responses and empty input', () => {
    expect(getGenuineResponseId(response('abc', { postId: '1' }, 'reply'))).toBeNull();
    expect(getGenuineResponseId(null)).toBeNull();
    expect(getGenuineResponseId(undefined)).toBeNull();
  });

  it('accepts a real tap with an identifier', () => {
    expect(getGenuineResponseId(response('0:1234%abc', { postId: '1' }))).toBe('0:1234%abc');
  });
});

describe('routeForNotificationData', () => {
  it('routes known payloads', () => {
    expect(routeForNotificationData({ type: 'follow', username: 'ali' }))
      .toEqual({ route: '/user/[username]', params: { username: 'ali' } });
    expect(routeForNotificationData({ type: 'message', conversationId: 'c1' }))
      .toEqual({ route: '/messages', params: { conversationId: 'c1' } });
    expect(routeForNotificationData({ type: 'like', postId: 'p1' }))
      .toEqual({ route: '/post/[id]', params: { id: 'p1' } });
    expect(routeForNotificationData({ type: 'like' }))
      .toEqual({ route: '/notifications', params: {} });
  });

  it('does not navigate for unknown or missing payloads', () => {
    expect(routeForNotificationData({ anim_not_finish: false })).toEqual({ route: null, reason: 'unknown-payload' });
    expect(routeForNotificationData(undefined)).toEqual({ route: null, reason: 'no-data' });
    expect(routeForNotificationData('x')).toEqual({ route: null, reason: 'no-data' });
  });
});

describe('resolveRoutePath', () => {
  it('fills dynamic segments', () => {
    expect(resolveRoutePath('/post/[id]', { id: '42' })).toBe('/post/42');
    expect(resolveRoutePath('/notifications', {})).toBe('/notifications');
  });
});
