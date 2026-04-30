import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Post, Story, SimpleUser } from '../../types';
import EditProfileScreen from '../screens/EditProfileScreen';
import { VerifiedIcon } from '../Icons';
import { getUserPosts, supabase, getFollowerCount, getFollowingCount, getPostById, mapPostData, getUserReposts, getSavedPosts } from '../../services/apiService';
import RenderUserContent from '../RenderUserContent';
import PostCard from '../PostCard';
import PostGridSkeleton from '../PostGridSkeleton';
import UserAvatar from '../UserAvatar';

interface ProfileTabProps {
    onViewProfile: (username: string, avatar?: string | null) => void;
    onLogout: () => void;
    onViewStories: (stories: Story[], startIndex: number) => void;
    scrollContainerRef: React.RefObject<HTMLElement>;
    onViewComments: (postId: string) => void;
    onViewPost: (posts: Post[], postToView: Post) => void;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
}

const StatColumn: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <div className="text-center">
        <p className="text-lg font-bold text-black dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
);

const RefreshIndicator: React.FC<{ isRefreshing: boolean; pullPosition: number }> = ({ isRefreshing, pullPosition }) => {
    const PULL_THRESHOLD = 80;
    const pullProgress = Math.min(pullPosition / PULL_THRESHOLD, 1);

    return (
        <div className="absolute top-0 left-0 right-0 flex justify-center items-center h-[60px] z-10 pointer-events-none">
            {isRefreshing ? (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            ) : (
                pullPosition > 10 && (
                    <div
                        className="rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
                        style={{ opacity: pullProgress, transform: `rotate(${pullProgress * 360}deg)` }}
                    ></div>
                )
            )}
        </div>
    );
};



