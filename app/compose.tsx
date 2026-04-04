import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import UserAvatar from '../components/native/UserAvatar';

export default function ComposeScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { userProfile, addProfilePost } = useApp();
  const router = useRouter();

  const handlePost = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      // Logic to actually publish via API would go here.
      // For now we use the hook as requested.
      const newPost = {
        id: Math.random().toString(36).substring(7),
        content,
        user_id: userProfile?.id,
        created_at: new Date().toISOString(),
        author: {
          username: userProfile?.username,
          full_name: userProfile?.name,
          avatar_url: userProfile?.profilePicture,
        }
      };
      
      // @ts-ignore
      addProfilePost(newPost);
      router.back();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-900">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white text-base">Cancel</Text>
        </Pressable>
        <Pressable 
          onPress={handlePost} 
          disabled={!content.trim() || loading}
          className={`px-6 py-1.5 rounded-full ${!content.trim() || loading ? 'bg-blue-500/50' : 'bg-blue-500'}`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-bold">Post</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 p-4 flex-row">
          <UserAvatar 
            username={userProfile?.username || ''} 
            avatarUrl={userProfile?.profilePicture} 
            size={45} 
          />
          <View className="flex-1 ml-3">
            <TextInput
              multiline
              autoFocus
              className="text-white text-lg mt-1"
              placeholder="What's happening?"
              placeholderTextColor="#6b7280"
              maxLength={500}
              value={content}
              onChangeText={setContent}
              style={{ textAlignVertical: 'top' }}
            />
          </View>
        </View>
        
        <View className="px-4 py-2 border-t border-gray-900 flex-row justify-end">
          <Text className={`${content.length > 480 ? 'text-red-500' : 'text-gray-600'} text-xs`}>
            {content.length}/500
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
