import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Animated, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import { useApp } from '../../store/AppContext.native';
import UserAvatar from './UserAvatar';
import RenderUserContent from './RenderUserContent';
import {
  HeartIcon,
  CommentIcon,
  RepostIcon,
  BookmarkIcon,
  TrashIcon,
  VerifiedIcon,
  ThreeDotsVerticalIcon,
  ShareIOSIcon,
  ReportIcon,
  ArrowLeftIcon,
  PencilAltIcon,
} from './Icons';
import { reportPost } from '../../services/apiService';
import type { Post } from '../../types';

// ─── Helpers ───────────────────────────────────────

const getTimeAgo = (timestamp?: string): string => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMin = differenceInMinutes(now, date);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = differenceInHours(now, date);
    if (diffH < 24) return `${diffH}h`;
    const diffD = differenceInDays(now, date);
    if (diffD < 7) return `${diffD}d`;
    const diffM = differenceInMonths(now, date);
    if (diffM < 1) return `${differenceInWeeks(now, date)}w`;
    if (diffM < 12) return `${diffM}m`;
    return `${differenceInYears(now, date)}y`;
  } catch {
    return '';
  }
};

const MAX_CHARS = 280;

// ─── Props ─────────────────────────────────────────

interface PostCardProps {
  post: Post;
  isStoryVersion?: boolean;
  onDelete?: (postId: string) => void;
  onEditPost?: (post: Post) => void;
  onViewProfile?: (username: string, avatar?: string | null) => void;
  onViewComments?: (postId: string) => void;
  onViewLikers?: (postId: string) => void;
  onViewReposters?: (postId: string) => void;
  onSharePost?: (post: Post) => void;
  isPreview?: boolean;
}

// ─── PostHeader ────────────────────────────────────

