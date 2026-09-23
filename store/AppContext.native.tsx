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

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { publishPost, deletePost, updatePost, toggleLike as apiToggleLike, toggleRepost as apiToggleRepost, addComment as apiAddComment, getFollowingList, unfollowUser, followUser, markNotificationsAsRead, getMyStories, deleteStoryFromDatabase, toggleStoryLikeInDatabase, markMessagesAsRead as apiMarkMessagesAsRead, toggleSavePost as apiToggleSavePost, adminDeletePost, ensureCurrentUserProfile, uploadMedia, getBlockRelations, blockUserById, unblockUserById, invalidateProfileCache } from '../services/apiService';
import {
    type BlockSets,
    buildBlockSets,
    emptyBlockSets,
    isHiddenUserId,
    isHiddenUsername,
    normalizeUsername,
    sameBlockSets,
    withLegacyUsernames,
} from '../services/blockRelations';
import { supabase } from '../services/supabase.native';
import { queryKeys } from '../services/queryKeys';
import {
    queryClient,
    clearQueryCache,
    invalidateAfterBlockChange,
    invalidateAfterFollowChange,
    invalidateAfterPostChange,
    removePostFromCaches,
} from '../services/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { Comment, Post, Story, UserProfile, Toast, Notification, Message } from '../types';
import { normalizeNotifications } from '../types';

interface AppState {
    likedPosts: Set<string>;
    repostedPosts: Set<string>;
    savedPosts: Set<string>;
    postComments: Map<string, Comment[]>;
    profilePosts: Post[];
    userProfile: UserProfile;
    theme: 'light' | 'dark';
    userStories: Story[];
    storyComments: Map<string, Comment[]>;
    likedStoryIds: Set<string>;
    hasNewStory: boolean;
    viewedStoryTimestamps: Set<string>;
    isViewingStory: boolean;
    /** Two-way block sets (server-backed). */
    blocks: BlockSets;
    likedVideoIds: Set<string>;
    followedUsernames: Set<string>;
    votedPolls: Map<string, number>;
    toasts: Toast[];
    tooltip: { text: string } | null;
    notifications: Notification[] | null;
    unreadMessageCount: number;
    unreadChats: Set<string>;
    topNotification: { title: string; message: string } | null;
    isAdmin: boolean;
}

