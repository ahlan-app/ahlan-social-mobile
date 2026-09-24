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

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../store/AppContext.native';
import {
  getUserPosts,
  getUserReposts,
  getSavedPosts,
  getFollowerCount,
  getFollowingCount,
} from '../../services/apiService';
import { queryKeys } from '../../services/queryKeys';
import { refreshWhileOnline } from '../../services/queryClient';
import { supabase } from '../../services/supabase.native';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { VerifiedIcon, ThreeDotsVerticalIcon } from '../../components/native/Icons';
import PostSkeleton from '../../components/native/PostSkeleton';
import type { Post } from '../../types';

const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const screenWidth = Dimensions.get('window').width;
const tileSize = (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type TabType = 'posts' | 'reposts' | 'saved';

/** Same shape/key as app/user/[username].tsx, so both screens share the cache. */
type FollowCounts = { followers: number; following: number };

const EMPTY_POSTS: Post[] = [];

// Saved posts are private to the viewer; queryKeys has no entry for them yet.
const savedPostsKey = queryKeys.savedPosts;

const fetchFollowCounts = async (userId: string): Promise<FollowCounts> => {
  const [followers, following] = await Promise.all([
    getFollowerCount(userId),
    getFollowingCount(userId),
  ]);
  return { followers, following };
};

/** Delay before refetching the saved/reposts tabs after an optimistic toggle. */
const LIST_REFRESH_DELAY_MS = 1500;

/** Stable fingerprint of a Set of ids, so effects run only on real changes. */
const setSignature = (ids: Set<string>) => Array.from(ids).sort().join(',');

// ─── Grid Tile ───────────────────────────────────

const GridTile: React.FC<{ post: Post; onPress: () => void }> = React.memo(({ post, onPress }) => {
  const isTextPost = post.media_type === 'text' || !post.media;

  return (
    <Pressable
      onPress={onPress}
      style={{ width: tileSize, height: tileSize, marginRight: GRID_GAP, marginBottom: GRID_GAP }}
    >
      {isTextPost ? (
        <View className="flex-1 p-2 justify-center bg-gray-800">
          <Text className="text-white text-xs" numberOfLines={6}>
            {post.content}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: post.media_preview_url || post.media }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      )}
    </Pressable>
  );
});

// ─── Profile Screen ──────────────────────────────

