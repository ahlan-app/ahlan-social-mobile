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
import { View, Text, TextInput, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { SendIcon } from '../components/native/Icons';
import { getPostById, searchUsers, sendMessage } from '../services/apiService';
import { supabase } from '../services/supabase.native';
import UserAvatar from '../components/native/UserAvatar';
import { VerifiedIcon } from '../components/native/Icons';
import type { Post } from '../types';

/**
 * Share a post to a conversation (DM). In-app only — no external sharing.
 */
export default function SharePostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useApp();

  const [post, setPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPostById(id).then((p) => setPost(p ?? null)).catch(() => setPost(null));
  }, [id]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const users = await searchUsers(text.trim());
      setResults(users || []);
    } catch (error) {
      console.error('User search error:', error);
      setResults([]);
    }
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
          title: 'Send to Messages',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          presentation: 'modal',
        }}
      />

      <View className="flex-1 p-4">
        <TextInput
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search people to share with..."
          placeholderTextColor="#6b7280"
          autoFocus
          className="bg-gray-900 text-white rounded-xl px-4 py-3 mb-3 border border-gray-800"
        />
        {sending ? (
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text className="text-gray-500 text-center mt-10">
                {searchQuery.trim().length < 2
                  ? 'Type at least 2 characters to search'
                  : 'No users found'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSendToUser(item)}
                className="flex-row items-center px-2 py-3 active:bg-gray-900 rounded-xl"
              >
                <UserAvatar username={item.username} avatarUrl={item.avatar_url || item.avatar || null} size={44} />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Text className="text-white font-semibold">@{item.username}</Text>
                    {item.is_verified && <VerifiedIcon color="#3b82f6" size={14} />}
                  </View>
                  {item.full_name ? (
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>{item.full_name}</Text>
                  ) : null}
                </View>
                <View className="bg-blue-600 p-2.5 rounded-full">
                  <SendIcon color="#fff" size={16} />
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
