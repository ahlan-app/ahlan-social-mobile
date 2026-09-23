// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Pure notification-tap routing (no react-native / expo imports so it can be
// unit tested in node).

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

export type NotificationRoute =
  | { route: string; params: Record<string, string> }
  | { route: null; reason: string };

const KNOWN_TYPES = new Set([
  'like', 'comment', 'follow', 'comment_like', 'repost', 'mention', 'story_like', 'message',
]);

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

type ResponseLike = {
  actionIdentifier?: string | null;
  notification?: {
    request?: { identifier?: string | null; content?: { data?: unknown } | null } | null;
  } | null;
} | null | undefined;

/**
 * Returns the notification identifier when the response is a genuine tap on a
 * notification, or null otherwise.
 *
 * On Android, expo-notifications 0.32 turns any launcher intent carrying extras
 * into a fake "response" (OEM launchers such as Samsung add extras like
 * "anim_not_finish" to plain icon taps). Those fakes have no identifier, because
 * the identifier comes from FCM's google.message_id.
 */
export function getGenuineResponseId(response: ResponseLike): string | null {
  if (!response || response.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) return null;
  const id = response.notification?.request?.identifier;
  return isNonEmptyString(id) ? id : null;
}

/** Maps a notification payload to a route. Unknown payloads do not navigate. */
export function routeForNotificationData(data: unknown): NotificationRoute {
  if (!data || typeof data !== 'object') return { route: null, reason: 'no-data' };
  const d = data as Record<string, unknown>;
  const type = isNonEmptyString(d.type) ? d.type : undefined;

  if (type === 'follow' && isNonEmptyString(d.username)) {
    return { route: '/user/[username]', params: { username: d.username } };
  }
  if (type === 'message' && isNonEmptyString(d.conversationId)) {
    return { route: '/messages', params: { conversationId: d.conversationId } };
  }
  if (isNonEmptyString(d.postId)) {
    return { route: '/post/[id]', params: { id: d.postId } };
  }
  if (type && KNOWN_TYPES.has(type)) {
    return { route: '/notifications', params: {} };
  }
  return { route: null, reason: 'unknown-payload' };
}

/** Fills a route pattern like /post/[id] with its params. */
export function resolveRoutePath(route: string, params: Record<string, string>): string {
  return route.replace(/\[(\w+)\]/g, (_, key: string) => params[key] ?? '');
}