const PostHeader: React.FC<{
  post: Post;
  isMyPost: boolean;
  isTextOnly: boolean;
  isImage: boolean;
  onViewProfile: () => void;
  onDelete: () => void;
  onEditPost?: () => void;
  isPreview?: boolean;
}> = React.memo(({ post, isMyPost, isTextOnly, isImage, onViewProfile, onDelete, onEditPost, isPreview }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { addToast, isAdmin } = useApp();

  const reportReasons = [
    "It's spam",
    'Hate speech or symbols',
    'Harassment or bullying',
    'False information',
    'Nudity or sexual activity',
    "I just don't like it",
  ];

  const textColor = isTextOnly || isImage ? 'text-white' : 'text-white';

  const handleReport = async (reason: string) => {
    setMenuVisible(false);
    setShowReport(false);
    const success = await reportPost(post.id, reason);
    if (success) {
      addToast('Report submitted. Thank you for your feedback.', 'success');
    } else {
      addToast('Failed to submit report. Please try again.', 'error');
    }
  };

  return (
    <View className="flex-row" style={{ gap: 12 }}>
      <Pressable onPress={onViewProfile} className="rounded-full">
        <UserAvatar
          username={post.username}
          avatarUrl={post.avatar}
          size={44}
        />
      </Pressable>

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              <Pressable onPress={onViewProfile}>
                <Text className={`font-bold ${textColor}`}>@{post.username}</Text>
              </Pressable>
              {post.isVerified && <VerifiedIcon color="#3b82f6" size={16} />}
            </View>
            <Text className="text-gray-400 text-sm">{post.name || post.username}</Text>
          </View>

          {!isPreview && (
            <Pressable
              onPress={() => { setMenuVisible(true); setShowReport(false); }}
              className="p-2 rounded-full"
              hitSlop={8}
            >
              <ThreeDotsVerticalIcon color={isImage ? '#e5e7eb' : '#9ca3af'} size={18} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            className="bg-gray-900 rounded-t-2xl pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            {!showReport ? (
              <View className="pt-4">
                <View className="w-10 h-1 bg-gray-700 rounded-full self-center mb-4" />
                {(isMyPost || isAdmin) ? (
                  <>
                    {isMyPost && post.media_type === 'text' && onEditPost && (
                      <Pressable
                        onPress={() => { setMenuVisible(false); onEditPost(); }}
                        className="flex-row items-center px-6 py-4"
                      >
                        <PencilAltIcon color="#3b82f6" size={20} />
                        <Text className="text-blue-400 text-base ml-3">Edit Post</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => { setMenuVisible(false); onDelete(); }}
                      className="flex-row items-center px-6 py-4"
                    >
                      <TrashIcon color="#ef4444" size={20} />
                      <Text className="text-red-500 text-base ml-3">Delete Post</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setShowReport(true)}
                    className="flex-row items-center justify-between px-6 py-4"
                  >
                    <View className="flex-row items-center">
                      <ReportIcon color="#ef4444" size={20} />
                      <Text className="text-red-500 text-base ml-3">Report Post</Text>
                    </View>
                    <Text className="text-gray-500 text-lg">&rsaquo;</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View className="pt-4">
                <View className="flex-row items-center px-4 pb-3 border-b border-gray-800">
                  <Pressable onPress={() => setShowReport(false)} className="p-2">
                    <ArrowLeftIcon color="#fff" size={18} />
                  </Pressable>
                  <Text className="text-white font-bold text-base ml-2">
                    Why are you reporting this?
                  </Text>
                </View>
                {reportReasons.map(reason => (
                  <Pressable
                    key={reason}
                    onPress={() => handleReport(reason)}
                    className="px-6 py-3"
                  >
                    <Text className="text-white text-base">{reason}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

// ─── PostCard ──────────────────────────────────────

const PostCard: React.FC<PostCardProps> = ({
  post,
  isStoryVersion = false,
  onDelete,
  onEditPost,
  onViewProfile,
  onViewComments,
  onViewLikers,
  onViewReposters,
  onSharePost,
  isPreview = false,
}) => {
  const {
    isPostLiked,
    togglePostLike,
    areCommentsLoaded,
    userProfile,
    deleteProfilePost,
    getComments,
    voteInPoll,
    getPollVote,
    addToast,
    isPostReposted,
    togglePostRepost,
    isPostSaved,
    toggleSavePost,
    isAdmin,
    triggerHapticFeedback,
  } = useApp();
  const router = useRouter();

  const liked = isPostLiked(post.id);
  const reposted = isPostReposted(post.id);
  const saved = isPostSaved(post.id);

  const [showHeart, setShowHeart] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [repostsCount, setRepostsCount] = useState(post.reposts);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const heartScale = useRef(new Animated.Value(0)).current;

  const isTextOnly = post.media_type === 'text';
  const isImage = post.media_type === 'image';
  const timeAgo = getTimeAgo(post.timestamp);

  const comments = getComments(post.id);
  const hasLoadedComments = areCommentsLoaded(post.id);
  const commentCount = hasLoadedComments ? comments.length : post.replies;
  const isMyPost = post.username === userProfile?.username;

  const userPollVote = getPollVote(post.id);
  const totalVotes = post.poll
    ? post.poll.options.reduce((sum, opt) => sum + opt.votes, 0) + (userPollVote !== undefined ? 1 : 0)
    : 0;

  const needsTruncation = isTextOnly && post.content.length > MAX_CHARS;

  // Sync counts from parent
  useEffect(() => { setLikesCount(post.likes); }, [post.likes]);
  useEffect(() => { setRepostsCount(post.reposts); }, [post.reposts]);

  // ─── Handlers ──────────────────────────────────

  const handleLike = useCallback(async () => {
    if (isStoryVersion || isLiking) return;
    setIsLiking(true);
    setLikesCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
    triggerHapticFeedback('light');
    try {
      await togglePostLike(post.id);
    } finally {
      setIsLiking(false);
    }
  }, [isStoryVersion, isLiking, liked, post.id]);

  const handleRepost = useCallback(async () => {
    if (isStoryVersion || isReposting) return;
    setIsReposting(true);
    setRepostsCount(prev => reposted ? Math.max(0, prev - 1) : prev + 1);
    try {
      await togglePostRepost(post.id);
    } finally {
      setIsReposting(false);
    }
  }, [isStoryVersion, isReposting, reposted, post.id]);

  const handleDoubleTap = useCallback(() => {
    if (isStoryVersion) return;
    if (!liked) handleLike();
    setShowHeart(true);
    triggerHapticFeedback('medium');
    // Animate heart
    heartScale.setValue(0.5);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.2, useNativeDriver: true, speed: 50 }),
      Animated.timing(heartScale, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowHeart(false));
  }, [isStoryVersion, liked]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (onDelete) onDelete(post.id);
          else deleteProfilePost(post.id);
        },
      },
    ]);
  }, [post.id, onDelete]);

  const handleViewProfile = useCallback(() => {
    if (onViewProfile) {
      onViewProfile(post.username, post.avatar);
    } else {
      router.push(`/user/${post.username}`);
    }
  }, [post.username, post.avatar]);

  const handlePollVote = (optionIndex: number) => {
    if (userPollVote !== undefined) return;
    voteInPoll(post.id, optionIndex);
    addToast('Your vote has been cast!', 'success');
  };

  // Last tap tracking for double tap
  const lastTap = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  }, [handleDoubleTap]);

  // ─── Render ────────────────────────────────────

  const aspectRatio = post.media_aspect_ratio || 1080 / 1350;

  return (
    <View className="mx-2 mb-2">
      <Pressable
        onPress={handleTap}
        className={`relative rounded-xl overflow-hidden ${isTextOnly ? 'bg-gray-700' : 'bg-[#15181d]'}`}
      >
        {/* Header */}
        <View
          className={`p-4 ${isImage ? 'absolute top-0 left-0 right-0 z-10' : ''}`}
          style={isImage ? { backgroundColor: 'rgba(0,0,0,0.4)' } : undefined}
        >
          <PostHeader
            post={post}
            isMyPost={isMyPost}
            isTextOnly={isTextOnly}
            isImage={isImage}
            onViewProfile={handleViewProfile}
            onDelete={handleDelete}
            onEditPost={onEditPost ? () => onEditPost(post) : undefined}
            isPreview={isPreview}
          />
        </View>

        {/* Content */}
        {isTextOnly ? (
          <View className="px-6 pb-4" style={{ minHeight: 200, justifyContent: 'center' }}>
            <RenderUserContent
              content={
                needsTruncation && !isExpanded
                  ? `${post.content.substring(0, MAX_CHARS)}...`
                  : post.content
              }
              className="text-white text-lg font-medium"
            />
            {needsTruncation && !isExpanded && (
              <Pressable onPress={() => setIsExpanded(true)} className="mt-2">
                <Text className="text-blue-400 font-semibold">Read more</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {post.media && (
              <View style={{ aspectRatio, backgroundColor: '#000' }}>
                <Image
                  source={{ uri: post.media }}
                  placeholder={post.media_preview_url ? { uri: post.media_preview_url } : undefined}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  transition={300}
                />
              </View>
            )}
            {(post.content || post.poll) && (
              <View className="p-4 pt-2">
                {post.content && (
                  <RenderUserContent
                    content={post.content}
                    className="text-white mb-3"
                  />
                )}
                {post.poll && (
                  <View style={{ gap: 8 }} className="mt-2">
                    {post.poll.options.map((option, index) => {
                      const pct =
                        totalVotes > 0
                          ? ((option.votes + (userPollVote === index ? 1 : 0)) / totalVotes) * 100
                          : 0;
                      return (
                        <Pressable
                          key={index}
                          onPress={() => handlePollVote(index)}
                          disabled={userPollVote !== undefined}
                          className="rounded-lg border border-gray-700 overflow-hidden p-3"
                        >
                          {userPollVote !== undefined && (
                            <View
                              className="absolute top-0 left-0 bottom-0 bg-blue-500/20"
                              style={{ width: `${pct}%` }}
                            />
                          )}
                          <View className="flex-row justify-between items-center">
                            <Text
                              className={`font-semibold ${userPollVote === index ? 'text-blue-500' : 'text-white'}`}
                            >
                              {option.text}
                            </Text>
                            {userPollVote !== undefined && (
                              <Text className="text-sm text-gray-400 font-bold">
                                {pct.toFixed(0)}%
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Action Buttons */}
        {!isStoryVersion && (
          <View className="flex-row justify-between items-center px-4 pb-3 pt-1">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              {/* Like */}
              <Pressable
                onPress={handleLike}
                onLongPress={() => onViewLikers?.(post.id)}
                disabled={isLiking}
                className="flex-row items-center"
                hitSlop={6}
              >
                <HeartIcon liked={liked} color={liked ? '#ef4444' : '#9ca3af'} size={20} />
                <Text className="text-sm text-gray-400 ml-1">{likesCount}</Text>
              </Pressable>

              {/* Comment */}
              <Pressable
                onPress={() => onViewComments?.(post.id)}
                className="flex-row items-center"
                hitSlop={6}
              >
                <CommentIcon color="#9ca3af" size={20} />
                <Text className="text-sm text-gray-400 ml-1">{commentCount}</Text>
              </Pressable>

              {/* Repost */}
              <Pressable
                onPress={handleRepost}
                onLongPress={() => onViewReposters?.(post.id)}
                disabled={isReposting}
                className="flex-row items-center"
                hitSlop={6}
              >
                <RepostIcon color={reposted ? '#3b82f6' : '#9ca3af'} size={20} />
                <Text className="text-sm text-gray-400 ml-1">{repostsCount}</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text className="text-xs text-gray-500">{timeAgo}</Text>
              <Pressable onPress={() => toggleSavePost(post.id)} hitSlop={6}>
                <BookmarkIcon saved={saved} color={saved ? '#3b82f6' : '#9ca3af'} size={20} />
              </Pressable>
              <Pressable onPress={() => onSharePost?.(post)} hitSlop={6}>
                <ShareIOSIcon color="#9ca3af" size={20} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Double-tap heart overlay */}
        {showHeart && (
          <View
            className="absolute inset-0 justify-center items-center"
            pointerEvents="none"
          >
            <Animated.View style={{ transform: [{ scale: heartScale }], opacity: heartScale }}>
              <HeartIcon liked color="rgba(255,255,255,0.8)" size={100} />
            </Animated.View>
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default React.memo(PostCard);
