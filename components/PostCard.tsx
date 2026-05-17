// Copyright 2026 Samet Yilmaz Temel
// SPDX-License-Identifier: Apache-2.0
//
// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
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


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import type { Post } from '../types';
import { useApp } from '../store/AppContext';
import { supabase, prefetchUserProfile } from '../services/apiService';
import { HeartIcon, RepostIcon, BookmarkIcon, CommentIcon, TrashIcon, ArrowLeftIcon, ArrowRightIcon, VerifiedIcon, ReportIcon } from './Icons';
import RenderUserContent from './RenderUserContent';
import UserAvatar from './UserAvatar';

interface PostCardProps {
    post: Post;
    isStoryVersion?: boolean;
    onDelete?: (postId: string) => void;
    onViewProfile: (username: string, avatar?: string | null) => void;
    onViewComments: (postId: string) => void;
    isFullScreen?: boolean;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
    isLazy?: boolean;
    isIntersecting?: boolean;
    isPreview?: boolean;
}

const PostHeader: React.FC<{
    post: Post,
    isMyPost: boolean,
    isTextOnly: boolean,
    isImage: boolean,
    onViewProfileClick: (e: React.MouseEvent) => void,
    onDelete: () => void,
    isPreview?: boolean,
}> = React.memo(({ post, isMyPost, isTextOnly, isImage, onViewProfileClick, onDelete, isPreview }) => {
    const [menuState, setMenuState] = useState<'closed' | 'main' | 'report'>('closed');
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const { addToast, showTopNotification, isAdmin } = useApp();

    const reportReasons = [
        "It's spam",
        "Hate speech or symbols",
        "Harassment or bullying",
        "False information",
        "Nudity or sexual activity",
        "I just don't like it"
    ];

    const textColor = isTextOnly || isImage ? 'text-white' : 'text-black dark:text-white';
    const subTextColor = isTextOnly || isImage ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400';
    const ringColor = isImage ? 'focus:ring-offset-black' : 'focus:ring-offset-white dark:focus:ring-offset-[#15181d]';
    const menuColor = isImage ? 'text-gray-200 hover:text-white' : 'text-gray-400 hover:text-blue-400';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setMenuState('closed');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleProfileClick = (e: React.MouseEvent) => {
        onViewProfileClick(e);
    };
    
    const handleSelectReportReason = (reason: string) => {
        setMenuState('closed');
        showTopNotification('Report Submitted', 'Thank you for your feedback. We will review the post.');
    };

    return (
        <div className="flex space-x-3" onMouseEnter={() => prefetchUserProfile(post.username)}>
            <button onClick={handleProfileClick} className={`flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${ringColor}`}>
                <UserAvatar username={post.username} avatarUrl={post.avatar} className={`w-12 h-12 rounded-full ${isImage ? 'border-2 border-white/80' : ''}`} />
            </button>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-1.5">
                            <button onClick={handleProfileClick} className="font-bold text-left hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 rounded">
                                <p className={textColor}>@{post.username}</p>
                            </button>
                            {post.isVerified && <VerifiedIcon className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className="flex items-center">
                            <p className={`${subTextColor} text-sm`}>{post.name || post.username}</p>
                        </div>
                    </div>
                    <div className="relative">
                        <button onClick={() => setMenuState(prev => prev === 'closed' ? 'main' : 'closed')} className={`${menuColor} p-2 rounded-full`}>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                        {menuState !== 'closed' && (
                            <div ref={optionsMenuRef} className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 animate-fade-in-fast border border-gray-200 dark:border-gray-700">
                                {menuState === 'main' && (
                                    <>
                                        {((isMyPost || isAdmin) && !isPreview) ? (
                                            <button
                                                onClick={() => { setMenuState('closed'); onDelete(); }}
                                                className="flex items-center w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                            >
                                                <TrashIcon className="w-5 h-5 mr-3" />
                                                <span>Delete Post</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setMenuState('report')}
                                                className="flex items-center justify-between w-full px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                            >
                                                <div className="flex items-center">
                                                    <ReportIcon className="w-5 h-5 mr-3" />
                                                    <span>Report Post</span>
                                                </div>
                                                <span className="text-gray-400 text-lg">›</span>
                                            </button>
                                        )}
                                    </>
                                )}
                                {menuState === 'report' && (
                                    <>
                                        <div className="p-2 font-bold text-sm text-black dark:text-white border-b border-gray-200 dark:border-gray-700 flex items-center">
                                            <button onClick={() => setMenuState('main')} className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-lg">‹</button>
                                            Why are you reporting this?
                                        </div>
                                        <ul className="py-1 max-h-60 overflow-y-auto">
                                            {reportReasons.map(reason => (
                                                <li key={reason}>
                                                    <button
                                                        onClick={() => handleSelectReportReason(reason)}
                                                        className="w-full text-left px-4 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
                </div>
            </div>
        </div>
    );
});

const getTimeAgo = (timestamp?: string): string => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        
        const diffMinutes = differenceInMinutes(now, date);
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}min ago`;
        
        const diffHours = differenceInHours(now, date);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = differenceInDays(now, date);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        const diffMonths = differenceInMonths(now, date);
        if (diffMonths < 1) {
            const diffWeeks = differenceInWeeks(now, date);
            return `${diffWeeks}w ago`;
        }
        
        if (diffMonths < 12) return `${diffMonths}m ago`;
        
        const diffYears = differenceInYears(now, date);
        return `${diffYears}y ago`;
    } catch (e) {
        console.error("Error formatting date:", e);
        return '';
    }
};

const MAX_CHARS = 280;

const PostCard: React.FC<PostCardProps> = ({ post, isStoryVersion = false, onDelete, onViewProfile, onViewComments, isFullScreen = false, onViewLikers, onViewReposters, onSharePost, isLazy = false, isIntersecting = false, isPreview = false }) => {
    const { isPostLiked, togglePostLike, areCommentsLoaded, userProfile, deleteProfilePost, getComments, voteInPoll, getPollVote, addToast, isPostReposted, togglePostRepost, isPostSaved, toggleSavePost } = useApp();
    
    if (isLazy && !isIntersecting) {
        // Render a placeholder with a fixed height to prevent layout shifts while scrolling
        return <div className="m-2" style={{ minHeight: '400px' }} />;
    }
    
    const liked = isPostLiked(post.id);
    const reposted = isPostReposted(post.id);
    const saved = isPostSaved(post.id);
    const [showHeart, setShowHeart] = useState(false);
    
    // State for counts, synced from parent props
    const [likesCount, setLikesCount] = useState(post.likes);
    const [repostsCount, setRepostsCount] = useState(post.reposts);
    
    // Add loading states for like/repost actions
    const [isLiking, setIsLiking] = useState(false);
    const [isReposting, setIsReposting] = useState(false);

    const isTextOnly = post.media_type === 'text';
    const isImage = post.media_type === 'image';

    const [isExpanded, setIsExpanded] = useState(false);

    // State for progressive media loading
    const [imageSrc, setImageSrc] = useState(post.media_preview_url || post.media);
    const [isImageLoaded, setIsImageLoaded] = useState(!post.media_preview_url);

    const cardRef = useRef<HTMLDivElement>(null);

    // State and refs for gestures
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const longPressTimerRef = useRef<number | null>(null);
    const [imageScale, setImageScale] = useState(1);
    const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
    const initialPinch = useRef<{ distance: number } | null>(null);

    const timeAgo = getTimeAgo(post.timestamp);

    // Sync local count state when props from parent component change
    useEffect(() => {
        setLikesCount(post.likes);
    }, [post.likes]);

    useEffect(() => {
        setRepostsCount(post.reposts);
    }, [post.reposts]);

    useEffect(() => {
        // Robust progressive image loading effect.
        const preview = post.media_preview_url;
        const final = post.media;

        // This effect runs when the post prop changes. Reset state.
        setImageSrc(preview || final);
        setIsImageLoaded(!preview); // If there's no preview, we aren't waiting for a high-res version to load.
        
        // If we have a preview, we need to load the full image in the background.
        if (preview && final) {
            let isCancelled = false;
            const imageLoader = new Image();
            imageLoader.src = final;
            imageLoader.onload = () => {
                if (!isCancelled) {
                    setImageSrc(final);
                    setIsImageLoaded(true);
                }
            };
            return () => { isCancelled = true; };
        }
    }, [post.media, post.media_preview_url]);

    const comments = getComments(post.id);
    const hasLoadedComments = areCommentsLoaded(post.id);
    const commentCount = hasLoadedComments ? comments.length : post.replies;
    const isMyPost = post.username === userProfile.username;
    
    const userPollVote = getPollVote(post.id);
    const totalVotes = post.poll ? post.poll.options.reduce((sum, opt) => sum + opt.votes, 0) + (userPollVote !== undefined ? 1 : 0) : 0;
    
    const needsTruncation = isTextOnly && post.content.length > MAX_CHARS;

    const handlePollVote = (optionIndex: number) => {
        if (userPollVote !== undefined) return;
        voteInPoll(post.id, optionIndex);
        addToast('Your vote has been cast!', 'success');
    };

    const handleLike = async () => {
        if (isStoryVersion || isLiking) return;
        setIsLiking(true);
        // Optimistically update local count
        setLikesCount(prev => liked ? Math.max(0, prev - 1) : prev + 1);
        try {
            // Call context function for backend update and global state
            await togglePostLike(post.id);
        } finally {
            setIsLiking(false);
        }
    };

    const handleRepost = async () => {
        if (isStoryVersion || isReposting) return;
        setIsReposting(true);
        // Optimistically update local count
        setRepostsCount(prev => reposted ? Math.max(0, prev - 1) : prev + 1);
        try {
            // Call context function for backend update and global state
            await togglePostRepost(post.id);
        } finally {
            setIsReposting(false);
        }
    };
    
    const handleViewProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onViewProfile(post.username, post.avatar);
    };

    const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isStoryVersion) return;
        if (!liked) {
            handleLike();
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(post.id);
        } else {
            deleteProfilePost(post.id);
        }
    };
    

    const handleMediaPointerDown = (e: React.PointerEvent) => {
        if (!isImage) return;
    
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
        if (activePointers.current.size === 1) {
            longPressTimerRef.current = window.setTimeout(() => {
                setIsHeaderHidden(true);
            }, 300);
        } else if (activePointers.current.size === 2) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            const pointers: { x: number; y: number }[] = Array.from(activePointers.current.values());
            const distance = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
            initialPinch.current = { distance };
        }
    };
    
    const handleMediaPointerMove = (e: React.PointerEvent) => {
        if (!isImage || !activePointers.current.has(e.pointerId)) return;
    
        const initialPos = activePointers.current.get(e.pointerId);
    
        if (longPressTimerRef.current && initialPos && Math.hypot(e.clientX - initialPos.x, e.clientY - initialPos.y) > 10) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
        if (activePointers.current.size === 2 && initialPinch.current) {
            const pointers: { x: number; y: number }[] = Array.from(activePointers.current.values());
            const currentDist = Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y);
            const newScale = currentDist / initialPinch.current.distance;
            setImageScale(Math.max(1, Math.min(newScale, 4)));
        }
    };
    
    const handleMediaPointerUp = (e: React.PointerEvent) => {
        if (!isImage) return;
        
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (error) {
            // Ignore error if pointer capture was already lost (e.g., due to scrolling)
        }
        activePointers.current.delete(e.pointerId);
    
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        
        setIsHeaderHidden(false);
    
        if (activePointers.current.size < 2) {
            initialPinch.current = null;
        }
        
        if (activePointers.current.size === 0) {
            setImageScale(1);
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    const imageContainerStyle: React.CSSProperties = {};
    if (isImage) {
        imageContainerStyle.aspectRatio = post.media_aspect_ratio || (1080 / 1350);
        imageContainerStyle.overflow = 'hidden';
    }
    
    const imageStyle: React.CSSProperties = {
        transform: `scale(${imageScale})`,
        transition: imageScale === 1 ? 'transform 0.3s ease-out' : 'none',
    };

    return (
        <>
            <div className={isStoryVersion ? '' : (isFullScreen ? '' : 'm-2')}>
                <div
                    ref={cardRef}
                    className={`relative ${isTextOnly ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gray-50 dark:bg-[#15181d]'} rounded-xl overflow-hidden shadow-sm dark:shadow-none`}
                    onDoubleClick={handleDoubleTap}
                >
                    <style>{`
                        @keyframes heart-beat { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 0.8; } 100% { transform: scale(1.1); opacity: 0; } }
                        .animate-heart-beat { animation: heart-beat 0.8s ease-out forwards; }
                        @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out; }
                    `}</style>
                    
                    <div className={`p-4 transition-opacity duration-300 ${isImage ? 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent z-10' : ''} ${isHeaderHidden ? 'opacity-0' : 'opacity-100'}`}>
                        <PostHeader post={post} isMyPost={isMyPost} isTextOnly={isTextOnly} isImage={isImage} onViewProfileClick={handleViewProfileClick} onDelete={handleDelete} isPreview={isPreview} />
                    </div>

                    {/* Content */}
                     {isTextOnly ? (
                         <div className="px-6 pt-0 pb-4 min-h-[16rem] flex flex-col justify-center">
                            <p className="text-white text-lg text-left font-medium whitespace-pre-wrap overflow-hidden overflow-wrap-break-word">
                                <RenderUserContent onViewProfile={onViewProfile} text={needsTruncation && !isExpanded ? `${post.content.substring(0, MAX_CHARS)}...` : post.content} />
                            </p>
                            {needsTruncation && !isExpanded && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                    className="text-blue-300 font-semibold mt-2 self-start"
                                >
                                    Read more
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {post.media && (
                                <div 
                                    className="relative bg-black" 
                                    style={imageContainerStyle}
                                    onPointerDown={handleMediaPointerDown}
                                    onPointerMove={handleMediaPointerMove}
                                    onPointerUp={handleMediaPointerUp}
                                    onPointerLeave={handleMediaPointerUp}
                                    onPointerCancel={handleMediaPointerUp}
                                    onContextMenu={handleContextMenu}
                                >
                                    <img 
                                        src={imageSrc} 
                                        alt="Post media" 
                                        className={`w-full h-full object-contain transition-all duration-300 ${isImageLoaded ? 'blur-none scale-100' : 'blur-md scale-105'}`}
                                        style={imageStyle}
                                        loading="lazy"
                                    />
                                </div>
                            )}
                            {(post.content || post.poll) && (
                                <div className="p-4 pt-2">
                                     {post.content && <p className="text-black dark:text-white whitespace-pre-wrap mb-3"><RenderUserContent text={post.content} onViewProfile={onViewProfile} /></p>}
                                     {post.poll && (
                                        <div className="space-y-2 mt-2">
                                            {post.poll.options.map((option, index) => {
                                                const percentage = totalVotes > 0 ? ((option.votes + (userPollVote === index ? 1 : 0)) / totalVotes) * 100 : 0;
                                                return (
                                                    <button key={index} onClick={() => handlePollVote(index)} disabled={userPollVote !== undefined} className="w-full text-left p-2 rounded-lg border border-gray-300 dark:border-gray-700 relative overflow-hidden transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-default">
                                                        {userPollVote !== undefined && <div className="absolute top-0 left-0 h-full bg-blue-500/20" style={{ width: `${percentage}%` }} />}
                                                        <div className="relative flex justify-between items-center">
                                                            <span className={`font-semibold ${userPollVote === index ? 'text-blue-500' : 'text-black dark:text-white'}`}>{option.text}</span>
                                                            {userPollVote !== undefined && <span className="text-sm text-gray-600 dark:text-gray-400 font-bold">{percentage.toFixed(0)}%</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    
                    {!isStoryVersion && (
                        <div className={`flex justify-between items-center px-4 pb-2 ${isTextOnly ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'} ${isTextOnly || isImage ? 'pt-2' : ''}`}>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                    <button className={`p-1 rounded-full transition-none hover:bg-red-500/10 ${liked ? 'text-red-500' : 'text-inherit'} disabled:opacity-50`} onClick={handleLike} disabled={isLiking}><HeartIcon liked={liked} /></button>
                                    <span className="text-sm text-left">{likesCount}</span>
                                </div>
                                <div className="flex items-center">
                                    <button className="p-1 rounded-full hover:bg-blue-500/10 text-inherit" onClick={() => onViewComments(post.id)}><CommentIcon /></button>
                                    <span className="text-sm text-left">{commentCount}</span>
                                </div>
                                <div className="flex items-center">
                                    <button className={`p-1 rounded-full transition-none hover:bg-blue-500/10 ${reposted ? 'text-blue-500' : 'text-inherit'} disabled:opacity-50`} onClick={handleRepost} disabled={isReposting}><RepostIcon /></button>
                                    <span className="text-sm text-left">{repostsCount}</span>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <span className={`text-xs mr-2 ${isTextOnly ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{timeAgo}</span>
                                <button className={`p-1 rounded-full transition-none ${saved ? 'text-blue-500' : 'text-inherit hover:bg-blue-500/10'}`} onClick={() => toggleSavePost(post.id)}><BookmarkIcon saved={saved} /></button>
                                <button className="p-1 rounded-full hover:bg-blue-500/10 text-inherit" onClick={() => onSharePost(post)}><span className="text-2xl leading-none">➢</span></button>
                            </div>
                        </div>
                    )}

                    {showHeart && (
                        <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-20">
                            <div className="animate-heart-beat"><svg className="w-28 h-28 text-white/80 dark:text-blue-900/70" fill="currentColor" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg></div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default React.memo(PostCard);
