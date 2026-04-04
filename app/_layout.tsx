import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { AppProvider, useApp } from '../store/AppContext.native';
import { supabase } from '../services/supabase.native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { userProfile, theme } = useApp();
  const segments = useSegments();
  const router = useRouter();

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

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const inAuthGroup = segments[0] === '(auth)';

      if (!session && !inAuthGroup) {
        // Redirect to the login page if the user is not signed in
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        // Redirect to the tabs page if the user is signed in
        router.replace('/(tabs)');
      }
    };

    if (fontsLoaded) {
      checkAuth();
    }

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fontsLoaded, segments]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