const ProfileTab: React.FC<ProfileTabProps> = ({ onViewProfile, onLogout, onViewStories, scrollContainerRef, onViewComments, onViewPost, onViewLikers, onViewReposters, onSharePost }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'saved'>('posts');
    const { userProfile, addToast, refreshAllData } = useApp();
    const [posts, setPosts] = useState<Post[]>([]);
    const [reposts, setReposts] = useState<Post[]>([]);
    const [savedPostsList, setSavedPostsList] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingProfile, setEditingProfile] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullPosition, setPullPosition] = useState(0);
    const touchStartY = useRef(0);
    const isDragging = useRef(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const pullPositionRef = useRef(pullPosition);
    pullPositionRef.current = pullPosition;
    const postsRef = useRef(posts);
    postsRef.current = posts;

    const fetchUserPosts = useCallback(async () => {
        if (userProfile.id) {
            const userPosts = await getUserPosts(userProfile.id);
            setPosts(userPosts);
        }
    }, [userProfile.id]);

    const fetchUserReposts = useCallback(async () => {
        if (userProfile.id) {
            const userReposts = await getUserReposts(userProfile.id);
            setReposts(userReposts);
        }
    }, [userProfile.id]);
    
    const fetchSavedPosts = useCallback(async () => {
        if (userProfile.id) {
            const userSavedPosts = await getSavedPosts(userProfile.id);
            setSavedPostsList(userSavedPosts);
        }
    }, [userProfile.id]);

    const refreshFollowerCounts = useCallback(async () => {
        if (userProfile.id) {
            const [followers, following] = await Promise.all([
                getFollowerCount(userProfile.id),
                getFollowingCount(userProfile.id)
            ]);
            setFollowerCount(followers);
            setFollowingCount(following);
        }
    }, [userProfile.id]);

    useEffect(() => {
        const initialFetch = async () => {
            if (posts.length === 0) setIsLoading(true);
            await Promise.all([fetchUserPosts(), fetchUserReposts(), fetchSavedPosts(), refreshFollowerCounts()]);
            setIsLoading(false);
        };
        initialFetch();
    }, [fetchUserPosts, fetchUserReposts, fetchSavedPosts, refreshFollowerCounts, posts.length]);

    const handlePostChange = useCallback(async (payload: any) => {
        console.log('Profile posts changed, performing granular update...', payload);
        const currentPosts = postsRef.current;
        
        if (payload.eventType === 'INSERT') {
            const newPostData = payload.new;
            if (newPostData.user_id !== userProfile.id) return;
            if (currentPosts.some(p => p.id === newPostData.id)) return;
    
            const fullPost = await getPostById(newPostData.id);
            if (fullPost) {
                setPosts(prev => [fullPost, ...prev]);
            }
        } 
        else if (payload.eventType === 'UPDATE') {
            const updatedPostId = payload.new.id;
            if (payload.new.user_id !== userProfile.id) return;
            const fullPost = await getPostById(updatedPostId);
            if (fullPost) {
                setPosts(prev => prev.map(p => p.id === fullPost.id ? fullPost : p));
            }
        } 
        else if (payload.eventType === 'DELETE') {
            const deletedPostId = payload.old.id;
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, [userProfile.id]);

    // Real-time listener for profile posts
    useEffect(() => {
        if (!userProfile.id) return;

        const subscription = supabase
            .channel(`profile-posts-${userProfile.id}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'posts', filter: `user_id=eq.${userProfile.id}` },
                handlePostChange
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        }
    }, [userProfile.id, handlePostChange]);

    // Real-time listener for follows
    useEffect(() => {
        if (!userProfile.id) return;
        
        const handleFollowChange = (payload: any) => {
            const changedFollower = payload.new?.follower_id || payload.old?.follower_id;
            const changedFollowing = payload.new?.followed_id || payload.old?.followed_id;

            if (changedFollower === userProfile.id || changedFollowing === userProfile.id) {
                console.log('Takip tablosu değişti, sayılar yenileniyor:', payload);
                refreshFollowerCounts();
            }
        };

        const followsSubscription = supabase
            .channel(`profile-follows-${userProfile.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'follows' },
                handleFollowChange
            )
            .subscribe();

        return () => {
            supabase.removeChannel(followsSubscription);
        };
    }, [userProfile.id, refreshFollowerCounts]);


    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const refreshPromises = Promise.all([
                fetchUserPosts(),
                fetchUserReposts(),
                fetchSavedPosts(),
                refreshAllData(),
                refreshFollowerCounts(),
            ]);

            // Race the refresh against a timeout to ensure the spinner doesn't get stuck.
            await Promise.race([
                refreshPromises,
                new Promise(resolve => setTimeout(resolve, 8000)) // 8-second timeout
            ]);
        } catch (error) {
            console.error("Failed to refresh profile:", error);
            addToast("Couldn't refresh profile.", "error");
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, fetchUserPosts, fetchUserReposts, fetchSavedPosts, refreshAllData, refreshFollowerCounts, addToast]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (container.scrollTop === 0 && !isRefreshing) {
                isDragging.current = true;
                touchStartY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging.current || isRefreshing) return;
            const deltaY = e.touches[0].clientY - touchStartY.current;
            if (deltaY > 0) {
                 if (container.scrollTop === 0) {
                    e.preventDefault();
                }
                setPullPosition(Math.pow(deltaY, 0.85));
            }
        };

        const handleTouchEnd = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            if (pullPositionRef.current > 80) {
                handleRefresh();
            }
            setPullPosition(0);
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [scrollContainerRef, handleRefresh, isRefreshing]);
    
    return (
        <>
            {isEditingProfile && <EditProfileScreen close={() => setEditingProfile(false)} />}
            <div className="relative">
                <RefreshIndicator isRefreshing={isRefreshing} pullPosition={pullPosition} />
                <div style={{ transform: `translateY(${isRefreshing ? 60 : pullPosition}px)` }} className={`transition-transform duration-300`}>
                    <header className="p-4 bg-white dark:bg-black">
                        <div className="flex items-center space-x-4">
                            <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-20 h-20 rounded-full" />
                            <div className="flex-1 flex justify-around">
                                <StatColumn value={posts.length.toString()} label="Posts" />
                                <div className="rounded-lg p-2 -m-2">
                                    <StatColumn value={followerCount.toString()} label="Followers" />
                                </div>
                                <div className="rounded-lg p-2 -m-2">
                                    <StatColumn value={followingCount.toString()} label="Following" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <h2 className="text-xl font-bold text-black dark:text-white flex items-center space-x-1">
                                <span>@{userProfile.username}</span>
                                {userProfile.isVerified && <VerifiedIcon className="w-5 h-5 text-blue-500" />}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400">{userProfile.name}</p>
                            <div className="text-black dark:text-white mt-2 whitespace-pre-wrap"><RenderUserContent text={userProfile.bio} onViewProfile={onViewProfile} /></div>
                        </div>
                        <div className="mt-4 flex">
                            <button onClick={() => setEditingProfile(true)} className="flex-1 text-center bg-gray-100 dark:bg-gray-800 text-black dark:text-white py-2 px-4 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                Edit Profile
                            </button>
                        </div>
                    </header>
                    
                    <div className="sticky top-0 bg-white dark:bg-black z-10 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex">
                            <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'posts' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-500'}`}>Posts</button>
                            <button onClick={() => setActiveTab('reposts')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'reposts' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-500'}`}>Reposts</button>
                            <button onClick={() => setActiveTab('saved')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'saved' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-500'}`}>Saved</button>
                        </div>
                    </div>

                    <div>
                        {activeTab === 'posts' && (
                             isLoading && posts.length === 0 ? (
                                <PostGridSkeleton />
                             ) : posts.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">No posts yet.</div>
                             ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {posts.map((post) => {
                                        let gridImageSrc: string | undefined = post.media_preview_url || post.media;
                                        if (post.media_type === 'image' && post.media && post.media.includes('supabase.co')) {
                                            try {
                                                const url = new URL(post.media);
                                                if (url.pathname.includes('/object/')) {
                                                    url.pathname = url.pathname.replace('/object/', '/render/image/');
                                                    url.searchParams.set('width', '400');
                                                    url.searchParams.set('height', '400');
                                                    url.searchParams.set('resize', 'cover');
                                                    gridImageSrc = url.toString();
                                                }
                                            } catch(e) {
                                                // Keep original URL if parsing fails
                                                gridImageSrc = post.media;
                                            }
                                        }
                                        return (
                                            <button
                                                key={post.id}
                                                onClick={() => onViewPost(posts, post)}
                                                className="aspect-square bg-gray-800 focus:outline-none relative group"
                                            >
                                                {(post.media_type === 'image' || (post.media_type as string) === 'video') && gridImageSrc ? (
                                                    <img src={gridImageSrc} alt="Post media" className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full p-2 flex flex-col justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                                        <div className="text-white text-xs text-left font-medium whitespace-pre-wrap overflow-hidden" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 8 }}>
                                                            <RenderUserContent text={post.content} onViewProfile={onViewProfile} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </button>
                                        );
                                    })}
                                </div>
                             )
                        )}
                        {activeTab === 'reposts' && (
                             isLoading && reposts.length === 0 ? (
                                <PostGridSkeleton />
                             ) : reposts.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">You haven't reposted anything yet.</div>
                             ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {reposts.map((post) => {
                                        let gridImageSrc: string | undefined = post.media_preview_url || post.media;
                                        if (post.media_type === 'image' && post.media && post.media.includes('supabase.co')) {
                                            try {
                                                const url = new URL(post.media);
                                                if (url.pathname.includes('/object/')) {
                                                    url.pathname = url.pathname.replace('/object/', '/render/image/');
                                                    url.searchParams.set('width', '400');
                                                    url.searchParams.set('height', '400');
                                                    url.searchParams.set('resize', 'cover');
                                                    gridImageSrc = url.toString();
                                                }
                                            } catch(e) {
                                                gridImageSrc = post.media;
                                            }
                                        }
                                        return (
                                            <button
                                                key={post.id}
                                                onClick={() => onViewPost(reposts, post)}
                                                className="aspect-square bg-gray-800 focus:outline-none relative group"
                                            >
                                                {(post.media_type === 'image' || (post.media_type as string) === 'video') && gridImageSrc ? (
                                                    <img src={gridImageSrc} alt="Post media" className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full p-2 flex flex-col justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                                        <div className="text-white text-xs text-left font-medium whitespace-pre-wrap overflow-hidden" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 8 }}>
                                                            <RenderUserContent text={post.content} onViewProfile={onViewProfile} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </button>
                                        );
                                    })}
                                </div>
                             )
                        )}
                        {activeTab === 'saved' && (
                            isLoading && savedPostsList.length === 0 ? (
                                <PostGridSkeleton />
                            ) : savedPostsList.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">You haven't saved any posts yet.</div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {savedPostsList.map((post) => {
                                        let gridImageSrc: string | undefined = post.media_preview_url || post.media;
                                        if (post.media_type === 'image' && post.media && post.media.includes('supabase.co')) {
                                            try {
                                                const url = new URL(post.media);
                                                if (url.pathname.includes('/object/')) {
                                                    url.pathname = url.pathname.replace('/object/', '/render/image/');
                                                    url.searchParams.set('width', '400');
                                                    url.searchParams.set('height', '400');
                                                    url.searchParams.set('resize', 'cover');
                                                    gridImageSrc = url.toString();
                                                }
                                            } catch(e) {
                                                gridImageSrc = post.media;
                                            }
                                        }
                                        return (
                                            <button
                                                key={post.id}
                                                onClick={() => onViewPost(savedPostsList, post)}
                                                className="aspect-square bg-gray-800 focus:outline-none relative group"
                                            >
                                                {(post.media_type === 'image' || (post.media_type as string) === 'video') && gridImageSrc ? (
                                                    <img src={gridImageSrc} alt="Post media" className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full p-2 flex flex-col justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                                        <div className="text-white text-xs text-left font-medium whitespace-pre-wrap overflow-hidden" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 8 }}>
                                                            <RenderUserContent text={post.content} onViewProfile={onViewProfile} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfileTab;