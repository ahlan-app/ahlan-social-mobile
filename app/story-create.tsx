import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { XIcon, CameraIcon } from '../components/native/Icons';

export default function StoryCreateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-4 flex-row justify-between items-center">
        <Text className="text-white font-bold text-xl">Create Story</Text>
        <Pressable 
          onPress={() => router.back()}
          className="bg-gray-800 p-2 rounded-full"
        >
          <XIcon color="white" />
        </Pressable>
      </View>
      
      <View className="flex-1 justify-center items-center px-10">
        <View className="bg-gray-900 p-8 rounded-full mb-8">
          <CameraIcon className="w-12 h-12" color="#3b82f6" />
        </View>
        <Text className="text-white text-2xl font-bold mb-4 text-center">
          Share Your Story
        </Text>
        <Text className="text-gray-400 text-lg text-center mb-8">
          Upload a photo or video to share what you're doing right now.
        </Text>
        
        <Pressable className="bg-blue-500 px-10 py-4 rounded-2xl w-full">
          <Text className="text-white font-bold text-center text-lg">Pick from Gallery</Text>
        </Pressable>
        
        <Pressable className="mt-4 bg-gray-900 border border-gray-800 px-10 py-4 rounded-2xl w-full">
          <Text className="text-white font-bold text-center text-lg">Open Camera</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
