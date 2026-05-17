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


import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Post, UserProfile as UserProfileType, SimpleUser, Story } from '../../types';
import { getUserProfile, getUserPosts, getFollowerCount, getFollowingCount, supabase, getUserReposts, setUserVerified, reportUser } from '../../services/apiService';
import { ArrowLeftIcon, ThreeDotsVerticalIcon, BlockIcon, VerifiedIcon, ShareIcon, ReportIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import RenderUserContent from '../RenderUserContent';
import PostCard from '../PostCard';
import PostGridSkeleton from '../PostGridSkeleton';
import UserAvatar from '../UserAvatar';

interface UserProfileScreenProps {
    user: { username: string; avatar: string };
    close: () => void;
    onViewProfile: (username: string, avatar?: string) => void;
    onViewComments: (postId: string) => void;
    onViewPost: (posts: Post[], postToView: Post) => void;
    onStartChat: (user: { username: string; avatar: string }) => void;
    onShareProfile: (user: SimpleUser) => void;
    onLogout: () => void;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
    onViewStories: (stories: Story[], startIndex: number) => void;
}

const StatColumn: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <div className="text-center">
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
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

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ user, close, onViewProfile, onViewComments, onViewPost, onStartChat, onShareProfile, onLogout, onViewLikers, onViewReposters, onSharePost, onViewStories }) => {
    const [profile, setProfile] = useState<UserProfileType | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reposts, setReposts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts'>('posts');
    const [menuState, setMenuState] = useState<'closed' | 'main' | 'report'>('closed');
    const { isUserBlocked, toggleBlockUser, addToast, setTooltip, tooltip, userProfile, isUserFollowed, toggleFollowUser, showTopNotification, isAdmin } = useApp();
    const isFollowing = isUserFollowed(user.username);
    const isBlocked = isUserBlocked(user.username);
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullPosition, setPullPosition] = useState(0);
    const touchStartY = useRef(0);
    const isDragging = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pullPositionRef = useRef(pullPosition);
    pullPositionRef.current = pullPosition;

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!isRefresh && !profile) setLoading(true);
        try {
            const profileData = await getUserProfile(user.username);
            setProfile(profileData);
            if (profileData) {
                const [userPosts, userReposts, followers, following] = await Promise.all([
                    getUserPosts(profileData.id),
                    getUserReposts(profileData.id),
                    getFollowerCount(profileData.id),
                    getFollowingCount(profileData.id)
                ]);
                setPosts(userPosts);
                setReposts(userReposts);
                setFollowerCount(followers);
                setFollowingCount(following);
            } else {
                setPosts([]);
                setReposts([]);
            }
        } catch (error) {
            console.error("Failed to load user profile", error);
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [user.username]); // removed profile from dependencies

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refreshFollowerCounts = useCallback(async () => {
        if (profile?.id) {
            const [followers, following] = await Promise.all([
                getFollowerCount(profile.id),
                getFollowingCount(profile.id)
            ]);
            setFollowerCount(followers);
            setFollowingCount(following);
        }
    }, [profile?.id]);

    useEffect(() => {
        if (!profile?.id) return;
        
        const handleFollowChange = (payload: any) => {
            const changedFollower = payload.new?.follower_id || payload.old?.follower_id;
            // FIX: Corrected typo from `following_id` to `followed_id` to match the database schema.
            const changedFollowing = payload.new?.followed_id || payload.old?.followed_id;
            if (changedFollower === profile.id || changedFollowing === profile.id) {
                refreshFollowerCounts();
            }
        };

        const followsSubscription = supabase
            .channel(`user-profile-follows-${profile.id}-${Date.now()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'follows' },
                handleFollowChange
            )
            .subscribe();

        return () => {
            supabase.removeChannel(followsSubscription);
        };
    }, [profile?.id, refreshFollowerCounts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setMenuState('closed');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const reportReasons = [
        "It's spam",
        "Hate speech or symbols",
        "Harassment or bullying",
        "Pretending to be someone else",
        "False information",
        "Nudity or sexual activity",
        "I just don't like their content"
    ];

    const handleSelectReportReason = async (reason: string) => {
        if (!profile) return;
        setMenuState('closed');
        try {
            const success = await reportUser(profile.id, reason);
            if (success) {
                showTopNotification('Report Submitted', `Thank you for your feedback. We will review the profile of @${profile.username}.`);
            } else {
                showTopNotification('Report Failed', 'Could not submit report. Please try again.');
            }
        } catch (err) {
            console.error('Report error:', err);
            showTopNotification('Report Failed', 'An error occurred. Please try again.');
        }
    };

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const refreshPromises = fetchData(true);
            await Promise.race([
                refreshPromises,
                new Promise(resolve => setTimeout(resolve, 8000))
            ]);
        } catch (error) {
            console.error("Failed to refresh user profile:", error);
            addToast("Couldn't refresh profile.", "error");
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, fetchData, addToast]);

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
    }, [handleRefresh, isRefreshing]);

    const handleFollowToggle = () => {
        toggleFollowUser(user.username);
    };
    
    const handleBlockToggle = () => {
        setMenuState('closed');
        const wasBlocked = isBlocked;
        if (wasBlocked) {
            toggleBlockUser(user.username);
            addToast(`@${user.username} has been unblocked.`, 'success');
        } else {
            if (window.confirm(`Are you sure you want to block @${user.username}? They won't be able to find your profile, posts, or story, and they won't be notified.`)) {
                toggleBlockUser(user.username);
                addToast(`@${user.username} has been blocked.`, 'info');
            }
        }
    };
    
    const handleShare = () => {
        if (!profile) return;
        setMenuState('closed');
        const userToShare: SimpleUser = {
            id: profile.id,
            username: profile.username,
            name: profile.name,
            avatar: profile.profilePicture,
            isVerified: profile.isVerified,
        };
        onShareProfile(userToShare);
    };

    const handleIconClick = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (tooltip && tooltip.target === e.currentTarget) {
            setTooltip(null);
        } else {
            setTooltip({ text, target: e.currentTarget as HTMLElement });
        }
    };

    const handleToggleVerify = async () => {
        if (!profile) return;
        try {
            // Optimistic update
            setProfile(prev => prev ? ({...prev, isVerified: !prev.isVerified}) : null);
            // Use ID for reliable update
            await setUserVerified(profile.id, profile.username, !profile.isVerified);
            addToast(`User ${profile.isVerified ? 'unverified' : 'verified'} successfully.`, 'success');
        } catch (error) {
            console.error(error);
            // Revert optimistic update on error
            setProfile(prev => prev ? ({...prev, isVerified: !prev.isVerified}) : null);
            addToast("Error updating verification status: " + (error as Error).message, 'error');
        }
    };

     if (loading && !profile) {
        return (
            <div className="fixed inset-0 bg-black z-40 flex flex-col h-screen animate-fade-in">
                 <style>{`.animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
                <header className="bg-black border-b border-gray-800 p-2 flex items-center flex-shrink-0 safe-pt">
                    <button onClick={close} className="p-2 text-white"><ArrowLeftIcon className="w-8 h-8" /></button>
                     <h1 className="text-xl font-bold ml-4">@{user.username}</h1>
                </header>
                <div className="flex justify-center items-center flex-1">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }
    
    if (!profile) {
        return (
            <div className="fixed inset-0 bg-black z-40 flex flex-col h-screen animate-fade-in">
                <header className="bg-black border-b border-gray-800 p-2 flex items-center flex-shrink-0 safe-pt">
                    <button onClick={close} className="p-2 text-white"><ArrowLeftIcon className="w-8 h-8" /></button>
                    <h1 className="text-xl font-bold ml-4">Profile not found</h1>
                </header>
                <div className="flex justify-center items-center flex-1 text-gray-400">
                    <p>This user does not exist.</p>
                </div>
            </div>
        );
    }

    const isMyProfile = userProfile.username === profile.username;

    return (
        <>
        <div className="fixed inset-0 bg-black z-40 flex flex-col h-screen animate-fade-in">
             <style>{`.animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out; } @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 safe-pt">
                <div className="flex items-center">
                    <button onClick={close} className="p-2 text-white">
                        <ArrowLeftIcon className="w-8 h-8" />
                    </button>
                    <h1 className="text-xl font-bold ml-4">@{profile.username}</h1>
                </div>
                <div className="relative">
                    <button onClick={() => setMenuState(prev => prev === 'closed' ? 'main' : 'closed')} className="p-2 text-white hover:bg-gray-800 rounded-full">
                        <ThreeDotsVerticalIcon className="w-6 h-6" />
                    </button>
                    {menuState !== 'closed' && (
                        <div ref={optionsMenuRef} className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg z-20 animate-fade-in-fast border border-gray-700">
                            {menuState === 'main' && (
                                <>
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-700 rounded-t-md"
                                    >
                                        <ShareIcon />
                                        <span className="ml-3">Share Profile</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => setMenuState('report')}
                                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                                    >
                                        <div className="flex items-center">
                                            <ReportIcon className="w-5 h-5 mr-3" />
                                            <span>Report User</span>
                                        </div>
                                        <span className="text-gray-400 text-lg">›</span>
                                    </button>

                                    <button
                                        onClick={handleBlockToggle}
                                        className={`flex items-center w-full px-4 py-2 text-sm ${isBlocked ? 'text-white' : 'text-red-400'} hover:bg-gray-700 rounded-b-md`}
                                    >
                                        <BlockIcon className="w-5 h-5 mr-3" />
                                        <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                                    </button>
                                </>
                            )}
                            {menuState === 'report' && (
                                <>
                                    <div className="p-2 font-bold text-sm text-white border-b border-gray-700 flex items-center">
                                        <button onClick={() => setMenuState('main')} className="mr-2 p-1 rounded-full hover:bg-gray-700 text-lg">‹</button>
                                        Why are you reporting this user?
                                    </div>
                                    <ul className="py-1 max-h-60 overflow-y-auto">
                                        {reportReasons.map(reason => (
                                            <li key={reason}>
                                                <button
                                                    onClick={() => handleSelectReportReason(reason)}
                                                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                                                >
                                                    {reason}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
                <RefreshIndicator isRefreshing={isRefreshing} pullPosition={pullPosition} />
                <div style={{ transform: `translateY(${isRefreshing ? 60 : pullPosition}px)` }} className="transition-transform duration-300">
                    <header className="p-4 bg-black">
                        <div className="flex items-center space-x-4">
                            <UserAvatar username={profile.username} avatarUrl={profile.profilePicture} className="w-20 h-20 rounded-full" />
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
                            <div className="flex items-center space-x-1.5">
                                <h2 className="text-xl font-bold text-white">@{profile.username}</h2>
                                {profile.isVerified && <VerifiedIcon className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div className="flex items-center">
                                <p className="text-gray-400">{profile.name}</p>
                            </div>
                            <div className="text-white mt-2"><RenderUserContent text={profile.bio} onViewProfile={onViewProfile} /></div>
                            
                            {isAdmin && !isMyProfile && (
                                <button
                                    onClick={handleToggleVerify}
                                    className={`mt-3 px-4 py-1.5 rounded text-sm font-semibold transition-colors ${profile.isVerified ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                >
                                    {profile.isVerified ? 'Unverify Account' : 'Verify Account'}
                                </button>
                            )}
                        </div>
                        <div className="mt-4 flex items-center space-x-2">
                            {!isMyProfile && (
                                isBlocked ? (
                                    <button
                                        onClick={handleBlockToggle}
                                        className="w-full text-center py-2 px-4 rounded-full font-semibold transition-colors duration-200 bg-white hover:bg-gray-200 text-black"
                                    >
                                        Unblock
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleFollowToggle}
                                            className={`flex-1 text-center py-2 px-4 rounded-full font-semibold transition-colors duration-200 ${
                                                isFollowing 
                                                ? 'bg-transparent text-white border border-gray-700 hover:bg-gray-800' 
                                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                        >
                                            {isFollowing ? 'Unfollow' : 'Follow'}
                                        </button>
                                        <button onClick={() => onStartChat(user)} className="flex-1 text-center bg-gray-100 dark:bg-gray-800 text-black dark:text-white py-2 px-4 rounded-full font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                            Message
                                        </button>
                                    </>
                                )
                            )}
                        </div>
                    </header>
                    
                    {isBlocked ? (
                        <div className="text-center py-10 text-gray-400">
                            <BlockIcon className="w-16 h-16 mx-auto text-gray-600" />
                            <p className="mt-4 text-lg font-bold">You have blocked @{user.username}</p>
                            <p className="mt-1 text-sm">They can't see your posts or find your profile.</p>
                        </div>
                    ) : (
                        <>
                            <div className="sticky top-0 bg-black z-10 border-t border-b border-gray-800">
                                <div className="flex">
                                    <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'posts' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}>Posts</button>
                                    <button onClick={() => setActiveTab('reposts')} className={`flex-1 py-3 text-center font-semibold transition-colors ${activeTab === 'reposts' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}>Reposts</button>
                                </div>
                            </div>

                            <div>
                                {activeTab === 'posts' && (
                                    loading && posts.length === 0 ? (
                                        <PostGridSkeleton />
                                    ) : posts.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500">No posts yet.</div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1">
                                            {posts.map((post) => {
                                                let gridImageSrc = post.media_preview_url || post.media;
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
                                                    } catch (e) {
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
                                    loading && reposts.length === 0 ? (
                                        <PostGridSkeleton />
                                    ) : reposts.length === 0 ? (
                                        <div className="text-center py-10 text-gray-500">No reposts yet.</div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1">
                                            {reposts.map((post) => {
                                                let gridImageSrc = post.media_preview_url || post.media;
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
                                                    } catch (e) {
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
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default UserProfileScreen;
