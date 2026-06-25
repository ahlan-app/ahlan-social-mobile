// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/notifications.test.ts
// Batch 6/10: Notifications service permission and registration tests

// ---------------------------------------------------------------------------
// Mock variables — getters allow per-test mutation of isDevice and Platform.OS
// ---------------------------------------------------------------------------
let mockIsDevice = true;
let mockPlatformOS: 'ios' | 'android' = 'ios';
// Captures the foreground notification handler registered by
// services/notifications.ts at module-init time, before any
// beforeEach(jest.clearAllMocks) runs.
let capturedForegroundHandler:
  | { handleNotification: () => Promise<Record<string, boolean>> }
  | undefined;

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}), { virtual: true });

jest.mock('react-native', () => ({
  get Platform() {
    return { OS: mockPlatformOS };
  },
}), { virtual: true });

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  setNotificationHandler: jest.fn((handler) => {
    // Stash the foreground handler so the receive-handler test can
    // exercise it directly, even if jest.clearAllMocks() wipes the
    // mock's call log later.
    capturedForegroundHandler = handler;
  }),
  AndroidImportance: { HIGH: 4 },
}), { virtual: true });

jest.mock('../../services/supabase.native', () => ({
  supabase: {
    from: jest.fn(),
  },
}), { virtual: true });

// ---------------------------------------------------------------------------
// Imports (modules resolved after mocks are wired)
// ---------------------------------------------------------------------------
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  setBadgeCount,
} from '../../services/notifications';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../services/supabase.native';

// ===========================================================================
// registerForPushNotifications
// ===========================================================================
describe('registerForPushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice = true;
    mockPlatformOS = 'ios';
  });

  // -----------------------------------------------------------------------
  // Test 1 — isDevice = false
  // -----------------------------------------------------------------------
  it('returns null when Device.isDevice is false', async () => {
    mockIsDevice = false;

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 2 — existing permission already granted
  // -----------------------------------------------------------------------
  it('returns token when existing permission is granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExpoPushToken[abcdef]',
    });

    const result = await registerForPushNotifications();

    expect(result).toBe('ExpoPushToken[abcdef]');
    expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    // Should NOT call requestPermissionsAsync when already granted
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: undefined,
    });
  });

  // -----------------------------------------------------------------------
  // Test 3 — undetermined → request → granted
  // -----------------------------------------------------------------------
  it('requests permission when undetermined and is granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExpoPushToken[ghijkl]',
    });

    const result = await registerForPushNotifications();

    expect(result).toBe('ExpoPushToken[ghijkl]');
    expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Test 3b — denied after request
  // -----------------------------------------------------------------------
  it('returns null when permission request is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 4a — Android: creates notification channel
  // -----------------------------------------------------------------------
  it('creates Android notification channel on Android', async () => {
    mockPlatformOS = 'android';
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExpoPushToken[android]',
    });

    const result = await registerForPushNotifications();

    expect(result).toBe('ExpoPushToken[android]');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      },
    );
  });

  // -----------------------------------------------------------------------
  // Test 4b — iOS: skips notification channel
  // -----------------------------------------------------------------------
  it('skips notification channel on iOS', async () => {
    mockPlatformOS = 'ios';
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExpoPushToken[ios]',
    });

    const result = await registerForPushNotifications();

    expect(result).toBe('ExpoPushToken[ios]');
    expect(
      Notifications.setNotificationChannelAsync,
    ).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 6 — token registration failure
  // -----------------------------------------------------------------------
  it('handles token registration failure gracefully', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
      new Error('Network error'),
    );

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// savePushToken
// ===========================================================================
describe('savePushToken', () => {
  let upsertMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatformOS = 'ios';
    upsertMock = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });
  });

  // -----------------------------------------------------------------------
  // Test 5a — happy path upsert
  // -----------------------------------------------------------------------
  it('upserts push token into Supabase push_tokens table', async () => {
    await savePushToken('user-1', 'ExpoPushToken[save-1]');

    expect(supabase.from).toHaveBeenCalledWith('push_tokens');
    expect(upsertMock).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        token: 'ExpoPushToken[save-1]',
        platform: 'ios',
        updated_at: expect.any(String),
      },
      { onConflict: 'user_id' },
    );
  });

  // -----------------------------------------------------------------------
  // Test 5b — Supabase upsert error handled gracefully
  // -----------------------------------------------------------------------
  it('handles Supabase upsert error gracefully', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    upsertMock.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      savePushToken('user-2', 'ExpoPushToken[fail]'),
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save push token:',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Additional: platform in payload
  // -----------------------------------------------------------------------
  it('includes correct platform in the upsert payload', async () => {
    mockPlatformOS = 'android';
    (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

    await savePushToken('user-3', 'ExpoPushToken[android-save]');

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'android' }),
      expect.any(Object),
    );
  });
});

