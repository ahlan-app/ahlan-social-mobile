import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../store/AppContext.native';
import {
  getTrendingPosts,
  getAllHashtags,
  searchUsers,
} from '../../services/apiService';
import UserAvatar from '../../components/native/UserAvatar';
import { SearchIcon, VerifiedIcon, HeartIcon, CommentIcon } from '../../components/native/Icons';
import RenderUserContent from '../../components/native/RenderUserContent';
import PostSkeleton from '../../components/native/PostSkeleton';
import type { Post, SimpleUser, Hashtag } from '../../types';

const NUM_COLUMNS = 3;
const GRID_GAP = 2;
const screenWidth = Dimensions.get('window').width;
const tileSize = (screenWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type FilterType = 'users' | 'posts' | 'hashtags';

// ─── Sub-components ──────────────────────────────

const UserSearchResult: React.FC<{
  user: SimpleUser;
  onViewProfile: (username: string) => void;
}> = React.memo(({ user, onViewProfile }) => {
  const { isUserFollowed, toggleFollowUser, userProfile } = useApp();
  const isFollowing = isUserFollowed(user.username);
  const isMyProfile = userProfile?.username === user.username;

  return (
    <Pressable
      onPress={() => onViewProfile(user.username)}
      className="flex-row items-center px-4 py-3"
    >
      <UserAvatar username={user.username} avatarUrl={user.avatar} size={48} />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Text className="font-bold text-white">@{user.username}</Text>
          {user.isVerified && <VerifiedIcon color="#3b82f6" size={14} />}
        </View>
        <Text className="text-sm text-gray-400">{user.name}</Text>
      </View>
      {!isMyProfile && (
        <Pressable
          onPress={() => toggleFollowUser(user.username)}
          className={`px-4 py-1.5 rounded-full ${isFollowing ? 'border border-gray-700' : 'bg-blue-600'}`}
        >
          <Text className="text-white font-semibold text-sm">
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
});

const HashtagResult: React.FC<{ hashtag: Hashtag }> = React.memo(({ hashtag }) => (
  <View className="flex-row items-center px-4 py-3">
    <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
      <Text className="text-white font-bold text-lg">#</Text>
    </View>
    <View className="ml-3">
      <Text className="font-bold text-white">#{hashtag.tag}</Text>
      <Text className="text-sm text-gray-400">{hashtag.postCount.toLocaleString()} posts</Text>
    </View>
  </View>
));

const ExploreTile: React.FC<{ post: Post; onPress: () => void }> = React.memo(({ post, onPress }) => {
  const isTextPost = post.media_type === 'text' || !post.media;

  return (
    <Pressable
      onPress={onPress}
      style={{ width: tileSize, height: tileSize, marginRight: GRID_GAP, marginBottom: GRID_GAP }}
    >
      {isTextPost ? (
        <View className="flex-1 p-2 bg-gray-800">
          <View className="flex-row items-center mb-1" style={{ gap: 4 }}>
            <UserAvatar username={post.username} avatarUrl={post.avatar} size={16} />
            <Text className="text-white text-xs font-bold" numberOfLines={1}>@{post.username}</Text>
          </View>
          <Text className="text-white text-xs flex-1" numberOfLines={4}>
            {post.content}
          </Text>
          <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
            <HeartIcon color="rgba(255,255,255,0.6)" size={12} />
            <Text className="text-white/60 text-xs">{post.likes}</Text>
            <CommentIcon color="rgba(255,255,255,0.6)" size={12} />
            <Text className="text-white/60 text-xs">{post.replies}</Text>
          </View>
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

// ─── Search Screen ───────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { isUserBlocked } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('users');

  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [userResults, setUserResults] = useState<SimpleUser[]>([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Data loading ──────────────────────────────

  const loadExploreData = useCallback(async () => {
    try {
      const [postsData, hashtagsData] = await Promise.all([
        getTrendingPosts(),
        getAllHashtags(),
      ]);
      setTrendingPosts(postsData);
      setHashtags(hashtagsData);
    } catch (error) {
      console.error('Search data load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExploreData();
  }, [loadExploreData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExploreData();
    setRefreshing(false);
  }, [loadExploreData]);

  // ─── User search with debounce ─────────────────

  useEffect(() => {
    if (!isSearching || activeFilter !== 'users' || !searchTerm.trim()) {
      setUserResults([]);
      return;
    }

    setIsUserSearchLoading(true);
    const timer = setTimeout(async () => {
      const usersFromApi = await searchUsers(searchTerm);
      const mapped: SimpleUser[] = usersFromApi.map((u: any) => ({
        id: u.id,
        name: u.full_name,
        username: u.username,
        avatar: u.avatar_url,
        isVerified: u.is_verified,
      }));
      setUserResults(mapped.filter(u => !isUserBlocked(u.username)));
      setIsUserSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, activeFilter, isSearching, isUserBlocked]);

  // ─── Filtered data ─────────────────────────────

  const filteredPosts = useMemo(
    () =>
      trendingPosts.filter(
        p =>
          !isUserBlocked(p.username) &&
          (p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.username.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [trendingPosts, searchTerm, isUserBlocked]
  );

  const filteredHashtags = useMemo(
    () => hashtags.filter(h => h.tag.toLowerCase().includes(searchTerm.toLowerCase())),
    [hashtags, searchTerm]
  );

  const visibleExplorePosts = useMemo(
    () => trendingPosts.filter(p => !isUserBlocked(p.username)),
    [trendingPosts, isUserBlocked]
  );

  // ─── Navigation ────────────────────────────────

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/user/${username}`);
  }, []);

  const handleViewPost = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, []);

  // ─── Render search results ─────────────────────

  const renderSearchContent = () => {
    if (activeFilter === 'users') {
      if (isUserSearchLoading) {
        return <ActivityIndicator color="#3b82f6" className="mt-16" />;
      }
      if (!searchTerm.trim()) {
        return (
          <Text className="text-gray-500 text-center p-8">Start typing to search for users.</Text>
        );
      }
      if (userResults.length === 0) {
        return (
          <Text className="text-gray-500 text-center p-8">
            No users found matching "{searchTerm}".
          </Text>
        );
      }
      return (
        <FlatList
          data={userResults}
          keyExtractor={item => item.username}
          renderItem={({ item }) => (
            <UserSearchResult user={item} onViewProfile={handleViewProfile} />
          )}
        />
      );
    }

    if (activeFilter === 'posts') {
      if (filteredPosts.length === 0) {
        return (
          <Text className="text-gray-500 text-center p-8">
            No posts found matching "{searchTerm}".
          </Text>
        );
      }
      return (
        <FlatList
          data={filteredPosts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleViewPost(item)}>
              <View className="px-2">
                <Text className="text-white font-bold px-2 pt-2">@{item.username}</Text>
                <Text className="text-gray-400 px-2 pb-2" numberOfLines={3}>{item.content}</Text>
                <View className="border-b border-gray-800" />
              </View>
            </Pressable>
          )}
        />
      );
    }

    // Hashtags
    if (filteredHashtags.length === 0) {
      return (
        <Text className="text-gray-500 text-center p-8">
          No hashtags found matching "{searchTerm}".
        </Text>
      );
    }
    return (
      <FlatList
        data={filteredHashtags}
        keyExtractor={item => item.tag}
        renderItem={({ item }) => <HashtagResult hashtag={item} />}
      />
    );
  };

  // ─── Render explore grid ───────────────────────

  const renderExploreItem = useCallback(
    ({ item }: { item: Post }) => (
      <ExploreTile post={item} onPress={() => handleViewPost(item)} />
    ),
    [handleViewPost]
  );

  // ─── Main render ───────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Search bar */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-gray-900 rounded-full px-4 py-2 border border-gray-800">
          <SearchIcon color="#6b7280" size={20} />
          <TextInput
            className="flex-1 text-white py-1 ml-2"
            placeholder="Search Ahlan"
            placeholderTextColor="#6b7280"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={() => setIsSearching(true)}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {isSearching && (
            <Pressable onPress={() => { setIsSearching(false); setSearchTerm(''); }}>
              <Text className="text-blue-400 font-semibold ml-2">Cancel</Text>
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        {isSearching && (
          <View className="flex-row mt-2 border-b border-gray-800">
            {(['users', 'posts', 'hashtags'] as FilterType[]).map(filter => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`flex-1 py-3 items-center ${activeFilter === filter ? 'border-b-2 border-blue-400' : ''}`}
              >
                <Text
                  className={`font-semibold capitalize ${activeFilter === filter ? 'text-blue-400' : 'text-gray-500'}`}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      {isSearching ? (
        renderSearchContent()
      ) : loading ? (
        <View className="py-4">
          <PostSkeleton />
          <PostSkeleton />
        </View>
      ) : visibleExplorePosts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-white text-xl font-bold">Nothing to Explore Yet</Text>
          <Text className="text-gray-500 mt-2 text-center">
            As more posts are created, they will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleExplorePosts}
          renderItem={renderExploreItem}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
