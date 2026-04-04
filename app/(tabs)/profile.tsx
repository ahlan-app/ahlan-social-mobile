import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  RefreshControl, 
  Pressable 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../store/AppContext.native';
import UserAvatar from '../../components/native/UserAvatar';

export default function ProfileScreen() {
  const { userProfile, refreshAllData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!userProfile) return null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 border-b border-gray-800 flex-row justify-between items-center">
        <Text className="text-white font-bold text-xl">@{userProfile.username}</Text>
        <Pressable 
          onPress={() => router.push('/settings')}
          className="bg-gray-800 px-4 py-1.5 rounded-full"
        >
          <Text className="text-white text-sm font-semibold">Settings</Text>
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#3b82f6"
          />
        }
      >
        <View className="px-4 py-6">
          <View className="flex-row items-center mb-6">
            <UserAvatar 
              username={userProfile.username} 
              avatarUrl={userProfile.profilePicture} 
              size={80} 
            />
            <View className="ml-5 flex-1">
              <Text className="text-white font-bold text-2xl">{userProfile.name || userProfile.username}</Text>
              <Text className="text-gray-400">@{userProfile.username}</Text>
            </View>
          </View>

          {userProfile.bio && (
            <Text className="text-white text-base mb-6 leading-6">
              {userProfile.bio}
            </Text>
          )}

          <View className="flex-row items-center border-t border-b border-gray-900 py-4 mb-6">
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">0</Text>
              <Text className="text-gray-500 text-sm">Posts</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">0</Text>
              <Text className="text-gray-500 text-sm">Followers</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-white font-bold text-lg">0</Text>
              <Text className="text-gray-500 text-sm">Following</Text>
            </View>
          </View>

          <View className="mt-4 items-center py-20">
            <Text className="text-gray-500 text-lg">Posts will appear here</Text>
            <Text className="text-gray-700 text-sm mt-2">
              Share your thoughts and media with the world!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
