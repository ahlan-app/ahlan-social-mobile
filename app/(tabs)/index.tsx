import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../store/AppContext.native';
import { getTimeline, getMorePosts, resetPageCounter, getStories } from '../../services/apiService';
import { supabase } from '../../services/supabase.native';
import PostCard from '../../components/native/PostCard';
import PostSkeleton from '../../components/native/PostSkeleton';
import StoryReel, { StoryGroup } from '../../components/native/StoryReel';
import StoryCreator from '../../components/native/StoryCreator';
import type { Post, Story } from '../../types';

export default function HomeFeedScreen() {
  const { userProfile, isUserBlocked, addToast, followedUsernames } = useApp();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;

  // ─── Data fetching ─────────────────────────────

  const loadFeed = useCallback(async () => {
    try {
      resetPageCounter();
      const [timelinePosts, stories] = await Promise.all([
        getTimeline(),
        getStories(),
      ]);

      const filtered = timelinePosts.filter(p => !isUserBlocked(p.username));
      setPosts(filtered);
      setHasMore(filtered.length >= 20);

      // Group stories by user
      const groups = new Map<string, StoryGroup>();
      stories.forEach(story => {
        if (isUserBlocked(story.username)) return;
        if (!groups.has(story.username)) {
          groups.set(story.username, {
            username: story.username,
            avatar: story.avatar,
            stories: [],
          });
        }
        groups.get(story.username)!.stories.push(story);
      });
      setStoryGroups(Array.from(groups.values()));
      setAllStories(stories.filter(s => !isUserBlocked(s.username)));
    } catch (error) {
      console.error('Feed load error:', error);
      addToast('Failed to load feed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isUserBlocked]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // ─── Realtime subscription ─────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('public:posts-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // We'd need to fetch the full post with profile data
            // For now just trigger a soft refresh indicator
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Handlers ──────────────────────────────────

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
      } else {
        const filtered = morePosts.filter(p => !isUserBlocked(p.username));
        setPosts(prev => [...prev, ...filtered]);
      }
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, isUserBlocked]);

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/user/${username}`);
  }, []);

  const handleViewComments = useCallback((postId: string) => {
    router.push(`/comments/${postId}`);
  }, []);

  const handleViewStories = useCallback((stories: Story[], startIndex: number) => {
    router.push({ pathname: '/story-viewer', params: { index: String(startIndex) } });
  }, []);

  const handleAddStory = useCallback(() => {
    router.push('/story-create');
  }, []);

  // ─── List renderers ────────────────────────────

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onViewProfile={handleViewProfile}
      onViewComments={handleViewComments}
    />
  ), [handleViewProfile, handleViewComments]);

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
  }, [storyGroups, allStories, isLoading]);

  const ListEmpty = useCallback(() => {
    if (isLoading) return null;

    const hasFollows = followedUsernames && followedUsernames.size > 0;

    return (
      <View className="items-center mt-20 px-8">
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
              Follow some users to see their latest posts and stories in your feed.
            </Text>
          </>
        )}
      </View>
    );
  }, [isLoading, followedUsernames]);

  const ListFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-6">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }, [isLoadingMore]);

  // ─── Render ────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="px-4 py-2 border-b border-gray-800 flex-row justify-between items-center">
          <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-2xl text-blue-500">
            Ahlan
          </Text>
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
        <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-2xl text-blue-500">
          Ahlan
        </Text>
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
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1 }}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </SafeAreaView>
  );
}
