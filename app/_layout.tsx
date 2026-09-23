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

import "../global.css";
import React, { useCallback, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  DancingScript_700Bold
} from '@expo-google-fonts/dancing-script';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Fredoka_500Medium } from '@expo-google-fonts/fredoka';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AppProvider, useApp } from '../store/AppContext.native';
import { supabase } from '../services/supabase.native';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  setBadgeCount,
} from '../services/notifications';
import { consumeNotificationResponse } from '../services/notificationResponse';
import { resolveRoutePath, type NotificationRoute } from '../services/notificationRouting';
import ToastContainer from '../components/native/Toast';

// Render errors show expo-router's error screen (with Retry) instead of
// closing the app.
export { ErrorBoundary } from 'expo-router';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { userProfile, theme } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const [fontsLoaded, fontError] = useFonts({
    DancingScript_700Bold,
    Anton_400Regular,
    Fredoka_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Auth routing — registered once after fonts load, not on every navigation
  useEffect(() => {
    if (!fontsLoaded) return;

    // Initial session check + redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === '(auth)';
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)');
      }
    });

    // Auth state change listener — registered ONCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only leave the auth screens on SIGNED_IN; supabase can re-emit it while
      // the user is already inside the app, which must not reset navigation.
      if (event === 'SIGNED_IN' && segmentsRef.current[0] === '(auth)') {
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fontsLoaded]); // segments removed — listener is stable across navigations

  // Push notifications registration
  useEffect(() => {
    if (!userProfile?.id) return;

    registerForPushNotifications().then(async (token) => {
      if (token) {
        await savePushToken(userProfile.id, token);
      }
    });

    // Clear badge on app open
    setBadgeCount(0);
  }, [userProfile?.id]);

  // Notification tap handler — route to relevant screen. Launcher icon taps
  // on some Android launchers arrive as fake responses; consumeNotificationResponse
  // filters those out and handles each real tap only once, so resuming the app
  // keeps the last screen instead of opening Notifications.
  const openNotificationRoute = useCallback((target: NotificationRoute | null) => {
    if (!target || !target.route) return;
    if (pathnameRef.current === resolveRoutePath(target.route, target.params)) return;
    router.push({ pathname: target.route, params: target.params } as never);
  }, [router]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      consumeNotificationResponse(response).then(openNotificationRoute).catch(() => {});
    });
    return () => subscription.remove();
  }, [openNotificationRoute]);

  // Cold start from a notification tap: handled once the user is signed in.
  const coldStartChecked = useRef(false);
  useEffect(() => {
    if (!fontsLoaded || !userProfile?.id || coldStartChecked.current) return;
    coldStartChecked.current = true;
    let last: Notifications.NotificationResponse | null = null;
    try {
      last = Notifications.getLastNotificationResponse();
    } catch {
      last = null;
    }
    consumeNotificationResponse(last).then(openNotificationRoute).catch(() => {});
  }, [fontsLoaded, userProfile?.id, openNotificationRoute]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      <Stack.Screen name="messages" options={{ presentation: 'modal' }} />
      <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
      <Stack.Screen name="story-viewer" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="story-create" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <RootLayoutNav />
          <ToastContainer />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
