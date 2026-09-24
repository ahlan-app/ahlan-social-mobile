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
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../store/AppContext.native';
import {
  getUserProfile,
  getUserPosts,
  getUserReposts,
  getFollowerCount,
  getFollowingCount,
  setUserVerified,
  reportUser,
} from '../../services/apiService';
import { queryKeys } from '../../services/queryKeys';
import { QUERY_STALE_TIME, refreshWhileOnline } from '../../services/queryClient';
import { supabase } from '../../services/supabase.native';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { VerifiedIcon, BlockIcon } from '../../components/native/Icons';
import PostSkeleton from '../../components/native/PostSkeleton';
import type { Post, UserProfile as UserProfileType } from '../../types';

const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const screenWidth = Dimensions.get('window').width;
const tileSize = (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type TabType = 'posts' | 'reposts';

/** Cached under queryKeys.followCounts(userId); shared with the profile tab. */
type FollowCounts = { followers: number; following: number };

const fetchFollowCounts = async (userId: string): Promise<FollowCounts> => {
  const [followers, following] = await Promise.all([
    getFollowerCount(userId),
    getFollowingCount(userId),
  ]);
  return { followers, following };
};

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

// Report-reason list is shared with the report-flow test suite.
// See `services/reportReasons.ts` for the full contract.
const REPORT_REASONS = [
  "It's spam",
  'Hate speech or symbols',
  'Harassment or bullying',
  'Pretending to be someone else',
  'False information',
  'Nudity or sexual activity',
  "I just don't like their content",
];

const EMPTY_POSTS: Post[] = [];

const markVerified = (list: Post[] | undefined, username: string, isVerified: boolean) =>
  list?.map(p => (p.username === username ? { ...p, isVerified } : p));

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    userProfile: myProfile,
    isUserFollowed,
    toggleFollowUser,
    isBlockedByMe,
    hasBlockedMe,
    refreshBlockRelations,
    toggleBlockUser,
    addToast,
    isAdmin,
    isUserBlocked,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportMenuVisible, setReportMenuVisible] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);

  const isFollowing = isUserFollowed(username || '');
  const isBlocked = isBlockedByMe(username);              // I blocked them
  const blockedMe = !isBlocked && hasBlockedMe(username); // they blocked me
  const isMyProfile = myProfile?.username === username;
  const [blockPending, setBlockPending] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Cached queries ────────────────────────────
  // Cached data (memory or disk) renders instantly; stale data is refreshed
  // in the background. Block filtering happens at render time below.

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(username || ''),
    queryFn: async (): Promise<UserProfileType | null> => {
      // getUserProfile throws on network errors (cached data is kept) and
      // resolves null only when the account does not exist.
      return getUserProfile(username as string, { force: true });
    },
    enabled: !!username,
    // A "not found" result is never fresh: re-check on every visit.
    staleTime: query => (query.state.data ? QUERY_STALE_TIME : 0),
  });
  const profile = profileQuery.data ?? null;
  const profileId = profile?.id;

  // Posts are hidden while either side has a block, so don't fetch them.
  // Blocks made by the other side are only known after a refresh of the block
  // relations; nothing from this profile is shown before that check.
  const [relationsChecked, setRelationsChecked] = useState(false);
  const canLoadPosts = relationsChecked && !!profileId && !isBlocked && !blockedMe;
  const postsQuery = useQuery({
    queryKey: queryKeys.userPosts(profileId || ''),
    queryFn: () => getUserPosts(profileId as string),
    enabled: canLoadPosts,
  });
  const repostsQuery = useQuery({
    queryKey: queryKeys.userReposts(profileId || ''),
    queryFn: () => getUserReposts(profileId as string),
    enabled: canLoadPosts,
  });
  const countsQuery = useQuery({
    queryKey: queryKeys.followCounts(profileId || ''),
    queryFn: () => fetchFollowCounts(profileId as string),
    enabled: !!profileId && !blockedMe,
  });

  const posts = postsQuery.data ?? EMPTY_POSTS;
  // Their reposts can include accounts blocked in either direction: hide
  // those at render time so a block change applies without a refetch.
  const reposts = useMemo(
    () => (repostsQuery.data ?? EMPTY_POSTS).filter(p => !isUserBlocked(p.username)),
    [repostsQuery.data, isUserBlocked],
  );
  const followerCount = countsQuery.data?.followers ?? 0;
  const followingCount = countsQuery.data?.following ?? 0;

  // Learn about blocks made by the other side as soon as the profile opens.
  useEffect(() => {
    if (!username) return;
    setRelationsChecked(false);
    refreshBlockRelations().finally(() => {
      if (mountedRef.current) setRelationsChecked(true);
    });
  }, [username, refreshBlockRelations]);

  // Realtime follow count updates
  useEffect(() => {
    if (!profileId) return;
    const countsKey = queryKeys.followCounts(profileId);
    const channel = supabase
      .channel(`user-profile-follows-${profileId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const f = payload.new as any;
          const o = payload.old as any;
          if (
            f?.follower_id === profileId || f?.followed_id === profileId ||
            o?.follower_id === profileId || o?.followed_id === profileId
          ) {
            void queryClient.invalidateQueries({ queryKey: countsKey });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, queryClient]);

  const { refetch: refetchProfile } = profileQuery;
  const { refetch: refetchPosts } = postsQuery;
  const { refetch: refetchReposts } = repostsQuery;
  const { refetch: refetchCounts } = countsQuery;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      void refreshBlockRelations();
      await refreshWhileOnline(() => Promise.all([
        refetchProfile(),
        canLoadPosts ? refetchPosts() : null,
        canLoadPosts ? refetchReposts() : null,
        profileId && !blockedMe ? refetchCounts() : null,
      ]));
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [refreshBlockRelations, refetchProfile, refetchPosts, refetchReposts, refetchCounts, canLoadPosts, profileId, blockedMe]);

  const handleToggleFollow = useCallback(async () => {
    if (!username || !profileId || isMyProfile || followPending || isBlocked || blockedMe) return;
    const wasFollowing = isFollowing;
    const countsKey = queryKeys.followCounts(profileId);

    setFollowPending(true);
    // Optimistic follower count; an in-flight fetch must not overwrite it.
    await queryClient.cancelQueries({ queryKey: countsKey });
    queryClient.setQueryData<FollowCounts>(countsKey, prev => (
      prev ? { ...prev, followers: Math.max(0, prev.followers + (wasFollowing ? -1 : 1)) } : prev
    ));

    try {
      await toggleFollowUser(username);
    } finally {
      // Resolves once the real counts are back (never rejects).
      await queryClient.invalidateQueries({ queryKey: countsKey });
      if (mountedRef.current) setFollowPending(false);
    }
  }, [username, profileId, isMyProfile, followPending, isBlocked, blockedMe, isFollowing, toggleFollowUser, queryClient]);

  const runToggleBlock = useCallback(async (nextBlocked: boolean) => {
    if (!profile?.id || blockPending) return;
    const { id, username: targetName } = profile;
    setBlockPending(true);
    try {
      const ok = await toggleBlockUser(targetName, id);
      if (!ok || !mountedRef.current) return;
      addToast(
        `@${targetName} has been ${nextBlocked ? 'blocked' : 'unblocked'}.`,
        nextBlocked ? 'info' : 'success',
      );
      // Blocked posts are hidden at render time (data = EMPTY_POSTS), so the
      // cached lists are kept; after an unblock they are refetched.
      if (nextBlocked) {
        setActiveTab('posts');
      } else {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.profile(username || targetName) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.userReposts(id) }),
        ]);
      }
      // The server removed follows in both directions.
      await queryClient.invalidateQueries({ queryKey: queryKeys.followCounts(id) });
    } finally {
      if (mountedRef.current) setBlockPending(false);
    }
  }, [profile, username, blockPending, toggleBlockUser, addToast, queryClient]);

  const handleBlockToggle = () => {
    setMenuVisible(false);
    if (isBlocked) {
      void runToggleBlock(false);
      return;
    }
    // Let the menu modal finish closing before the native alert opens.
    setTimeout(() => {
      Alert.alert(
        `Block @${username}?`,
        "They won't be able to find your profile, posts, or story, and they won't be notified.",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => { void runToggleBlock(true); } },
        ],
      );
    }, 300);
  };

  const handleReport = async (reason: string) => {
    setReportMenuVisible(false);
    setMenuVisible(false);
    if (!profile?.id) {
      addToast('Unable to report — user not loaded.', 'error');
      return;
    }
    const success = await reportUser(profile.id, reason);
    if (success) {
      addToast('Report submitted. Thank you for your feedback.', 'success');
    } else {
      addToast('Failed to submit report. Please try again.', 'error');
    }
  };

  // The badge only changes after the server confirms it, so it never flips back.
  const applyVerify = useCallback(async (next: boolean) => {
    if (!profile) return;
    const { id, username: targetName } = profile;
    const keys = {
      profile: queryKeys.profile(username || targetName),
      posts: queryKeys.userPosts(id),
      reposts: queryKeys.userReposts(id),
    };
    setVerifyPending(true);
    try {
      const stored = await setUserVerified(id, targetName, next);
      // Write the confirmed value into the caches (not local state). A fetch
      // that started before the change would bring the old badge back, so
      // cancel those first.
      await Promise.all(Object.values(keys).map(queryKey => queryClient.cancelQueries({ queryKey })));
      queryClient.setQueryData<UserProfileType | null>(keys.profile, prev => (
        prev ? { ...prev, isVerified: stored } : prev
      ));
      queryClient.setQueryData<Post[]>(keys.posts, prev => markVerified(prev, targetName, stored));
      queryClient.setQueryData<Post[]>(keys.reposts, prev => markVerified(prev, targetName, stored));
      // Then refetch in the background (the server already stores the new
      // value, so the badge cannot flip back): this restarts a first load the
      // cancel above interrupted — it would otherwise stay pending with no
      // fetch — and updates the badge on every other cached screen (feed,
      // post detail, comments, search, user lists).
      void queryClient.invalidateQueries();
      addToast(
        stored ? `@${targetName} now has the blue badge.` : `Blue badge removed from @${targetName}.`,
        'success',
      );
    } catch (error) {
      addToast((error as Error)?.message || 'Error updating verification status.', 'error');
    } finally {
      if (mountedRef.current) setVerifyPending(false);
    }
  }, [profile, username, addToast, queryClient]);

  const handleToggleVerify = () => {
    if (!profile || verifyPending) return;
    const next = !profile.isVerified;
    if (!next) {
      Alert.alert('Remove blue badge?', `@${profile.username} will no longer be verified.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { void applyVerify(false); } },
      ]);
      return;
    }
    void applyVerify(true);
  };

  const handlePostPress = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, [router]);

  const currentData = activeTab === 'posts' ? posts : reposts;
  const currentLoading = (activeTab === 'posts' ? postsQuery : repostsQuery).isPending;
  const renderItem = useCallback(({ item }: { item: Post }) => (
    <GridTile post={item} onPress={() => handlePostPress(item)} />
  ), [handlePostPress]);
  const emptyMessage = activeTab === 'posts' ? 'No posts yet.' : 'No reposts yet.';

  // The other user blocked me: behave as if the account does not exist.
  if (blockedMe) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: `@${username}`,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-gray-400 text-lg text-center">This account isn't available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state: only when no profile is cached yet (also while re-checking
  // a cached "not found", which is never trusted without a fresh fetch), and
  // until the block relations have been refreshed for someone else's profile.
  if ((!profile && (profileQuery.isPending || profileQuery.isFetching)) || (!relationsChecked && !isMyProfile)) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: `@${username}`,
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

  // First load failed and nothing is cached
  if (profileQuery.isError && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: `@${username}`,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-gray-400 text-lg text-center">Couldn't load this profile.</Text>
          <Pressable onPress={() => { void refetchProfile(); }} className="mt-4 bg-gray-800 px-5 py-2 rounded-full">
            <Text className="text-white font-semibold">Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Not found (the query succeeded with no profile)
  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Profile not found',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400 text-lg">This user does not exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // An element (not a component defined in render), so the header is not
  // remounted every time a background refresh re-renders the screen.
  const profileHeader = (
    <View>
      {/* Stats */}
      <View className="p-4">
        <View className="flex-row items-center">
          <UserAvatar username={profile.username} avatarUrl={profile.profilePicture} size={80} />
          <View className="flex-1 flex-row justify-around ml-4">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{isBlocked ? 0 : posts.length}</Text>
              <Text className="text-gray-500 text-sm">Posts</Text>
            </View>
            <Pressable
              onPress={() => profile?.id && router.push({ pathname: '/user-list', params: { type: 'followers', userId: profile.id, title: 'Followers' } })}
              className="items-center"
            >
              <Text className="text-white font-bold text-lg">{followerCount}</Text>
              <Text className="text-gray-500 text-sm">Followers</Text>
            </Pressable>
            <Pressable
              onPress={() => profile?.id && router.push({ pathname: '/user-list', params: { type: 'following', userId: profile.id, title: 'Following' } })}
              className="items-center"
            >
              <Text className="text-white font-bold text-lg">{followingCount}</Text>
              <Text className="text-gray-500 text-sm">Following</Text>
            </Pressable>
          </View>
        </View>

        {/* Bio */}
        <View className="mt-4">
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="text-white text-xl font-bold">@{profile.username}</Text>
            {profile.isVerified && <VerifiedIcon color="#3b82f6" size={18} />}
          </View>
          <Text className="text-gray-400">{profile.name}</Text>
          {profile.bio ? (
            <View className="mt-2">
              <RenderUserContent content={profile.bio} className="text-white" />
            </View>
          ) : null}
        </View>

        {/* Admin verify */}
        {isAdmin && !isMyProfile && (
          <Pressable
            onPress={handleToggleVerify}
            disabled={verifyPending}
            className={`mt-3 px-4 py-1.5 rounded self-start ${profile.isVerified ? 'bg-red-600' : 'bg-blue-600'} ${verifyPending ? 'opacity-60' : ''}`}
          >
            <Text className="text-white text-sm font-semibold">
              {verifyPending ? '...' : profile.isVerified ? 'Remove Blue Badge' : 'Give Blue Badge'}
            </Text>
          </Pressable>
        )}

        {/* Action buttons */}
        {!isMyProfile && (
          <View className="mt-4 flex-row" style={{ gap: 8 }}>
            {isBlocked ? (
              <Pressable
                onPress={handleBlockToggle}
                disabled={blockPending}
                className={`flex-1 bg-white py-2 rounded-full items-center ${blockPending ? 'opacity-60' : ''}`}
              >
                <Text className="text-black font-semibold">{blockPending ? '...' : 'Unblock'}</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => { void handleToggleFollow(); }}
                  disabled={followPending}
                  className={`flex-1 py-2 rounded-full items-center ${isFollowing ? 'border border-gray-700' : 'bg-blue-600'} ${followPending ? 'opacity-60' : ''}`}
                >
                  <Text className="text-white font-semibold">
                    {followPending ? '...' : (isFollowing ? 'Unfollow' : 'Follow')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/messages?chatWith=${username}`)}
                  className="flex-1 bg-gray-800 py-2 rounded-full items-center"
                >
                  <Text className="text-white font-semibold">Message</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* Blocked state */}
      {isBlocked ? (
        <View className="py-10 items-center">
          <BlockIcon color="#4b5563" size={64} />
          <Text className="mt-4 text-lg font-bold text-gray-400">
            You have blocked @{username}
          </Text>
          <Text className="mt-1 text-sm text-gray-600">
            They can't see your posts or find your profile.
          </Text>
        </View>
      ) : (
        /* Tabs */
        <View className="flex-row border-b border-gray-800">
          {(['posts', 'reposts'] as TabType[]).map(tab => (
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
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          title: `@${username}`,
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () =>
            !isMyProfile ? (
              <Pressable onPress={() => setMenuVisible(true)} className="p-2">
                <Text className="text-white text-lg">...</Text>
              </Pressable>
            ) : null,
        }}
      />

      {/* One FlatList with a constant numColumns: swapping lists with different
          numColumns on block/unblock threw an invariant and crashed the app. */}
      <FlatList
        data={isBlocked ? EMPTY_POSTS : currentData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={profileHeader}
        ListEmptyComponent={
          isBlocked ? null : currentLoading ? (
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

      {/* Options Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setMenuVisible(false)}>
          <View className="bg-gray-900 rounded-t-2xl border-t border-gray-800 pb-8">
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-gray-700 rounded-full" />
            </View>

            <Pressable
              onPress={() => { setMenuVisible(false); setReportMenuVisible(true); }}
              className="flex-row items-center px-6 py-4 border-b border-gray-800"
            >
              <Text className="text-red-400 text-base font-semibold">Report User</Text>
            </Pressable>

            <Pressable onPress={handleBlockToggle} disabled={blockPending} className="flex-row items-center px-6 py-4">
              <Text className={`text-base font-semibold ${isBlocked ? 'text-white' : 'text-red-400'}`}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Report Reason Modal */}
      <Modal visible={reportMenuVisible} transparent animationType="slide" onRequestClose={() => setReportMenuVisible(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setReportMenuVisible(false)}>
          <View className="bg-gray-900 rounded-t-2xl border-t border-gray-800 pb-8 max-h-[60%]">
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-gray-700 rounded-full" />
            </View>
            <Text className="text-white font-bold text-base px-6 pb-3 border-b border-gray-800">
              Why are you reporting this user?
            </Text>
            {REPORT_REASONS.map(reason => (
              <Pressable
                key={reason}
                onPress={() => handleReport(reason)}
                className="px-6 py-3 border-b border-gray-800"
              >
                <Text className="text-white text-sm">{reason}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