export default function ProfileScreen() {
  const {
    userProfile,
    refreshAllData,
    addToast,
    followedUsernames,
    savedPosts: savedPostIds,
    repostedPosts: repostedPostIds,
    isUserBlocked,
  } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const myId = userProfile?.id || '';

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [refreshing, setRefreshing] = useState(false);

  // ─── Cached queries (shared keys with app/user/[username].tsx) ──

  const postsQuery = useQuery({
    queryKey: queryKeys.userPosts(myId),
    queryFn: () => getUserPosts(myId),
    enabled: !!myId,
  });
  const repostsQuery = useQuery({
    queryKey: queryKeys.userReposts(myId),
    queryFn: () => getUserReposts(myId),
    enabled: !!myId,
  });
  const savedQuery = useQuery({
    queryKey: savedPostsKey(myId),
    queryFn: () => getSavedPosts(myId),
    enabled: !!myId,
  });
  const countsQuery = useQuery({
    queryKey: queryKeys.followCounts(myId),
    queryFn: () => fetchFollowCounts(myId),
    enabled: !!myId,
  });

  const posts = postsQuery.data ?? EMPTY_POSTS;
  // Posts by blocked accounts (either direction) are hidden at render time,
  // so a block change applies instantly without a refetch.
  const reposts = useMemo(
    () => (repostsQuery.data ?? EMPTY_POSTS).filter(p => !isUserBlocked(p.username)),
    [repostsQuery.data, isUserBlocked],
  );
  const savedPosts = useMemo(
    () => (savedQuery.data ?? EMPTY_POSTS).filter(p => !isUserBlocked(p.username)),
    [savedQuery.data, isUserBlocked],
  );
  const followerCount = countsQuery.data?.followers ?? 0;
  const followingCount = countsQuery.data?.following ?? 0;

  const anyError = postsQuery.isError || repostsQuery.isError || savedQuery.isError || countsQuery.isError;
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;
  useEffect(() => {
    // Once when an error appears, not on every re-render.
    if (anyError) addToastRef.current('Failed to load profile data', 'error');
  }, [anyError]);

  // Following count follows my follow/unfollow actions instantly; the server
  // count comes back through the followCounts invalidation in AppContext.
  const seenFollowedRef = useRef(followedUsernames);
  useEffect(() => {
    if (seenFollowedRef.current === followedUsernames) return;
    seenFollowedRef.current = followedUsernames;
    if (!myId) return;
    queryClient.setQueryData<FollowCounts>(queryKeys.followCounts(myId), prev => (
      prev ? { ...prev, following: followedUsernames.size } : prev
    ));
  }, [followedUsernames, myId, queryClient]);

  // Saving/unsaving or reposting elsewhere changes those tabs: refetch them.
  // Those toggles are optimistic, so wait for the server write to land first.
  const savedSignature = useMemo(() => setSignature(savedPostIds), [savedPostIds]);
  const repostedSignature = useMemo(() => setSignature(repostedPostIds), [repostedPostIds]);
  const seenSavedRef = useRef(savedSignature);
  const seenRepostedRef = useRef(repostedSignature);
  useEffect(() => {
    if (seenSavedRef.current === savedSignature) return;
    seenSavedRef.current = savedSignature;
    if (!myId) return;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: savedPostsKey(myId) });
    }, LIST_REFRESH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [savedSignature, myId, queryClient]);
  useEffect(() => {
    if (seenRepostedRef.current === repostedSignature) return;
    seenRepostedRef.current = repostedSignature;
    if (!myId) return;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userReposts(myId) });
    }, LIST_REFRESH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [repostedSignature, myId, queryClient]);

  // Realtime: own posts
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`profile-posts-${myId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${myId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(myId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.userReposts(myId) });
          void queryClient.invalidateQueries({ queryKey: savedPostsKey(myId) });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myId, queryClient]);

  // Realtime: follow counts
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`profile-follows-${myId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const f = payload.new as any;
          const o = payload.old as any;
          if (f?.follower_id === myId || f?.followed_id === myId ||
              o?.follower_id === myId || o?.followed_id === myId) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.followCounts(myId) });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myId, queryClient]);

  const { refetch: refetchPosts } = postsQuery;
  const { refetch: refetchReposts } = repostsQuery;
  const { refetch: refetchSaved } = savedQuery;
  const { refetch: refetchCounts } = countsQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWhileOnline(() => Promise.all([
        myId ? refetchPosts() : null,
        myId ? refetchReposts() : null,
        myId ? refetchSaved() : null,
        myId ? refetchCounts() : null,
        refreshAllData(),
      ]));
    } finally {
      setRefreshing(false);
    }
  }, [myId, refetchPosts, refetchReposts, refetchSaved, refetchCounts, refreshAllData]);

  const currentData = activeTab === 'posts' ? posts : activeTab === 'reposts' ? reposts : savedPosts;
  const currentQuery = activeTab === 'posts' ? postsQuery : activeTab === 'reposts' ? repostsQuery : savedQuery;
  // Skeleton only while nothing is cached for this tab yet.
  const isLoading = currentQuery.isPending;

  const handlePostPress = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <GridTile post={item} onPress={() => handlePostPress(item)} />
  ), [handlePostPress]);

  // All hooks are above this early return (rules of hooks).
  if (!userProfile) return null;

  // ─── Profile Header ────────────────────────────

  // An element (not a component defined in render), so the header is not
  // remounted every time a background refresh re-renders the screen.
  const profileHeader = (
    <View>
      <View className="px-4 py-3 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-white font-bold text-xl">@{userProfile.username}</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          className="p-2"
          hitSlop={8}
          accessibilityLabel="Settings"
        >
          <ThreeDotsVerticalIcon color="#fff" size={22} />
        </Pressable>
      </View>

      <View className="p-4">
        <View className="flex-row items-center">
          <UserAvatar
            username={userProfile.username}
            avatarUrl={userProfile.profilePicture}
            size={80}
          />
          <View className="flex-1 flex-row justify-around ml-4">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{posts.length}</Text>
              <Text className="text-gray-500 text-sm">Posts</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/user-list', params: { type: 'followers', userId: userProfile.id, title: 'Followers' } })}
              className="items-center"
            >
              <Text className="text-white font-bold text-lg">{followerCount}</Text>
              <Text className="text-gray-500 text-sm">Followers</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: '/user-list', params: { type: 'following', userId: userProfile.id, title: 'Following' } })}
              className="items-center"
            >
              <Text className="text-white font-bold text-lg">{followingCount}</Text>
              <Text className="text-gray-500 text-sm">Following</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="text-white text-xl font-bold">@{userProfile.username}</Text>
            {userProfile.isVerified && <VerifiedIcon color="#3b82f6" size={18} />}
          </View>
          <Text className="text-gray-400">{userProfile.name}</Text>
          {userProfile.bio ? (
            <View className="mt-2">
              <RenderUserContent content={userProfile.bio} className="text-white" />
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push('/settings')}
          className="mt-4 bg-gray-800 py-2 rounded-full items-center"
        >
          <Text className="text-white font-semibold">Edit Profile</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-800">
        {(['posts', 'reposts', 'saved'] as TabType[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center ${activeTab === tab ? 'border-b-2 border-white' : ''}`}
          >
            <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-white' : 'text-gray-500'}`}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // ─── Render ────────────────────────────────────

  const emptyMessage = activeTab === 'posts'
    ? 'No posts yet.'
    : activeTab === 'reposts'
    ? "You haven't reposted anything yet."
    : "You haven't saved any posts yet.";

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        data={currentData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={profileHeader}
        ListEmptyComponent={
          isLoading ? (
            <View className="py-4">
              <PostSkeleton />
              <PostSkeleton />
            </View>
          ) : (
            <View className="py-20 items-center">
              <Text className="text-gray-500 text-lg">{emptyMessage}</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