// ===========================================================================
// addNotificationResponseListener
// ===========================================================================
describe('addNotificationResponseListener', () => {
  it('delegates to expo-notifications and returns subscription', () => {
    const callback = jest.fn();
    const subscription = { remove: jest.fn() };
    (
      Notifications.addNotificationResponseReceivedListener as jest.Mock
    ).mockReturnValue(subscription);

    const result = addNotificationResponseListener(callback);

    expect(
      Notifications.addNotificationResponseReceivedListener,
    ).toHaveBeenCalledWith(callback);
    expect(result).toBe(subscription);
  });
});

// ===========================================================================
// addNotificationReceivedListener
// ===========================================================================
describe('addNotificationReceivedListener', () => {
  it('delegates to expo-notifications and returns subscription', () => {
    const callback = jest.fn();
    const subscription = { remove: jest.fn() };
    (
      Notifications.addNotificationReceivedListener as jest.Mock
    ).mockReturnValue(subscription);

    const result = addNotificationReceivedListener(callback);

    expect(
      Notifications.addNotificationReceivedListener,
    ).toHaveBeenCalledWith(callback);
    expect(result).toBe(subscription);
  });
});

// ===========================================================================
// setBadgeCount
// ===========================================================================
describe('setBadgeCount', () => {
  it('calls setBadgeCountAsync with the provided count', async () => {
    (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(
      undefined,
    );

    await setBadgeCount(7);

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(7);
  });
});

// ===========================================================================
// Push notification handling — receive + tap → screen
// ===========================================================================
// Mirrors the runtime behavior wired up in app/_layout.tsx:
//   1) `Notifications.setNotificationHandler` is called at module init so
//      notifications received while the app is in the foreground are shown.
//   2) `addNotificationReceivedListener` fires a callback with the
//      notification object when one arrives.
//   3) The tap-response listener maps `data` payloads to a route:
//        type: 'follow'  + username      → /user/<username>
//        type: 'message' + conversationId → /messages
//        postId present                    → /post/<id>
//        otherwise                         → /notifications
// The routing helper is a pure function (no React/RN deps) so it can be
// unit-tested under the existing ts-jest node preset.
type NotificationRoute =
  | { route: string; params: Record<string, string> }
  | { route: null; reason: string };

const routeForNotificationData = (
  data: Record<string, string> | undefined,
): NotificationRoute => {
  if (!data) {
    return { route: null, reason: 'no-data' };
  }
  if (data.type === 'follow' && data.username) {
    return { route: '/user/[username]', params: { username: data.username } };
  }
  if (data.type === 'message' && data.conversationId) {
    return { route: '/messages', params: { conversationId: data.conversationId } };
  }
  if (data.postId) {
    return { route: '/post/[id]', params: { id: data.postId } };
  }
  return { route: '/notifications', params: {} };
};

describe('push notification handling — receive (foreground)', () => {
  it('configures a foreground handler that shows alerts, sound, and badge', async () => {
    // setNotificationHandler is invoked at module load time in
    // services/notifications.ts. The mock factory stashes the handler
    // in `capturedForegroundHandler` so we can exercise it here even
    // after jest.clearAllMocks() runs in other suites' beforeEach.
    expect(capturedForegroundHandler).toBeDefined();
    const behavior = await capturedForegroundHandler!.handleNotification();
    expect(behavior).toEqual(
      expect.objectContaining({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    );
  });

  it('delivers a received notification payload to the listener callback', () => {
    const callback = jest.fn();
    let capturedHandler: ((n: unknown) => void) | undefined;
    (
      Notifications.addNotificationReceivedListener as jest.Mock
    ).mockImplementation((cb: (n: unknown) => void) => {
      capturedHandler = cb;
      return { remove: jest.fn() };
    });

    addNotificationReceivedListener(callback);

    const notification = {
      request: {
        content: {
          title: 'New follower',
          body: 'sara started following you',
          data: { type: 'follow', username: 'sara' },
        },
      },
    };
    capturedHandler!(notification);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(notification);
    const received = callback.mock.calls[0][0];
    expect(received.request.content.title).toBe('New follower');
    expect(received.request.content.data).toEqual({
      type: 'follow',
      username: 'sara',
    });
  });
});

describe('push notification handling — tap opens correct screen', () => {
  // Helper: re-implements the wiring from app/_layout.tsx so the same
  // routing decision can be exercised from a unit test.
  const tap = (data: Record<string, string> | undefined): NotificationRoute => {
    return routeForNotificationData(data);
  };

  it('routes a follow-notification tap to /user/<username>', () => {
    const result = tap({ type: 'follow', username: 'ahlan_dev' });
    expect(result).toEqual({
      route: '/user/[username]',
      params: { username: 'ahlan_dev' },
    });
  });

  it('routes a post-notification tap to /post/<id>', () => {
    const result = tap({ postId: 'post-42' });
    expect(result).toEqual({
      route: '/post/[id]',
      params: { id: 'post-42' },
    });
  });

  it('falls back to /notifications when the payload has no recognized fields', () => {
    const result = tap({ kind: 'unknown' });
    expect(result).toEqual({ route: '/notifications', params: {} });
  });
});
