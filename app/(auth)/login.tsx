import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../services/supabase.native';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let email = identifier;

      // If identifier is not an email, assume it's a username and look up email
      if (!identifier.includes('@')) {
        const { data, error: rpcError } = await supabase.rpc('get_email_by_username', {
          p_username: identifier.toLowerCase()
        });

        if (rpcError || !data) {
          throw new Error('Username not found');
        }
        email = data;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      // router.replace('/(tabs)') handled by _layout's listener
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

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
              <Text className="text-gray-400 mt-2 text-lg">Social Media App</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-400 mb-2 ml-1">Email or Username</Text>
                <TextInput
                  className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-blue-500"
                  placeholder="Enter your email or username"
                  placeholderTextColor="#6b7280"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={setIdentifier}
                />
              </View>

              <View className="mt-4">
                <Text className="text-gray-400 mb-2 ml-1">Password</Text>
                <TextInput
                  className="bg-gray-900 text-white px-4 py-4 rounded-xl border border-gray-800 focus:border-blue-500"
                  placeholder="Enter your password"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {error && (
                <View className="bg-red-900/20 border border-red-900/50 p-3 rounded-xl mt-4">
                  <Text className="text-red-500 text-center">{error}</Text>
                </View>
              )}

              <Pressable 
                onPress={handleLogin}
                disabled={loading}
                className={`mt-8 py-4 rounded-xl items-center ${loading ? 'bg-blue-500/50' : 'bg-blue-500'}`}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Login</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View className="pb-8 items-center">
            <Text className="text-gray-400">
              Don't have an account?{' '}
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text className="text-blue-500 font-bold">Sign Up</Text>
                </Pressable>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
