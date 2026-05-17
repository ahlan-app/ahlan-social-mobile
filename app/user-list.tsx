// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { getFollowerUsers, getFollowingUsers, getPostLikers, getPostReposters, getStoryViewers } from '../services/apiService';
import UserAvatar from '../components/native/UserAvatar';
import { VerifiedIcon } from '../components/native/Icons';
import type { SimpleUser } from '../types';
import type { StoryViewer } from '../services/apiService';

export default function UserListScreen() {
  const { type, userId, postId, storyId, title } = useLocalSearchParams<{
    type: 'followers' | 'following' | 'likes' | 'reposts' | 'storyViews';
    userId?: string;
    postId?: string;
    storyId?: string;
    title: string;
  }>();
  const router = useRouter();
  const { isUserBlocked, isUserFollowed, toggleFollowUser, userProfile } = useApp();

  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUsernames, setPendingUsernames] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        let result: SimpleUser[] = [];
        if (type === 'followers' && userId) {
          result = await getFollowerUsers(userId);
        } else if (type === 'following' && userId) {
          result = await getFollowingUsers(userId);
        } else if (type === 'likes' && postId) {
          result = await getPostLikers(postId);
        } else if (type === 'reposts' && postId) {
          result = await getPostReposters(postId);
        } else if (type === 'storyViews' && storyId) {
          const viewers = await getStoryViewers(storyId);
          result = viewers.map((v: StoryViewer) => ({
            id: v.user_id,
            username: v.username,
            name: v.username,
            avatar: v.avatar_url,
            isVerified: false,
          }));
        }
        if (!cancelled) {
          setUsers(result);
        }
      } catch (err) {
        console.error('Failed to fetch user list:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();
    return () => { cancelled = true; };
  }, [type, userId, postId, storyId]);

  const withPendingUsername = useCallback((username: string, add: boolean) => {
    const key = username.trim().toLowerCase();
    if (!key) return;
    setPendingUsernames((prev) => {
      const next = new Set(prev);
      if (add) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleToggleFollow = useCallback(async (username: string) => {
    const key = username.trim().toLowerCase();
    if (!key || pendingUsernames.has(key)) return;
    withPendingUsername(username, true);
    try {
      await toggleFollowUser(username);
    } finally {
      withPendingUsername(username, false);
    }
  }, [pendingUsernames, toggleFollowUser, withPendingUsername]);

  const filteredUsers = useMemo(() => {
    const seen = new Set<string>();
    const uniqueUsers: SimpleUser[] = [];

    for (const user of users) {
      if (isUserBlocked(user.username)) continue;

      const key = user.id || user.username;
      if (seen.has(key)) continue;

      seen.add(key);
      uniqueUsers.push(user);
    }

    return uniqueUsers;
  }, [users, isUserBlocked]);

  const renderItem = useCallback(
    ({ item }: { item: SimpleUser }) => {
      const usernameKey = item.username.trim().toLowerCase();
      const isFollowing = isUserFollowed(item.username);
      const isSelf = Boolean(userProfile?.id && item.id === userProfile.id);
      const isPending = pendingUsernames.has(usernameKey);

      return (
        <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
          <Pressable
            className="flex-row items-center flex-1"
            onPress={() => router.push(`/user/${item.username}`)}
          >
            <UserAvatar username={item.username} avatarUrl={item.avatar} size={48} />
            <View className="flex-1 ml-3">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-base" numberOfLines={1}>
                  @{item.username}
                </Text>
                {item.isVerified && (
                  <View className="ml-1">
                    <VerifiedIcon size={16} />
                  </View>
                )}
              </View>
              <Text className="text-gray-400 text-sm" numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </Pressable>
          {isSelf ? (
            <View className="px-3 py-1 rounded-full border border-gray-700">
              <Text className="text-gray-400 text-sm font-semibold">You</Text>
            </View>
          ) : (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleToggleFollow(item.username);
              }}
              disabled={isPending}
              className={`px-4 py-1.5 rounded-full ${
                isFollowing ? 'border border-gray-500' : 'bg-blue-500'
              } ${isPending ? 'opacity-60' : ''}`}
            >
              <Text className="text-sm font-semibold text-white">
                {isPending ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </Text>
            </Pressable>
          )}
        </View>
      );
    },
    [handleToggleFollow, isUserFollowed, pendingUsernames, router, userProfile?.id],
  );

  const keyExtractor = useCallback((item: SimpleUser) => item.id || item.username, []);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: (title as string) || 'Users',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-base">No users to show.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
