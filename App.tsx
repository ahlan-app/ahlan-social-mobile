
import React, { useState, useRef, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import HomeTab from './components/tabs/HomeTab';
import SearchTab from './components/tabs/SearchTab';
import ProfileTab from './components/tabs/ProfileTab';
import { BellIcon, CommentIcon, MenuIcon } from './components/Icons';
import BottomNavigationBar from './components/BottomNavigationBar';
import LoginScreen from './components/screens/LoginScreen';
import SignUpScreen from './components/screens/SignUpScreen';
import StoryCreator from './components/StoryCreator';
import StoryReel from './components/StoryReel';
import { getStories, getPostById, supabase, getUserProfile, getStoryById, prefetchUserProfile } from './services/apiService';
import type { Story, Post, SimpleUser, Toast as ToastType, Notification } from './types';
import TooltipRenderer from './components/TooltipRenderer';

// --- Lazy-loaded Components ---
const CameraTab = lazy(() => import('./components/tabs/CameraTab'));
const ComposePostScreen = lazy(() => import('./components/screens/ComposePostScreen'));
const NotificationsScreen = lazy(() => import('./components/screens/NotificationsScreen'));
const MessagesScreen = lazy(() => import('./components/screens/MessagesScreen'));
const UserProfileScreen = lazy(() => import('./components/screens/UserProfileScreen'));
const StoryViewer = lazy(() => import('./components/screens/StoryViewer'));
const StoryCreationScreen = lazy(() => import('./components/screens/StoryCreationScreen'));
const ShareChoiceScreen = lazy(() => import('./components/screens/ShareChoiceScreen'));
const ComposeMediaPostScreen = lazy(() => import('./components/screens/ComposeMediaPostScreen'));
const SettingsScreen = lazy(() => import('./components/screens/SettingsScreen'));
const InstallAppModal = lazy(() => import('./components/screens/InstallAppModal'));
const CommentsScreen = lazy(() => import('./components/screens/CommentsScreen'));
const PostViewerScreen = lazy(() => import('./components/screens/PostViewerScreen'));
const UserListScreen = lazy(() => import('./components/screens/UserListScreen'));
const EditPostScreen = lazy(() => import('./components/screens/EditPostScreen'));
const ShareScreen = lazy(() => import('./components/screens/ShareScreen'));
const PrivacyPolicyScreen = lazy(() => import('./components/screens/PrivacyPolicyScreen'));
const TermsOfServiceScreen = lazy(() => import('./components/screens/TermsOfServiceScreen'));

const FullscreenSpinner: React.FC = () => (
    <div className="loading-spinner-overlay">
        <div className="loading-spinner"></div>
    </div>
);


// This handler will automatically reload the app when a new version is activated.
const AutomaticUpdateHandler: React.FC = () => {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            let refreshing = false;
            // This event fires when the new service worker has taken control.
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }
    }, []);

    return null;
};

const Toast: React.FC<{ toast: ToastType; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="bg-gray-800 text-white py-2 px-4 rounded-full shadow-lg">
            {toast.message}
        </div>
    );
};

const ToastsContainer: React.FC = () => {
    const { toasts, removeToast } = useApp();
    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};


type Screen = 'home' | 'search' | 'camera' | 'compose' | 'profile' | 'notifications' | 'messages';

interface NavigationState {
    activeScreen: Screen;
    viewingUser: { username: string; avatar: string } | null;
    isComposeOpen: boolean;
    isViewingStories: boolean;
    storyViewerProps: { stories: Story[]; initialIndex: number } | null;
    isCreatingStory: boolean;
    isSettingsOpen: boolean;
    viewingCommentsForPostId: string | null;
    viewingPosts: { posts: Post[]; initialPostId: string } | null;
    viewingInteractionList: { title: 'Likes' | 'Reposts'; users: SimpleUser[] } | null;
    editingPost: Post | null;
    chattingWithUser: { username: string; avatar: string } | null;
    postToShare?: Post | null;
    userToShare?: SimpleUser | null;
    isPrivacyPolicyOpen: boolean;
    isTermsOfServiceOpen: boolean;
}

