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
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../store/AppContext.native';
import { createLikeGuard } from '../../services/likeGuard';
import { queryKeys } from '../../services/queryKeys';
import {
  getCommentsForPost,
  toggleCommentLike,
  getCommentLikesCount,
  isCommentLikedByUser,
  deleteComment as apiDeleteComment,
  getPostOwnerId,
  cleanHtml,
} from '../../services/apiService';
import UserAvatar from '../../components/native/UserAvatar';
import RenderUserContent from '../../components/native/RenderUserContent';
import { HeartIcon, TrashIcon, VerifiedIcon } from '../../components/native/Icons';
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

/** Optimistic comments (not yet confirmed by the server) carry a temp- id. */
const isPendingComment = (comment: Comment): boolean => comment.id.startsWith('temp-');

/**
 * Comments restored from the persisted query cache are JSON, so their
 * timestamps come back as ISO strings. Turn them into Dates again.
 */
const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const normaliseComments = (comments: readonly Comment[] | null | undefined): Comment[] => {
  if (!Array.isArray(comments)) return EMPTY_COMMENTS;
  let changed = false;
  const next = comments.map((comment) => {
    const timestamp = toDate(comment.timestamp);
    const replies = Array.isArray(comment.replies) ? normaliseComments(comment.replies) : EMPTY_COMMENTS;
    if (timestamp === comment.timestamp && replies === comment.replies) return comment;
    changed = true;
    return { ...comment, timestamp, replies };
  });
  return changed ? next : (comments as Comment[]);
};

/** Cheap content fingerprint used to skip no-op syncs between cache and context. */
const commentsSignature = (comments: readonly Comment[]): string =>
  comments
    .map(c => `${c.id}|${c.username}|${c.avatar ?? ''}|${c.isVerified ? 1 : 0}|${c.text}|${c.replies?.length ?? 0}`)
    .join('\n');

const filterBlockedComments = (
  comments: Comment[],
  isUserBlocked: (username: string) => boolean,
): Comment[] =>
  comments
    .filter(c => !isUserBlocked(c.username))
    .map(c => ({ ...c, replies: c.replies ? filterBlockedComments(c.replies, isUserBlocked) : [] }));

// ─── Comment Item ─────────────────────────────

