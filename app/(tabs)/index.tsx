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
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { useApp } from '../../store/AppContext.native';
import {
  getTimelinePage,
  getStories,
  getPostById,
  getSmartUserSuggestions,
  type FeedPage,
} from '../../services/apiService';
import { queryKeys } from '../../services/queryKeys';
import { refreshWhileOnline } from '../../services/queryClient';
import { supabase } from '../../services/supabase.native';
import PostCard from '../../components/native/PostCard';
import PostSkeleton from '../../components/native/PostSkeleton';
import StoryReel, { StoryGroup } from '../../components/native/StoryReel';
import UserAvatar from '../../components/native/UserAvatar';
import { VerifiedIcon, BellIcon, SendIcon } from '../../components/native/Icons';
import type { Post, Story, SimpleUser } from '../../types';

type FeedData = InfiniteData<FeedPage, string | null>;

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
// How long after a pull-to-refresh / follow change an empty stories result is
// taken at face value (a window rather than a one-shot flag, so a fetch that
// gets cancelled and restarted by an invalidation still trusts it).

const dedupeStoriesById = (stories: Story[]): Story[] => {
  const seen = new Set<string>();
  const unique: Story[] = [];
  for (const story of stories) {
    if (!story?.id || seen.has(story.id)) continue;
    seen.add(story.id);
    unique.push(story);
  }
  return unique;
};

// Stories are persisted with the rest of the query cache (up to a week), so
// hide the ones whose 24h window ended while the app was closed.
const isStoryLive = (story: Story, now: number): boolean => {
  const createdAt = new Date(story.timestamp).getTime();
  return Number.isNaN(createdAt) || now - createdAt < STORY_LIFETIME_MS;
};

const feedHasPost = (data: FeedData, postId: string): boolean =>
  data.pages.some(page => page.posts.some(post => post.id === postId));

const prependFeedPost = (data: FeedData, post: Post): FeedData => {
  if (data.pages.length === 0 || feedHasPost(data, post.id)) return data;
  const [first, ...rest] = data.pages;
  return { ...data, pages: [{ ...first, posts: [post, ...first.posts] }, ...rest] };
};

const replaceFeedPost = (data: FeedData, post: Post): FeedData => {
  let changed = false;
  const pages = data.pages.map(page => {
    const index = page.posts.findIndex(item => item.id === post.id);
    if (index === -1) return page;
    changed = true;
    const posts = page.posts.slice();
    posts[index] = post;
    return { ...page, posts };
  });
  return changed ? { ...data, pages } : data;
};

const removeFeedPost = (data: FeedData, postId: string): FeedData => {
  let changed = false;
  const pages = data.pages.map(page => {
    if (!page.posts.some(post => post.id === postId)) return page;
    changed = true;
    return { ...page, posts: page.posts.filter(post => post.id !== postId) };
  });
  return changed ? { ...data, pages } : data;
};

