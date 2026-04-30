import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import { getPostById } from '../services/apiService';
import type { Post } from '../types';

const MAX_CHARS = 280;

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { updateProfilePost, userProfile, addToast } = useApp();

  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const data = await getPostById(id);
        if (data) {
          setPost(data);
          setContent(data.content || '');
        }
      } catch (error) {
        console.error('Failed to load post for editing', error);
        addToast('Failed to load post.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSave = content.trim().length > 0 && !isSaving && post && content !== post.content && !isOverLimit;

  const handleSave = useCallback(async () => {
    if (!post || !canSave) return;
    setIsSaving(true);
    try {
      const updatedPost: Post = { ...post, content };
      updateProfilePost(updatedPost);
      addToast('Post updated.', 'success');
      if (router.canGoBack()) {
        router.back();
      }
    } catch (error) {
      console.error('Failed to update post', error);
      addToast('Failed to update post.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [post, content, canSave, updateProfilePost, addToast, router]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Edit Post',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          }}
        />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Edit Post',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          }}
        />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400 text-lg">Post not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const percentage = (charCount / MAX_CHARS) * 100;
  const ringColor = isOverLimit ? '#ef4444' : percentage > 80 ? '#f59e0b' : '#3b82f6';
  const remainingChars = MAX_CHARS - charCount;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Edit Post',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              className={`px-4 py-1.5 rounded-full ${canSave ? 'bg-blue-600' : 'bg-gray-800'}`}
            >
              <Text className={`font-semibold text-sm ${canSave ? 'text-white' : 'text-gray-500'}`}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 p-4">
          <View className="bg-gray-900 rounded-xl p-4">
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#6b7280"
              className="text-white text-lg font-medium"
              multiline
              autoFocus
              maxLength={MAX_CHARS + 50}
              style={{ minHeight: 150, textAlignVertical: 'top' }}
            />
          </View>
        </ScrollView>

        <View className="flex-shrink-0 border-t border-gray-800 bg-black p-3 flex-row items-center justify-end">
          {charCount > 0 && (
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ borderWidth: 2, borderColor: ringColor }}
              >
                {isOverLimit && (
                  <Text className="text-red-500 text-xs font-bold">!</Text>
                )}
              </View>
              <Text className={`font-semibold text-sm ${isOverLimit ? 'text-red-500' : percentage > 80 ? 'text-yellow-500' : 'text-blue-500'}`}>
                {remainingChars}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}