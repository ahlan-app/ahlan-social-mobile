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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { formatDistanceToNow } from 'date-fns';
import { useApp } from '../../store/AppContext.native';
import { createLikeGuard } from '../../services/likeGuard';
import { createFetchGuard, runFetchGuarded } from '../../services/fetchGuard';
import {
  getCommentsForPost,
  toggleCommentLike,
  getCommentLikesCount,
  isCommentLikedByUser,
  deleteComment as apiDeleteComment,
  cleanHtml,
} from '../../services/apiService';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { HeartIcon } from '../../components/native/Icons';
import type { Comment } from '../../types';

const EMPTY_COMMENTS: Comment[] = [];

const removeCommentById = (comments: Comment[], idToRemove: string): Comment[] => {
  let changed = false;
  const next: Comment[] = [];

  for (const comment of comments) {
    if (comment.id === idToRemove) {
      changed = true;
      continue;
    }

    if (comment.replies && comment.replies.length > 0) {
      const updatedReplies = removeCommentById(comment.replies, idToRemove);
      if (updatedReplies !== comment.replies) {
        changed = true;
        next.push({ ...comment, replies: updatedReplies });
        continue;
      }
    }

    next.push(comment);
  }

  return changed ? next : comments;
};

// ─── Comment Item ─────────────────────────────

