import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Comments',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView className="flex-1 px-6">
        <View className="py-20 items-center">
          <Text className="text-blue-500 font-bold text-xl mb-4">
            Post ID: {postId}
          </Text>
          <Text className="text-gray-400 text-lg text-center">
            Comments section is coming soon!
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            Join the conversation and share your thoughts.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
