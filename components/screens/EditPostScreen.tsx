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

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { cleanHtml } from '../../services/apiService';
import { ArrowLeftIcon } from '../Icons';
import { Post } from '../../types';
import UserAvatar from '../UserAvatar';

interface EditPostScreenProps {
    post: Post;
    close: () => void;
}

const MAX_CHARS = 280;

const CharacterCounter: React.FC<{ count: number }> = ({ count }) => {
    const percentage = (count / MAX_CHARS) * 100;
    const isApproaching = percentage > 80 && percentage <= 100;
    const isOver = percentage > 100;

    const color = isOver ? 'text-red-500' : isApproaching ? 'text-yellow-500' : 'text-blue-500';
    const ringColor = isOver ? '#ef4444' : isApproaching ? '#f59e0b' : '#3b82f6';
    
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    const remainingChars = MAX_CHARS - count;

    return (
        <div className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
                <svg className="w-full h-full" viewBox="0 0 30 30">
                    <circle
                        className="text-gray-700"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="15"
                        cy="15"
                    />
                    <circle
                        style={{ stroke: ringColor }}
                        className="transition-all duration-300"
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="15"
                        cy="15"
                        transform="rotate(-90 15 15)"
                    />
                 </svg>
                 {percentage > 100 && (
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-red-500 text-sm">!</span>
                )}
            </div>
            <span className={`font-semibold text-sm ${color}`}>{remainingChars}</span>
        </div>
    );
};

const EditPostScreen: React.FC<EditPostScreenProps> = ({ post, close }) => {
    const [content, setContent] = useState(post.content);
    const [isPosting, setPosting] = useState(false);
    const { updateProfilePost, userProfile } = useApp();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [content]);

    const handleSave = async () => {
        if (content.trim().length === 0 || isPosting) return;
        
        setPosting(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const updatedPost: Post = {
            ...post,
            content: cleanHtml(content),
        };

        updateProfilePost(updatedPost);
        setPosting(false);
        close();
    };
    
    const charCount = content.length;
    const isOverLimit = charCount > MAX_CHARS;
    const canSave = content.trim().length > 0 && !isPosting && content !== post.content && !isOverLimit;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-full w-full animate-slide-up">
            <header className="flex items-center justify-between p-2 bg-black border-b border-gray-800 z-10 flex-shrink-0 safe-pt">
                <button onClick={close} className="p-2">
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold">Edit Post</h1>
                <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-opacity hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-900 disabled:cursor-not-allowed"
                    disabled={!canSave}
                >
                    {isPosting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        'Save'
                    )}
                </button>
            </header>
            <div className="flex-1 flex flex-col overflow-y-auto p-4">
                <div className="relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-sm flex flex-col">
                    <div className="p-4 flex space-x-3 flex-shrink-0">
                        <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-12 h-12 rounded-full" />
                        <div className="flex-1">
                            <p className="font-bold text-white">@{userProfile.username}</p>
                            <p className="text-gray-300 text-sm">{userProfile.name}</p>
                        </div>
                    </div>
                    <div className="relative flex-1 px-6 pb-4">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                            placeholder="What's on your mind?"
                            className="w-full bg-transparent text-white text-lg font-medium resize-none focus:outline-none placeholder-gray-400 overflow-hidden"
                            rows={4}
                            autoFocus
                        />
                    </div>
                </div>
            </div>
             <div className="flex-shrink-0 border-t border-gray-800 bg-black p-2 safe-pb">
                 <div className="flex items-center justify-end">
                    {content.length > 0 && <CharacterCounter count={charCount} />}
                </div>
            </div>
             <style>{`
            @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default EditPostScreen;