const CommentItem: React.FC<{
  comment: Comment;
  onDelete: (id: string) => void | Promise<void>;
  currentUserId?: string;
  currentUsername: string;
  currentAvatar?: string;
  onViewProfile: (username: string) => void;
}> = React.memo(({ comment, onDelete, currentUserId, currentUsername, onViewProfile }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const { triggerHapticFeedback } = useApp();

  useEffect(() => {
    if (!comment.id || comment.id.startsWith('temp-')) return;
    const fetchLikes = async () => {
      try {
        const [count, liked] = await Promise.all([
          getCommentLikesCount(comment.id),
          isCommentLikedByUser(comment.id),
        ]);
        setLikesCount(count);
        setIsLiked(liked);
      } catch (error) {
        console.error('Failed to fetch comment likes', error);
      }
    };
    fetchLikes();
  }, [comment.id]);

  const likeGuardRef = useRef(createLikeGuard());

  const handleLike = async () => {
    if (!comment.id || comment.id.startsWith('temp-')) return;
    if (!likeGuardRef.current.tryAcquire()) return;
    triggerHapticFeedback();
    try {
      const newLiked = await toggleCommentLike(comment.id);
      setIsLiked(newLiked);
      setLikesCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (error) {
      console.error('Failed to toggle like', error);
    } finally {
      likeGuardRef.current.release();
    }
  };

  const canDelete = comment.userId
    ? comment.userId === currentUserId
    : comment.username === currentUsername;

  const rowContent = (
    <View className="px-4 py-3 border-b border-gray-800">
      <View className="flex-row" style={{ gap: 12 }}>
        <Pressable onPress={() => onViewProfile(comment.username)}>
          <UserAvatar username={comment.username} avatarUrl={comment.avatar} size={40} />
        </Pressable>
        <View className="flex-1">
          <Pressable onPress={() => onViewProfile(comment.username)}>
            <Text className="text-white">
              <Text className="font-bold">@{comment.username}</Text>
              {'  '}
              <Text className="text-gray-500 text-sm">
                {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
              </Text>
            </Text>
          </Pressable>
          <View className="mt-1">
            <RenderUserContent content={comment.text} className="text-white" />
          </View>
          <View className="flex-row items-center mt-2" style={{ gap: 16 }}>
            <Pressable onPress={handleLike} className="flex-row items-center" style={{ gap: 4 }}>
              <HeartIcon color={isLiked ? '#ef4444' : '#6b7280'} size={16} liked={isLiked} />
              <Text className={`text-sm ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>
                {likesCount}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  if (!canDelete) return rowContent;

  return (
    <Swipeable
      overshootRight={false}
      rightThreshold={36}
      renderRightActions={() => (
        <Pressable
          onPress={() => onDelete(comment.id)}
          className="bg-red-600 justify-center items-center px-5"
        >
          <Text className="text-white font-semibold">Delete</Text>
        </Pressable>
      )}
    >
      {rowContent}
    </Swipeable>
  );
});

// ─── Comments Screen ──────────────────────────

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { getComments, setComments, userProfile, isUserBlocked, postComment, addToast } = useApp();
  const inputRef = useRef<TextInput>(null);

  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');

  const commentsFromContext = useMemo(
    () => (postId ? getComments(postId) : EMPTY_COMMENTS),
    [getComments, postId],
  );

  // Per-postId in-flight guard. Recreated when postId changes so a
  // previous post's request can never race with a new one.
  const fetchGuardRef = useRef(createFetchGuard());

  useEffect(() => {
    // When the route param changes, drop any in-flight request for
    // the previous postId and start fresh.
    fetchGuardRef.current.abort();
    fetchGuardRef.current = createFetchGuard();
  }, [postId]);

  const loadAndSetComments = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await runFetchGuarded(fetchGuardRef.current, async (signal) => {
      try {
        const fetched = await getCommentsForPost(postId);
        if (signal?.aborted) {
          // The fetch was cancelled while in flight; do not apply
          // the stale result.
          return [];
        }
        setComments(postId, fetched);
        return fetched;
      } catch (error) {
        if ((error as { name?: string } | undefined)?.name === 'AbortError') {
          return [];
        }
        console.error('Failed to load comments', error);
        throw error;
      }
    });
    if (result.ran) {
      setLoading(false);
    }
    // When result.ran === false, a newer fetch is taking over; it
    // owns the loading state from here on, so we leave it alone.
  }, [postId, setComments]);

  useEffect(() => {
    loadAndSetComments();
    return () => {
      // On unmount, cancel any in-flight request so it can't call
      // setComments / setLoading on an unmounted component.
      fetchGuardRef.current.abort();
    };
  }, [loadAndSetComments]);

  useEffect(() => {
    const filterBlocked = (comments: Comment[]): Comment[] =>
      comments
        .filter(c => !isUserBlocked(c.username))
        .map(c => ({ ...c, replies: c.replies ? filterBlocked(c.replies) : [] }));
    setLocalComments(filterBlocked(commentsFromContext));
  }, [commentsFromContext, isUserBlocked]);

  const handleAddComment = () => {
    const text = newCommentText.trim();
    if (!text || !postId) return;
    setNewCommentText('');
    postComment(postId, cleanHtml(text));
  };

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const previous = localComments;
    const updated = removeCommentById(localComments, commentId);
    if (updated === localComments) return;

    setLocalComments(updated);
    if (postId) setComments(postId, updated);

    if (commentId.startsWith('temp-')) return;

    try {
      await apiDeleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment', error);
      addToast('Failed to delete comment.', 'error');
      setLocalComments(previous);
      if (postId) setComments(postId, previous);
    }
  }, [addToast, localComments, postId, setComments]);

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/user/${username}`);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem
        comment={item}
        onDelete={handleDeleteComment}
        currentUserId={userProfile?.id}
        currentUsername={userProfile?.username || ''}
        currentAvatar={userProfile?.profilePicture || undefined}
        onViewProfile={handleViewProfile}
      />
    ),
    [handleDeleteComment, handleViewProfile, userProfile?.id, userProfile?.username],
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Comments',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        ) : (
          <FlatList
            data={localComments}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="py-20 items-center">
                <Text className="text-gray-500 text-lg text-center">
                  No comments yet. Be the first to comment!
                </Text>
              </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
          />
        )}

        {/* Comment input */}
        <View className="border-t border-gray-800 bg-black px-3 py-2">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <UserAvatar
              username={userProfile?.username || ''}
              avatarUrl={userProfile?.profilePicture}
              size={36}
            />
            <View className="flex-1 flex-row items-center bg-gray-800 rounded-full px-4">
              <TextInput
                ref={inputRef}
                value={newCommentText}
                onChangeText={setNewCommentText}
                placeholder="Add a comment..."
                placeholderTextColor="#6b7280"
                className="flex-1 text-white py-2"
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
              />
            </View>
            <Pressable
              onPress={handleAddComment}
              disabled={!newCommentText.trim()}
            >
              <Text className={`font-semibold ${newCommentText.trim() ? 'text-blue-500' : 'text-gray-500'}`}>
                Post
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
