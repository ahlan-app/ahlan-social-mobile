import React, { useState, useEffect, useCallback } from 'react';
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
import { useApp } from '../../store/AppContext.native';
import {
  getUserPosts,
  getUserReposts,
  getSavedPosts,
  getFollowerCount,
  getFollowingCount,
} from '../../services/apiService';
import { supabase } from '../../services/supabase.native';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { VerifiedIcon } from '../../components/native/Icons';
import PostSkeleton from '../../components/native/PostSkeleton';
import type { Post } from '../../types';

const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const screenWidth = Dimensions.get('window').width;
const tileSize = (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type TabType = 'posts' | 'reposts' | 'saved';

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
  const { userProfile, refreshAllData, addToast, followedUsernames } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!userProfile?.id) return;
    try {
      const [userPosts, userReposts, userSaved, followers, following] = await Promise.all([
        getUserPosts(userProfile.id),
        getUserReposts(userProfile.id),
        getSavedPosts(userProfile.id),
        getFollowerCount(userProfile.id),
        getFollowingCount(userProfile.id),
      ]);
      setPosts(userPosts);
      setReposts(userReposts);
      setSavedPosts(userSaved);
      setFollowerCount(followers);
      setFollowingCount(following);
    } catch (error) {
      console.error('Profile fetch error:', error);
      addToast('Failed to load profile data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setFollowingCount(followedUsernames.size);
  }, [followedUsernames]);

  // Realtime: own posts
  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`profile-posts-${userProfile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${userProfile.id}` },
        () => { fetchAll(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id, fetchAll]);

  // Realtime: follow counts
  useEffect(() => {
    if (!userProfile?.id) return;
    const channel = supabase
      .channel(`profile-follows-${userProfile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        async (payload) => {
          const f = payload.new as any;
          const o = payload.old as any;
          if (f?.follower_id === userProfile.id || f?.followed_id === userProfile.id ||
              o?.follower_id === userProfile.id || o?.followed_id === userProfile.id) {
            const [followers, following] = await Promise.all([
              getFollowerCount(userProfile.id),
              getFollowingCount(userProfile.id),
            ]);
            setFollowerCount(followers);
            setFollowingCount(following);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfile?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAll(), refreshAllData()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll, refreshAllData]);

  const currentData = activeTab === 'posts' ? posts : activeTab === 'reposts' ? reposts : savedPosts;

  const handlePostPress = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, []);

  if (!userProfile) return null;

  // ─── Profile Header ────────────────────────────

  const ProfileHeader = () => (
    <View>
      <View className="px-4 py-3 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-white font-bold text-xl">@{userProfile.username}</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          className="bg-gray-800 px-4 py-1.5 rounded-full"
        >
          <Text className="text-white text-sm font-semibold">Settings</Text>
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

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <GridTile post={item} onPress={() => handlePostPress(item)} />
  ), [handlePostPress]);

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
        ListHeaderComponent={ProfileHeader}
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
