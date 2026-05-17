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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Story } from '../../types';
import { useApp } from '../../store/AppContext';
import { HeartIcon, TrashIcon, ArrowLeftIcon, ShareIcon, EyeIcon } from '../Icons';
import RenderUserContent from '../RenderUserContent';
import { getStoryViewCount, getStoryViewers, recordStoryView, replyToStory } from '../../services/apiService';
import UserAvatar from '../UserAvatar';

interface StoryViewerProps {
    stories: Story[];
    close: () => void;
    initialIndex?: number;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ stories: initialStories, close, initialIndex = 0 }) => {
    const [stories, setStories] = useState(initialStories);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [replyText, setReplyText] = useState('');
    const { isStoryLiked, toggleStoryLike, userProfile, deleteStory, markStoryAsViewed, addToast } = useApp();
    const [viewCount, setViewCount] = useState<number | null>(null);
    const [viewers, setViewers] = useState<any[]>([]);

    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const interactionState = useRef<{
        startX: number;
        startY: number;
        isSwiping: boolean;
        swipeDirection: 'horizontal' | 'vertical' | null;
        pointerId: number | null;
        isPaused: boolean;
    }>({ startX: 0, startY: 0, isSwiping: false, swipeDirection: null, pointerId: null, isPaused: false });
    const timerRef = useRef<number | null>(null);


    const handleClose = useCallback(() => {
        close();
    }, [close]);

    // Effect to handle story array changes (e.g., after deletion)
    useEffect(() => {
        if (!stories || stories.length === 0) {
            handleClose();
            return;
        }
        // If the current index is now out of bounds (e.g., last story was deleted),
        // move to the new last story.
        if (currentIndex >= stories.length) {
            setCurrentIndex(stories.length - 1);
        }
    }, [stories, currentIndex, handleClose]);

    // Effect to mark story as viewed and fetch view count
    useEffect(() => {
        if (stories && stories.length > currentIndex) {
            const currentStory = stories[currentIndex];

            // Mark story as viewed (local state)
            markStoryAsViewed(currentStory.timestamp);

            // Don't interact with DB for local, un-uploaded stories
            if (currentStory.id.startsWith('local-')) {
                if (currentStory.username === userProfile.username) {
                    setViewCount(0); // Show 0 for own local story
                } else {
                    setViewCount(null);
                }
                return;
            }

            // Record the view in the database if it's not the user's own story
            if (currentStory.username !== userProfile.username && userProfile.id) {
                recordStoryView(currentStory.id, userProfile.id);
            }
    
            // Fetch view count if it is the user's own story
            if (currentStory.username === userProfile.username) {
                const fetchViews = async () => {
                    const count = await getStoryViewCount(currentStory.id);
                    setViewCount(count);
                    const viewerList = await getStoryViewers(currentStory.id);
                    setViewers(viewerList);
                };
                fetchViews();
            } else {
                // Reset view count if it's not our story
                setViewCount(null);
                setViewers([]);
            }
        }
    }, [currentIndex, stories, markStoryAsViewed, userProfile.id, userProfile.username]);


    const goToNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setReplyText('');
        } else {
            close();
        }
    }, [currentIndex, stories.length, close]);

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setReplyText('');
        }
    }, [currentIndex]);
    
    // Timer for auto-advancing stories
    useEffect(() => {
        if (interactionState.current.isPaused) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        
        timerRef.current = window.setTimeout(() => {
            goToNext();
        }, 15000); // 15 seconds

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentIndex, goToNext, interactionState.current.isPaused]);


    if (!stories || stories.length === 0 || currentIndex >= stories.length) {
        return null;
    }

    const story = stories[currentIndex];
    const isMyStory = story.username === userProfile.username;
    const liked = isStoryLiked(story.id);

    const handleDelete = () => {
        const storyToDelete = stories[currentIndex];
        // Call context for backend/global state update
        deleteStory(storyToDelete.id);
        
        // Update local state immediately for instant UI feedback
        const newStories = stories.filter(s => s.id !== storyToDelete.id);
        setStories(newStories);
    };

    const handleSendReply = async () => {
        if (replyText.trim() && !isMyStory) {
            const message = replyText.trim();
            setReplyText(''); // Clear input optimistically

            try {
                await replyToStory(story.id, story.userId, message);
                addToast('Reply sent as a message!', 'success');
            } catch (error) {
                console.error(error);
                addToast('Failed to send reply.', 'error');
                setReplyText(message); // Restore text on failure
            }
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('input, button')) {
            return;
        }
        interactionState.current.isPaused = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        interactionState.current = {
            ...interactionState.current,
            startX: e.clientX,
            startY: e.clientY,
            isSwiping: false,
            swipeDirection: null,
            pointerId: e.pointerId,
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (interactionState.current.pointerId !== e.pointerId) return;

        const deltaX = e.clientX - interactionState.current.startX;
        const deltaY = e.clientY - interactionState.current.startY;
        
        if (!interactionState.current.isSwiping && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
            interactionState.current.isSwiping = true;
            interactionState.current.swipeDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        }
        
        if (interactionState.current.isSwiping) {
            if (interactionState.current.swipeDirection === 'horizontal') {
                 setTranslateX(deltaX);
            } else {
                 setTranslateY(deltaY);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (interactionState.current.pointerId !== e.pointerId) return;

        interactionState.current.isPaused = false;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

        const deltaX = e.clientX - interactionState.current.startX;
        const deltaY = e.clientY - interactionState.current.startY;

        if (interactionState.current.isSwiping) {
            const swipeThreshold = 50; 
            if (interactionState.current.swipeDirection === 'horizontal') {
                if (deltaX < -swipeThreshold) {
                    goToNext();
                } else if (deltaX > swipeThreshold) {
                    goToPrev();
                }
            } else {
                if (Math.abs(deltaY) > swipeThreshold) {
                    handleClose();
                }
            }
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const tapAreaWidth = rect.width * 0.3;

            if (tapX < tapAreaWidth) {
                goToPrev();
            } else if (tapX > rect.width - tapAreaWidth) {
                goToNext();
            }
        }

        interactionState.current = { ...interactionState.current, startX: 0, startY: 0, isSwiping: false, swipeDirection: null, pointerId: null };
        setTranslateX(0);
        setTranslateY(0);
    };
    
    // Keying the div to reset animations/state when story changes
    const storyContent = (
        <div key={currentIndex} className="w-full h-full animate-fade-in-fast">
            {story.imageUrl ? (
                <img src={story.imageUrl} alt="Story" className="w-full h-full object-contain" />
            ) : story.content ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-8">
                    <p className="text-white text-3xl font-bold text-center">
                        <RenderUserContent text={story.content} />
                    </p>
                </div>
            ) : null}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black z-50">
            <style>{`
                @keyframes fade-in-fast {
                    from { opacity: 0; } to { opacity: 1; }
                }
                .animate-fade-in-fast { animation: fade-in-fast 0.3s ease-out; }
                @keyframes progress-fill {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-progress-fill { animation: progress-fill 15s linear; }
            `}</style>
            <div 
                className="relative w-full h-full bg-black touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div 
                    className="w-full h-full"
                    style={{
                        transform: `translate(${translateX}px, ${translateY}px)`,
                        transition: interactionState.current.isSwiping ? 'none' : 'transform 0.2s ease-out',
                    }}
                >
                    {storyContent}
                </div>
                
                {/* Header */}
                <div 
                    className="absolute top-0 left-0 right-0 px-3 pb-3 bg-gradient-to-b from-black/60 to-transparent z-10"
                    style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0rem))` }}
                >
                    {/* Progress Bars */}
                    <div className="flex items-center space-x-1 mb-2">
                        {stories.map((s, index) => (
                            <div key={index} className="h-0.5 flex-1 bg-white/40 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white"
                                    style={{
                                        width: '100%',
                                        transform: index < currentIndex ? 'translateX(0)' : 'translateX(-100%)',
                                        animation: index === currentIndex ? 'progress-fill 15s linear' : 'none',
                                        animationPlayState: interactionState.current.isPaused ? 'paused' : 'running'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between h-10">
                        <div className="flex items-center space-x-2">
                            <UserAvatar username={story.username} avatarUrl={story.avatar} className="w-10 h-10 rounded-full" />
                            <span className="text-white font-bold">@{story.username}</span>
                        </div>
                        <button onClick={close} className="p-2 pointer-events-auto rounded-full hover:bg-white/10">
                            <ArrowLeftIcon className="w-6 h-6 text-blue-500" />
                        </button>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div 
                    className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-gradient-to-t from-black/60 to-transparent z-10"
                    style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0rem))` }}
                >
                    {isMyStory ? (
                        <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                {viewCount !== null && (
                                    <div className="flex items-center space-x-1 text-white font-semibold text-sm bg-black/40 py-2 px-3 rounded-full">
                                        <EyeIcon className="w-5 h-5" />
                                        <span>{viewCount} {viewCount === 1 ? 'view' : 'views'}</span>
                                    </div>
                                )}
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={handleDelete}
                                        className="p-2 rounded-full bg-black/40 hover:bg-red-500/80 text-white transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            {/* Viewer avatars row */}
                            {viewers.length > 0 && (
                                <div className="flex items-center space-x-1 overflow-x-auto py-1">
                                    {viewers.slice(0, 25).map((viewer: any) => (
                                        <UserAvatar
                                            key={viewer.user_id}
                                            username={viewer.username}
                                            avatarUrl={viewer.avatar_url}
                                            className="w-7 h-7 rounded-full flex-shrink-0"
                                        />
                                    ))}
                                    {viewers.length > 25 && (
                                        <span className="text-white/60 text-xs ml-2 flex-shrink-0">
                                            +{viewers.length - 25}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <input 
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                                placeholder={`Reply to @${story.username}...`}
                                className="flex-1 bg-black/40 border border-white/40 rounded-full py-3 px-4 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                             <button
                                onClick={handleSendReply}
                                className="text-blue-500 font-semibold disabled:text-gray-500 transition-colors px-2"
                                disabled={!replyText.trim()}>
                                Send
                            </button>
                            {!isMyStory && (
                                <button
                                    onClick={() => toggleStoryLike(story)}
                                    className={`p-3 rounded-full ${liked ? 'text-red-500' : 'text-white'}`}
                                >
                                    <HeartIcon liked={liked} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryViewer;