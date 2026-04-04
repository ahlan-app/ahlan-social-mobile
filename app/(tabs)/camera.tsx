import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon } from '../../components/native/Icons';

export default function CameraScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-8">
        <CameraIcon className="w-16 h-16 mb-6" color="#3b82f6" />
        <Text className="text-white text-xl font-bold mb-2">Camera</Text>
        <Text className="text-gray-400 text-center">
          Camera features will be available soon. Capture and share your moments directly!
        </Text>
      </View>
    </SafeAreaView>
  );
}
