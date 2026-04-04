import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { getFollowerUsers, getFollowingUsers } from '../services/apiService';
import UserAvatar from '../components/native/UserAvatar';
import { VerifiedIcon } from '../components/native/Icons';
import type { SimpleUser } from '../types';

export default function UserListScreen() {
  const { type, userId, title } = useLocalSearchParams<{
    type: 'followers' | 'following' | 'likes' | 'reposts';
    userId: string;
    title: string;
  }>();
  const router = useRouter();
  const { isUserBlocked } = useApp();

  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        let result: SimpleUser[] = [];
        if (type === 'followers') {
          result = await getFollowerUsers(userId);
        } else if (type === 'following') {
          result = await getFollowingUsers(userId);
        }
        // likes/reposts: API not implemented, show empty
        if (!cancelled) {
          setUsers(result);
        }
      } catch (err) {
        console.error('Failed to fetch user list:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();
    return () => { cancelled = true; };
  }, [type, userId]);

  const toggleFollow = useCallback((targetUserId: string) => {
    setFollowingSet((prev) => {
      const next = new Set(prev);
      if (next.has(targetUserId)) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }
      return next;
    });
  }, []);

  const filteredUsers = users.filter((u) => !isUserBlocked(u.username));

  const renderItem = useCallback(
    ({ item }: { item: SimpleUser }) => {
      const isFollowing = followingSet.has(item.id);

      return (
        <Pressable
          className="flex-row items-center px-4 py-3 border-b border-gray-800"
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
                  <VerifiedIcon size={16} />
                </View>
              )}
            </View>
            <Text className="text-gray-400 text-sm" numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Pressable
            onPress={() => toggleFollow(item.id)}
            className={`px-4 py-1.5 rounded-full ${
              isFollowing
                ? 'border border-gray-500'
                : 'bg-blue-500'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                isFollowing ? 'text-white' : 'text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        </Pressable>
      );
    },
    [followingSet, toggleFollow, router],
  );

  const keyExtractor = useCallback((item: SimpleUser) => item.id, []);

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