interface AppContextType extends AppState {
    togglePostLike: (postId: string) => void;
    isPostLiked: (postId: string) => boolean;
    togglePostRepost: (postId: string) => void;
    isPostReposted: (postId: string) => boolean;
    toggleSavePost: (postId: string) => void;
    isPostSaved: (postId: string) => boolean;
    postComment: (postId: string, content: string) => Promise<void>;
    getComments: (postId: string) => Comment[];
    setComments: (postId: string, comments: Comment[] | ((prev: Comment[]) => Comment[])) => void;
    areCommentsLoaded: (postId: string) => boolean;
    addProfilePost: (post: Post) => void;
    deleteProfilePost: (postId: string) => void;
    updateProfilePost: (updatedPost: Post) => void;
    setProfilePosts: (posts: Post[]) => void;
    updateProfile: (newProfile: Partial<UserProfile>) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    addUserStory: (story: Story) => void;
    deleteStory: (storyId: string) => void;
    markStoriesViewed: () => void;
    isStoryLiked: (storyId: string) => boolean;
    toggleStoryLike: (story: Story) => Promise<void>;
    getStoryComments: (storyId: string) => Comment[];
    addStoryComment: (storyId: string, comment: Comment) => void;
    setStoryComments: (storyId: string, comments: Comment[]) => void;
    markStoryAsViewed: (timestamp: string) => void;
    isStoryViewed: (timestamp: string) => boolean;
    setIsViewingStory: (isViewing: boolean) => void;
    /** Lower-case usernames I blocked (compat). */
    blockedUsers: Set<string>;
    toggleBlockUser: (username: string, userId?: string) => Promise<boolean>;
    /** True when there is a block in EITHER direction (used by every content filter). */
    isUserBlocked: (username?: string | null) => boolean;
    isUserIdBlocked: (userId?: string | null) => boolean;
    /** I blocked this user (drives the Unblock button). */
    isBlockedByMe: (username?: string | null) => boolean;
    /** This user blocked me (profile shows "account isn't available"). */
    hasBlockedMe: (username?: string | null) => boolean;
    refreshBlockRelations: () => Promise<void>;
    toggleVideoLike: (videoId: string) => void;
    isVideoLiked: (videoId: string) => boolean;
    toggleFollowUser: (username: string) => Promise<void>;
    isUserFollowed: (username: string) => boolean;
    voteInPoll: (postId: string, optionIndex: number) => void;
    getPollVote: (postId: string) => number | undefined;
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
    showTopNotification: (title: string, message: string) => void;
    triggerHapticFeedback: (style?: 'light' | 'medium' | 'heavy') => void;
    setTooltip: (tooltip: { text: string } | null) => void;
    refreshAllData: () => Promise<void>;
    markAllNotificationsAsRead: (userId?: string) => Promise<void>;
    markAllMessagesAsRead: () => Promise<void>;
    markChatAsRead: (senderId: string) => Promise<void>;
    replaceStory: (localId: string, realStory: Story) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Pre-1.0.9 blocks were usernames stored only on this device; they are
// migrated to the server once and then removed.
const LEGACY_BLOCKED_USERS_KEY = 'ahlan-blocked-users';
// The old list has no account id; the first account that signs in after the
// update owns it, so it is never applied to (or migrated onto) other accounts.
const LEGACY_BLOCKED_USERS_OWNER_KEY = 'ahlan-blocked-users-owner';
const blockCacheKey = (userId: string) => `ahlan-block-relations-v2:${userId}`;

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        return {
            likedPosts: new Set(),
            repostedPosts: new Set(),
            savedPosts: new Set(),
            postComments: new Map(),
            profilePosts: [],
            userProfile: {
                id: '',
                name: 'Ahlan User',
                username: 'ahlan_user',
                bio: 'Hello, I am using Ahlan',
                profilePicture: null,
            },
            theme: 'dark',
            userStories: [],
            storyComments: new Map(),
            likedStoryIds: new Set(),
            hasNewStory: false,
            viewedStoryTimestamps: new Set(),
            isViewingStory: false,
            blocks: emptyBlockSets(),
            likedVideoIds: new Set(),
            followedUsernames: new Set(),
            votedPolls: new Map(),
            toasts: [],
            tooltip: null,
            notifications: null,
            unreadMessageCount: 0,
            unreadChats: new Set(),
            topNotification: null,
            isAdmin: false,
        };
    });

    const legacyBlockedRef = useRef<string[]>([]);
    const userIdRef = useRef('');
    userIdRef.current = state.userProfile.id;

    const refreshBlockRelations = useCallback(async (userIdArg?: string) => {
        const userId = userIdArg || userIdRef.current;
        if (!userId) return;
        const rows = await getBlockRelations();
        if (rows === null) return; // server unavailable: keep current sets
        const next = buildBlockSets(rows, legacyBlockedRef.current);
        // Keep the same object when nothing changed so filters don't re-run.
        setState(prevState => (sameBlockSets(prevState.blocks, next) ? prevState : { ...prevState, blocks: next }));
        AsyncStorage.setItem(blockCacheKey(userId), JSON.stringify(rows)).catch(() => {});
    }, []);

    /** Loads the legacy list for this account (empty when another account owns it). */
    const loadLegacyBlocksFor = useCallback(async (userId: string): Promise<string[]> => {
        try {
            const [raw, owner] = await Promise.all([
                AsyncStorage.getItem(LEGACY_BLOCKED_USERS_KEY),
                AsyncStorage.getItem(LEGACY_BLOCKED_USERS_OWNER_KEY),
            ]);
            const parsed = raw ? JSON.parse(raw) : [];
            const names = Array.isArray(parsed)
                ? parsed.filter((item: unknown): item is string => typeof item === 'string')
                : [];
            if (names.length === 0) return [];
            if (owner && owner !== userId) return [];
            if (!owner) await AsyncStorage.setItem(LEGACY_BLOCKED_USERS_OWNER_KEY, userId);
            return names;
        } catch {
            return [];
        }
    }, []);

    // One-time: push device-only username blocks to the server.
    const migrateLegacyBlocks = useCallback(async (myId: string) => {
        legacyBlockedRef.current = await loadLegacyBlocksFor(myId);
        const names = legacyBlockedRef.current;
        if (names.length === 0) return;
        // Keep filtering them locally until the server has them.
        setState(prevState => ({ ...prevState, blocks: withLegacyUsernames(prevState.blocks, names) }));
        const { data, error } = await supabase.from('profiles').select('id, username').in('username', names);
        if (error) return;
        const results = await Promise.allSettled(
            (data || [])
                .filter((p: { id?: string }) => p.id && p.id !== myId)
                .map((p: { id: string }) => blockUserById(p.id)),
        );
        if (results.every(r => r.status === 'fulfilled')) {
            legacyBlockedRef.current = [];
            AsyncStorage.multiRemove([LEGACY_BLOCKED_USERS_KEY, LEGACY_BLOCKED_USERS_OWNER_KEY]).catch(() => {});
        }
    }, [loadLegacyBlocksFor]);

    // Fetches notifications and messages, and subscribes to real-time updates.
    useEffect(() => {
        const userId = state.userProfile.id;
        if (!userId) return;

        let notificationsChannel: any;
        let messagesChannel: any;

        const setupSubscriptions = async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select(`
                    id, type, is_read, created_at, content, comment_id,
                    sender:profiles!notifications_sender_id_fkey(id, username, avatar_url),
                    post:posts!notifications_post_id_fkey(id, content, media:image_url, media_type),
                    comment:comments!notifications_comment_id_fkey(id, text:content),
                    story:stories!notifications_story_id_fkey(id, media_url)
                `)
                .eq("receiver_id", userId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching initial notifications:", error.message || error);
            } else {
                 setState(prev => ({
                    ...prev,
                    notifications: normalizeNotifications(data || [])
                }));
            }

            // Listen for new messages in real-time
            const fetchUnreadData = async () => {
                const { data, error } = await supabase
                    .from('messages')
                    .select('sender_id')
                    .eq('receiver_id', userId)
                    .eq('seen', false);
                if (!error && data) {
                    const senderIds = data.map(m => m.sender_id);
                    const unreadChatsSet = new Set(senderIds);
                    setState(prev => ({
                        ...prev,
                        unreadMessageCount: unreadChatsSet.size,
                        unreadChats: unreadChatsSet,
                    }));
                }
            };
            fetchUnreadData();

            messagesChannel = supabase
                .channel(`public:messages-realtime-${userId}-${Date.now()}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'messages' },
                    (payload) => {
                        const newMessage = payload.new as any;
                        const oldMessage = payload.old as any;

                        if (payload.eventType === 'INSERT') {
                            if (newMessage?.receiver_id === userId || newMessage?.sender_id === userId) {
                                // Chat list order / last message changed.
                                void queryClient.invalidateQueries({ queryKey: queryKeys.chatList(userId) });
                            }
                            // Yeni mesaj geldi
                            if (newMessage.receiver_id === userId) {
                                setState(prev => {
                                    const updatedUnreadChats = new Set(prev.unreadChats);
                                    updatedUnreadChats.add(newMessage.sender_id);
                                    return {
                                        ...prev,
                                        unreadChats: updatedUnreadChats,
                                        unreadMessageCount: updatedUnreadChats.size,
                                    };
                                });
                            }
                        }

                        if (payload.eventType === 'UPDATE') {
                            // Mesaj 'seen' olduysa bildirimi kaldır
                            if (oldMessage?.seen === false && newMessage?.seen === true && newMessage.receiver_id === userId) {
                                setState(prev => {
                                    const updatedUnreadChats = new Set(prev.unreadChats);
                                    updatedUnreadChats.delete(newMessage.sender_id);
                                    return {
                                        ...prev,
                                        unreadChats: updatedUnreadChats,
                                        unreadMessageCount: updatedUnreadChats.size,
                                    };
                                });
                            }
                        }
                    }
                )
                .subscribe();
        };

        setupSubscriptions();

        return () => {
            if (notificationsChannel) supabase.removeChannel(notificationsChannel);
            if (messagesChannel) supabase.removeChannel(messagesChannel);
        };
    }, [state.userProfile.id]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = `toast-${Date.now()}`;
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            toasts: [...prevState.toasts, { id, message, type }],
        }));
    }, []);

    const showTopNotification = useCallback((title: string, message: string) => {
        setState(prevState => ({ ...prevState, topNotification: { title, message } }));
        setTimeout(() => {
            setState(prevState => ({ ...prevState, topNotification: null }));
        }, 3000);
    }, []);

    const syncUserData = useCallback(async (user: User) => {
        try {
            // Seed blocks from the last known server state so filtering works immediately.
            try {
                const cached = await AsyncStorage.getItem(blockCacheKey(user.id));
                const rows = cached ? JSON.parse(cached) : null;
                if (Array.isArray(rows)) {
                    setState(prevState => ({ ...prevState, blocks: buildBlockSets(rows, legacyBlockedRef.current) }));
                }
            } catch {
                // ignore a corrupt cache entry
            }

            await ensureCurrentUserProfile();

            // Use Promise.all to fetch profile, likes, reposts, follows, and stories concurrently for better performance.
            const [profileResult, likesResult, repostsResult, savedPostsResult, followingResult, myStoriesResult, storyLikesResult, unreadMessagesResult] = await Promise.all([
                supabase
                    .from('profiles')
                    // '*' so a missing is_admin column (before the migration) does not fail the query
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle(),
                supabase.from('likes').select('post_id').eq('user_id', user.id),
                supabase.from('reposts').select('post_id').eq('user_id', user.id),
                supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
                getFollowingList(user.id),
                getMyStories(user.id),
                supabase.from('story_likes').select('story_id').eq('user_id', user.id),
                supabase.from('messages').select('sender_id').eq('receiver_id', user.id).eq('seen', false)
            ]);

            // Destructure results
            const { data: profileData } = profileResult as any;
            const { data: likedPostsData } = likesResult as any;
            const { data: repostedPostsData } = repostsResult as any;
            const { data: savedPostsData } = savedPostsResult as any;
            const followingUsernames = followingResult as string[];
            const myStories = myStoriesResult as Story[];
            const { data: storyLikesData } = storyLikesResult as any;
            const { data: unreadMessagesData } = unreadMessagesResult;

            const unreadChats = new Set(unreadMessagesData?.map(m => m.sender_id) || []);
            const unreadMessageCount = unreadChats.size;

            // Update state in a single, batched call to avoid multiple re-renders.
            setState(prevState => {
                const newUserProfile = {
                    ...prevState.userProfile,
                    id: user.id,
                    name: user.user_metadata.full_name || profileData?.full_name || prevState.userProfile.name,
                    username: user.user_metadata.username || profileData?.username || prevState.userProfile.username,
                    profilePicture: user.user_metadata.avatar_url || profileData?.avatar_url || prevState.userProfile.profilePicture,
                    isVerified: profileData?.is_verified ?? prevState.userProfile.isVerified,
                    bio: profileData?.bio || prevState.userProfile.bio,
                };

                // Admin comes from profiles.is_admin; the username check is only a
                // fallback until the 20260923 migration has been applied.
                const isAdmin = typeof profileData?.is_admin === 'boolean'
                    ? profileData.is_admin
                    : (newUserProfile.username || '').toLowerCase() === 'ahlan';

                const newLikedPosts = (likedPostsData && Array.isArray(likedPostsData))
                    ? new Set(likedPostsData.map(l => l.post_id))
                    : prevState.likedPosts;

                const newRepostedPosts = (repostedPostsData && Array.isArray(repostedPostsData))
                    ? new Set(repostedPostsData.map(r => r.post_id))
                    : prevState.repostedPosts;

                const newSavedPosts = (savedPostsData && Array.isArray(savedPostsData))
                    ? new Set(savedPostsData.map(s => s.post_id))
                    : prevState.savedPosts;

                const newFollowedUsernames = new Set(
                    (followingUsernames || []).map((username) => username.toLowerCase())
                );

                const newLikedStoryIds = (storyLikesData && Array.isArray(storyLikesData))
                    ? new Set(storyLikesData.map(l => l.story_id))
                    : prevState.likedStoryIds;

                return {
                    ...prevState,
                    userProfile: newUserProfile,
                    likedPosts: newLikedPosts,
                    repostedPosts: newRepostedPosts,
                    savedPosts: newSavedPosts,
                    followedUsernames: newFollowedUsernames,
                    userStories: myStories,
                    likedStoryIds: newLikedStoryIds,
                    unreadMessageCount: unreadMessageCount,
                    unreadChats: unreadChats,
                    isAdmin: isAdmin,
                };
            });

            void migrateLegacyBlocks(user.id).finally(() => { void refreshBlockRelations(user.id); });
        } catch (error) {
            console.error("Error syncing user data:", error);
            addToast("Could not sync your account data. Please try again later.", "error");
        }
    }, [addToast, migrateLegacyBlocks, refreshBlockRelations]);

    // Refresh blocks when the app returns to the foreground, so a user who was
    // just blocked stops seeing the blocker.
    useEffect(() => {
        if (!state.userProfile.id) return;
        const subscription = RNAppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') void refreshBlockRelations();
        });
        return () => subscription.remove();
    }, [state.userProfile.id, refreshBlockRelations]);

    const refreshAllData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await Promise.all([
                syncUserData(user)
            ]);
        }
    }, [syncUserData]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
                // Seed the viewer id from the stored session right away so screens can
                // render their persisted query cache before the full sync finishes.
                const sessionUser = session.user;
                setState(prevState => (prevState.userProfile.id === sessionUser.id ? prevState : {
                    ...prevState,
                    userProfile: {
                        ...prevState.userProfile,
                        id: sessionUser.id,
                        username: sessionUser.user_metadata?.username || prevState.userProfile.username,
                        name: sessionUser.user_metadata?.full_name || prevState.userProfile.name,
                    },
                }));
                await syncUserData(session.user);
            } else if (event === 'SIGNED_OUT') {
                // Cached feeds, profiles and lists belong to the old account.
                void clearQueryCache();
                legacyBlockedRef.current = [];
                setState(prevState => ({
                    ...prevState,
                    likedPosts: new Set(),
                    repostedPosts: new Set(),
                    savedPosts: new Set(),
                    postComments: new Map(),
                    profilePosts: [],
                    userProfile: {
                        id: '',
                        name: 'Ahlan User',
                        username: 'ahlan_user',
                        bio: 'Hello, I am using Ahlan',
                        profilePicture: null,
                    },
                    userStories: [],
                    storyComments: new Map(),
                    likedStoryIds: new Set(),
                    hasNewStory: false,
                    viewedStoryTimestamps: new Set(),
                    isViewingStory: false,
                    likedVideoIds: new Set(),
                    followedUsernames: new Set(),
                    votedPolls: new Map(),
                    notifications: null,
                    unreadMessageCount: 0,
                    unreadChats: new Set(),
                    topNotification: null,
                    isAdmin: false,
                    blocks: emptyBlockSets(),
                }));
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [syncUserData]);

    const triggerHapticFeedback = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'light') => {
        try {
            if (style === 'heavy') {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } else if (style === 'medium') {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error("Haptics not available:", error);
        }
    }, []);

    const togglePostLike = useCallback(async (postId: string) => {
        triggerHapticFeedback();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to like posts.', 'error');
            return;
        }

        const alreadyLiked = state.likedPosts.has(postId);
        // Optimistic update
        setState(prevState => {
            const newLikedPosts = new Set(prevState.likedPosts);
            if (alreadyLiked) {
                newLikedPosts.delete(postId);
            } else {
                newLikedPosts.add(postId);
            }
            return { ...prevState, likedPosts: newLikedPosts };
        });

        try {
            await apiToggleLike(postId, user.id);
        } catch (error) {
            console.error("Failed to toggle like:", error);
            addToast('Failed to update like status.', 'error');
            // Revert on failure
            setState(prevState => {
                const newLikedPosts = new Set(prevState.likedPosts);
                if (alreadyLiked) {
                    newLikedPosts.add(postId);
                } else {
                    newLikedPosts.delete(postId);
                }
                return { ...prevState, likedPosts: newLikedPosts };
            });
        }
    }, [triggerHapticFeedback, state.likedPosts, addToast]);

    const isPostLiked = useCallback((postId: string) => state.likedPosts.has(postId), [state.likedPosts]);

    const togglePostRepost = useCallback(async (postId: string) => {
        triggerHapticFeedback();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to repost.', 'error');
            return;
        }

        const alreadyReposted = state.repostedPosts.has(postId);
        // Optimistic update
        setState(prevState => {
            const newRepostedPosts = new Set(prevState.repostedPosts);
            if (alreadyReposted) {
                newRepostedPosts.delete(postId);
                addToast('Repost removed', 'info');
            } else {
                newRepostedPosts.add(postId);
                addToast('Post reposted!', 'success');
            }
            return { ...prevState, repostedPosts: newRepostedPosts };
        });

        try {
            await apiToggleRepost(postId, user.id);
            void queryClient.invalidateQueries({ queryKey: queryKeys.userReposts(user.id) });
        } catch (error) {
            console.error("Failed to toggle repost:", error);
            addToast('Failed to update repost status.', 'error');
            // Revert on failure
            setState(prevState => {
                const newRepostedPosts = new Set(prevState.repostedPosts);
                if (alreadyReposted) {
                    newRepostedPosts.add(postId);
                } else {
                    newRepostedPosts.delete(postId);
                }
                return { ...prevState, repostedPosts: newRepostedPosts };
            });
        }
    }, [triggerHapticFeedback, state.repostedPosts, addToast]);

    const isPostReposted = useCallback((postId: string) => state.repostedPosts.has(postId), [state.repostedPosts]);

    const toggleSavePost = useCallback(async (postId: string) => {
        triggerHapticFeedback();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to save posts.', 'error');
            return;
        }

        const alreadySaved = state.savedPosts.has(postId);
        // Optimistic update
        setState(prevState => {
            const newSavedPosts = new Set(prevState.savedPosts);
            if (alreadySaved) {
                newSavedPosts.delete(postId);
                addToast('Removed from your collection.', 'info');
            } else {
                newSavedPosts.add(postId);
                addToast('Saved to your collection!', 'success');
            }
            return { ...prevState, savedPosts: newSavedPosts };
        });

        try {
            await apiToggleSavePost(postId, user.id);
            void queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts(user.id) });
        } catch (error) {
            console.error("Failed to toggle save:", error);
            addToast('Failed to update saved status.', 'error');
            // Revert on failure
            setState(prevState => {
                const newSavedPosts = new Set(prevState.savedPosts);
                if (alreadySaved) {
                    newSavedPosts.add(postId);
                } else {
                    newSavedPosts.delete(postId);
                }
                return { ...prevState, savedPosts: newSavedPosts };
            });
        }
    }, [triggerHapticFeedback, state.savedPosts, addToast]);

    const isPostSaved = useCallback((postId: string) => state.savedPosts.has(postId), [state.savedPosts]);

    const postComment = useCallback(async (postId: string, content: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to comment.', 'error');
            return;
        }

        const tempId = `temp-comment-${Date.now()}`;
        const optimisticComment: Comment = {
            id: tempId,
            userId: user.id,
            username: state.userProfile.username,
            avatar: state.userProfile.profilePicture,
            isVerified: state.userProfile.isVerified,
            text: content,
            timestamp: new Date(),
            likes: 0,
            isLiked: false,
            replies: [],
        };

        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newPostComments = new Map(prevState.postComments);
            const existingComments = newPostComments.get(postId);
            const allComments = Array.isArray(existingComments) ? existingComments : [];
            newPostComments.set(postId, [optimisticComment, ...allComments]);
            return { ...prevState, postComments: newPostComments };
        });

        try {
            const newCommentData = await apiAddComment(postId, user.id, content);

            const realComment: Comment = {
                id: newCommentData.id,
                userId: newCommentData.user_id,
                username: newCommentData.profiles?.username ?? state.userProfile.username,
                avatar: newCommentData.profiles?.avatar_url ?? state.userProfile.profilePicture,
                isVerified: Boolean(newCommentData.profiles?.is_verified),
                text: newCommentData.content,
                timestamp: new Date(newCommentData.created_at),
                likes: 0,
                isLiked: false,
                replies: [],
            };

            // FIX: Explicitly typed `prevState` as AppState.
            setState((prevState: AppState) => {
                const newPostComments = new Map(prevState.postComments);
                const postComments = newPostComments.get(postId) || [];
                const updatedComments = postComments.map(c => c.id === tempId ? realComment : c);
                newPostComments.set(postId, updatedComments);
                return { ...prevState, postComments: newPostComments };
            });

        } catch (error) {
            addToast('Failed to post comment.', 'error');
            console.error(error);
            // FIX: Explicitly typed `prevState` as AppState.
            setState((prevState: AppState) => {
                const newPostComments = new Map(prevState.postComments);
                const postComments = newPostComments.get(postId) || [];
                newPostComments.set(postId, postComments.filter(c => c.id !== tempId));
                return { ...prevState, postComments: newPostComments };
            });
        }
    }, [addToast, state.userProfile.username, state.userProfile.profilePicture, state.userProfile.isVerified]);

    const getComments = useCallback((postId: string) => state.postComments.get(postId) || [], [state.postComments]);

    /** Replaces a post's comments, or updates them from the latest list (updater). */
    const setComments = useCallback((postId: string, comments: Comment[] | ((prev: Comment[]) => Comment[])) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newPostComments = new Map(prevState.postComments);
            const current = newPostComments.get(postId) || [];
            newPostComments.set(postId, typeof comments === 'function' ? comments(current) : comments);
            return { ...prevState, postComments: newPostComments };
        });
    }, []);

    const areCommentsLoaded = useCallback((postId: string) => state.postComments.has(postId), [state.postComments]);

    const addProfilePost = useCallback(async (post: Post) => {
        // Upload local media to Supabase Storage before creating the post.
        // This ensures other users can see the image (local file:// URIs are only visible on the sender's device).
        const isLocalUri = (uri: string) =>
            uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('blob:') || uri.startsWith('data:');

        try {
            let postToPublish = { ...post };

            if (postToPublish.media && isLocalUri(postToPublish.media)) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('You must be logged in to upload media.');
                }
                try {
                    const publicUrl = await uploadMedia(postToPublish.media, user.id);
                    postToPublish.media = publicUrl;
                } catch (uploadError) {
                    console.warn('Storage upload failed, using local data URL as fallback:', uploadError);
                    // Fallback: keep the original data URL if upload fails
                    // For camera captures, the URL is already a data: URL
                    // For blob: URLs from gallery, we keep it as is (will only work on same device)
                }
            }

            const realPost = await publishPost(postToPublish);
            if (!realPost) {
                throw new Error("API returned null post.");
            }
            void invalidateAfterPostChange(state.userProfile.id);
        } catch (error) {
            console.error("Failed to publish post.", error);
            addToast('Failed to create post.', 'error');
            throw error;
        }
    }, [addToast, state.userProfile.id]);

    const deleteProfilePost = useCallback((postId: string) => {
        // Gone from every cached list right away (also posts deleted by an admin).
        removePostFromCaches(postId);
        // Optimistic update
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            profilePosts: prevState.profilePosts.filter(p => p.id !== postId),
        }));

        // If admin is deleting, call admin delete function
        const request = state.isAdmin
            ? adminDeletePost(postId).catch(err => {
                console.error("Failed to delete post as admin", err);
                addToast("Could not delete post.", "error");
            })
            : Promise.resolve(deletePost(postId));
        request.finally(() => { void invalidateAfterPostChange(state.userProfile.id, postId); });
    }, [state.isAdmin, state.userProfile.id, addToast]);

     const updateProfilePost = useCallback((updatedPost: Post) => {
        // Optimistic update
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            profilePosts: prevState.profilePosts.map(p => p.id === updatedPost.id ? updatedPost : p),
        }));
        Promise.resolve(updatePost(updatedPost)).finally(() => { void invalidateAfterPostChange(state.userProfile.id, updatedPost.id); });
    }, [state.userProfile.id]);

    const setProfilePosts = useCallback((posts: Post[]) => {
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({ ...prevState, profilePosts: posts }));
    }, []);

    const updateProfile = useCallback((newProfile: Partial<UserProfile>) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            userProfile: {
                ...prevState.userProfile,
                ...newProfile,
            }
        }));
    }, []);

    const setTheme = useCallback((theme: 'light' | 'dark') => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, theme }));
    }, []);

    const addUserStory = useCallback((story: Story) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            userStories: [story, ...prevState.userStories],
            hasNewStory: true,
        }));
    }, []);

    const deleteStory = useCallback(async (storyId: string) => {
        const { id: userId } = state.userProfile;
        if (!userId) {
            addToast('You must be logged in to delete a story.', 'error');
            return;
        }

        const originalStories = [...state.userStories];

        // Optimistic update
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            userStories: prevState.userStories.filter(s => s.id !== storyId),
        }));

        if (storyId.startsWith('local-')) {
            addToast('Story upload failed.', 'error');
            return;
        }

        try {
            const success = await deleteStoryFromDatabase(storyId);
            if (!success) {
                throw new Error("Failed to delete story from server.");
            }
            addToast('Story deleted.', 'info');
        } catch (error) {
            console.error("Failed to delete story:", error);
            addToast('Could not delete story.', 'error');
            // Revert on failure
            // FIX: Explicitly typed `prevState` as AppState.
            setState((prevState: AppState) => ({ ...prevState, userStories: originalStories }));
        }
    }, [state.userStories, state.userProfile.id, addToast]);

    const replaceStory = useCallback((localId: string, realStory: Story) => {
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            userStories: prevState.userStories.map(story => story.id === localId ? realStory : story),
        }));
    }, []);

    const markStoriesViewed = useCallback(() => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            hasNewStory: false,
        }));
    }, []);

    const isStoryLiked = useCallback((storyId: string) => state.likedStoryIds.has(storyId), [state.likedStoryIds]);

    const toggleStoryLike = useCallback(async (story: Story) => {
        triggerHapticFeedback();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to like stories.', 'error');
            return;
        }

        const storyId = story.id;
        if (storyId.startsWith('local-')) {
            addToast('Please wait for the story to finish uploading.', 'error');
            return;
        }

        const alreadyLiked = state.likedStoryIds.has(storyId);

        // Optimistic update
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => {
            const newLikedStoryIds = new Set(prevState.likedStoryIds);
            if (alreadyLiked) {
                newLikedStoryIds.delete(storyId);
            } else {
                newLikedStoryIds.add(storyId);
            }
            return { ...prevState, likedStoryIds: newLikedStoryIds };
        });

        try {
            await toggleStoryLikeInDatabase(storyId, user.id);
        } catch (error) {
            console.error("Failed to toggle story like:", error);
            addToast('Failed to update story like status.', 'error');
            // Revert on failure
            // FIX: Explicitly type prevState as AppState.
            setState((prevState: AppState) => {
                const newLikedStoryIds = new Set(prevState.likedStoryIds);
                if (alreadyLiked) {
                    newLikedStoryIds.add(storyId);
                } else {
                    newLikedStoryIds.delete(storyId);
                }
                return { ...prevState, likedStoryIds: newLikedStoryIds };
            });
        }
    }, [state.likedStoryIds, addToast, triggerHapticFeedback]);

    const getStoryComments = useCallback((storyId: string) => state.storyComments.get(storyId) || [], [state.storyComments]);

    const addStoryComment = useCallback((storyId: string, comment: Comment) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newStoryComments = new Map(prevState.storyComments);
            const comments = newStoryComments.get(storyId) || [];
            newStoryComments.set(storyId, [comment, ...comments]);
            return { ...prevState, storyComments: newStoryComments };
        });
    }, []);

    const setStoryComments = useCallback((storyId: string, comments: Comment[]) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newStoryComments = new Map(prevState.storyComments);
            newStoryComments.set(storyId, comments);
            return { ...prevState, storyComments: newStoryComments };
        });
    }, []);

    const isStoryViewed = useCallback((timestamp: string) => state.viewedStoryTimestamps.has(timestamp), [state.viewedStoryTimestamps]);

    const markStoryAsViewed = useCallback((timestamp: string) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            if (prevState.viewedStoryTimestamps.has(timestamp)) {
                return prevState;
            }
            const newViewed = new Set(prevState.viewedStoryTimestamps);
            newViewed.add(timestamp);
            return { ...prevState, viewedStoryTimestamps: newViewed };
        });
    }, []);

    const setIsViewingStory = useCallback((isViewing: boolean) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, isViewingStory: isViewing }));
    }, []);

    const isUserBlocked = useCallback((username?: string | null) => isHiddenUsername(state.blocks, username), [state.blocks]);
    const isUserIdBlocked = useCallback((userId?: string | null) => isHiddenUserId(state.blocks, userId), [state.blocks]);
    const isBlockedByMe = useCallback((username?: string | null) => {
        const name = normalizeUsername(username);
        return !!name && state.blocks.blockedUsernames.has(name);
    }, [state.blocks]);
    const hasBlockedMe = useCallback((username?: string | null) => {
        const name = normalizeUsername(username);
        return !!name && state.blocks.blockedByUsernames.has(name);
    }, [state.blocks]);

    const setLocalBlock = useCallback((id: string, name: string, blocked: boolean, restoreFollow = false) => {
        setState((prevState: AppState) => {
            const blockedIds = new Set(prevState.blocks.blockedIds);
            const blockedUsernames = new Set(prevState.blocks.blockedUsernames);
            const followedUsernames = new Set(prevState.followedUsernames);
            if (blocked) {
                blockedIds.add(id);
                blockedUsernames.add(name);
                followedUsernames.delete(name);
            } else {
                blockedIds.delete(id);
                blockedUsernames.delete(name);
                if (restoreFollow) followedUsernames.add(name);
            }
            return { ...prevState, followedUsernames, blocks: { ...prevState.blocks, blockedIds, blockedUsernames } };
        });
    }, []);

    /** Blocks or unblocks a user on the server. Resolves true on success. */
    const toggleBlockUser = useCallback(async (username: string, userId?: string): Promise<boolean> => {
        const myId = state.userProfile.id;
        const name = normalizeUsername(username);
        if (!myId) {
            addToast('You must be logged in to block users.', 'error');
            return false;
        }
        if (!name) return false;

        let targetId = userId;
        if (!targetId) {
            const { data } = await supabase.from('profiles').select('id').ilike('username', name).maybeSingle();
            targetId = (data as { id?: string } | null)?.id;
        }
        if (!targetId || targetId === myId) return false;

        const wasBlocked = state.blocks.blockedIds.has(targetId) || state.blocks.blockedUsernames.has(name);
        const wasFollowing = state.followedUsernames.has(name);
        setLocalBlock(targetId, name, !wasBlocked);
        try {
            if (wasBlocked) {
                await unblockUserById(targetId);
                legacyBlockedRef.current = legacyBlockedRef.current.filter(n => normalizeUsername(n) !== name);
                AsyncStorage.setItem(LEGACY_BLOCKED_USERS_KEY, JSON.stringify(legacyBlockedRef.current)).catch(() => {});
            } else {
                await blockUserById(targetId);
            }
            invalidateProfileCache(username);
            await refreshBlockRelations(myId);
            void invalidateAfterBlockChange();
            // The server removed follows in both directions.
            const usernames = await getFollowingList(myId);
            setState(prev => ({ ...prev, followedUsernames: new Set(usernames.map(u => u.toLowerCase())) }));
            return true;
        } catch (error) {
            console.error('Failed to toggle block:', error);
            // Roll back, including the follow removed optimistically by a failed block.
            setLocalBlock(targetId, name, wasBlocked, !wasBlocked && wasFollowing);
            addToast(wasBlocked ? 'Could not unblock this account.' : 'Could not block this account.', 'error');
            return false;
        }
    }, [state.userProfile.id, state.blocks, state.followedUsernames, addToast, refreshBlockRelations, setLocalBlock]);

    const toggleVideoLike = useCallback((videoId: string) => {
        triggerHapticFeedback();
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newLikedVideos = new Set(prevState.likedVideoIds);
            if (newLikedVideos.has(videoId)) {
                newLikedVideos.delete(videoId);
            } else {
                newLikedVideos.add(videoId);
            }
            return { ...prevState, likedVideoIds: newLikedVideos };
        });
    }, [triggerHapticFeedback]);

    const isVideoLiked = useCallback((videoId: string) => state.likedVideoIds.has(videoId), [state.likedVideoIds]);

    const toggleFollowUser = useCallback(async (username: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            addToast('You must be logged in to follow users.', 'error');
            return;
        }

        const normalizedUsername = username.trim().toLowerCase();
        if (!normalizedUsername) return;

        const { data: targetUserData, error: targetUserError } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', normalizedUsername)
            .single();

        if (targetUserError || !targetUserData) {
            addToast(`Could not find user @${username}.`, 'error');
            return;
        }
        const targetUserId = targetUserData.id;
        if (targetUserId === user.id) return;
        if (isHiddenUserId(state.blocks, targetUserId)) {
            addToast("You can't follow this account.", 'error');
            return;
        }

        const alreadyFollowing = state.followedUsernames.has(normalizedUsername);

        // Optimistic update
        setState((prevState: AppState) => {
            const newFollowed = new Set(prevState.followedUsernames);
            if (alreadyFollowing) {
                newFollowed.delete(normalizedUsername);
            } else {
                newFollowed.add(normalizedUsername);
            }
            return { ...prevState, followedUsernames: newFollowed };
        });

        try {
            if (alreadyFollowing) {
                await unfollowUser(user.id, targetUserId);
            } else {
                await followUser(user.id, targetUserId);
            }
            void invalidateAfterFollowChange(targetUserId);
            // Re-sync with database after action to ensure consistency.
            const usernames = await getFollowingList(user.id);
            setState(prev => ({
                ...prev,
                followedUsernames: new Set(usernames.map((item) => item.toLowerCase())),
            }));
        } catch (error) {
            console.error("Failed to toggle follow:", error);
            addToast('Failed to update follow status.', 'error');
            // Revert on failure
            setState((prevState: AppState) => {
                const newFollowed = new Set(prevState.followedUsernames);
                if (alreadyFollowing) {
                    newFollowed.add(normalizedUsername);
                } else {
                    newFollowed.delete(normalizedUsername);
                }
                return { ...prevState, followedUsernames: newFollowed };
            });
        }
    }, [state.followedUsernames, state.blocks, addToast]);

    const isUserFollowed = useCallback(
        (username: string) => state.followedUsernames.has(username.trim().toLowerCase()),
        [state.followedUsernames]
    );

    const voteInPoll = useCallback((postId: string, optionIndex: number) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newVotedPolls = new Map(prevState.votedPolls);
            newVotedPolls.set(postId, optionIndex);
            return { ...prevState, votedPolls: newVotedPolls };
        });
    }, []);

    const getPollVote = useCallback((postId: string) => state.votedPolls.get(postId), [state.votedPolls]);

    const markAllNotificationsAsRead = useCallback(async (userId?: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("receiver_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking notifications as read:", error.message || error);
      } else {
        const { data, error: fetchError } = await supabase
          .from("notifications")
          .select(`
              id, type, is_read, created_at, content, comment_id,
              sender:profiles!notifications_sender_id_fkey(id, username, avatar_url),
              post:posts!notifications_post_id_fkey(id, content, media:image_url, media_type),
              comment:comments!notifications_comment_id_fkey(id, text:content),
              story:stories!notifications_story_id_fkey(id, media_url)
          `)
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false });

        if (fetchError) {
            console.error("Error refetching notifications after marking as read:", fetchError.message || fetchError);
        } else {
            setState((prev: AppState) => ({
                ...prev,
                notifications: normalizeNotifications(data || []),
            }));
        }
      }
    }, []);

    const markAllMessagesAsRead = useCallback(async () => {
        const userId = state.userProfile.id;
        if (!userId || state.unreadMessageCount === 0) return;

        // Optimistic update
        // FIX: Explicitly type prev as AppState.
        setState((prev: AppState) => ({ ...prev, unreadMessageCount: 0, unreadChats: new Set() }));

        const { error } = await supabase
            .from("messages")
            .update({ seen: true })
            .eq("receiver_id", userId)
            .eq("seen", false);

        if (error) {
            console.error("Error marking all messages as read:", error.message || error);
        } else {
        }
    }, [state.userProfile.id, state.unreadMessageCount]);

    const markChatAsRead = useCallback(async (senderId: string) => {
        const userId = state.userProfile.id;
        if (!userId) return;

        // 1️⃣ Veritabanını güncelle
        const success = await apiMarkMessagesAsRead(userId, senderId);

        if (success) {
            // 2️⃣ UI'daki unread state'ini güncelle
            // FIX: Explicitly type prev as AppState.
            setState((prev: AppState) => {
                const updatedUnreadChats = new Set(prev.unreadChats);
                updatedUnreadChats.delete(senderId); // mavi/kırmızı noktayı kaldır

                return {
                    ...prev,
                    unreadChats: updatedUnreadChats,
                    unreadMessageCount: updatedUnreadChats.size,
                };
            });
        } else {
            console.error("Failed to mark chat as read");
            addToast("Couldn't mark messages as read.", 'error');
        }
    }, [state.userProfile.id, addToast]);

    const removeToast = useCallback((id: string) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            toasts: prevState.toasts.filter(toast => toast.id !== id),
        }));
    }, []);

    const setTooltip = useCallback((tooltip: { text: string } | null) => {
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({ ...prevState, tooltip }));
    }, []);

    // Notifications and unread chats from blocked accounts (either direction) are hidden everywhere.
    const visibleNotifications = useMemo(() => (
        state.notifications === null
            ? null
            : state.notifications.filter(n =>
                !isHiddenUserId(state.blocks, n.sender?.id) && !isHiddenUsername(state.blocks, n.sender?.username))
    ), [state.notifications, state.blocks]);

    const visibleUnreadChats = useMemo(() => {
        const visible = new Set<string>();
        state.unreadChats.forEach(id => {
            if (!isHiddenUserId(state.blocks, id)) visible.add(id);
        });
        return visible;
    }, [state.unreadChats, state.blocks]);

    const contextValue = useMemo(() => ({
        ...state,
        notifications: visibleNotifications,
        unreadChats: visibleUnreadChats,
        unreadMessageCount: visibleUnreadChats.size,
        blockedUsers: state.blocks.blockedUsernames,
        isUserIdBlocked,
        isBlockedByMe,
        hasBlockedMe,
        refreshBlockRelations,
        togglePostLike,
        isPostLiked,
        togglePostRepost,
        isPostReposted,
        toggleSavePost,
        isPostSaved,
        postComment,
        getComments,
        setComments,
        areCommentsLoaded,
        addProfilePost,
        deleteProfilePost,
        updateProfilePost,
        setProfilePosts,
        updateProfile,
        setTheme,
        addUserStory,
        deleteStory,
        markStoriesViewed,
        isStoryLiked,
        toggleStoryLike,
        getStoryComments,
        addStoryComment,
        setStoryComments,
        isStoryViewed,
        markStoryAsViewed,
        setIsViewingStory,
        toggleBlockUser,
        isUserBlocked,
        toggleVideoLike,
        isVideoLiked,
        toggleFollowUser,
        isUserFollowed,
        voteInPoll,
        getPollVote,
        addToast,
        removeToast,
        showTopNotification,
        triggerHapticFeedback,
        setTooltip,
        refreshAllData,
        markAllNotificationsAsRead,
        markAllMessagesAsRead,
        markChatAsRead,
        replaceStory,
    }), [
        state,
        visibleNotifications,
        visibleUnreadChats,
        isUserIdBlocked,
        isBlockedByMe,
        hasBlockedMe,
        refreshBlockRelations,
        togglePostLike,
        isPostLiked,
        togglePostRepost,
        isPostReposted,
        toggleSavePost,
        isPostSaved,
        postComment,
        getComments,
        setComments,
        areCommentsLoaded,
        addProfilePost,
        deleteProfilePost,
        updateProfilePost,
        setProfilePosts,
        updateProfile,
        setTheme,
        addUserStory,
        deleteStory,
        markStoriesViewed,
        isStoryLiked,
        toggleStoryLike,
        getStoryComments,
        addStoryComment,
        setStoryComments,
        isStoryViewed,
        markStoryAsViewed,
        setIsViewingStory,
        toggleBlockUser,
        isUserBlocked,
        toggleVideoLike,
        isVideoLiked,
        toggleFollowUser,
        isUserFollowed,
        voteInPoll,
        getPollVote,
        addToast,
        removeToast,
        showTopNotification,
        triggerHapticFeedback,
        setTooltip,
        refreshAllData,
        markAllNotificationsAsRead,
        markAllMessagesAsRead,
        markChatAsRead,
        replaceStory,
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
