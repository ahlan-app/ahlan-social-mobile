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
  setNotificationHandler: jest.fn(),
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