const initialNavigationState: NavigationState = {
    activeScreen: 'home',
    viewingUser: null,
    isComposeOpen: false,
    isViewingStories: false,
    storyViewerProps: null,
    isCreatingStory: false,
    isSettingsOpen: false,
    viewingCommentsForPostId: null,
    viewingPosts: null,
    viewingInteractionList: null,
    editingPost: null,
    chattingWithUser: null,
    postToShare: null,
    userToShare: null,
    isPrivacyPolicyOpen: false,
    isTermsOfServiceOpen: false,
};

// FIX: Define the AppContentProps interface for the onLogout prop.
interface AppContentProps {
    onLogout: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ onLogout }) => {
    const mainContentRef = useRef<HTMLElement>(null);
    const { 
        userProfile, 
        setIsViewingStory, 
        setIsStandalone, 
        theme,
        setInstallPromptEvent,
        setInstallModalOpen,
        isUserBlocked,
        addToast,
        isPostLiked,
        isPostReposted,
        notifications,
        unreadMessageCount,
        topNotification,
    } = useApp();
    
    // Story related state
    const [stories, setStories] = useState<Story[]>([]);

    // Share target related state
    const [sharedMediaSrc, setSharedMediaSrc] = useState<string | null>(null);
    const [shareChoice, setShareChoice] = useState<'story' | 'post' | null>(null);
    const [sharingTarget, setSharingTarget] = useState<{ post?: Post; user?: SimpleUser } | null>(null);

    // --- Navigation State Management ---
    const [navStack, setNavStack] = useState<NavigationState[]>([initialNavigationState]);
    const currentState = navStack[navStack.length - 1];
    const { 
        activeScreen, 
        viewingUser, 
        isComposeOpen, 
        isViewingStories,
        storyViewerProps,
        isCreatingStory,
        isSettingsOpen,
        viewingCommentsForPostId,
        viewingPosts,
        viewingInteractionList,
        editingPost,
        chattingWithUser,
        postToShare,
        userToShare,
        isPrivacyPolicyOpen,
        isTermsOfServiceOpen,
    } = currentState;


    const navigateTo = (newState: Partial<NavigationState>) => {
        const nextState = { ...currentState, ...newState };
        history.pushState({ screen: nextState.activeScreen }, ''); 
        setNavStack(prev => [...prev, nextState]);
    };

    const handleGoBack = useCallback(() => {
        if (navStack.length > 1) {
            setNavStack(prev => prev.slice(0, -1));
        }
    }, [navStack.length]);

    useEffect(() => {
        window.addEventListener('popstate', handleGoBack);
        return () => {
            window.removeEventListener('popstate', handleGoBack);
        };
    }, [handleGoBack]);

    const navigate = (screen: Screen) => {
       if (screen === 'compose') {
            navigateTo({ isComposeOpen: true });
        } else {
            const newState: Partial<NavigationState> = { activeScreen: screen };
            if (screen === 'messages') {
                // When navigating to the messages tab, don't open a specific chat.
                newState.chattingWithUser = null; 
            }
            navigateTo(newState);
        }
    };
    
    const closeFullScreen = useCallback(() => {
        history.back();
    }, []);
    
    const handleViewProfile = useCallback(async (username: string, avatar?: string) => {
        if (username === userProfile.username) {
             navigateTo({ activeScreen: 'profile' });
            return;
        }
        
        let finalAvatar = avatar;
        if (!finalAvatar) {
            const profile = await getUserProfile(username);
            if (profile) {
                finalAvatar = profile.profilePicture;
            } else {
                addToast(`User @${username} not found.`, 'error');
                return;
            }
        }
        
        navigateTo({ viewingUser: { username, avatar: finalAvatar } });
    }, [userProfile.username, addToast]);

    const fetchStories = useCallback(async () => {
        const friendStories = await getStories();
        setStories(friendStories);
    }, []);

    useEffect(() => {
        fetchStories();
    }, [fetchStories]);
    
    const filteredStories = useMemo(() => stories.filter(story => !isUserBlocked(story.username) && story.username !== userProfile.username), [stories, isUserBlocked, userProfile.username]);

    const storyGroupsForReel = useMemo(() => {
        const groups: Record<string, { username: string; avatar: string; stories: Story[] }> = {};

        filteredStories.forEach(story => {
            if (!groups[story.username]) {
                groups[story.username] = {
                    username: story.username,
                    avatar: story.avatar,
                    stories: [],
                };
            }
            groups[story.username].stories.push(story);
        });

        Object.values(groups).forEach(group => {
            group.stories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        
        const sortedGroups = Object.values(groups).sort((a, b) => {
            const lastStoryA = a.stories[a.stories.length - 1];
            const lastStoryB = b.stories[b.stories.length - 1];
            if (!lastStoryA || !lastStoryB) return 0;
            return new Date(lastStoryB.timestamp).getTime() - new Date(lastStoryA.timestamp).getTime();
        });

        return sortedGroups;
    }, [filteredStories]);

    const flatStoriesForViewer = useMemo(() => {
        return storyGroupsForReel.flatMap(group => group.stories);
    }, [storyGroupsForReel]);

    const handleViewStories = useCallback((storiesToView: Story[], startIndex: number) => {
        navigateTo({ 
            isViewingStories: true, 
            storyViewerProps: { stories: storiesToView, initialIndex: startIndex } 
        });
        setIsViewingStory(true);
    }, [setIsViewingStory]);

    const closeStoryViewer = useCallback(() => {
        history.back();
        setIsViewingStory(false);
    }, [setIsViewingStory]);

    const handleCreateStory = useCallback(() => {
        navigateTo({ isCreatingStory: true });
    }, []);

    const handleViewComments = useCallback((postId: string) => {
        navigateTo({ viewingCommentsForPostId: postId });
    }, []);
    
    const handleViewPost = useCallback((posts: Post[], postToView: Post) => {
        navigateTo({ viewingPosts: { posts: posts, initialPostId: postToView.id } });
    }, []);

    const handleEditPost = useCallback((post: Post) => {
        navigateTo({ editingPost: post });
    }, []);
    
    const handleViewLikers = useCallback((postId: string) => {
        const users: SimpleUser[] = [];
        // This is a placeholder as we don't fetch the list of likers yet.
        // It shows the current user if they have liked the post.
        if (isPostLiked(postId)) {
            // FIX: Add the missing 'id' property to satisfy the SimpleUser type.
            users.push({
                id: userProfile.id,
                name: userProfile.name,
                username: userProfile.username,
                avatar: userProfile.profilePicture,
                isVerified: userProfile.isVerified,
            });
        }
        navigateTo({ viewingInteractionList: { title: 'Likes', users }});
    }, [isPostLiked, userProfile]);
    
    const handleViewReposters = useCallback((postId: string) => {
        // This is a placeholder as we don't fetch the list of reposters yet.
        const users: SimpleUser[] = [];
        navigateTo({ viewingInteractionList: { title: 'Reposts', users }});
    }, []);

    const handleStartChat = useCallback((user: { username: string; avatar: string }) => {
        navigateTo({ 
            activeScreen: 'messages', 
            chattingWithUser: user,
            postToShare: null,
            userToShare: null,
            // Reset all overlay states to ensure the message screen is visible
            viewingUser: null,
            viewingPosts: null,
            viewingCommentsForPostId: null,
            viewingInteractionList: null,
            editingPost: null, // Also reset editing state for good measure
        });
    }, []);

    const handleNotificationClick = useCallback(async (notification: Notification) => {
        const { type, post, sender, comment_id, story } = notification;

        // 1. Handle user profile navigation
        if (type === 'follow' && sender) {
            closeFullScreen();
            setTimeout(() => {
                handleViewProfile(sender.username, sender.avatar_url);
            }, 50);
            return;
        }
        
        // Handle story like notification
        if (type === 'story_like' && story) {
            const storyIdToFetch = story.id;
            if (storyIdToFetch) {
                const fullStory = await getStoryById(storyIdToFetch);
                if (fullStory) {
                    closeFullScreen();
                    setTimeout(() => {
                        handleViewStories([fullStory], 0);
                    }, 50);
                } else {
                    addToast("Sorry, the story could not be found.", 'error');
                }
            }
            return;
        }

        // 2. Handle navigation to content (post or comments)
        if (post?.id) {
            // Decide if we should show the comments screen or the post viewer
            const shouldOpenComments = 
                type === 'comment' || 
                type === 'comment_like' || 
                (type === 'mention' && comment_id);

            if (shouldOpenComments) {
                closeFullScreen();
                setTimeout(() => {
                    handleViewComments(post.id);
                }, 50);
            } else {
                // Default action is to open the post itself (for likes, reposts, and mentions in post content)
                const fetchedPost = await getPostById(post.id);
                if (fetchedPost) {
                    closeFullScreen();
                    setTimeout(() => {
                        handleViewPost([fetchedPost], fetchedPost);
                    }, 50);
                } else {
                    addToast("Sorry, the post could not be found.", 'error');
                }
            }
        }
    }, [closeFullScreen, handleViewProfile, handleViewStories, addToast, handleViewComments, handleViewPost]);
    
    const handleOpenShare = useCallback((target: { post?: Post; user?: SimpleUser }) => {
        setSharingTarget(target);
    }, []);

    const handleItemSentAndNavigate = useCallback((recipient: SimpleUser) => {
        setSharingTarget(null);
        setTimeout(() => {
            handleStartChat({ username: recipient.username, avatar: recipient.avatar });
        }, 50);
    }, [handleStartChat]);


    // Theme logic
    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    }, [theme]);

    // PWA Install Prompt Logic
    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e);
            setInstallModalOpen(true);
            console.log('beforeinstallprompt event fired and stashed.');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [setIsStandalone, setInstallPromptEvent, setInstallModalOpen]);

    // Share Target Logic
    useEffect(() => {
        const handleSharedFile = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('shared')) {
                try {
                    const cache = await caches.open('shared-files-cache-v1');
                    const response = await cache.match('shared-file');
                    if (response) {
                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        setSharedMediaSrc(objectUrl);
                        await cache.delete('shared-file');
                        
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.delete('shared');
                        window.history.replaceState({}, '', newUrl);
                    }
                } catch (error) {
                    console.error('Error handling shared file:', error);
                }
            }
        };
        handleSharedFile();
    }, []);

    const handleShareChoice = (choice: 'story' | 'post') => {
        setShareChoice(choice);
    };

    const closeShareFlow = () => {
        if (sharedMediaSrc) {
            URL.revokeObjectURL(sharedMediaSrc);
        }
        setSharedMediaSrc(null);
        setShareChoice(null);
    };

    
    if (sharedMediaSrc && shareChoice === 'post') {
        return <Suspense fallback={<FullscreenSpinner />}><ComposeMediaPostScreen initialMediaSrc={sharedMediaSrc} close={closeShareFlow} /></Suspense>;
    }

    if (sharedMediaSrc && shareChoice === 'story') {
        return <Suspense fallback={<FullscreenSpinner />}><StoryCreationScreen close={closeShareFlow} initialMediaSrc={sharedMediaSrc} /></Suspense>;
    }

    if (sharedMediaSrc && !shareChoice) {
        return <Suspense fallback={<FullscreenSpinner />}><ShareChoiceScreen mediaSrc={sharedMediaSrc} onClose={closeShareFlow} onChoose={handleShareChoice} /></Suspense>;
    }
    
    const unreadNotificationCount = useMemo(() => (notifications || []).filter(n => !n.is_read).length, [notifications]);

    return (
        <div className="app-shell dark text-black dark:text-white transition-colors duration-200">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
                @keyframes slide-down-fade {
                    from { opacity: 0; transform: translateY(-100%); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down-fade {
                    animation: slide-down-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            {topNotification && (
                <div className="fixed top-0 left-0 right-0 z-[100] p-4 safe-pt animate-slide-down-fade">
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-center shadow-lg">
                        <h3 className="font-bold text-lg">{topNotification.title}</h3>
                        <p>{topNotification.message}</p>
                    </div>
                </div>
            )}

            <header className="app-header safe-pt">
                <h1 className="text-3xl font-bold font-handwriting">Ahlan</h1>
                
                {activeScreen === 'profile' ? (
                    <div className="flex items-center">
                        <button onClick={() => navigateTo({ isSettingsOpen: true })} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <MenuIcon />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <button onClick={() => navigateTo({ activeScreen: 'notifications' })} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <BellIcon />
                            {unreadNotificationCount > 0 && (
                                <span className="absolute top-1 right-1 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white dark:ring-black">
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </span>
                            )}
                        </button>
                        <button onClick={() => navigateTo({ activeScreen: 'messages' })} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                            <CommentIcon className="w-7 h-7" />
                            {unreadMessageCount > 0 && (
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-black"></span>
                            )}
                        </button>
                    </div>
                )}
            </header>
            
            <main ref={mainContentRef} className={`app-main ${activeScreen === 'search' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
                {activeScreen === 'home' && (
                    <div className="border-b border-gray-200 dark:border-gray-800 px-2 py-3">
                        <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar">
                           <StoryCreator onAddStory={handleCreateStory} onViewStories={handleViewStories} />
                           <StoryReel storyGroups={storyGroupsForReel} allStories={flatStoriesForViewer} onViewStories={handleViewStories} />
                        </div>
                        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                    </div>
                )}

                <div style={{ display: ['home', 'search', 'profile'].includes(activeScreen) ? 'block' : 'none', height: '100%' }}>
                    <div style={{ display: activeScreen === 'home' ? 'block' : 'none', height: '100%' }}>
                        <HomeTab scrollContainerRef={mainContentRef} onRefreshStories={fetchStories} onViewProfile={handleViewProfile} onViewComments={handleViewComments} onViewPost={handleViewPost} onViewLikers={handleViewLikers} onViewReposters={handleViewReposters} onSharePost={(post: Post) => handleOpenShare({ post })} />
                    </div>
                    <div style={{ display: activeScreen === 'search' ? 'block' : 'none', height: '100%' }}>
                        <SearchTab onViewProfile={handleViewProfile} onViewComments={handleViewComments} onViewPost={handleViewPost} onViewLikers={handleViewLikers} onViewReposters={handleViewReposters} onSharePost={(post: Post) => handleOpenShare({ post })} />
                    </div>
                    <div style={{ display: activeScreen === 'profile' ? 'block' : 'none', height: '100%' }}>
                        <ProfileTab scrollContainerRef={mainContentRef} onLogout={onLogout} onViewStories={handleViewStories} onViewProfile={handleViewProfile} onViewComments={handleViewComments} onViewPost={handleViewPost} onViewLikers={handleViewLikers} onViewReposters={handleViewReposters} onSharePost={(post: Post) => handleOpenShare({ post })} />
                    </div>
                </div>

                <Suspense fallback={<FullscreenSpinner />}>
                    {activeScreen === 'camera' && (
                        <div className="fixed inset-0 bg-black z-40">
                            <CameraTab onPostCreated={() => navigateTo(initialNavigationState)} close={closeFullScreen} />
                        </div>
                    )}
                    {activeScreen === 'notifications' && (
                        <div className="fixed inset-0 bg-white dark:bg-black z-40">
                            <NotificationsScreen
                                close={closeFullScreen}
                                onNotificationClick={handleNotificationClick}
                            />
                        </div>
                    )}
                    {activeScreen === 'messages' && (
                        <div className="fixed inset-0 bg-white dark:bg-black z-40">
                            <MessagesScreen 
                                close={closeFullScreen} 
                                onViewProfile={handleViewProfile} 
                                initialUserToChatWith={chattingWithUser}
                                postToShare={postToShare || null}
                                userToShare={userToShare || null}
                                onViewPost={handleViewPost}
                                onViewStories={handleViewStories}
                            />
                        </div>
                    )}
                </Suspense>
            </main>
            
            <BottomNavigationBar activeScreen={activeScreen} navigate={navigate} />

            {/* Full-screen overlays */}
            <Suspense fallback={<FullscreenSpinner />}>
                {sharingTarget && <ShareScreen post={sharingTarget.post} user={sharingTarget.user} close={() => setSharingTarget(null)} onSent={handleItemSentAndNavigate} />}
                {isComposeOpen && <ComposePostScreen close={closeFullScreen} />}
                {editingPost && <EditPostScreen post={editingPost} close={closeFullScreen} />}
                {isCreatingStory && <StoryCreationScreen close={closeFullScreen} />}
                {isViewingStories && storyViewerProps && <StoryViewer {...storyViewerProps} close={closeStoryViewer} />}
                {isSettingsOpen && <SettingsScreen close={closeFullScreen} onLogout={onLogout} onOpenPrivacyPolicy={() => navigateTo({ isPrivacyPolicyOpen: true })} onOpenTermsOfService={() => navigateTo({ isTermsOfServiceOpen: true })} />}
                {viewingUser && <UserProfileScreen user={viewingUser} close={closeFullScreen} onViewProfile={handleViewProfile} onStartChat={handleStartChat} onShareProfile={(user) => handleOpenShare({ user })} onLogout={onLogout} onViewComments={handleViewComments} onViewPost={handleViewPost} onViewLikers={handleViewLikers} onViewReposters={handleViewReposters} onSharePost={(post) => handleOpenShare({ post })} onViewStories={handleViewStories} />}
                {viewingCommentsForPostId && <CommentsScreen postId={viewingCommentsForPostId} close={closeFullScreen} onViewProfile={handleViewProfile} />}
                {viewingPosts && <PostViewerScreen posts={viewingPosts.posts} initialPostId={viewingPosts.initialPostId} close={closeFullScreen} onViewProfile={handleViewProfile} onViewComments={handleViewComments} onEditPost={handleEditPost} onViewLikers={handleViewLikers} onViewReposters={handleViewReposters} onSharePost={(post) => handleOpenShare({ post })} />}
                {viewingInteractionList && <UserListScreen title={viewingInteractionList.title} users={viewingInteractionList.users} close={closeFullScreen} onViewProfile={handleViewProfile} />}
                {isPrivacyPolicyOpen && <PrivacyPolicyScreen close={closeFullScreen} />}
                {isTermsOfServiceOpen && <TermsOfServiceScreen close={closeFullScreen} />}
                <InstallAppModal />
            </Suspense>

            <ToastsContainer />
            <AutomaticUpdateHandler />
            <TooltipRenderer />
        </div>
    );
};


const App: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLoginView, setIsLoginView] = useState(true);
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [isTermsOfServiceOpen, setIsTermsOfServiceOpen] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error);
    };

    if (loading) {
        return <div className="h-screen w-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
    }

    return (
        <AppProvider>
            {session?.user ? (
                <AppContent onLogout={handleLogout} />
            ) : (
                isLoginView ? (
                    <LoginScreen onLogin={() => {}} onNavigateToSignUp={() => setIsLoginView(false)} />
                ) : (
                    <SignUpScreen
                        onSignUp={() => setIsLoginView(true)}
                        onNavigateToLogin={() => setIsLoginView(true)}
                        onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
                        onOpenTermsOfService={() => setIsTermsOfServiceOpen(true)}
                    />
                )
            )}
            
            <Suspense fallback={<FullscreenSpinner />}>
                {isPrivacyPolicyOpen && <PrivacyPolicyScreen close={() => setIsPrivacyPolicyOpen(false)} />}
                {isTermsOfServiceOpen && <TermsOfServiceScreen close={() => setIsTermsOfServiceOpen(false)} />}
            </Suspense>
        </AppProvider>
    );
};

export default App;
