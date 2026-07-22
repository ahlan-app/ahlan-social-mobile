/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/services/shareIntent.ts
 *
 * Stable share-intent handling across app backgrounds; persists the deep-link until it is consumed.
 */

import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHARE_INTENT_KEY = 'share_intent:last';

export interface ShareIntent {
  url: string;
  receivedAt: string;
}

export async function captureShareIntent(url: string): Promise<void> {
  const payload: ShareIntent = { url, receivedAt: new Date().toISOString() };
  await AsyncStorage.setItem(SHARE_INTENT_KEY, JSON.stringify(payload));
}

export async function consumePendingShareIntent(): Promise<ShareIntent | null> {
  const raw = await AsyncStorage.getItem(SHARE_INTENT_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(SHARE_INTENT_KEY);
  try {
    return JSON.parse(raw) as ShareIntent;
  } catch {
    return null;
  }
}

export function listenForIncomingShares(handler: (intent: ShareIntent) => void) {
  const sub = Linking.addEventListener('url', ({ url }) => {
    if (url) {
      void captureShareIntent(url).then(() => handler({ url, receivedAt: new Date().toISOString() }));
    }
  });
  return () => sub.remove();
}
