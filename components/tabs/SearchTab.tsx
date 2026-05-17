// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
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


import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Post, SimpleUser, Hashtag } from '../../types';
import PostCard from '../PostCard';
import { SearchIcon, HashtagIcon, VerifiedIcon, HeartIcon, CommentIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import { getTrendingPosts, getAllHashtags, searchUsers } from '../../services/apiService';
import RenderUserContent from '../RenderUserContent';
import PostGridSkeleton from '../PostGridSkeleton';
import UserAvatar from '../UserAvatar';

interface SearchTabProps {
    onViewProfile: (username: string, avatar?: string | null) => void;
    onViewComments: (postId: string) => void;
    onViewPost: (posts: Post[], postToView: Post) => void;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
}

type FilterType = 'posts' | 'users' | 'hashtags';

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

const FilterButton: React.FC<{ name: string; active: boolean; onClick: () => void; }> = ({ name, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-center font-semibold transition-colors duration-200 ${
            active 
            ? 'text-blue-400 border-b-2 border-blue-400' 
            : 'text-gray-500 hover:text-white'
        }`}
    >
        {name}
    </button>
);

const UserSearchResult: React.FC<{ user: SimpleUser; onViewProfile: (username: string, avatar?: string | null) => void; }> = ({ user, onViewProfile }) => {
    const { isUserFollowed, toggleFollowUser, userProfile } = useApp();
    const isFollowing = isUserFollowed(user.username);
    const isMyProfile = userProfile.username === user.username;

    return (
        <div className="flex items-center space-x-4 p-3 hover:bg-gray-900 transition-colors">
            <button onClick={() => onViewProfile(user.username, user.avatar)} className="flex items-center space-x-4 flex-1">
                <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full" />
                <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                        <p className="font-bold text-white">@{user.username}</p>
                        {user.isVerified && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex items-center">
                        <p className="text-sm text-gray-400">{user.name}</p>
                    </div>
                </div>
            </button>
            {!isMyProfile && (
                <button
                    onClick={() => toggleFollowUser(user.username)}
                    className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors duration-200 w-28 text-center ${
                        isFollowing 
                        ? 'bg-transparent text-white border border-gray-700 hover:bg-gray-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
            )}
        </div>
    );
};

const HashtagSearchResult: React.FC<{ hashtag: Hashtag }> = ({ hashtag }) => (
    <button className="w-full flex items-center space-x-4 p-3 hover:bg-gray-900 transition-colors text-left">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
            <HashtagIcon />
        </div>
        <div>
            <p className="font-bold text-white">#{hashtag.tag}</p>
            <p className="text-sm text-gray-400">{hashtag.postCount.toLocaleString()} posts</p>
        </div>
    </button>
);


const SearchTab: React.FC<SearchTabProps> = ({ onViewProfile, onViewComments, onViewPost, onViewLikers, onViewReposters, onSharePost }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('users');
    
    const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
    const [hashtags, setHashtags] = useState<Hashtag[]>([]);
    const [userResults, setUserResults] = useState<SimpleUser[]>([]);
    const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const { isUserBlocked } = useApp();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullPosition, setPullPosition] = useState(0);
    const touchStartY = useRef(0);
    const isDragging = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const loadAllData = useCallback(async () => {
        if (!isRefreshing) setLoading(true);
        try {
            const [postsData, hashtagsData] = await Promise.all([
                getTrendingPosts(),
                getAllHashtags()
            ]);
            setTrendingPosts(postsData);
            setHashtags(hashtagsData);
        } catch (error) {
            console.error("Failed to load search data", error);
        } finally {
            if (!isRefreshing) setLoading(false);
        }
    }, [isRefreshing]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        await loadAllData();
        setIsRefreshing(false);
    }, [isRefreshing, loadAllData]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (container.scrollTop === 0) {
                isDragging.current = true;
                touchStartY.current = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging.current || isRefreshing) return;
            const deltaY = e.touches[0].clientY - touchStartY.current;
            if (deltaY > 0) {
                // Prevent default scroll behavior only when pulling down at the top
                if (container.scrollTop === 0) {
                    e.preventDefault();
                }
                setPullPosition(Math.pow(deltaY, 0.85));
            }
        };

        const handleTouchEnd = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            if (pullPosition > 80) {
                handleRefresh();
            }
            setPullPosition(0);
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleRefresh, isRefreshing, pullPosition]);

    useEffect(() => {
        if (!isSearching) {
            setUserResults([]);
            return;
        }

        if (activeFilter !== 'users' || !searchTerm.trim()) {
            setUserResults([]);
            return;
        }

        const handleSearch = async () => {
            setIsUserSearchLoading(true);
            const usersFromApi = await searchUsers(searchTerm);
            // FIX: Add the missing 'id' property to satisfy the SimpleUser type.
            const mappedUsers: SimpleUser[] = usersFromApi.map(u => ({
                id: u.id,
                name: u.full_name,
                username: u.username,
                avatar: u.avatar_url,
                isVerified: u.is_verified,
            }));
            setUserResults(mappedUsers.filter(u => !isUserBlocked(u.username)));
            setIsUserSearchLoading(false);
        };
        
        const timerId = setTimeout(() => {
            handleSearch();
        }, 300);

        return () => clearTimeout(timerId);
    }, [searchTerm, activeFilter, isSearching, isUserBlocked]);

    const filteredPosts = useMemo(() => 
        trendingPosts.filter(post => 
            !isUserBlocked(post.username) &&
            (post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.username.toLowerCase().includes(searchTerm.toLowerCase()))
        ), [trendingPosts, searchTerm, isUserBlocked]
    );

    const filteredHashtags = useMemo(() =>
        hashtags.filter(hashtag =>
            hashtag.tag.toLowerCase().includes(searchTerm.toLowerCase())
        ), [hashtags, searchTerm]
    );

    const renderSearchResults = () => {
        if (loading && !isSearching) {
            return <div className="flex justify-center items-center flex-1 pt-16"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        }

        switch (activeFilter) {
            case 'posts':
                return filteredPosts.length > 0 ? (
                    <div>{filteredPosts.map(post => (
                        <div key={post.id} onClick={() => onViewPost(filteredPosts, post)} className="cursor-pointer">
                            <PostCard post={post} onViewProfile={onViewProfile} onViewComments={onViewComments} onViewLikers={onViewLikers} onViewReposters={onViewReposters} onSharePost={onSharePost} />
                        </div>
                    ))}</div>
                ) : (
                    <p className="text-center text-gray-500 p-8">No posts found matching "{searchTerm}".</p>
                );
            case 'users':
                if (isUserSearchLoading) {
                    return <div className="flex justify-center items-center flex-1 pt-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;
                }
                if (!searchTerm.trim()) {
                    return <p className="text-center text-gray-500 p-8">Start typing to search for users.</p>;
                }
                return userResults.length > 0 ? (
                    <div>{userResults.map(user => <UserSearchResult key={user.username} user={user} onViewProfile={onViewProfile} />)}</div>
                ) : (
                    <p className="text-center text-gray-500 p-8">No users found matching "{searchTerm}".</p>
                );
            case 'hashtags':
                 return filteredHashtags.length > 0 ? (
                    <div>{filteredHashtags.map(hashtag => <HashtagSearchResult key={hashtag.tag} hashtag={hashtag} />)}</div>
                ) : (
                    <p className="text-center text-gray-500 p-8">No hashtags found matching "{searchTerm}".</p>
                );
            default:
                return null;
        }
    };
    
    const renderExploreGrid = () => {
        // Show skeleton grid on initial load and during pull-to-refresh.
        if (loading || isRefreshing) {
            return <PostGridSkeleton />;
        }
        
        const visiblePosts = trendingPosts.filter(post => !isUserBlocked(post.username));

        if (visiblePosts.length === 0) {
            return (
                <div className="text-center py-20 text-gray-500">
                    <h2 className="text-xl font-bold">Nothing to Explore Yet</h2>
                    <p className="mt-2">As more posts are created, they will appear here.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-3 gap-1 p-1">
                {visiblePosts.map((post) => {
                    const isTextPost = post.media_type === 'text' || !post.media;
                    
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
                        } catch(e) {
                            gridImageSrc = post.media;
                        }
                    }

                    return (
                        <button 
                            key={post.id} 
                            onClick={() => onViewPost(visiblePosts, post)}
                            className="aspect-square bg-gray-800 focus:outline-none relative group w-full h-full overflow-hidden"
                        >
                            {isTextPost ? (
                                <div className="w-full h-full p-2 flex flex-col bg-gradient-to-br from-gray-700 to-gray-800 text-left">
                                    <div className="flex items-center space-x-2">
                                        <UserAvatar username={post.username} avatarUrl={post.avatar} className="w-5 h-5 rounded-full" />
                                        <span className="text-white text-xs font-bold truncate">@{post.username}</span>
                                    </div>
                                    <div className="flex-grow text-white text-xs font-medium whitespace-pre-wrap overflow-hidden py-1" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 5 }}>
                                        <RenderUserContent text={post.content} onViewProfile={onViewProfile} />
                                    </div>
                                    <div className="flex items-center space-x-2 text-white/70 text-xs">
                                        <HeartIcon liked={false} />
                                        <span className="font-mono text-xs">{post.likes}</span>
                                        <CommentIcon className="w-4 h-4" />
                                        <span className="font-mono text-xs">{post.replies}</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <img src={gridImageSrc} alt="Post media" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                                        <div className="flex items-center text-white font-bold">
                                            <HeartIcon liked={false} />
                                            <span className="ml-1">{post.likes}</span>
                                        </div>
                                        <div className="flex items-center text-white font-bold">
                                            <CommentIcon className="w-6 h-6" />
                                            <span className="ml-1">{post.replies}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 sticky top-0 bg-black z-10">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search Ahlan"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                        className="w-full bg-gray-800 border border-transparent rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <SearchIcon />
                    </div>
                </div>
                 {isSearching && (
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full border-b border-gray-800">
                           <FilterButton name="Users" active={activeFilter === 'users'} onClick={() => setActiveFilter('users')} />
                           <FilterButton name="Posts" active={activeFilter === 'posts'} onClick={() => setActiveFilter('posts')} />
                           <FilterButton name="Hashtags" active={activeFilter === 'hashtags'} onClick={() => setActiveFilter('hashtags')} />
                        </div>
                        <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="ml-2 text-blue-400 font-semibold">Cancel</button>
                    </div>
                 )}
            </div>

            <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
                <RefreshIndicator isRefreshing={isRefreshing} pullPosition={pullPosition} />
                <div style={{ transform: `translateY(${isRefreshing ? 60 : pullPosition}px)` }} className="transition-transform duration-300">
                    {isSearching ? renderSearchResults() : renderExploreGrid()}
                </div>
            </div>
        </div>
    );
};

export default SearchTab;
