import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store/AppContext.native';
import {
  getStories,
  getMyStories,
  getStoryViewCount,
  recordStoryView,
  replyToStory,
} from '../services/apiService';
import UserAvatar from '../components/native/UserAvatar';
import { HeartIcon, XIcon, TrashIcon, EyeIcon, SendIcon } from '../components/native/Icons';
import type { Story } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_DURATION = 15000;
const SWIPE_THRESHOLD = 60;

const GRADIENT_COLORS = [
  ['#1e3a5f', '#0f172a'],
  ['#4a1942', '#1a0a2e'],
  ['#1a3c34', '#0a1628'],
  ['#3d1f00', '#1a0e00'],
  ['#2d1b4e', '#0e0a1a'],
] as const;

export default function StoryViewerScreen() {
  const router = useRouter();
  const { index: startIndexParam } = useLocalSearchParams<{ index?: string }>();
  const {
    userProfile,
    isStoryLiked,
    toggleStoryLike,
    deleteStory,
    markStoryAsViewed,
    setIsViewingStory,
    isUserBlocked,
    triggerHapticFeedback,
    addToast,
  } = useApp();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentStory = stories[currentIndex];
  const isOwnStory = currentStory?.userId === userProfile?.id;
  const liked = currentStory ? isStoryLiked(currentStory.id) : false;

  // Load stories
  useEffect(() => {
    const load = async () => {
      try {
        const [allStories, myStories] = await Promise.all([
          getStories(),
          userProfile?.id ? getMyStories(userProfile.id) : Promise.resolve([]),
        ]);

        const filtered = allStories.filter(s => !isUserBlocked(s.username));
        const combined = [...myStories, ...filtered];
        setStories(combined);

        const startIdx = parseInt(startIndexParam || '0', 10);
        setCurrentIndex(Math.min(startIdx, Math.max(0, combined.length - 1)));
      } catch (error) {
        console.error('Failed to load stories', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userProfile?.id, isUserBlocked, startIndexParam]);

  // Mark as viewing
  useEffect(() => {
    setIsViewingStory(true);
    return () => setIsViewingStory(false);
  }, [setIsViewingStory]);

  // Record view & fetch view count
  useEffect(() => {
    if (!currentStory) return;
    markStoryAsViewed(currentStory.timestamp);

    if (isOwnStory) {
      getStoryViewCount(currentStory.id).then(setViewCount).catch(() => setViewCount(null));
    } else if (userProfile?.id) {
      recordStoryView(currentStory.id, userProfile.id).catch(() => {});
    }
  }, [currentIndex, currentStory?.id]);

  // Navigation
  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      router.back();
    }
  }, [currentIndex, stories.length, router]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Auto-advance timer
  const startTimer = useCallback(() => {
    progressAnim.setValue(0);
    timerRef.current?.stop();

    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    timerRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
  }, [progressAnim, goNext]);

  useEffect(() => {
    if (!isPaused && stories.length > 0 && !loading) {
      startTimer();
    }
    return () => timerRef.current?.stop();
  }, [currentIndex, isPaused, startTimer, loading]);

  const handleClose = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => router.back());
  }, [router, opacityAnim]);

  // Tap zones
  const handleTap = useCallback(
    (x: number) => {
      const leftZone = SCREEN_WIDTH * 0.3;
      const rightZone = SCREEN_WIDTH * 0.7;

      if (x < leftZone) {
        goPrev();
      } else if (x > rightZone) {
        goNext();
      } else {
        setIsPaused(prev => !prev);
      }
    },
    [goPrev, goNext],
  );

  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [translateX, translateY]);

  // Pan gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10,
      onPanResponderGrant: () => {
        setIsPaused(true);
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dy) > Math.abs(gs.dx)) {
          translateY.setValue(gs.dy);
        } else {
          translateX.setValue(gs.dx);
        }
      },
      onPanResponderRelease: (evt, gs) => {
        const moved = Math.abs(gs.dx) > 10 || Math.abs(gs.dy) > 10;

        if (!moved) {
          handleTap(evt.nativeEvent.pageX);
          setIsPaused(false);
          resetPosition();
          return;
        }

        if (gs.dy > SWIPE_THRESHOLD) {
          handleClose();
          return;
        }

        if (Math.abs(gs.dx) > SWIPE_THRESHOLD) {
          if (gs.dx < 0) goNext();
          else goPrev();
        }

        setIsPaused(false);
        resetPosition();
      },
      onPanResponderTerminate: () => {
        setIsPaused(false);
        resetPosition();
      },
    }),
  ).current;

  const handleLike = useCallback(() => {
    if (!currentStory) return;
    triggerHapticFeedback('medium');
    toggleStoryLike(currentStory);
  }, [currentStory, triggerHapticFeedback, toggleStoryLike]);

  const handleReply = useCallback(async () => {
    if (!replyText.trim() || !currentStory || !userProfile?.id) return;
    try {
      await replyToStory(currentStory.id, currentStory.userId, replyText.trim());
      addToast('Reply sent!', 'success');
      setReplyText('');
    } catch {
      addToast('Failed to send reply.', 'error');
    }
  }, [replyText, currentStory, userProfile?.id, addToast]);

  const handleDelete = useCallback(() => {
    if (!currentStory) return;
    triggerHapticFeedback('heavy');
    deleteStory(currentStory.id);
    setStories(prev => prev.filter(s => s.id !== currentStory.id));
    if (stories.length <= 1) {
      router.back();
    } else if (currentIndex >= stories.length - 1) {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  }, [currentStory, triggerHapticFeedback, deleteStory, stories.length, currentIndex, router]);

  // Loading
  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  // No stories
  if (!currentStory || stories.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-gray-400 text-lg">No stories to show.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-blue-500">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const gradientPair = GRADIENT_COLORS[currentIndex % GRADIENT_COLORS.length];
  const isTextStory = !currentStory.imageUrl;

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#000',
        opacity: opacityAnim,
        transform: [{ translateX }, { translateY }],
      }}
    >
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />

      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {/* Story content */}
        {isTextStory ? (
          <LinearGradient
            colors={[...gradientPair]}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}
          >
            <Text className="text-white text-2xl font-bold text-center" style={{ lineHeight: 36 }}>
              {currentStory.content}
            </Text>
          </LinearGradient>
        ) : (
          <Image
            source={{ uri: currentStory.imageUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
            transition={200}
          />
        )}

        {/* Top gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }}
        />

        {/* Bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
        />

        {/* Header */}
        <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-20">
          {/* Progress bars */}
          <View className="flex-row px-2 pt-2" style={{ gap: 3 }}>
            {stories.map((_, i) => (
              <View key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                {i < currentIndex ? (
                  <View className="flex-1 bg-white" />
                ) : i === currentIndex ? (
                  <Animated.View
                    style={{
                      height: '100%',
                      backgroundColor: 'white',
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>

          {/* User info row */}
          <View className="flex-row items-center px-4 mt-3" style={{ gap: 10 }}>
            <Pressable
              onPress={() => {
                router.back();
                setTimeout(() => router.push(`/user/${currentStory.username}`), 100);
              }}
            >
              <UserAvatar
                username={currentStory.username}
                avatarUrl={currentStory.avatar || undefined}
                size={36}
              />
            </Pressable>
            <Text className="text-white font-semibold flex-1">
              @{currentStory.username}
            </Text>

            {isPaused && (
              <Text className="text-white/60 text-xs mr-2">PAUSED</Text>
            )}

            <Pressable onPress={handleClose} className="p-1">
              <XIcon color="white" size={24} />
            </Pressable>
          </View>
        </SafeAreaView>

        {/* Footer */}
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 z-20">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {isOwnStory ? (
              <View className="flex-row items-center justify-between px-6 pb-4">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <EyeIcon color="white" size={20} />
                  <Text className="text-white font-semibold">
                    {viewCount !== null ? viewCount : '...'}
                  </Text>
                </View>
                <Pressable onPress={handleDelete} className="p-2">
                  <TrashIcon color="#ef4444" size={22} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center px-4 pb-4" style={{ gap: 12 }}>
                <View className="flex-1 flex-row items-center bg-white/10 rounded-full px-4">
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Send a reply..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    className="flex-1 text-white py-2.5"
                    returnKeyType="send"
                    onSubmitEditing={handleReply}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                  />
                  {replyText.trim() ? (
                    <Pressable onPress={handleReply} className="ml-2">
                      <SendIcon color="#3b82f6" size={20} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable onPress={handleLike}>
                  <HeartIcon color={liked ? '#ef4444' : 'white'} size={26} liked={liked} />
                </Pressable>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Animated.View>
  );
}
