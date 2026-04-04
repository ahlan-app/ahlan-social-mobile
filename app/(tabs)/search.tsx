import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from '../../components/native/Icons';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-gray-900 rounded-xl px-4 py-2 border border-gray-800">
          <SearchIcon className="mr-2" color="#6b7280" />
          <TextInput
            className="flex-1 text-white py-1"
            placeholder="Search users..."
            placeholderTextColor="#6b7280"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      <View className="flex-1 justify-center items-center px-8">
        <Text className="text-gray-400 text-lg text-center">
          Search for friends and creators
        </Text>
        <Text className="text-gray-600 text-sm text-center mt-2">
          Discover new people and content across Ahlan Social.
        </Text>
      </View>
    </SafeAreaView>
  );
}
