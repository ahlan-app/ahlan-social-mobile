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

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { supabase } from '../services/supabase.native';
import UserAvatar from '../components/native/UserAvatar';
import type { Notification } from '../types';

const getNotificationText = (n: Notification): string => {
  switch (n.type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'follow': return 'started following you';
    case 'comment_like': return 'liked your comment';
    case 'repost': return 'reposted your post';
    case 'mention': return 'mentioned you';
    case 'story_like': return 'liked your story';
    default: return 'interacted with you';
  }
};

const getTimeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
};

export default function NotificationsScreen() {
  const { notifications, userProfile, markAllNotificationsAsRead } = useApp();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      markAllNotificationsAsRead(userProfile.id);
    }
  }, [userProfile?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userProfile?.id) await markAllNotificationsAsRead(userProfile.id);
    setRefreshing(false);
  }, [userProfile?.id]);

  const handlePress = useCallback((n: Notification) => {
    if (n.type === 'follow') {
      router.push(`/user/${n.sender.username}`);
    } else if (n.post) {
      router.push(`/post/${n.post.id}`);
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handlePress(item)}
      className={`flex-row items-center px-4 py-3 ${!item.is_read ? 'bg-blue-950/20' : ''}`}
    >
      <UserAvatar username={item.sender.username} avatarUrl={item.sender.avatar_url} size={44} />
      <View className="flex-1 ml-3">
        <Text className="text-white">
          <Text className="font-bold">@{item.sender.username}</Text>
          {' '}{getNotificationText(item)}
        </Text>
        {item.content && (
          <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>{item.content}</Text>
        )}
        <Text className="text-gray-600 text-xs mt-1">{getTimeAgo(item.created_at)}</Text>
      </View>
    </Pressable>
  ), [handlePress]);

  const data = notifications || [];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View className="py-20 items-center">
            <Text className="text-gray-400 text-lg text-center">You're all caught up!</Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              New activity and interactions will show up here.
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="border-b border-gray-900" />}
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
