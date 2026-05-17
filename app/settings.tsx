// Copyright 2026 Samet Yilmaz Temel
// SPDX-License-Identifier: Apache-2.0
//
// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { supabase } from '../services/supabase.native';
import { LogoutIcon, ChevronRightIcon, TrashIcon } from '../components/native/Icons';

export default function SettingsScreen() {
  const { theme, setTheme, addToast } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Permanently delete your account and all of your content. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call Supabase Edge Function for full account deletion
              const { data, error } = await supabase.functions.invoke('delete-user-account', {
                method: 'POST',
              });

              if (error || !data?.success) {
                const msg = data?.error || error?.message || 'Unknown error';
                console.error('Delete account failed:', msg);
                addToast('Failed to delete account. Please try again.', 'error');
                return;
              }

              await supabase.auth.signOut();
              addToast('Account permanently deleted. You have been signed out.', 'info');
            } catch (error) {
              console.error(error);
              addToast('Failed to delete account. Please try again.', 'error');
            }
          },
        },
      ],
    );
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
          {/* Account */}
          <Text className="text-gray-500 font-bold mb-4 ml-1">ACCOUNT</Text>
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-8">
            <Link href="/edit-profile" asChild>
              <Pressable className="flex-row items-center justify-between px-4 py-4">
                <Text className="text-white text-base">Edit Profile</Text>
                <ChevronRightIcon color="#6b7280" />
              </Pressable>
            </Link>
          </View>

          {/* Preferences */}
          <Text className="text-gray-500 font-bold mb-4 ml-1">PREFERENCES</Text>
          <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden mb-8">
            <View className="flex-row items-center justify-between px-4 py-4">
              <Text className="text-white text-base">Dark Mode</Text>
              <Switch
                value={theme === 'dark'}
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
                trackColor={{ false: '#374151', true: '#3b82f6' }}
              />
            </View>
          </View>

          {/* About */}
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

          {/* Danger Zone */}
          <Text className="text-gray-500 font-bold mb-4 ml-1">DANGER ZONE</Text>
          <View className="bg-gray-900 rounded-2xl border border-red-900/30 overflow-hidden mb-8">
            <Pressable
              onPress={handleDeleteAccount}
              className="flex-row items-center px-4 py-4"
              style={{ gap: 10 }}
            >
              <TrashIcon color="#ef4444" size={20} />
              <View className="flex-1">
                <Text className="text-red-500 font-semibold text-base">Delete Account</Text>
                <Text className="text-gray-600 text-sm mt-0.5">
                  Permanently delete your account and all content
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center bg-red-950/20 border border-red-900/50 rounded-2xl py-4"
            style={{ gap: 8 }}
          >
            <LogoutIcon color="#ef4444" size={22} />
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
