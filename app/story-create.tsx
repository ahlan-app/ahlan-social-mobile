// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store/AppContext.native';
import { uploadStory, cleanHtml } from '../services/apiService';
import {
  CameraIcon,
  FlipCameraIcon,
  ImageIcon,
  XIcon,
} from '../components/native/Icons';
import type { Story } from '../types';

type ViewState = 'options' | 'camera' | 'preview-image' | 'preview-text';

const GRADIENT_PRESETS = [
  ['#1e3a5f', '#0f172a'],
  ['#4a1942', '#1a0a2e'],
  ['#1a3c34', '#0a1628'],
  ['#3d1f00', '#1a0e00'],
  ['#2d1b4e', '#0e0a1a'],
  ['#5b2c6f', '#1a1a2e'],
  ['#0e4d44', '#041c2c'],
] as const;

export default function StoryCreateScreen() {
  const router = useRouter();
  const {
    userProfile,
    addUserStory,
    replaceStory,
    deleteStory,
    addToast,
    triggerHapticFeedback,
  } = useApp();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [view, setView] = useState<ViewState>('options');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [capturing, setCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image story
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  // Text story
  const [textContent, setTextContent] = useState('');
  const [gradientIndex, setGradientIndex] = useState(0);

  const handleUpload = useCallback(
    async (options: { imageUri?: string; text?: string }) => {
      if (!userProfile?.id) return;
      setIsUploading(true);

      const localId = `local-${Date.now()}`;
      const localStory: Story = {
        id: localId,
        userId: userProfile.id,
        username: userProfile.username,
        avatar: userProfile.profilePicture || null,
        timestamp: new Date().toISOString(),
        imageUrl: options.imageUri,
        content: options.text,
      };

      addUserStory(localStory);
      addToast('Uploading story...', 'info');

      try {
        if (options.imageUri) {
          const response = await fetch(options.imageUri);
          const blob = await response.blob();
          const uploadBlob = blob.type
            ? blob
            : new Blob([blob], { type: 'image/jpeg' });
          const realStory = await uploadStory(
            uploadBlob,
            caption.trim() || null,
            userProfile.id,
          );
          if (realStory) {
            replaceStory(localId, realStory);
            addToast('Story shared!', 'success');
          } else {
            throw new Error('Upload returned null');
          }
        } else if (options.text) {
          // Text-only story — skip storage upload and save only caption.
          const realStory = await uploadStory(
            null,
            options.text,
            userProfile.id,
          );
          if (realStory) {
            replaceStory(localId, realStory);
            addToast('Story shared!', 'success');
          } else {
            throw new Error('Upload returned null');
          }
        }
      } catch (error) {
        console.error('Story upload failed', error);
        deleteStory(localId);
        addToast('Failed to upload story.', 'error');
      } finally {
        setIsUploading(false);
        // Brief delay so success/error toast is visible before navigating away
        setTimeout(() => router.back(), 1200);
      }
    },
    [userProfile, addUserStory, replaceStory, deleteStory, addToast, caption, router],
  );

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    triggerHapticFeedback('medium');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setImageSrc(photo.uri);
        setView('preview-image');
      }
    } catch (error) {
      console.error('Failed to take photo', error);
      addToast('Failed to capture photo.', 'error');
    } finally {
      setCapturing(false);
    }
  }, [capturing, triggerHapticFeedback, addToast]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [9, 16],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageSrc(result.assets[0].uri);
      setView('preview-image');
    }
  }, []);

  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Required',
          'Please enable camera access in your device settings.',
        );
        return;
      }
    }
    setView('camera');
  }, [permission, requestPermission]);

  // ─── Options View ──────────────────────────────
  if (view === 'options') {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

        <View className="px-4 py-4 flex-row justify-between items-center">
          <Text className="text-white font-bold text-xl">Create Story</Text>
          <Pressable onPress={() => router.back()} className="bg-gray-800 p-2 rounded-full">
            <XIcon color="white" size={20} />
          </Pressable>
        </View>

        <View className="flex-1 justify-center items-center px-8" style={{ gap: 16 }}>
          <Pressable
            onPress={openCamera}
            className="bg-blue-500 w-full py-4 rounded-2xl items-center flex-row justify-center"
            style={{ gap: 10 }}
          >
            <CameraIcon color="white" size={24} />
            <Text className="text-white font-bold text-lg">Take a Photo</Text>
          </Pressable>

          <Pressable
            onPress={pickFromGallery}
            className="bg-gray-800 border border-gray-700 w-full py-4 rounded-2xl items-center flex-row justify-center"
            style={{ gap: 10 }}
          >
            <ImageIcon color="white" size={24} />
            <Text className="text-white font-bold text-lg">Pick from Gallery</Text>
          </Pressable>

          <Pressable
            onPress={() => setView('preview-text')}
            className="bg-gray-800 border border-gray-700 w-full py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-bold text-lg">Create Text Story</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Camera View ──────────────────────────────
  if (view === 'camera') {
    return (
      <View className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />

        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

        {/* Top */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10">
          <View className="flex-row justify-between items-center px-4 py-2">
            <Pressable
              onPress={() => setView('options')}
              className="bg-black/40 p-2 rounded-full"
            >
              <XIcon color="white" size={24} />
            </Pressable>
            <Pressable
              onPress={() => {
                triggerHapticFeedback('light');
                setFacing(prev => (prev === 'back' ? 'front' : 'back'));
              }}
              className="bg-black/40 p-2 rounded-full"
            >
              <FlipCameraIcon color="white" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Bottom */}
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-10">
          <View className="flex-row justify-around items-center pb-6 pt-4">
            <Pressable
              onPress={pickFromGallery}
              className="bg-black/40 p-3 rounded-full"
            >
              <ImageIcon color="white" size={28} />
            </Pressable>
            <Pressable
              onPress={takePhoto}
              disabled={capturing}
              className="items-center justify-center"
            >
              <View
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
                style={{ opacity: capturing ? 0.5 : 1 }}
              >
                <View className="w-16 h-16 rounded-full bg-white" />
              </View>
            </Pressable>
            <View className="w-14" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Image Preview ─────────────────────────────
  if (view === 'preview-image' && imageSrc) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="px-4 py-3 flex-row justify-between items-center">
          <Pressable
            onPress={() => {
              setImageSrc(null);
              setCaption('');
              setView('options');
            }}
          >
            <Text className="text-white text-base">Back</Text>
          </Pressable>
          <Pressable
            onPress={() => handleUpload({ imageUri: imageSrc })}
            disabled={isUploading}
            className={`px-6 py-1.5 rounded-full ${isUploading ? 'bg-blue-500/40' : 'bg-blue-500'}`}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">Share</Text>
            )}
          </Pressable>
        </View>

        {/* Preview */}
        <View className="flex-1 mx-4 rounded-2xl overflow-hidden">
          <Image
            source={{ uri: imageSrc }}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        </View>

        {/* Caption input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="px-4 py-3">
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor="#6b7280"
              className="text-white text-base bg-gray-800 rounded-xl px-4 py-3"
              multiline
              maxLength={200}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Text Story Preview ────────────────────────
  if (view === 'preview-text') {
    const currentGradient = GRADIENT_PRESETS[gradientIndex % GRADIENT_PRESETS.length];

    return (
      <SafeAreaView className="flex-1 bg-black">
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="px-4 py-3 flex-row justify-between items-center">
          <Pressable onPress={() => setView('options')}>
            <Text className="text-white text-base">Back</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!textContent.trim()) {
                addToast('Write something first!', 'error');
                return;
              }
              handleUpload({ text: cleanHtml(textContent.trim()) });
            }}
            disabled={isUploading || !textContent.trim()}
            className={`px-6 py-1.5 rounded-full ${
              isUploading || !textContent.trim() ? 'bg-blue-500/40' : 'bg-blue-500'
            }`}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold">Share</Text>
            )}
          </Pressable>
        </View>

        {/* Text story preview */}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 mx-4 rounded-2xl overflow-hidden">
            <LinearGradient
              colors={[...currentGradient]}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
            >
              <TextInput
                value={textContent}
                onChangeText={setTextContent}
                placeholder="Type your story..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                className="text-white text-2xl font-bold text-center"
                multiline
                maxLength={300}
                autoFocus
                style={{ textAlignVertical: 'center', lineHeight: 36 }}
              />
            </LinearGradient>
          </View>

          {/* Gradient picker */}
          <View className="flex-row justify-center py-4" style={{ gap: 12 }}>
            {GRADIENT_PRESETS.map((colors, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  triggerHapticFeedback('light');
                  setGradientIndex(i);
                }}
                className={`w-8 h-8 rounded-full overflow-hidden ${
                  i === gradientIndex ? 'border-2 border-white' : ''
                }`}
              >
                <LinearGradient
                  colors={[...colors]}
                  style={{ flex: 1 }}
                />
              </Pressable>
            ))}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Fallback
  return null;
}
