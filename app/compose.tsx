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

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useApp } from '../store/AppContext.native';
import { cleanHtml } from '../services/apiService';
import UserAvatar from '../components/native/UserAvatar';
import type { Post } from '../types';

const MAX_CHARS = 280;

export default function ComposeScreen() {
  const { mediaUri, mediaType: paramMediaType } = useLocalSearchParams<{
    mediaUri?: string;
    mediaType?: string;
  }>();
  const router = useRouter();
  const { userProfile, addProfilePost, addToast } = useApp();
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const charCount = content.length;
  const canPost =
    (content.trim().length > 0 || mediaUri) &&
    !isPosting &&
    charCount <= MAX_CHARS;

  const handlePost = async () => {
    if (!canPost || !userProfile) return;
    setIsPosting(true);

    try {
      const cleanContent = cleanHtml(content.trim());

      const newPost: Post = {
        id: `temp-${Date.now()}`,
        content: cleanContent,
        username: userProfile.username,
        name: userProfile.name || userProfile.username,
        avatar: userProfile.profilePicture || null,
        timestamp: new Date().toISOString(),
        media: mediaUri || undefined,
        media_type: mediaUri ? 'image' : 'text',
        likes: 0,
        reposts: 0,
        replies: 0,
        isVerified: userProfile.isVerified || false,
      };

      await addProfilePost(newPost);
      setTimeout(() => router.back(), 400);
    } catch (error) {
      console.error('Failed to publish post', error);
      addToast('Failed to create post.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const charProgress = Math.min(charCount / MAX_CHARS, 1);
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      {/* Header */}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-900">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handlePost}
          disabled={!canPost}
          className={`px-6 py-1.5 rounded-full ${canPost ? 'bg-blue-500' : 'bg-blue-500/40'}`}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className={`font-bold ${canPost ? 'text-white' : 'text-white/60'}`}>
              Share
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Compose area */}
          <View className="p-4 flex-row" style={{ gap: 12 }}>
            <UserAvatar
              username={userProfile?.username || ''}
              avatarUrl={userProfile?.profilePicture}
              size={45}
            />
            <View className="flex-1">
              <TextInput
                ref={inputRef}
                multiline
                autoFocus
                className="text-white text-lg"
                placeholder="What's happening?"
                placeholderTextColor="#6b7280"
                value={content}
                onChangeText={setContent}
                style={{ textAlignVertical: 'top', minHeight: 100 }}
              />
            </View>
          </View>

          {/* Media preview */}
          {mediaUri && (
            <View className="px-4 pb-4">
              <View className="rounded-2xl overflow-hidden">
                <Image
                  source={{ uri: mediaUri }}
                  style={{ width: '100%', aspectRatio: 1 }}
                  contentFit="cover"
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Toolbar — poll creation removed per customer feedback */}
        <View className="border-t border-gray-900 px-4 py-2 flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 16 }} />

          {/* Character counter */}
          {charCount > 0 && (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text
                className={`text-sm ${
                  isOverLimit
                    ? 'text-red-500'
                    : isNearLimit
                    ? 'text-yellow-500'
                    : 'text-gray-500'
                }`}
              >
                {MAX_CHARS - charCount}
              </Text>
              {/* Simple progress indicator */}
              <View
                className="w-6 h-6 rounded-full border-2"
                style={{
                  borderColor: isOverLimit
                    ? '#ef4444'
                    : isNearLimit
                    ? '#eab308'
                    : '#3b82f6',
                }}
              >
                <View
                  className="rounded-full"
                  style={{
                    width: `${charProgress * 100}%`,
                    height: '100%',
                    backgroundColor: isOverLimit
                      ? '#ef4444'
                      : isNearLimit
                      ? '#eab308'
                      : '#3b82f6',
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
