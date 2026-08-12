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

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, TextInput, FlatList, ActivityIndicator, Clipboard } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { ShareIOSIcon } from '../components/native/Icons';
import { getPostById, searchUsers, sendMessage } from '../services/apiService';
import type { Post } from '../types';

export default function SharePostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { togglePostRepost, addToast } = useApp();

  const [post, setPost] = useState<Post | null>(null);
  const [sharingToMessages, setSharingToMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPostById(id).then((p) => setPost(p ?? null)).catch(() => setPost(null));
  }, [id]);

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

  const handleCopyLink = async () => {
    if (!id) return;
    try {
      await Clipboard.setString(`https://ahlan.social/post/${id}`);
      addToast('Link copied to clipboard!', 'success');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      console.error('Failed to copy link', error);
      addToast('Failed to copy link.', 'error');
    }
  };

  const openShareToMessages = async () => {
    setSharingToMessages(true);
    setSearchQuery('');
    setResults([]);
    const { data: { user } } = await import('../services/supabase.native').then(m => m.supabase.auth.getUser());
    setCurrentUserId(user?.id ?? null);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    const users = await searchUsers(text.trim());
    setResults(users);
  };

  const handleSendToUser = async (receiver: any) => {
    if (!post || !currentUserId || sending) return;
    setSending(true);
    try {
      await sendMessage({
        sender_id: currentUserId,
        receiver_id: receiver.id,
        post,
      });
      addToast(`Post shared with @${receiver.username}!`, 'success');
      setSharingToMessages(false);
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      console.error('Failed to share post to messages', error);
      addToast('Failed to share post.', 'error');
    } finally {
      setSending(false);
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

      {!sharingToMessages ? (
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
              onPress={openShareToMessages}
              className="flex-row items-center px-6 py-5 border-b border-gray-800 active:bg-gray-800"
            >
              <View className="w-6 h-6 items-center justify-center">
                <Text className="text-blue-400 text-sm font-bold">✉</Text>
              </View>
              <View className="ml-4">
                <Text className="text-white font-semibold text-base">Send to Messages</Text>
                <Text className="text-gray-400 text-sm">Share this post in a direct message</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleCopyLink}
              className="flex-row items-center px-6 py-5 active:bg-gray-800"
            >
              <View className="w-6 h-6 items-center justify-center">
                <Text className="text-gray-400 text-sm font-bold">#</Text>
              </View>
              <View className="ml-4">
                <Text className="text-white font-semibold text-base">Copy Link</Text>
                <Text className="text-gray-400 text-sm">Copy post link to clipboard</Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-1 p-4">
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search people to share with..."
            placeholderTextColor="#6b7280"
            autoFocus
            className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-3"
          />
          {sending ? (
            <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSendToUser(item)}
                  className="flex-row items-center px-4 py-3 border-b border-gray-800 active:bg-gray-800"
                >
                  <View className="flex-1">
                    <Text className="text-white font-semibold">@{item.username}</Text>
                    {item.full_name ? (
                      <Text className="text-gray-400 text-sm">{item.full_name}</Text>
                    ) : null}
                  </View>
                  <Text className="text-blue-400 text-sm font-semibold">Send</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                searchQuery.trim().length >= 2 ? (
                  <Text className="text-gray-500 text-center mt-8">No users found.</Text>
                ) : (
                  <Text className="text-gray-500 text-center mt-8">Type at least 2 characters to search.</Text>
                )
              }
            />
          )}
          <Pressable
            onPress={() => setSharingToMessages(false)}
            className="mt-4 items-center py-3"
          >
            <Text className="text-gray-400">Cancel</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
