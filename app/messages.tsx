import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';

export default function MessagesScreen() {
  const { unreadMessageCount } = useApp();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Messages',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }} 
      />
      
      <ScrollView className="flex-1 px-6">
        <View className="py-20 items-center">
          <Text className="text-gray-400 text-lg text-center">
            No messages yet
          </Text>
          <Text className="text-gray-600 text-sm text-center mt-2">
            Connect with friends through private messaging.
            {unreadMessageCount > 0 && (
              <Text className="text-blue-500 font-bold ml-1">
                {'\n'}You have {unreadMessageCount} unread message(s).
              </Text>
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
