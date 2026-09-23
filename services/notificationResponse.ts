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

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getGenuineResponseId, routeForNotificationData, NotificationRoute } from './notificationRouting';

const HANDLED_KEY = 'ahlan:handledNotificationIds';
const MAX_HANDLED = 50;

// Module scope so it survives RootLayout remounts; persisted so an old tap is
// not replayed when Android recreates the activity with its original intent.
const handled = new Set<string>();
let loaded: Promise<void> | null = null;

const ensureLoaded = (): Promise<void> => {
  if (!loaded) {
    loaded = AsyncStorage.getItem(HANDLED_KEY)
      .then((raw) => {
        if (raw) (JSON.parse(raw) as string[]).forEach((id) => handled.add(id));
      })
      .catch(() => {});
  }
  return loaded;
};

/**
 * Handles a notification response at most once. Returns the route to open, or
 * null for fake responses (launcher icon taps), action buttons, duplicates and
 * unknown payloads.
 */
export async function consumeNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined,
): Promise<NotificationRoute | null> {
  const id = getGenuineResponseId(response);
  if (!id || !response) return null;

  await ensureLoaded();
  if (handled.has(id)) return null;
  handled.add(id);
  AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...handled].slice(-MAX_HANDLED))).catch(() => {});

  try {
    Notifications.clearLastNotificationResponse();
  } catch {
    // not available on this platform
  }

  const route = routeForNotificationData(response.notification.request.content.data);
  return route.route ? route : null;
}
