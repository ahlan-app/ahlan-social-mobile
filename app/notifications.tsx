import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Notifications',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView className="flex-1 px-6">
        <View className="py-20 items-center">
          <Text className="text-gray-400 text-lg text-center">
            You're all caught up!
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            New activity and interactions will show up here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
