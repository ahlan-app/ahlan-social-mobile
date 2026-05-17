// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useApp } from '../../store/AppContext.native';
import {
  FEED_PAGE_SIZE,
  getTimeline,
  getMorePosts,
  resetPageCounter,
  getStories,
  getPostById,
  getSmartUserSuggestions,
} from '../../services/apiService';
import { supabase } from '../../services/supabase.native';
import PostCard from '../../components/native/PostCard';
import PostSkeleton from '../../components/native/PostSkeleton';
import StoryReel, { StoryGroup } from '../../components/native/StoryReel';
import StoryCreator from '../../components/native/StoryCreator';
import UserAvatar from '../../components/native/UserAvatar';
import { VerifiedIcon, BellIcon, SendIcon } from '../../components/native/Icons';
import type { Post, Story, SimpleUser } from '../../types';

const appendUniquePosts = (current: Post[], incoming: Post[]): Post[] => {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map(post => post.id));
  const next = incoming.filter(post => !seen.has(post.id));
  return next.length === 0 ? current : [...current, ...next];
};

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
  const unreadNotificationCount = notifications?.filter(n => !n.is_read).length ?? 0;

  const [posts, setPosts] = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const allStoriesRef = useRef<Story[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuggestions = useCallback(async (userId: string) => {
    try {
      const suggestions = await getSmartUserSuggestions(userId);
      const mappedSuggestions: SimpleUser[] = (suggestions || [])
        .map((suggestion: any) => ({
          id: suggestion.suggested_user_id || suggestion.id || suggestion.username,
          username: suggestion.username || '',
          name: suggestion.username || 'Ahlan user',
          avatar: suggestion.avatar_url || null,
          isVerified: Boolean(suggestion.is_verified),
        }))
        .filter((user: SimpleUser) => Boolean(user.username) && !isUserBlocked(user.username));
      setSuggestedUsers(mappedSuggestions);
    } catch (error) {
      console.error('Suggestion load error:', error);
      setSuggestedUsers([]);
    }
  }, [isUserBlocked]);

  const applyStoriesState = useCallback((stories: Story[]) => {
    const filteredStories = stories.filter(story => !isUserBlocked(story.username));
    const dedupedStories = dedupeStoriesById(filteredStories);
    const currentUsername = userProfile?.username?.trim().toLowerCase();
    const feedStories = currentUsername
      ? dedupedStories.filter(story => story.username.trim().toLowerCase() !== currentUsername)
      : dedupedStories;

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

    setStoryGroups(Array.from(groups.values()));
    setAllStories(feedStories);
    allStoriesRef.current = feedStories;
  }, [isUserBlocked, userProfile?.username]);

  const refreshStories = useCallback(async () => {
    try {
      const stories = await getStories();
      // Only update if we got stories OR if we had stories before (don't clear transiently)
      if (stories.length > 0 || allStoriesRef.current.length === 0) {
        applyStoriesState(stories);
      }
    } catch (error) {
      console.error('Story refresh error:', error);
    }
  }, [applyStoriesState]);

  const loadFeed = useCallback(async () => {
    try {
      resetPageCounter();
      const [timelinePosts, stories] = await Promise.all([
        getTimeline(),
        getStories(),
      ]);

      const filteredPosts = timelinePosts.filter(post => !isUserBlocked(post.username));
      setPosts(filteredPosts);
      setHasMore(filteredPosts.length >= FEED_PAGE_SIZE);
      applyStoriesState(stories);

      const hasFollows = followedUsernames && followedUsernames.size > 0;
      if (filteredPosts.length === 0 && !hasFollows && userProfile?.id) {
        await loadSuggestions(userProfile.id);
      } else {
        setSuggestedUsers([]);
      }
    } catch (error) {
      console.error('Feed load error:', error);
      addToast('Failed to load feed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isUserBlocked, addToast, followedUsernames, userProfile?.id, loadSuggestions, applyStoriesState]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const channel = supabase
      .channel(`public:stories-home-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        () => { void refreshStories(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshStories]);

  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`public:follows-home-${userProfile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          const next = payload.new as { follower_id?: string } | null;
          const prev = payload.old as { follower_id?: string } | null;
          if (next?.follower_id === userProfile.id || prev?.follower_id === userProfile.id) {
            void refreshStories();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, refreshStories]);

  useEffect(() => {
    if (!userProfile?.id || isLoading) return;
    const hasFollows = followedUsernames && followedUsernames.size > 0;
    if (posts.length === 0 && !hasFollows) {
      void loadSuggestions(userProfile.id);
    } else if (suggestedUsers.length > 0) {
      setSuggestedUsers([]);
    }
  }, [followedUsernames, isLoading, loadSuggestions, posts.length, suggestedUsers.length, userProfile?.id]);

  const handlePostUpdates = useCallback(async (payload: any) => {
    try {
      if (payload.eventType === 'DELETE') {
        setPosts(prev => prev.filter(post => post.id !== payload.old.id));
        return;
      }

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const postId = payload.new?.id;
        if (!postId) return;
        const fullPost = await getPostById(postId);
        if (!fullPost || isUserBlocked(fullPost.username)) return;

        if (payload.eventType === 'INSERT') {
          setPosts(prev => (prev.some(post => post.id === fullPost.id) ? prev : [fullPost, ...prev]));
          return;
        }

        setPosts(prev => prev.map(post => (post.id === fullPost.id ? fullPost : post)));
      }
    } catch (error) {
      console.error('Realtime post handling error:', error);
    }
  }, [isUserBlocked]);

  useEffect(() => {
    const channel = supabase
      .channel(`public:posts-home-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        payload => { void handlePostUpdates(payload); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handlePostUpdates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFeed();
    } finally {
      setRefreshing(false);
    }
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const morePosts = await getMorePosts();
      if (morePosts.length === 0) {
        setHasMore(false);
        return;
      }

      const filteredPosts = morePosts.filter(post => !isUserBlocked(post.username));
      setPosts(prev => appendUniquePosts(prev, filteredPosts));

      if (morePosts.length < FEED_PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, isUserBlocked]);

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

  const ListHeader = useCallback(() => {
    if (storyGroups.length === 0 && !isLoading) return null;
    return (
      <View className="py-3 border-b border-gray-800">
        <View className="flex-row px-2">
          <StoryCreator
            onAddStory={handleAddStory}
            onViewStories={handleViewStories}
          />
          <StoryReel
            storyGroups={storyGroups}
            allStories={allStories}
            onViewStories={handleViewStories}
          />
        </View>
      </View>
    );
  }, [storyGroups, allStories, isLoading, handleAddStory, handleViewStories]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    const hasFollows = followedUsernames && followedUsernames.size > 0;

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
  }, [isLoading, followedUsernames, suggestedUsers, isUserFollowed, toggleFollowUser, handleViewProfile]);

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
        ListHeaderComponent={ListHeader}
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