export default function HomeFeedScreen() {
  const {
    userProfile,
    isUserBlocked,
    addToast,
    followedUsernames,
    isUserFollowed,
    toggleFollowUser,
    notifications,
    unreadMessageCount,
  } = useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const unreadNotificationCount = notifications?.filter(n => !n.is_read).length ?? 0;

  // userProfile.id is only filled in after the profile round-trips to the
  // server; the locally stored session knows who is signed in right away, so
  // the cached feed can be shown instantly after an app restart. The id follows
  // every auth change (INITIAL_SESSION is emitted to new listeners), so after a
  // sign-out it is cleared in the same batch as userProfile and the previous
  // account's queries are never re-enabled (the tabs stay mounted under
  // /settings when signing out from there).
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const profileId = userProfile?.id || null;
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => { subscription.unsubscribe(); };
  }, []);
  const viewerId = profileId || sessionUserId;

  const [refreshing, setRefreshing] = useState(false);
  const hasFollows = Boolean(followedUsernames && followedUsernames.size > 0);

  // ---- Feed -----------------------------------------------------------------
  const feedKey = useMemo(() => queryKeys.feed(viewerId ?? ''), [viewerId]);
  const feedQuery = useInfiniteQuery({
    queryKey: feedKey,
    queryFn: async ({ pageParam }) => {
      const page = await getTimelinePage(pageParam);
      // getTimelinePage() also answers an empty page when auth.getUser() fails
      // (e.g. offline). Before an empty first page replaces a cached feed,
      // confirm with the auth server; a failure keeps the cached pages.
      if (pageParam === null && page.posts.length === 0) {
        const cached = queryClient.getQueryData<FeedData>(feedKey);
        if (cached?.pages.some(cachedPage => (cachedPage?.posts?.length ?? 0) > 0)) {
          const { data, error } = await supabase.auth.getUser();
          if (error || !data.user) throw error ?? new Error('Feed refresh without a signed-in user');
        }
      }
      return page;
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    enabled: !!viewerId,
  });
  const {
    data: feedData,
    error: feedError,
    isError: isFeedError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchFeed,
  } = feedQuery;

  // Skeleton only while there is nothing (not even cached pages) to show.
  const isLoading = feedQuery.isPending && !feedData;
  const isLoadingMore = isFetchingNextPage;

  // Pages flattened with de-dup by id (a realtime prepend can overlap a page
  // boundary); blocks are applied here so a block change filters instantly.
  const posts = useMemo(() => {
    const seen = new Set<string>();
    const visible: Post[] = [];
    for (const page of feedData?.pages ?? []) {
      for (const post of page?.posts ?? []) {
        if (!post?.id || seen.has(post.id)) continue;
        seen.add(post.id);
        if (isUserBlocked(post.username)) continue;
        visible.push(post);
      }
    }
    return visible;
  }, [feedData, isUserBlocked]);

  // Once per failed fetch (each failure yields a new error object), and only
  // when there is no cached feed to fall back on.
  useEffect(() => {
    if (!isFeedError || feedData) return;
    console.error('Feed load error:', feedError);
    addToast('Failed to load feed', 'error');
  }, [isFeedError, feedError, feedData, addToast]);

  // ---- Stories --------------------------------------------------------------
  const storiesKey = useMemo(() => queryKeys.stories(viewerId ?? ''), [viewerId]);
  // getStories() throws on errors, so a failed refresh keeps the cached reel.
  const storiesQuery = useQuery({
    queryKey: storiesKey,
    queryFn: getStories,
    enabled: !!viewerId,
  });
  const { data: storiesData, refetch: refetchStories } = storiesQuery;

  const { storyGroups, allStories } = useMemo(() => {
    const now = Date.now();
    const filteredStories = (storiesData ?? []).filter(
      story => !isUserBlocked(story.username) && isStoryLive(story, now),
    );
    const dedupedStories = dedupeStoriesById(filteredStories);
    const currentUsername = userProfile?.username?.trim().toLowerCase();
    const feedStories = dedupedStories.filter(story => {
      if (viewerId && story.userId === viewerId) return false;
      return !currentUsername || story.username?.trim().toLowerCase() !== currentUsername;
    });

    const groups = new Map<string, StoryGroup>();
    feedStories.forEach(story => {
      if (!groups.has(story.username)) {
        groups.set(story.username, {
          username: story.username,
          avatar: story.avatar,
          stories: [],
        });
      }
      groups.get(story.username)?.stories.push(story);
    });

    return { storyGroups: Array.from(groups.values()), allStories: feedStories };
  }, [storiesData, isUserBlocked, userProfile?.username, viewerId]);

  // ---- Suggestions (empty feed + following nobody) -------------------------
  // Gated on the loaded profile (not the session id): followedUsernames arrives
  // together with userProfile.id, so before that "follows nobody" is unknown.
  const wantsSuggestions = !!profileId && !isLoading && posts.length === 0 && !hasFollows;
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.suggestions(viewerId ?? ''),
    queryFn: async () => {
      try {
        return await getSmartUserSuggestions(viewerId as string);
      } catch (error) {
        // Rethrown so a failed refresh keeps the cached suggestions.
        console.error('Suggestion load error:', error);
        throw error;
      }
    },
    enabled: wantsSuggestions,
  });
  const { data: suggestionRows, refetch: refetchSuggestions } = suggestionsQuery;

  const suggestedUsers = useMemo<SimpleUser[]>(() => {
    if (!wantsSuggestions) return [];
    return (suggestionRows || [])
      .map((suggestion: any) => ({
        id: suggestion.suggested_user_id || suggestion.id || suggestion.username,
        username: suggestion.username || '',
        name: suggestion.username || 'Ahlan user',
        avatar: suggestion.avatar_url || null,
        isVerified: Boolean(suggestion.is_verified),
      }))
      .filter((user: SimpleUser) => Boolean(user.username) && !isUserBlocked(user.username));
  }, [wantsSuggestions, suggestionRows, isUserBlocked]);

  // ---- Realtime -------------------------------------------------------------
  // Realtime patches keep the original fetch time so they do not postpone the
  // regular background refresh.
  const patchQueryData = useCallback(<T,>(key: QueryKey, patch: (data: T) => T) => {
    const current = queryClient.getQueryData<T>(key);
    if (current === undefined) return;
    const next = patch(current);
    if (next === current) return;
    queryClient.setQueryData<T>(key, next, {
      updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt,
    });
  }, [queryClient]);

  const invalidateStories = useCallback(() => {
    if (!viewerId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.stories(viewerId) });
  }, [queryClient, viewerId]);

  const handleStoryChange = useCallback((payload: any) => {
    if (!viewerId) return;
    if (payload?.eventType === 'DELETE') {
      const deletedId = payload.old?.id;
      if (!deletedId) return;
      patchQueryData<Story[]>(queryKeys.stories(viewerId), stories => {
        const next = stories.filter(story => story.id !== deletedId);
        return next.length === stories.length ? stories : next;
      });
      return;
    }
    invalidateStories();
  }, [viewerId, patchQueryData, invalidateStories]);

  const handlePostUpdates = useCallback(async (payload: any) => {
    if (!viewerId) return;
    const key = queryKeys.feed(viewerId);
    try {
      if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (!deletedId) return;
        patchQueryData<FeedData>(key, data => removeFeedPost(data, deletedId));
        return;
      }

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const postId = payload.new?.id;
        if (!postId) return;
        if (payload.eventType === 'UPDATE') {
          // Only posts already on this timeline need refreshing.
          const cached = queryClient.getQueryData<FeedData>(key);
          if (!cached || !feedHasPost(cached, postId)) return;
        }
        const fullPost = await getPostById(postId);
        if (!fullPost || isUserBlocked(fullPost.username)) return;

        if (payload.eventType === 'INSERT') {
          // The timeline only holds followed users + me; anything else would
          // vanish again on the next refetch.
          const author = fullPost.username?.trim().toLowerCase();
          const isOwnPost = payload.new?.user_id === viewerId
            || (Boolean(author) && author === userProfile?.username?.trim().toLowerCase());
          if (!isOwnPost && !isUserFollowed(fullPost.username)) return;
          patchQueryData<FeedData>(key, data => prependFeedPost(data, fullPost));
          return;
        }

        patchQueryData<FeedData>(key, data => replaceFeedPost(data, fullPost));
      }
    } catch (error) {
      console.error('Realtime post handling error:', error);
    }
  }, [viewerId, queryClient, isUserBlocked, isUserFollowed, userProfile?.username, patchQueryData]);

  // Channels subscribe once per viewer and always call the latest handler.
  const handleStoryChangeRef = useRef(handleStoryChange);
  const handlePostUpdatesRef = useRef(handlePostUpdates);
  useEffect(() => {
    handleStoryChangeRef.current = handleStoryChange;
    handlePostUpdatesRef.current = handlePostUpdates;
  }, [handleStoryChange, handlePostUpdates]);

  useEffect(() => {
    if (!viewerId) return;
    const channel = supabase
      .channel(`public:stories-home-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        payload => { handleStoryChangeRef.current(payload); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId]);

  useEffect(() => {
    if (!viewerId) return;
    const channel = supabase
      .channel(`public:follows-home-${viewerId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const next = payload.new as { follower_id?: string } | null;
          const prev = payload.old as { follower_id?: string } | null;
          if (next?.follower_id === viewerId || prev?.follower_id === viewerId) {
            invalidateStories();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, invalidateStories]);

  useEffect(() => {
    if (!viewerId) return;
    const channel = supabase
      .channel(`public:posts-home-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        payload => { void handlePostUpdatesRef.current(payload); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId]);

  // ---- Refresh / pagination -------------------------------------------------
  const onRefresh = useCallback(async () => {
    if (!viewerId) return;
    setRefreshing(true);
    try {
      // Like the old loadFeed(): pull-to-refresh restarts from the newest page
      // instead of re-downloading every page scrolled so far.
      // (patchQueryData keeps the fetch time, so a failed refresh stays stale.)
      patchQueryData<FeedData>(feedKey, data => (data.pages.length > 1
        ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) }
        : data));
      await refreshWhileOnline(() => Promise.all([
        refetchFeed(),
        refetchStories(),
        wantsSuggestions ? refetchSuggestions() : Promise.resolve(),
      ]));
    } finally {
      setRefreshing(false);
    }
  }, [viewerId, patchQueryData, feedKey, refetchFeed, refetchStories, refetchSuggestions, wantsSuggestions]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    fetchNextPage().catch(error => {
      console.error('Load more error:', error);
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/user/${username}`);
  }, [router]);

  const handleViewComments = useCallback((postId: string) => {
    router.push(`/comments/${postId}`);
  }, [router]);

  const handleViewStories = useCallback((stories: Story[], startIndex: number) => {
    const selectedStory = stories[startIndex];
    router.push({
      pathname: '/story-viewer',
      params: {
        index: String(startIndex),
        storyId: selectedStory?.id || '',
      },
    });
  }, [router]);

  const handleAddStory = useCallback(() => {
    router.push('/story-create');
  }, [router]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onViewProfile={handleViewProfile}
      onViewComments={handleViewComments}
      onViewLikers={(postId: string) => router.push({ pathname: '/user-list', params: { type: 'likes', postId, title: 'Likes' } })}
      onViewReposters={(postId: string) => router.push({ pathname: '/user-list', params: { type: 'reposts', postId, title: 'Reposts' } })}
      onSharePost={(post: Post) => router.push({ pathname: '/share-post', params: { id: post.id } })}
      onEditPost={(post: Post) => router.push({ pathname: '/edit-post', params: { id: post.id } })}
    />
  ), [handleViewProfile, handleViewComments, router]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  // An element (not a component) so the story row keeps its scroll position
  // when storyGroups changes.
  const listHeader = useMemo(() => (
    <View className="py-2 border-b border-gray-800">
      <StoryReel
        storyGroups={storyGroups}
        allStories={allStories}
        onViewStories={handleViewStories}
        onAddStory={handleAddStory}
      />
    </View>
  ), [storyGroups, allStories, handleAddStory, handleViewStories]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    return (
      <View className="items-center mt-20 px-4">
        {hasFollows ? (
          <>
            <Text className="text-gray-400 text-lg text-center">
              No posts yet
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              The people you follow haven't posted anything yet. Check back later!
            </Text>
          </>
        ) : (
          <>
            <Text className="text-gray-400 text-lg text-center">
              Welcome to Ahlan!
            </Text>
            <Text className="text-gray-600 text-sm text-center mt-2">
              Follow users to build your feed.
            </Text>

            {suggestedUsers.length > 0 && (
              <View className="w-full mt-6">
                <Text className="text-white font-semibold mb-3 px-1">Suggested for you</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {suggestedUsers.map(user => {
                    const isFollowing = isUserFollowed(user.username);
                    return (
                      <View key={user.id} className="w-36 bg-gray-900 rounded-xl p-3 mr-3">
                        <Pressable
                          onPress={() => handleViewProfile(user.username)}
                          className="items-center"
                        >
                          <UserAvatar username={user.username} avatarUrl={user.avatar} size={56} />
                          <View className="flex-row items-center mt-2" style={{ gap: 4 }}>
                            <Text className="text-white font-semibold" numberOfLines={1}>
                              @{user.username}
                            </Text>
                            {user.isVerified && <VerifiedIcon color="#3b82f6" size={14} />}
                          </View>
                        </Pressable>

                        <Pressable
                          onPress={() => { void toggleFollowUser(user.username); }}
                          className={`mt-3 py-2 rounded-full items-center ${isFollowing ? 'bg-gray-800' : 'bg-blue-600'}`}
                        >
                          <Text className="text-white text-sm font-semibold">
                            {isFollowing ? 'Following' : 'Follow'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </View>
    );
  }, [isLoading, hasFollows, suggestedUsers, isUserFollowed, toggleFollowUser, handleViewProfile]);

  const ListFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-6">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }, [isLoadingMore]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-4 py-2 border-b border-gray-800 flex-row justify-between items-center">
          <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-2xl text-white">
            Ahlan
          </Text>
          <View className="flex-row items-center" style={{ gap: 16 }}>
            <Pressable onPress={() => router.push('/notifications')} className="relative">
              <BellIcon color="#e5e7eb" size={24} />
              {unreadNotificationCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/messages')} className="relative">
              <SendIcon color="#e5e7eb" size={22} />
              {unreadMessageCount > 0 && (
                <View className="absolute -top-1 -right-2 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{unreadMessageCount > 9 ? '9+' : unreadMessageCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-2 border-b border-gray-800 flex-row justify-between items-center">
        <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-2xl text-white">
          Ahlan
        </Text>
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Pressable onPress={() => router.push('/notifications')} className="relative">
            <BellIcon color="#e5e7eb" size={24} />
            {unreadNotificationCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/messages')} className="relative">
            <SendIcon color="#e5e7eb" size={22} />
            {unreadMessageCount > 0 && (
              <View className="absolute -top-1 -right-2 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{unreadMessageCount > 9 ? '9+' : unreadMessageCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}
