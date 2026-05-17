// Copyright 2026 Samet Yilmaz Temel
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
import type { Post } from '../../types';
import PostCard from '../PostCard';
import { getTimeline, getMorePosts, resetPageCounter, supabase, mapPostData, getPostById, getSmartUserSuggestions } from '../../services/apiService';
import { useApp } from '../../store/AppContext';
import PostSkeleton from '../PostSkeleton';
import UserSuggestions from '../UserSuggestions';
import { VerifiedIcon } from '../Icons';
import UserAvatar from '../UserAvatar';

interface HomeTabProps {
    scrollContainerRef: React.RefObject<HTMLElement>;
    onViewProfile: (username: string, avatar?: string | null) => void;
    onViewComments: (postId: string) => void;
    onViewPost: (posts: Post[], postToView: Post) => void;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
    onRefreshStories: () => Promise<void>;
}

interface Suggestion {
  suggested_user_id: string;
  username: string;
  avatar_url: string;
  mutual_followers: number;
  is_verified?: boolean;
}

const NewUserHomeSuggestions: React.FC<{ suggestions: Suggestion[], onViewProfile: (username: string, avatar?: string) => void }> = ({ suggestions, onViewProfile }) => {
    const { toggleFollowUser, isUserFollowed } = useApp();

    if (suggestions.length === 0) {
        return (
            <div className="text-center py-8 px-4">
                <h2 className="text-xl font-bold mb-2">Welcome to Ahlan!</h2>
                <p className="text-gray-400">Finding people for you to follow...</p>
            </div>
        );
    }

    return (
        <div className="py-4">
            <div className="px-4">
                <h2 className="text-xl font-bold mb-2">Welcome to Ahlan!</h2>
                <p className="text-gray-400 mb-4">Your feed is empty. Get started by following some of these accounts.</p>
            </div>
            <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style> {/* For webkit */}
                {suggestions.map((user) => {
                    const isFollowing = isUserFollowed(user.username);
                    return (
                        <div key={user.suggested_user_id} className="flex-shrink-0 w-40 bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center">
                            <button onClick={() => onViewProfile(user.username, user.avatar_url)}>
                                <UserAvatar username={user.username} avatarUrl={user.avatar_url} className="w-20 h-20 rounded-full" />
                            </button>
                            <div className="flex items-center space-x-1 mt-2">
                                <p className="font-bold truncate w-full text-white">@{user.username}</p>
                                {user.is_verified && <VerifiedIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                            </div>
                            <button 
                                onClick={() => toggleFollowUser(user.username)}
                                className={`mt-4 w-full px-4 py-1.5 rounded-full font-semibold text-sm transition-colors duration-200 ${
                                    isFollowing
                                    ? 'bg-transparent text-white border border-gray-700 hover:bg-gray-700'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

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

const HomeTab: React.FC<HomeTabProps> = ({ scrollContainerRef, onRefreshStories, ...postCardProps }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullPosition, setPullPosition] = useState(0);
    const [visiblePosts, setVisiblePosts] = useState<Set<string>>(new Set());
    
    const { isUserBlocked, addToast, followedUsernames, userProfile } = useApp();
    const [newUserSuggestions, setNewUserSuggestions] = useState<Suggestion[]>([]);
    
    const touchStartY = useRef(0);
    const isDragging = useRef(false);
    const pullPositionRef = useRef(pullPosition);
    pullPositionRef.current = pullPosition;
    const postsRef = useRef(posts);
    postsRef.current = posts;
    const postsContainerRef = useRef<HTMLDivElement>(null);

    const allPosts = useMemo(() => {
        return posts.filter(post => post.username && !isUserBlocked(post.username));
    }, [posts, isUserBlocked]);

    const isNewUserEmptyFeed = useMemo(() => {
        return followedUsernames.size === 0 && allPosts.length === 0 && !isLoading;
    }, [followedUsernames.size, allPosts.length, isLoading]);

    useEffect(() => {
        if (isNewUserEmptyFeed && userProfile.id) {
            getSmartUserSuggestions(userProfile.id).then(data => {
                setNewUserSuggestions(data || []);
            });
        }
    }, [isNewUserEmptyFeed, userProfile.id]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        resetPageCounter();
        const timelinePosts = await getTimeline();
        setPosts(timelinePosts);
        setHasMore(timelinePosts.length > 0);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            resetPageCounter();
            const refreshPromises = Promise.all([
                getTimeline(),
                onRefreshStories(),
            ]).then(([timelinePosts]) => {
                setPosts(timelinePosts);
                setHasMore(timelinePosts.length > 0);
            });

            // Race the refresh against a timeout to ensure the spinner doesn't get stuck.
            await Promise.race([
                refreshPromises,
                new Promise(resolve => setTimeout(resolve, 8000)) // 8-second timeout
            ]);
        } catch (error) {
            console.error("Failed to refresh timeline:", error);
            addToast("Couldn't refresh timeline.", "error");
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, onRefreshStories, addToast]);
    
    const handlePostUpdates = useCallback(async (payload: any) => {
        const currentPosts = postsRef.current;

        if (payload.eventType === 'INSERT') {
            const newPostData = payload.new;
            if (currentPosts.some(p => p.id === newPostData.id)) return;
            
            const fullPost = await getPostById(newPostData.id);
            if (fullPost) {
                setPosts(prev => [fullPost, ...prev]);
            }
        } 
        else if (payload.eventType === 'UPDATE') {
            const updatedPostData = payload.new;
            const fullPost = await getPostById(updatedPostData.id);
            if (fullPost) {
                setPosts(prev => prev.map(p => p.id === fullPost.id ? fullPost : p));
            }
        } 
        else if (payload.eventType === 'DELETE') {
            const deletedPostId = payload.old.id;
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, []);

    useEffect(() => {
        const subscription = supabase
            .channel(`public:posts-home-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handlePostUpdates)
            .subscribe();
        
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [handlePostUpdates]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        const morePosts = await getMorePosts();
        if (morePosts.length > 0) {
            setPosts(prev => [...prev, ...morePosts]);
        } else {
            setHasMore(false);
        }
        setIsLoadingMore(false);
    }, [isLoadingMore, hasMore]);
    
    useEffect(() => {
        const container = scrollContainerRef.current;
        const handleScroll = () => {
            if (container && container.scrollTop + container.clientHeight >= container.scrollHeight - 300) {
                loadMore();
            }
        };
        container?.addEventListener('scroll', handleScroll);
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef, loadMore]);

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

    // Intersection Observer for lazy rendering post content
    useEffect(() => {
        // FIX: Explicitly typing the `entries` parameter ensures that `entry.target` is correctly
        // inferred as `Element`, resolving the type error without needing a manual cast.
        const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
            setVisiblePosts(prevVisiblePosts => {
                const newVisible = new Set(prevVisiblePosts);
                let hasChanged = false;
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // FIX: Cast entry.target to Element because type inference seems to be failing in this environment.
                        const postId = (entry.target as Element).getAttribute('data-postid');
                        if (postId && !newVisible.has(postId)) {
                            newVisible.add(postId);
                            hasChanged = true;
                        }
                    }
                });
                return hasChanged ? newVisible : prevVisiblePosts;
            });
        }, { rootMargin: '200px' });

        const container = postsContainerRef.current;
        if (container) {
            // FIX: Use a for...of loop to ensure `child` is correctly typed as an Element.
            // This resolves an issue where `child` was being inferred as `unknown` or `{}`.
            for (const child of Array.from(container.children)) {
                if (child.getAttribute('data-postid')) {
                    observer.observe(child);
                }
            }
        }

        return () => {
            observer.disconnect();
        };
    }, [allPosts]); // Re-run effect when the list of posts changes

    return (
        <div className="relative">
            <RefreshIndicator isRefreshing={isRefreshing} pullPosition={pullPosition} />
            <div style={{ transform: `translateY(${isRefreshing ? 60 : pullPosition}px)` }} className={`transition-transform duration-300`}>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
                ) : (
                    <div ref={postsContainerRef}>
                        {allPosts.map((post, index) => (
                           <React.Fragment key={post.id}>
                               {index === 3 && !isNewUserEmptyFeed && <UserSuggestions onViewProfile={postCardProps.onViewProfile} />}
                               <div data-postid={post.id}>
                                  <PostCard 
                                    post={post} 
                                    {...postCardProps}
                                    isLazy={true}
                                    isIntersecting={visiblePosts.has(post.id)} 
                                  />
                               </div>
                           </React.Fragment>
                        ))}
                    </div>
                )}
                {isLoadingMore && <PostSkeleton />}
                 {!isLoading && allPosts.length === 0 && (
                    isNewUserEmptyFeed ? (
                        <NewUserHomeSuggestions suggestions={newUserSuggestions} onViewProfile={postCardProps.onViewProfile} />
                    ) : (
                         <p className="text-center text-gray-500 py-8">
                            {followedUsernames.size > 0 ? "Your feed is empty. The people you follow haven't posted yet." : "Welcome! Follow some users to see their posts here."}
                         </p>
                    )
                )}
            </div>
        </div>
    );
};

export default HomeTab;