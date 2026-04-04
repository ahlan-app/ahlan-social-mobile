import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XIcon } from '../components/native/Icons';

export default function StoryViewerScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-4 flex-row justify-end">
        <Pressable 
          onPress={() => router.back()}
          className="bg-gray-800/50 p-2 rounded-full"
        >
          <XIcon color="white" />
        </Pressable>
      </View>
      
      <View className="flex-1 justify-center items-center px-10">
        <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-4xl text-blue-500 mb-4 text-center">
          Story Viewer
        </Text>
        <Text className="text-gray-300 text-lg text-center">
          Experience immersive stories from your network.
        </Text>
        <Text className="text-gray-500 text-sm text-center mt-4">
          Visual story viewing will be available in the next update.
        </Text>
      </View>
    </SafeAreaView>
  );
}
