import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen 
        options={{ 
          headerShown: true, 
          title: 'Terms of Service',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="text-white text-2xl font-bold mb-4">Terms of Service</Text>
        <Text className="text-gray-400 text-base mb-4 leading-6">
          Last Updated: April 4, 2026
        </Text>
        <Text className="text-gray-300 text-base mb-6 leading-7">
          By using Ahlan Social, you agree to these terms. Please read them carefully.
        </Text>
        <Text className="text-white text-lg font-bold mb-3">1. Using our Services</Text>
        <Text className="text-gray-400 text-base mb-6 leading-7">
          You must follow any policies made available to you within the Services. Do not misuse our Services. For example, do not interfere with our Services or try to access them using a method other than the interface and the instructions that we provide.
        </Text>
        <View className="pb-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
