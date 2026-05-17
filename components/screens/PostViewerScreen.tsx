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

import React, { useState, useRef, useEffect } from 'react';
import type { Post } from '../../types';
import PostCard from '../PostCard';
import { ArrowRightIcon, ThreeDotsVerticalIcon, PencilIcon, TrashIcon } from '../Icons';
import { useApp } from '../../store/AppContext';

interface PostViewerScreenProps {
    posts: Post[];
    initialPostId: string;
    close: () => void;
    onViewProfile: (username: string, avatar?: string | null) => void;
    onViewComments: (postId: string) => void;
    onEditPost: (post: Post) => void;
    onViewLikers: (postId: string) => void;
    onViewReposters: (postId: string) => void;
    onSharePost: (post: Post) => void;
}

const PostViewerScreen: React.FC<PostViewerScreenProps> = ({ posts, initialPostId, close, onViewProfile, onViewComments, onEditPost, onViewLikers, onViewReposters, onSharePost }) => {
    const { userProfile, deleteProfilePost } = useApp();
    const [activePost, setActivePost] = useState<Post | null>(() => posts.find(p => p.id === initialPostId) || null);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    
    const optionsMenuRef = useRef<HTMLDivElement>(null);
    const postRefs = useRef<Map<string, any>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const isMyPost = activePost?.username === userProfile.username;

    useEffect(() => {
        // Scroll to the initial post
        const initialPostElement = postRefs.current.get(initialPostId);
        if (initialPostElement) {
            initialPostElement.scrollIntoView({ block: 'start' });
        }
    }, [initialPostId]);

    useEffect(() => {
        // Set up IntersectionObserver to track the active post
        observer.current = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // FIX: Cast entry.target to Element to access getAttribute.
                        const postId = (entry.target as Element).getAttribute('data-postid');
                        const post = posts.find(p => p.id === postId);
                        if (post) {
                            setActivePost(post);
                        }
                    }
                });
            },
            { threshold: 0.5 } // 50% of the post must be visible
        );

        const currentRefs = postRefs.current;
        currentRefs.forEach(el => {
            if (el) observer.current?.observe(el);
        });

        return () => {
            currentRefs.forEach(el => {
                if (el) observer.current?.unobserve(el);
            });
        };
    }, [posts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
                setShowOptionsMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDelete = () => {
        if (activePost && window.confirm("Are you sure you want to delete this post?")) {
            deleteProfilePost(activePost.id);
            close();
        }
        setShowOptionsMenu(false);
    };

    const handleEdit = () => {
        if (activePost) {
            onEditPost(activePost);
        }
        setShowOptionsMenu(false);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen animate-fade-in">
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                @keyframes fade-in-fast { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out; }
                /* Custom scrollbar for the feed */
                .post-feed-scrollbar::-webkit-scrollbar { width: 4px; }
                .post-feed-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .post-feed-scrollbar::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 2px; }
                .post-feed-scrollbar { scrollbar-width: thin; scrollbar-color: #4a5568 transparent; }
            `}</style>
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 safe-pt">
                <h1 className="text-xl font-bold">Feed</h1>
                <div className="flex items-center">
                    {isMyPost && (
                         <div className="relative">
                            <button onClick={() => setShowOptionsMenu(prev => !prev)} className="p-2 text-white hover:bg-gray-800 rounded-full">
                                <ThreeDotsVerticalIcon className="w-6 h-6" />
                            </button>
                            {showOptionsMenu && activePost && (
                                <div ref={optionsMenuRef} className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-20 animate-fade-in-fast border border-gray-700">
                                    {activePost.media_type === 'text' && (
                                        <button onClick={handleEdit} className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-gray-700 rounded-t-md">
                                            <PencilIcon className="w-5 h-5 mr-3" />
                                            <span>Edit Post</span>
                                        </button>
                                    )}
                                    <button onClick={handleDelete} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-b-md">
                                        <TrashIcon className="w-5 h-5 mr-3" />
                                        <span>Delete Post</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={close} className="text-blue-400 p-2">
                        <ArrowRightIcon className="w-8 h-8" />
                    </button>
                </div>
            </header>

            <div ref={containerRef} className="flex-1 overflow-y-auto post-feed-scrollbar">
                {posts.map(post => (
                    <div 
                        key={post.id} 
                        ref={el => { postRefs.current.set(post.id, el); }} 
                        data-postid={post.id}
                        className="py-2"
                    >
                        <PostCard 
                            post={post} 
                            onViewProfile={onViewProfile} 
                            onViewComments={onViewComments} 
                            onViewLikers={onViewLikers} 
                            onViewReposters={onViewReposters}
                            isFullScreen={true}
                            onSharePost={onSharePost}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PostViewerScreen;