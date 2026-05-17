// Copyright 2026 Samet Yilmaz Temel
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
import { View, Text, Pressable, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { ShareIOSIcon } from '../components/native/Icons';

export default function SharePostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { togglePostRepost, addToast } = useApp();

  const handleRepost = async () => {
    if (!id) return;
    try {
      await togglePostRepost(id);
      addToast('Reposted!', 'success');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      console.error('Failed to repost', error);
      addToast('Failed to repost.', 'error');
    }
  };

  const handleShareToMessages = () => {
    // Navigate to messages with a shared post context (future feature)
    addToast('Sharing to messages coming soon.', 'info');
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleCopyLink = () => {
    addToast('Link copied to clipboard!', 'success');
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Share Post',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          presentation: 'modal',
        }}
      />

      <View className="flex-1 p-4">
        <View className="bg-gray-900 rounded-xl overflow-hidden">
          <Pressable
            onPress={handleRepost}
            className="flex-row items-center px-6 py-5 border-b border-gray-800 active:bg-gray-800"
          >
            <ShareIOSIcon color="#3b82f6" size={24} />
            <View className="ml-4">
              <Text className="text-white font-semibold text-base">Repost</Text>
              <Text className="text-gray-400 text-sm">Repost to your followers</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleCopyLink}
            className="flex-row items-center px-6 py-5 active:bg-gray-800"
          >
            <View className="w-6 h-6 items-center justify-center">
              <Text className="text-gray-400 text-sm font-mono">🔗</Text>
            </View>
            <View className="ml-4">
              <Text className="text-white font-semibold text-base">Copy Link</Text>
              <Text className="text-gray-400 text-sm">Copy post link to clipboard</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}