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

import React, { useState, useEffect, useCallback } from 'react';
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

const REPORT_REASONS = [
  "It's spam",
  'Hate speech or symbols',
  'Harassment or bullying',
  'Pretending to be someone else',
  'False information',
  'Nudity or sexual activity',
  "I just don't like their content",
];

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const {
    userProfile: myProfile,
    isUserFollowed,
    toggleFollowUser,
    isUserBlocked,
    toggleBlockUser,
    addToast,
    isAdmin,
  } = useApp();

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportMenuVisible, setReportMenuVisible] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const isFollowing = isUserFollowed(username || '');
  const isBlocked = isUserBlocked(username || '');
  const isMyProfile = myProfile?.username === username;

  const fetchData = useCallback(async () => {
    if (!username) return;
    try {
      const profileData = await getUserProfile(username);
      setProfile(profileData);
      if (profileData) {
        const [userPosts, userReposts, followers, following] = await Promise.all([
          getUserPosts(profileData.id),
          getUserReposts(profileData.id),
          getFollowerCount(profileData.id),
          getFollowingCount(profileData.id),
        ]);
        setPosts(userPosts);
        setReposts(userReposts);
        setFollowerCount(followers);
        setFollowingCount(following);
      }
    } catch (error) {
      console.error('Failed to load user profile', error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime follow count updates
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`user-profile-follows-${profile.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        async (payload) => {
          const f = payload.new as any;
          const o = payload.old as any;
          if (
            f?.follower_id === profile.id || f?.followed_id === profile.id ||
            o?.follower_id === profile.id || o?.followed_id === profile.id
          ) {
            const [followers, following] = await Promise.all([
              getFollowerCount(profile.id),
              getFollowingCount(profile.id),
            ]);
            setFollowerCount(followers);
            setFollowingCount(following);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleToggleFollow = useCallback(async () => {
    if (!username || !profile?.id || isMyProfile || followPending) return;
    const wasFollowing = isFollowing;

    setFollowPending(true);
    setFollowerCount(prev => Math.max(0, prev + (wasFollowing ? -1 : 1)));

    try {
      await toggleFollowUser(username);
      const [followers, following] = await Promise.all([
        getFollowerCount(profile.id),
        getFollowingCount(profile.id),
      ]);
      setFollowerCount(followers);
      setFollowingCount(following);
    } finally {
      setFollowPending(false);
    }
  }, [username, profile?.id, isMyProfile, followPending, isFollowing, toggleFollowUser]);

  const handleBlockToggle = () => {
    setMenuVisible(false);
    if (isBlocked) {
      toggleBlockUser(username || '');
      addToast(`@${username} has been unblocked.`, 'success');
    } else {
      Alert.alert(
        `Block @${username}?`,
        "They won't be able to find your profile, posts, or story, and they won't be notified.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              toggleBlockUser(username || '');
              addToast(`@${username} has been blocked.`, 'info');
            },
          },
        ],
      );
    }
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

  const handleToggleVerify = async () => {
    if (!profile) return;
    try {
      setProfile(prev => prev ? { ...prev, isVerified: !prev.isVerified } : null);
      await setUserVerified(profile.id, profile.username, !profile.isVerified);
      addToast(`User ${profile.isVerified ? 'unverified' : 'verified'} successfully.`, 'success');
    } catch (error) {
      setProfile(prev => prev ? { ...prev, isVerified: !prev.isVerified } : null);
      addToast('Error updating verification status.', 'error');
    }
  };

  const handlePostPress = useCallback((post: Post) => {
    router.push(`/post/${post.id}`);
  }, [router]);

  const currentData = activeTab === 'posts' ? posts : reposts;
  const renderItem = ({ item }: { item: Post }) => (
    <GridTile post={item} onPress={() => handlePostPress(item)} />
  );
  const emptyMessage = activeTab === 'posts' ? 'No posts yet.' : 'No reposts yet.';

  // Loading state
  if (loading && !profile) {
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

  // Not found
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

  const ProfileHeader = () => (
    <View>
      {/* Stats */}
      <View className="p-4">
        <View className="flex-row items-center">
          <UserAvatar username={profile.username} avatarUrl={profile.profilePicture} size={80} />
          <View className="flex-1 flex-row justify-around ml-4">
            <View className="items-center">
              <Text className="text-white font-bold text-lg">{posts.length}</Text>
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
            className={`mt-3 px-4 py-1.5 rounded self-start ${profile.isVerified ? 'bg-red-600' : 'bg-blue-600'}`}
          >
            <Text className="text-white text-sm font-semibold">
              {profile.isVerified ? 'Unverify Account' : 'Verify Account'}
            </Text>
          </Pressable>
        )}

        {/* Action buttons */}
        {!isMyProfile && (
          <View className="mt-4 flex-row" style={{ gap: 8 }}>
            {isBlocked ? (
              <Pressable
                onPress={handleBlockToggle}
                className="flex-1 bg-white py-2 rounded-full items-center"
              >
                <Text className="text-black font-semibold">Unblock</Text>
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

      {isBlocked ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={ProfileHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          ListHeaderComponent={ProfileHeader}
          ListEmptyComponent={
            loading ? (
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
      )}

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

            <Pressable onPress={handleBlockToggle} className="flex-row items-center px-6 py-4">
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