const CommentItem: React.FC<{
  comment: Comment;
  onDelete: (comment: Comment) => void | Promise<void>;
  currentUserId?: string;
  currentUsername: string;
  currentAvatar?: string;
  /** Post owners (and admins) may delete any comment on the post. */
  canModerate: boolean;
  onViewProfile: (username: string) => void;
}> = React.memo(({ comment, onDelete, currentUserId, currentUsername, canModerate, onViewProfile }) => {
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

  const isOwnComment = comment.userId
    ? comment.userId === currentUserId
    : comment.username === currentUsername;
  // A comment that is still being posted cannot be deleted yet (it would come back).
  const canDelete = !isPendingComment(comment) && (isOwnComment || canModerate);

  const rowContent = (
    <View className="px-4 py-3 border-b border-gray-800">
      <View className="flex-row" style={{ gap: 12 }}>
        <Pressable onPress={() => onViewProfile(comment.username)}>
          <UserAvatar username={comment.username} avatarUrl={comment.avatar} size={40} />
        </Pressable>
        <View className="flex-1">
          <Pressable onPress={() => onViewProfile(comment.username)} className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="text-white font-bold">@{comment.username}</Text>
            {comment.isVerified && <VerifiedIcon color="#3b82f6" size={14} />}
            <Text className="text-gray-500 text-sm">
              {'  '}{formatDistanceToNow(toDate(comment.timestamp), { addSuffix: true })}
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
            {canDelete && (
              <Pressable
                onPress={() => onDelete(comment)}
                className="flex-row items-center"
                style={{ gap: 4 }}
                hitSlop={8}
                accessibilityLabel="Delete comment"
              >
                <TrashIcon color="#9ca3af" size={16} />
                <Text className="text-gray-500 text-sm">Delete</Text>
              </Pressable>
            )}
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
          onPress={() => onDelete(comment)}
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
  const { getComments, setComments, areCommentsLoaded, userProfile, isUserBlocked, postComment, addToast, isAdmin } = useApp();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);

  // The post owner never changes, so this is served from the cache instantly.
  const { data: postOwnerId = null } = useQuery({
    queryKey: queryKeys.postOwner(postId ?? ''),
    queryFn: () => getPostOwnerId(postId as string),
    enabled: !!postId,
  });

  const isPostOwner = !!postOwnerId && postOwnerId === userProfile?.id;
  const canModerate = isAdmin || isPostOwner;

  const [newCommentText, setNewCommentText] = useState('');

  // Comments are fetched through TanStack Query (memory + disk cache) and
  // mirrored into AppContext, which stays the list's source of truth because
  // postComment() writes optimistic comments there.
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(postId ?? ''),
    queryFn: () => getCommentsForPost(postId as string),
    enabled: !!postId,
    // Cached comments render instantly; new comments from others are picked
    // up by a background refresh every time the screen opens.
    refetchOnMount: 'always',
  });
  const { data: cachedCommentsRaw, dataUpdatedAt: commentsUpdatedAt, isPending: commentsPending } = commentsQuery;

  const cachedComments = useMemo(
    () => (cachedCommentsRaw === undefined ? undefined : normaliseComments(cachedCommentsRaw)),
    [cachedCommentsRaw],
  );

  const contextLoaded = postId ? areCommentsLoaded(postId) : false;
  const commentsFromContext = useMemo(
    () => (postId && contextLoaded ? getComments(postId) : EMPTY_COMMENTS),
    [getComments, postId, contextLoaded],
  );

  // Two-way sync between the query cache and AppContext. The refs remember
  // what was last seen on each side so every change is applied exactly once
  // (no render loops):
  //  - new query data (fetch finished, cache restored from disk, or a
  //    setQueryData) is written into AppContext, keeping optimistic comments;
  //  - an AppContext change made elsewhere (postComment confirmed or rolled
  //    back) is written into the cache so reopening shows the same list.
  const syncRef = useRef<{ postId: string | null; context: Comment[] | null; updatedAt: number }>({
    postId: null,
    context: null,
    updatedAt: 0,
  });

  useEffect(() => {
    if (!postId) return;
    const prev = syncRef.current;
    const samePost = prev.postId === postId;
    let context = commentsFromContext;

    if (cachedComments !== undefined && (!samePost || commentsUpdatedAt !== prev.updatedAt)) {
      const fresh = cachedComments;
      const withPending = (current: Comment[]): Comment[] => {
        const pending = current.filter(isPendingComment);
        return pending.length > 0 ? [...pending, ...fresh] : fresh;
      };
      const merged = withPending(commentsFromContext);
      if (!contextLoaded || commentsSignature(merged) !== commentsSignature(commentsFromContext)) {
        // Updater form: merges with the latest list, so an optimistic comment
        // confirmed (or added) after this render is never overwritten or
        // left behind as a stale temp- duplicate.
        setComments(postId, withPending);
        context = merged;
      }
    } else if (
      samePost &&
      contextLoaded &&
      cachedComments !== undefined &&
      commentsFromContext !== prev.context &&
      !commentsFromContext.some(isPendingComment) &&
      commentsSignature(commentsFromContext) !== commentsSignature(cachedComments)
    ) {
      queryClient.setQueryData<Comment[]>(queryKeys.comments(postId), commentsFromContext);
    }

    syncRef.current = { postId, context, updatedAt: commentsUpdatedAt };
  }, [postId, cachedComments, commentsUpdatedAt, commentsFromContext, contextLoaded, setComments, queryClient]);

  // Until AppContext holds this post's comments, render the cached copy so
  // there is no spinner (or empty-state flash) when cached data exists.
  const sourceComments = contextLoaded ? commentsFromContext : (cachedComments ?? EMPTY_COMMENTS);

  const localComments = useMemo(
    () => filterBlockedComments(sourceComments, isUserBlocked),
    [sourceComments, isUserBlocked],
  );

  const loading = !!postId && !contextLoaded && cachedComments === undefined && commentsPending;

  const handleAddComment = () => {
    const text = newCommentText.trim();
    if (!text || !postId) return;
    setNewCommentText('');
    const targetPostId = postId;
    void postComment(targetPostId, cleanHtml(text))
      .catch((error) => console.error('Failed to post comment', error))
      .finally(() => {
        // Refresh the cached list even if this screen was closed meanwhile.
        void queryClient.invalidateQueries({ queryKey: queryKeys.comments(targetPostId), refetchType: 'all' });
      });
  };

  const deleteCommentNow = useCallback(async (commentId: string) => {
    if (!postId) return;
    // `sourceComments` may be a few renders old (captured when the Alert
    // opened), so it is only used to find the comment; every write below
    // goes through an updater on the latest list.
    const previous = sourceComments;
    if (removeCommentById(previous, commentId) === previous) return;
    const removedIndex = previous.findIndex(c => c.id === commentId);
    const removed = removedIndex >= 0 ? previous[removedIndex] : undefined;

    const key = queryKeys.comments(postId);
    const previousCache = queryClient.getQueryData<Comment[]>(key);

    setComments(postId, current => removeCommentById(current, commentId));
    if (commentId.startsWith('temp-')) return;

    // Cancel before writing: an in-flight fetch could still contain the
    // comment (the invalidate in `finally` fetches again afterwards).
    void queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<Comment[]>(key, old => (old ? removeCommentById(old, commentId) : old));

    /** Puts the comment back where it was (a nested reply restores the snapshot). */
    const restore = (current: Comment[], fallback: Comment[]): Comment[] => {
      if (!removed) return fallback;
      if (current.some(c => c.id === commentId)) return current;
      const next = current.slice();
      next.splice(Math.min(removedIndex, next.length), 0, removed);
      return next;
    };

    try {
      await apiDeleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment', error);
      addToast((error as Error)?.message || 'Failed to delete comment.', 'error');
      setComments(postId, current => restore(current, previous));
      if (previousCache !== undefined) {
        queryClient.setQueryData<Comment[]>(key, old => restore(old ?? previousCache, previousCache));
      }
    } finally {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }, [addToast, sourceComments, postId, queryClient, setComments]);

  const handleDeleteComment = useCallback((comment: Comment) => {
    const isOwn = comment.userId ? comment.userId === userProfile?.id : comment.username === userProfile?.username;
    const message = isOwn
      ? 'Your comment will be removed.'
      : isPostOwner
        ? `The comment from @${comment.username} will be removed from your post.`
        : `The comment from @${comment.username} will be removed.`;
    Alert.alert(
      'Delete comment?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { void deleteCommentNow(comment.id); } },
      ],
    );
  }, [deleteCommentNow, isPostOwner, userProfile?.id, userProfile?.username]);

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
        canModerate={canModerate}
        onViewProfile={handleViewProfile}
      />
    ),
    [handleDeleteComment, handleViewProfile, userProfile?.id, userProfile?.username, canModerate],
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
            extraData={canModerate}
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
