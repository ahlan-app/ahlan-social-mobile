// Copyright 2026 Samet Yilmaz Temel
// SPDX-License-Identifier: Apache-2.0
//
// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, checkUsernameExists, ensureCurrentUserProfile } from '../../services/apiService';

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase();
    setUsername(lower);

    if (lower.length > 0 && !/^[a-z0-9_.]+$/.test(lower)) {
      setUsernameError('Only lowercase letters, numbers, "_", and "." are allowed.');
    } else if (lower.length > 0 && (lower.length < 3 || lower.length > 20)) {
      setUsernameError('Username must be between 3 and 20 characters.');
    } else {
      setUsernameError('');
    }
  };

  const isFormValid =
    fullName.trim() !== '' &&
    username.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '' &&
    password === confirmPassword &&
    birthday.trim() !== '' &&
    !usernameError;

  const formattedDate = useMemo(() => {
    if (!birthday) return '';
    try {
      const parts = birthday.split('-').map(p => parseInt(p, 10));
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return 'Invalid Date';
    }
  }, [birthday]);

  const showDatePicker = () => {
    Alert.prompt(
      'Birthday',
      'Enter your birthday (YYYY-MM-DD)',
      (text) => {
        if (text && /^\d{4}-\d{2}-\d{2}$/.test(text.trim())) {
          setBirthday(text.trim());
        } else if (text) {
          Alert.alert('Invalid format', 'Please use YYYY-MM-DD format.');
        }
      },
      'plain-text',
      birthday || '',
    );
  };

  const handleSignUp = async () => {
    if (loading || usernameError) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isFormValid) {
      setError('Please fill out all fields correctly.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const isTaken = await checkUsernameExists(username);
      if (isTaken) {
        throw new Error('This username is already taken.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username,
            birthday: birthday,
            bio: 'Hello, I am using Ahlan',
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('This email is already registered. Please try logging in.');
        return;
      }

      if (data.session) {
        const profileReady = await ensureCurrentUserProfile();
        if (!profileReady) {
          throw new Error('Account created but profile initialization failed. Please try logging in again.');
        }
        // Auto-confirmed: session exists, _layout auth listener handles redirect.
        setIsSuccess(true);
        return;
      }

      if (data.user && !data.session) {
        // Email confirmation required.
        setNeedsConfirmation(true);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Email Confirmation Required Screen ────────
  if (needsConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-blue-500 text-5xl mb-4">✉</Text>
          <Text className="text-white text-2xl font-bold mb-4 text-center">
            Check your email
          </Text>
          <Text className="text-gray-400 text-center mb-2">
            We sent a verification link to
          </Text>
          <Text className="text-white font-semibold mb-6">{email}</Text>
          <Text className="text-gray-500 text-center text-sm mb-8">
            Click the link in the email to activate your account, then come back and log in.
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="bg-blue-500 px-8 py-4 rounded-xl w-full items-center"
          >
            <Text className="text-white font-bold text-lg">Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Success (auto-confirmed) Screen ───────────
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-green-500 text-6xl mb-4">✓</Text>
          <Text className="text-white text-3xl font-bold mb-4">Welcome!</Text>
          <Text className="text-gray-300 text-center mb-8">
            Your account has been created successfully.
          </Text>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text className="text-gray-500 text-sm mt-4">Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Signup Form ───────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
          <View className="flex-1 justify-center py-8">
            <View className="items-center mb-8">
              <Text
                style={{ fontFamily: 'DancingScript_700Bold' }}
                className="text-4xl text-white"
              >
                Create Account
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <TextInput
                className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800"
                placeholder="Full Name"
                placeholderTextColor="#6b7280"
                value={fullName}
                onChangeText={setFullName}
              />

              <View>
                <TextInput
                  className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800"
                  placeholder="Username"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={handleUsernameChange}
                />
                {usernameError ? (
                  <Text className="text-red-500 text-sm mt-1 ml-1">{usernameError}</Text>
                ) : null}
              </View>

              <TextInput
                className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800"
                placeholder="Email"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800"
                placeholder="Password (min. 6 characters)"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TextInput
                className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800"
                placeholder="Confirm Password"
                placeholderTextColor="#6b7280"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <Pressable
                onPress={showDatePicker}
                className="bg-gray-900 px-4 py-4 rounded-xl border border-gray-800"
              >
                <Text className={birthday ? 'text-white' : 'text-gray-500'}>
                  {birthday ? formattedDate : 'Select your birthday'}
                </Text>
              </Pressable>

              {error ? (
                <View className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl">
                  <Text className="text-red-500 text-center">{error}</Text>
                </View>
              ) : null}

              <Text className="text-gray-500 text-xs text-center mt-2">
                By creating an account you agree to the terms of service and privacy policy.
              </Text>

              <Pressable
                onPress={handleSignUp}
                disabled={loading}
                className={`py-4 rounded-xl items-center mt-2 ${loading ? 'bg-blue-500/50' : 'bg-blue-500'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Sign Up</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View className="pb-8 items-center">
            <Text className="text-gray-400">Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} className="mt-1">
              <Text className="text-blue-500 font-bold">Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
