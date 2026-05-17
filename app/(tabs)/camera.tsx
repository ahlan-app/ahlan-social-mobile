// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
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
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../store/AppContext.native';
import { uploadStory } from '../../services/apiService';
import {
  CameraIcon,
  FlipCameraIcon,
  ImageIcon,
  XIcon,
} from '../../components/native/Icons';
import type { Story } from '../../types';

export default function CameraScreen() {
  const router = useRouter();
  const { userProfile, addUserStory, replaceStory, deleteStory, addToast, triggerHapticFeedback } = useApp();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const toggleFacing = useCallback(() => {
    triggerHapticFeedback('light');
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  }, [triggerHapticFeedback]);

  const handleUploadStory = useCallback(async (uri: string) => {
    if (!userProfile?.id || uploading) return;

    const localId = `local-${Date.now()}`;
    const localStory: Story = {
      id: localId,
      userId: userProfile.id,
      username: userProfile.username,
      avatar: userProfile.profilePicture || null,
      timestamp: new Date().toISOString(),
      imageUrl: uri,
    };

    addUserStory(localStory);
    setUploading(true);
    addToast('Uploading story...', 'info');

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadBlob = blob.type
        ? blob
        : new Blob([blob], { type: 'image/jpeg' });
      const realStory = await uploadStory(uploadBlob, null, userProfile.id);
      if (realStory) {
        replaceStory(localId, realStory);
        addToast('Story shared! ✨', 'success');
      } else {
        deleteStory(localId);
        addToast('Failed to upload story.', 'error');
      }
    } catch (error) {
      console.error('Story upload failed', error);
      deleteStory(localId);
      addToast('Failed to upload story.', 'error');
    } finally {
      setUploading(false);
      // Small delay so toast is visible
      setTimeout(() => router.navigate('/(tabs)'), 1000);
    }
  }, [userProfile, uploading, addUserStory, replaceStory, deleteStory, addToast, router]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    triggerHapticFeedback('medium');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        Alert.alert('Share as', 'What would you like to do with this photo?', [
          {
            text: 'Story',
            onPress: () => handleUploadStory(photo.uri),
          },
          {
            text: 'Post',
            onPress: () =>
              router.push({
                pathname: '/compose',
                params: { mediaUri: photo.uri, mediaType: 'image' },
              }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    } catch (error) {
      console.error('Failed to take photo', error);
      addToast('Failed to capture photo.', 'error');
    } finally {
      setCapturing(false);
    }
  }, [capturing, triggerHapticFeedback, handleUploadStory, router, addToast]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      Alert.alert('Share as', 'What would you like to do with this photo?', [
        {
          text: 'Story',
          onPress: () => handleUploadStory(uri),
        },
        {
          text: 'Post',
          onPress: () =>
            router.push({
              pathname: '/compose',
              params: { mediaUri: uri, mediaType: 'image' },
            }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [handleUploadStory, router]);

  // Permission not determined
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <Text className="text-gray-400">Loading camera...</Text>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center px-8">
        <CameraIcon color="#6b7280" size={64} />
        <Text className="text-white text-xl font-bold mt-6 mb-2 text-center">
          Camera Access Required
        </Text>
        <Text className="text-gray-400 text-center mb-6">
          Allow camera access to take photos and create stories.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-blue-500 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold text-base">Grant Access</Text>
        </Pressable>
        <Pressable onPress={pickFromGallery} className="mt-4">
          <Text className="text-blue-500 font-semibold">Pick from Gallery instead</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Uploading overlay */}
      {uploading && (
        <View className="absolute inset-0 bg-black/70 z-20 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white mt-4 font-semibold text-lg">Uploading story...</Text>
        </View>
      )}

      {/* Top controls */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10">
        <View className="flex-row justify-between items-center px-4 py-2">
          <Pressable
            onPress={() => router.back()}
            className="bg-black/40 p-2 rounded-full"
          >
            <XIcon color="white" size={24} />
          </Pressable>
          <Pressable
            onPress={toggleFacing}
            className="bg-black/40 p-2 rounded-full"
          >
            <FlipCameraIcon color="white" size={24} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-10">
        <View className="flex-row justify-around items-center pb-6 pt-4">
          {/* Gallery */}
          <Pressable
            onPress={pickFromGallery}
            className="bg-black/40 p-3 rounded-full"
          >
            <ImageIcon color="white" size={28} />
          </Pressable>

          {/* Capture */}
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

          {/* Placeholder for symmetry */}
          <View className="w-14" />
        </View>
      </SafeAreaView>
    </View>
  );
}
