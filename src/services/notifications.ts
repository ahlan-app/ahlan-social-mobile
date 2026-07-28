/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/services/notifications.ts
 *
 * Notification service that deduplicates incoming notifications across multiple devices using a stable key.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'notifications:seen_keys';

export interface IncomingNotification {
  id: string;
  kind: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  actorId: string;
  targetId: string;
  createdAt: string;
}

export interface VisibleNotification extends IncomingNotification {
  dedupedFrom?: string[];
}

export async function loadSeenKeys(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(SEEN_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export async function persistSeenKeys(keys: Set<string>): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(keys)));
}

export function dedupeKey(notification: IncomingNotification): string {
  // Stable key: dedupes across devices because it does not include the
  // device-local notification id.
  return [notification.kind, notification.actorId, notification.targetId].join(':');
}

export async function filterNew(
  notifications: IncomingNotification[],
): Promise<VisibleNotification[]> {
  const seen = await loadSeenKeys();
  const visible: VisibleNotification[] = [];
  for (const n of notifications) {
    const key = dedupeKey(n);
    if (seen.has(key)) continue;
    seen.add(key);
    visible.push(n);
  }
  await persistSeenKeys(seen);
  return visible;
}
