// Copyright 2026 Samet Yilmaz Temel
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

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../store/AppContext.native';
import { cleanHtml, uploadAvatar, updateUserProfileData } from '../services/apiService';
import UserAvatar from '../components/native/UserAvatar';
import { FlagIcon } from '../components/native/Icons';

export default function EditProfileScreen() {
  const router = useRouter();
  const { userProfile, updateProfile, addToast } = useApp();

  const [name, setName] = useState(userProfile?.name ?? '');
  const [username, setUsername] = useState(userProfile?.username ?? '');
  const [bio, setBio] = useState(userProfile?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    const originalProfile = userProfile ? { ...userProfile } : null;

    // Optimistic update — apply locally and navigate back immediately
    updateProfile({
      name,
      username,
      bio: cleanHtml(bio),
      ...(avatarUri ? { profilePicture: avatarUri } : {}),
    });
    router.back();

    // Background sync
    try {
      const promises: Promise<unknown>[] = [];

      if (avatarUri) {
        promises.push(
          fetch(avatarUri)
            .then((res) => res.blob())
            .then((blob) => uploadAvatar(blob))
        );
      }

      const hasTextChanges =
        name !== originalProfile?.name ||
        username !== originalProfile?.username ||
        bio !== (originalProfile?.bio ?? '');

      if (hasTextChanges) {
        promises.push(
          updateUserProfileData({
            name,
            username,
            bio,
          })
        );
      }

      const results = await Promise.all(promises);

      const failed = results.some((r) => r === false || r === null);
      if (failed) {
        throw new Error('One or more updates failed');
      }
    } catch {
      // Revert to original profile on failure
      if (originalProfile) {
        updateProfile(originalProfile);
      }
      addToast('Failed to save profile. Changes reverted.', 'error');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <SafeAreaView className="flex-1 bg-black">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
            <Pressable onPress={() => router.back()}>
              <Text className="text-white text-base">Cancel</Text>
            </Pressable>
            <Text className="text-white text-lg font-semibold">Edit Profile</Text>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="bg-blue-500 rounded-full px-5 py-1.5 min-w-[70px] items-center"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-sm">Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            {/* Avatar Section */}
            <View className="items-center py-6">
              <UserAvatar
                username={userProfile?.username || ''}
                avatarUrl={avatarUri ?? userProfile?.profilePicture}
                size={90}
              />
              <Pressable onPress={pickImage} className="mt-3">
                <Text className="text-blue-500 text-base font-medium">Change Photo</Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <View className="px-4 gap-5">
              {/* Name */}
              <View>
                <Text className="text-gray-400 text-sm mb-1.5">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#6b7280"
                  className="bg-gray-800 text-white rounded-lg px-4 py-3 text-base border border-gray-700"
                />
              </View>

              {/* Username */}
              <View>
                <Text className="text-gray-400 text-sm mb-1.5">Username</Text>
                <View className="flex-row items-center bg-gray-800 rounded-lg border border-gray-700">
                  <View className="pl-4 pr-1 py-3">
                    <Text className="text-gray-400 text-base">@</Text>
                  </View>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="username"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 text-white px-2 py-3 text-base"
                  />
                </View>
              </View>

              {/* Bio */}
              <View>
                <Text className="text-gray-400 text-sm mb-1.5">Bio</Text>
                <View className="relative">
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#6b7280"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="bg-gray-800 text-white rounded-lg px-4 py-3 text-base border border-gray-700 min-h-[110px]"
                  />
                  <Pressable
                    onPress={() => addToast('Flag picker coming soon', 'info')}
                    className="absolute bottom-2 right-2 p-2 rounded-full bg-gray-700"
                  >
                    <FlagIcon size={18} color="#9ca3af" />
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
