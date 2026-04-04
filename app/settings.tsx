import React from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { supabase } from '../services/supabase.native';
import { LogoutIcon, ChevronRightIcon } from '../components/native/Icons';

export default function SettingsScreen() {
  const { theme, setTheme } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Router redirection is handled by _layout's listener
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Settings',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />

      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          <Text className="text-gray-500 font-bold mb-4 ml-1">PREFERENCES</Text>
          
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-8">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-800">
              <Text className="text-white text-base">Dark Mode</Text>
              <Switch 
                value={theme === 'dark'} 
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')} 
                trackColor={{ false: '#374151', true: '#3b82f6' }}
              />
            </View>
          </View>

          <Text className="text-gray-500 font-bold mb-4 ml-1">ABOUT</Text>
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-8">
            <Link href="/privacy-policy" asChild>
              <Pressable className="flex-row items-center justify-between px-4 py-4 border-b border-gray-800">
                <Text className="text-white text-base">Privacy Policy</Text>
                <ChevronRightIcon color="#6b7280" />
              </Pressable>
            </Link>
            <Link href="/terms" asChild>
              <Pressable className="flex-row items-center justify-between px-4 py-4">
                <Text className="text-white text-base">Terms of Service</Text>
                <ChevronRightIcon color="#6b7280" />
              </Pressable>
            </Link>
          </View>

          <Pressable 
            onPress={handleLogout}
            className="flex-row items-center justify-center bg-red-950/20 border border-red-900/50 rounded-2xl py-4 mt-12"
          >
            <LogoutIcon color="#ef4444" className="mr-3" />
            <Text className="text-red-500 font-bold text-lg">Log Out</Text>
          </Pressable>

          <View className="mt-12 items-center">
            <Text className="text-gray-700 text-xs">AHLAN SOCIAL MOBILE v1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
