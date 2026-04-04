import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams();

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
      
      <ScrollView className="flex-1 px-6">
        <View className="py-20 items-center">
          <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-4xl text-blue-500 mb-4">
            @{username}
          </Text>
          <Text className="text-gray-400 text-lg text-center">
            Profile view for {username} is coming soon!
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            Stay tuned for user stats, bio, and content.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
