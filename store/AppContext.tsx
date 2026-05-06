
import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { publishPost, deletePost, updatePost, supabase, toggleLike as apiToggleLike, toggleRepost as apiToggleRepost, addComment as apiAddComment, getFollowingList, unfollowUser, followUser, markNotificationsAsRead, getMyStories, deleteStoryFromDatabase, toggleStoryLikeInDatabase, markMessagesAsRead as apiMarkMessagesAsRead, toggleSavePost as apiToggleSavePost, adminDeletePost, ensureCurrentUserProfile } from '../services/apiService';
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
    isStandalone: boolean;
    isInstallModalOpen: boolean;
    installPromptEvent: Event | null;
    blockedUsers: Set<string>;
    likedVideoIds: Set<string>;
    followedUsernames: Set<string>;
    votedPolls: Map<string, number>; // <postId, optionIndex>
    toasts: Toast[];
    tooltip: { text: string; target: HTMLElement | null } | null;
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
    setComments: (postId: string, comments: Comment[]) => void;
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
    setIsStandalone: (isStandalone: boolean) => void;
    setInstallModalOpen: (isOpen: boolean) => void;
    setInstallPromptEvent: (event: Event) => void;
    triggerInstallPrompt: () => Promise<void>;
    toggleBlockUser: (username: string) => void;
    isUserBlocked: (username: string) => boolean;
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
    setTooltip: (tooltip: { text: string; target: HTMLElement | null } | null) => void;
    refreshAllData: () => Promise<void>;
    markAllNotificationsAsRead: (userId?: string) => Promise<void>;
    markAllMessagesAsRead: () => Promise<void>;
    markChatAsRead: (senderId: string) => Promise<void>;
    replaceStory: (localId: string, realStory: Story) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const BLOCKED_USERS_KEY = 'ahlan-blocked-users';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => {
        const savedBlockedUsers = localStorage.getItem(BLOCKED_USERS_KEY);
        
        let initialBlockedUsers: string[] = [];
        if (savedBlockedUsers) {
            try {
                const parsed = JSON.parse(savedBlockedUsers);
                if (Array.isArray(parsed)) {
                    initialBlockedUsers = parsed.filter(item => typeof item === 'string');
                }
            } catch (e) {
                console.error("Could not parse blocked users from local storage", e);
            }
        }
        
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
            isStandalone: false,
            isInstallModalOpen: false,
            installPromptEvent: null,
            blockedUsers: new Set(initialBlockedUsers),
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
                .channel(`public:messages-realtime-${userId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'messages' },
                    (payload) => {
                        const newMessage = payload.new as any;
                        const oldMessage = payload.old as any;
            
                        if (payload.eventType === 'INSERT') {
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
            await ensureCurrentUserProfile();

            // Use Promise.all to fetch profile, likes, reposts, follows, and stories concurrently for better performance.
            const [profileResult, likesResult, repostsResult, savedPostsResult, followingResult, myStoriesResult, storyLikesResult, unreadMessagesResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url, is_verified, bio')
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
                
                const isAdmin = newUserProfile.username === 'ahlan';

                const newLikedPosts = (likedPostsData && Array.isArray(likedPostsData)) 
                    ? new Set(likedPostsData.map(l => l.post_id)) 
                    : prevState.likedPosts;

                const newRepostedPosts = (repostedPostsData && Array.isArray(repostedPostsData))
                    ? new Set(repostedPostsData.map(r => r.post_id))
                    : prevState.repostedPosts;
                
                const newSavedPosts = (savedPostsData && Array.isArray(savedPostsData))
                    ? new Set(savedPostsData.map(s => s.post_id))
                    : prevState.savedPosts;

                const newFollowedUsernames = new Set(followingUsernames);

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
        } catch (error) {
            console.error("Error syncing user data:", error);
            addToast("Could not sync your account data. Please try again later.", "error");
        }
    }, [addToast]);

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
                await syncUserData(session.user);
            }
        });
    
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [syncUserData]);
    
    const triggerHapticFeedback = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
        if ('vibrate' in navigator) {
            const pattern = style === 'heavy' ? [100] : style === 'medium' ? [50] : [20];
            navigator.vibrate(pattern);
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
            username: state.userProfile.username,
            avatar: state.userProfile.profilePicture,
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
                username: newCommentData.profiles.username,
                avatar: newCommentData.profiles.avatar_url,
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
    }, [addToast, state.userProfile.username, state.userProfile.profilePicture]);
    
    const getComments = useCallback((postId: string) => state.postComments.get(postId) || [], [state.postComments]);

    const setComments = useCallback((postId: string, comments: Comment[]) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newPostComments = new Map(prevState.postComments);
            newPostComments.set(postId, comments);
            return { ...prevState, postComments: newPostComments };
        });
    }, []);

    const areCommentsLoaded = useCallback((postId: string) => state.postComments.has(postId), [state.postComments]);

    const addProfilePost = useCallback(async (post: Post) => {
        // This function is now fire-and-forget. The UI will be updated
        // by the real-time listener in HomeTab / ProfileTab.
        try {
            const realPost = await publishPost(post);
            if (!realPost) {
                throw new Error("API returned null post.");
            }
        } catch (error) {
            console.error("Failed to publish post.", error);
            addToast('Failed to create post.', 'error');
        }
    }, [addToast]);


    const deleteProfilePost = useCallback((postId: string) => {
        // Optimistic update
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            profilePosts: prevState.profilePosts.filter(p => p.id !== postId),
        }));
        
        // If admin is deleting, call admin delete function
        if (state.isAdmin) {
            adminDeletePost(postId).catch(err => {
                 console.error("Failed to delete post as admin", err);
                 addToast("Could not delete post.", "error");
            });
        } else {
            deletePost(postId);
        }
    }, [state.isAdmin, addToast]);
    
     const updateProfilePost = useCallback((updatedPost: Post) => {
        // Optimistic update
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({
            ...prevState,
            profilePosts: prevState.profilePosts.map(p => p.id === updatedPost.id ? updatedPost : p),
        }));
        updatePost(updatedPost);
    }, []);
    
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

    const setIsStandalone = useCallback((isStandalone: boolean) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, isStandalone }));
    }, []);

    const setInstallModalOpen = useCallback((isOpen: boolean) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, isInstallModalOpen: isOpen }));
    }, []);

    const setInstallPromptEvent = useCallback((event: Event) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, installPromptEvent: event }));
    }, []);

    const triggerInstallPrompt = useCallback(async () => {
        const promptEvent = state.installPromptEvent as any;
        if (!promptEvent) {
            console.warn('Install prompt event not available.');
            return;
        }
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${choiceResult.outcome}`);
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => ({ ...prevState, installPromptEvent: null, isInstallModalOpen: false }));
    }, [state.installPromptEvent]);

    const isUserBlocked = useCallback((username: string) => state.blockedUsers.has(username), [state.blockedUsers]);

    const toggleBlockUser = useCallback((username: string) => {
        // FIX: Explicitly typed `prevState` as AppState.
        setState((prevState: AppState) => {
            const newBlockedUsers = new Set(prevState.blockedUsers);
            if (newBlockedUsers.has(username)) {
                newBlockedUsers.delete(username);
            } else {
                newBlockedUsers.add(username);
            }
            localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(Array.from(newBlockedUsers)));
            return { ...prevState, blockedUsers: newBlockedUsers };
        });
    }, []);

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

        if (user.user_metadata.username === username) return;

        const { data: targetUserData, error: targetUserError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
        
        if (targetUserError || !targetUserData) {
            addToast(`Could not find user @${username}.`, 'error');
            return;
        }
        const targetUserId = targetUserData.id;

        const alreadyFollowing = state.followedUsernames.has(username);

        // Optimistic update
        setState((prevState: AppState) => {
            const newFollowed = new Set(prevState.followedUsernames);
            if (alreadyFollowing) {
                newFollowed.delete(username);
            } else {
                newFollowed.add(username);
            }
            return { ...prevState, followedUsernames: newFollowed };
        });

        try {
            if (alreadyFollowing) {
                await unfollowUser(user.id, targetUserId);
            } else {
                await followUser(user.id, targetUserId);
            }
            // Re-sync with database after action to ensure consistency.
            const usernames = await getFollowingList(user.id);
            setState(prev => ({ ...prev, followedUsernames: new Set(usernames) }));
        } catch (error) {
            console.error("Failed to toggle follow:", error);
            addToast('Failed to update follow status.', 'error');
            // Revert on failure
            setState((prevState: AppState) => {
                const newFollowed = new Set(prevState.followedUsernames);
                if (alreadyFollowing) {
                    newFollowed.add(username);
                } else {
                    newFollowed.delete(username);
                }
                return { ...prevState, followedUsernames: newFollowed };
            });
        }
    }, [state.followedUsernames, addToast]);

    const isUserFollowed = useCallback((username: string) => state.followedUsernames.has(username), [state.followedUsernames]);

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
            console.log("✅ All messages marked as read.");
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

    const setTooltip = useCallback((tooltip: { text: string; target: HTMLElement | null } | null) => {
        // FIX: Explicitly type prevState as AppState.
        setState((prevState: AppState) => ({ ...prevState, tooltip }));
    }, []);


    const contextValue = useMemo(() => ({
        ...state,
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
        setIsStandalone,
        setInstallModalOpen,
        setInstallPromptEvent,
        triggerInstallPrompt,
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
        setIsStandalone, 
        setInstallModalOpen,
        setInstallPromptEvent, 
        triggerInstallPrompt, 
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
