import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Post',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView className="flex-1 px-6">
        <View className="py-20 items-center">
          <Text className="text-blue-500 font-bold text-xl mb-4">
            Post ID: {id}
          </Text>
          <Text className="text-gray-400 text-lg text-center">
            Detailed post view is under development.
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            View full content, likes, reposts, and more soon!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
