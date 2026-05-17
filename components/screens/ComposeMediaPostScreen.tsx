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

import React, { useState, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { ArrowLeftIcon, FlagIcon } from '../Icons';
import { Post } from '../../types';
import { cleanHtml } from '../../services/apiService';
import PostCard from '../PostCard';
import FlagPicker from '../FlagPicker';
import UserAvatar from '../UserAvatar';

interface ComposeMediaPostScreenProps {
    initialMediaSrc: string;
    close: () => void;
}

const ComposeMediaPostScreen: React.FC<ComposeMediaPostScreenProps> = ({ initialMediaSrc, close }) => {
    const [caption, setCaption] = useState('');
    const [isPosting, setPosting] = useState(false);
    const { addProfilePost, userProfile, addToast } = useApp();
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handlePostCreation = async () => {
        setPosting(true);
        
        const newPost: Post = {
            id: `post_${Date.now()}`,
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            content: cleanHtml(caption),
            media: initialMediaSrc,
            media_type: 'image',
            media_aspect_ratio: 1080 / 1350,
            likes: 0,
            reposts: 0,
            replies: 0,
            timestamp: new Date().toISOString(),
        };
        
        try {
            await addProfilePost(newPost);
            close();
        } catch (error) {
            console.error('Post creation failed:', error);
            addToast('Failed to create post. Please try again.', 'error');
        } finally {
            setPosting(false);
        }
    };

    const handleFlagSelect = (flagTextCode: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setCaption(prev => prev + flagTextCode);
            return;
        }

        const start = textarea.selectionStart ?? caption.length;
        const end = textarea.selectionEnd ?? caption.length;
        const text = caption;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setCaption(newText);
        setFlagPickerOpen(false);

        // Focus and set cursor position after insertion
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + flagTextCode.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const previewPost: Post = {
        id: 'preview_post',
        username: userProfile.username,
        avatar: userProfile.profilePicture,
        content: caption,
        media: initialMediaSrc,
        media_type: 'image',
        media_aspect_ratio: 1080 / 1350,
        likes: 13,
        reposts: 2,
        replies: 4,
        timestamp: new Date().toISOString(),
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen w-screen animate-slide-up">
            <header className="flex items-center justify-between p-2 bg-black border-b border-gray-800 z-10 flex-shrink-0 safe-pt">
                <button onClick={close} className="p-2">
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold">New Post</h1>
                <button
                    onClick={handlePostCreation}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-opacity hover:bg-blue-700 disabled:opacity-50"
                    disabled={isPosting}
                >
                    {isPosting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        'Share'
                    )}
                </button>
            </header>
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-6">
                <div className="flex-shrink-0">
                    <PostCard 
                        post={previewPost} 
                        onViewComments={() => {}} 
                        onViewProfile={(username, avatar) => {}} 
                        onViewLikers={() => {}}
                        onViewReposters={() => {}}
                        onSharePost={() => {}}
                        isPreview={true}
                    />
                </div>
                
                <div className="flex items-start space-x-3">
                    <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-10 h-10 rounded-full"/>
                    <div className="relative flex-1">
                        <textarea
                            ref={textareaRef}
                            value={caption}
                            onChange={(e) => setCaption(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                            placeholder="Write a caption..."
                            className="w-full h-24 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none text-lg pr-10"
                            rows={4}
                        />
                        <button 
                            onClick={() => setFlagPickerOpen(true)}
                            className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700"
                            aria-label="Add a flag"
                        >
                            <FlagIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            {isFlagPickerOpen && (
                <FlagPicker
                    onFlagSelected={handleFlagSelect}
                    onClose={() => setFlagPickerOpen(false)}
                />
            )}
            <style>{`
            @keyframes slide-up {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            .animate-slide-up {
                animation: slide-up 0.2s ease-out forwards;
            }
            `}</style>
        </div>
    );
};

export default ComposeMediaPostScreen;