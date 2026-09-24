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

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../store/AppContext.native';
import { getFollowerUsers, getFollowingUsers, getPostLikers, getPostReposters, getStoryViewers } from '../services/apiService';
import { queryKeys } from '../services/queryKeys';
import UserAvatar from '../components/native/UserAvatar';
import { VerifiedIcon } from '../components/native/Icons';
import type { SimpleUser } from '../types';
import type { StoryViewer } from '../services/apiService';

type UserListType = 'followers' | 'following' | 'likes' | 'reposts' | 'storyViews';

const EMPTY_USERS: SimpleUser[] = [];

/** The id a list is about: a user for followers/following, a post, or a story. */
const getListSubjectId = (
  type: UserListType | undefined,
  userId?: string,
  postId?: string,
  storyId?: string,
): string | null => {
  switch (type) {
    case 'followers':
    case 'following':
      return userId || null;
    case 'likes':
    case 'reposts':
      return postId || null;
    case 'storyViews':
      return storyId || null;
    default:
      return null;
  }
};

/** Every list type is cached as plain SimpleUser[] under queryKeys.userList(type, id). */
const fetchUserList = async (type: UserListType, id: string): Promise<SimpleUser[]> => {
  switch (type) {
    case 'followers':
      return getFollowerUsers(id);
    case 'following':
      return getFollowingUsers(id);
    case 'likes':
      return getPostLikers(id);
    case 'reposts':
      return getPostReposters(id);
    case 'storyViews': {
      const viewers = await getStoryViewers(id);
      return viewers.map((v: StoryViewer) => ({
        id: v.user_id,
        username: v.username,
        name: v.username,
        avatar: v.avatar_url,
        isVerified: false,
      }));
    }
    default:
      return [];
  }
};

export default function UserListScreen() {
  const { type, userId, postId, storyId, title } = useLocalSearchParams<{
    type: UserListType;
    userId?: string;
    postId?: string;
    storyId?: string;
    title: string;
  }>();
  const router = useRouter();
  const { isUserBlocked, isUserIdBlocked, isUserFollowed, toggleFollowUser, userProfile } = useApp();

  const [pendingUsernames, setPendingUsernames] = useState<Set<string>>(new Set());

  const subjectId = getListSubjectId(type, userId, postId, storyId);
  const usersQuery = useQuery({
    queryKey: queryKeys.userList(type ?? '', subjectId ?? ''),
    queryFn: () => fetchUserList(type as UserListType, subjectId as string),
    enabled: Boolean(type && subjectId),
    // Opening a list is an explicit request for it: show the cached copy
    // instantly, but always refresh it in the background.
    refetchOnMount: 'always',
  });
  const users = usersQuery.data ?? EMPTY_USERS;
  // Spinner only when nothing is cached yet (a list without an id shows the empty state).
  const loading = Boolean(subjectId) && usersQuery.isPending && !usersQuery.data;

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
      if (isUserIdBlocked(user.id) || isUserBlocked(user.username)) continue;

      const key = user.id || user.username;
      if (seen.has(key)) continue;

      seen.add(key);
      uniqueUsers.push(user);
    }

    return uniqueUsers;
  }, [users, isUserBlocked, isUserIdBlocked]);

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
                    <VerifiedIcon color="#3b82f6" size={16} />
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
