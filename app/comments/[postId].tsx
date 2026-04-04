import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { formatDistanceToNow } from 'date-fns';
import { useApp } from '../../store/AppContext.native';
import {
  getCommentsForPost,
  toggleCommentLike,
  getCommentLikesCount,
  isCommentLikedByUser,
  cleanHtml,
} from '../../services/apiService';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { HeartIcon } from '../../components/native/Icons';
import type { Comment } from '../../types';

// ─── Comment Item ─────────────────────────────

const CommentItem: React.FC<{
  comment: Comment;
  onDelete: (id: string) => void;
  currentUsername: string;
  currentAvatar?: string;
  onViewProfile: (username: string) => void;
}> = React.memo(({ comment, onDelete, currentUsername, onViewProfile }) => {
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

  const handleLike = async () => {
    if (!comment.id || comment.id.startsWith('temp-')) return;
    triggerHapticFeedback();
    try {
      const newLiked = await toggleCommentLike(comment.id);
      setIsLiked(newLiked);
      setLikesCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (error) {
      console.error('Failed to toggle like', error);
    }
  };

  return (
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
            {comment.username === currentUsername && (
              <Pressable onPress={() => onDelete(comment.id)}>
                <Text className="text-gray-500 text-sm">Delete</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── Comments Screen ──────────────────────────

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const { getComments, setComments, userProfile, isUserBlocked, postComment } = useApp();
  const inputRef = useRef<TextInput>(null);

  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');

  const commentsFromContext = getComments(postId || '');

  const loadAndSetComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const fetched = await getCommentsForPost(postId);
      setComments(postId, fetched);
    } catch (error) {
      console.error('Failed to load comments', error);
    } finally {
      setLoading(false);
    }
  }, [postId, setComments]);

  useEffect(() => {
    loadAndSetComments();
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

  const handleDeleteComment = (commentId: string) => {
    const removeComment = (comments: Comment[], idToRemove: string): Comment[] =>
      comments
        .filter(c => c.id !== idToRemove)
        .map(c => ({ ...c, replies: c.replies ? removeComment(c.replies, idToRemove) : [] }));

    const updated = removeComment(localComments, commentId);
    setLocalComments(updated);
    if (postId) setComments(postId, updated);
  };

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/user/${username}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem
        comment={item}
        onDelete={handleDeleteComment}
        currentUsername={userProfile?.username || ''}
        currentAvatar={userProfile?.profilePicture || undefined}
        onViewProfile={handleViewProfile}
      />
    ),
    [userProfile?.username, handleViewProfile],
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
