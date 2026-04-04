import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SignupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-6">
        <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-4xl text-blue-500 mb-6">
          Create Account
        </Text>
        <Text className="text-gray-400 text-center mb-8">
          Sign up is currently limited. Please contact an administrator or check back later.
        </Text>
        
        <Pressable 
          onPress={() => router.back()}
          className="bg-gray-800 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
