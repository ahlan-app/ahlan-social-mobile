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

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useApp } from '../../store/AppContext.native';
import { getPostById } from '../../services/apiService';
import { queryKeys } from '../../services/queryKeys';
import { refreshWhileOnline } from '../../services/queryClient';
import { supabase } from '../../services/supabase.native';
import PostCard from '../../components/native/PostCard';
import type { Post } from '../../types';

// Cached lists that can already hold the post (feed pages, profile grids,
// explore) — used to open a post instantly when it was just on screen.
const POST_LIST_QUERY_ROOTS = ['feed', 'userPosts', 'userReposts', 'savedPosts', 'trending'] as const;

type CachedPostHit = { post: Post; updatedAt: number };

const isCachedPost = (value: unknown, postId: string): value is Post => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Post>;
  return candidate.id === postId
    && typeof candidate.username === 'string'
    && typeof candidate.content === 'string';
};

/** Finds the post in Post[], { pages: [...] } (infinite) or { posts: [...] } shapes. */
const findPostInData = (data: unknown, postId: string, depth = 0): Post | undefined => {
  if (depth > 4 || !data || typeof data !== 'object') return undefined;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (isCachedPost(item, postId)) return item;
      if (item && typeof item === 'object' && (Array.isArray(item) || 'posts' in item || 'pages' in item)) {
        const found = findPostInData(item, postId, depth + 1);
        if (found) return found;
      }
    }
    return undefined;
  }
  const container = data as { pages?: unknown; posts?: unknown };
  return findPostInData(container.pages, postId, depth + 1)
    ?? findPostInData(container.posts, postId, depth + 1);
};

/** The freshest copy of the post held by any cached list query. */
const findPostInQueryCache = (queryClient: QueryClient, postId: string): CachedPostHit | undefined => {
  let best: CachedPostHit | undefined;
  for (const root of POST_LIST_QUERY_ROOTS) {
    for (const [queryKey, data] of queryClient.getQueriesData({ queryKey: [root] })) {
      const post = findPostInData(data, postId);
      if (!post) continue;
      const updatedAt = queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0;
      if (!best || updatedAt > best.updatedAt) best = { post, updatedAt };
    }
  }
  return best;
};

/**
 * getPostById resolves undefined for "not found" and for network errors alike.
 * Only a confirmed missing row becomes null ("Post not found"); any other
 * failure throws, so a cached copy stays on screen while offline.
 */
const fetchPostDetail = async (postId: string): Promise<Post | null> => {
  const post = await getPostById(postId);
  if (post) return post;
  const { data, error } = await supabase.from('posts').select('id').eq('id', postId).maybeSingle();
  // 22P02 = the id is not a valid uuid (e.g. a malformed deep link): it cannot exist.
  if (error?.code === '22P02') return null;
  if (error) throw error;
  if (data) throw new Error('Post could not be loaded');
  return null;
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isUserBlocked } = useApp();

  const [refreshing, setRefreshing] = useState(false);

  const postId = typeof id === 'string' ? id : '';
  // Looked up lazily (only when the post itself is not cached) and at most
  // once per render: initialData runs before initialDataUpdatedAt.
  let seed: CachedPostHit | undefined | null = null;
  const getSeed = () => {
    if (seed === null) seed = postId ? findPostInQueryCache(queryClient, postId) : undefined;
    return seed;
  };

  const postQuery = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => fetchPostDetail(postId),
    enabled: Boolean(postId),
    initialData: () => getSeed()?.post,
    initialDataUpdatedAt: () => getSeed()?.updatedAt,
    // Show the cached copy instantly, but always refresh counts in the background.
    refetchOnMount: 'always',
  });
  const post = postQuery.data ?? null;
  const loading = Boolean(postId) && postQuery.isPending && !postQuery.data;

  const refetchPost = postQuery.refetch;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWhileOnline(() => refetchPost());
    } catch (error) {
      console.error('Failed to load post', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPost]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Post',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Post',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400 text-lg">Post not found.</Text>
          <Text className="text-gray-600 text-sm mt-2">
            It may have been deleted or is no longer available.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isUserBlocked(post.username)) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Post',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400 text-lg">This post is unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Post',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <PostCard
          post={post}
          onViewProfile={(username) => router.push(`/user/${username}`)}
          onViewComments={(postId) => router.push(`/comments/${postId}`)}
          onViewLikers={(postId) => router.push({ pathname: '/user-list', params: { type: 'likes', postId, title: 'Likes' } })}
          onViewReposters={(postId) => router.push({ pathname: '/user-list', params: { type: 'reposts', postId, title: 'Reposts' } })}
          onSharePost={(p) => router.push({ pathname: '/share-post', params: { id: p.id } })}
          onEditPost={(p) => router.push({ pathname: '/edit-post', params: { id: p.id } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
