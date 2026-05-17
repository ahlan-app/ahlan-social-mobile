// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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

import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../services/supabase.native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: 'ahlan://reset-password',
        }
      );

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      console.error('[ForgotPassword] Error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-blue-500 text-5xl mb-4">✉</Text>
          <Text className="text-white text-2xl font-bold mb-4 text-center">
            Check your email
          </Text>
          <Text className="text-gray-400 text-center mb-2">
            We sent a password reset link to
          </Text>
          <Text className="text-white font-semibold mb-6">{email.trim()}</Text>
          <Text className="text-gray-500 text-center text-sm mb-8">
            Click the link in the email to reset your password, then come back and log in.
          </Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            className="bg-blue-500 px-8 py-4 rounded-xl w-full items-center"
          >
            <Text className="text-white font-bold text-lg">Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
          <View className="flex-1 justify-center py-12">
            <View className="items-center mb-10">
              <Text style={{ fontFamily: 'DancingScript_700Bold' }} className="text-5xl text-blue-500">
                Ahlan
              </Text>
              <Text className="text-gray-400 mt-2 text-lg">Reset your password</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-400 mb-2 ml-1">Email</Text>
                <TextInput
                  className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-blue-500"
                  placeholder="Enter your email address"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {error && (
                <View className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl mt-4">
                  <Text className="text-red-500 text-center">{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleResetPassword}
                disabled={loading}
                className={`mt-8 py-4 rounded-xl items-center ${loading ? 'bg-blue-500/50' : 'bg-blue-500'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Send Reset Link</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View className="pb-8 items-center">
            <Text className="text-gray-400">
              Remember your password?{' '}
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text className="text-blue-500 font-bold">Log in</Text>
                </Pressable>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}