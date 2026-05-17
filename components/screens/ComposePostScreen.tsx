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
import { ArrowLeftIcon, PollIcon, XIcon, FlagIcon } from '../Icons';
import { Post } from '../../types';
import FlagPicker from '../FlagPicker';
import UserAvatar from '../UserAvatar';

interface ComposePostScreenProps {
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


const ComposePostScreen: React.FC<ComposePostScreenProps> = ({ close }) => {
    const [content, setContent] = useState('');
    const [isPosting, setPosting] = useState(false);
    const { addProfilePost, userProfile, addToast } = useApp();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [isCreatingPoll, setIsCreatingPoll] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);


    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [content]);
    
    const handlePollOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };
    
    const addPollOption = () => {
        if (pollOptions.length < 4) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const handlePost = async () => {
        const hasContent = content.trim().length > 0;
        const hasValidPoll = isCreatingPoll && pollQuestion.trim().length > 0 && pollOptions.every(opt => opt.trim().length > 0);
        
        if ((!hasContent && !hasValidPoll) || isPosting) return;
        
        setPosting(true);

        const newPost: Post = {
            id: `post_${Date.now()}`,
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            content: cleanHtml(content),
            media: undefined,
            media_type: 'text' as const,
            likes: 0,
            reposts: 0,
            replies: 0,
            timestamp: new Date().toISOString(),
            ...(hasValidPoll && {
                poll: {
                    question: pollQuestion.trim(),
                    options: pollOptions.map(opt => ({ text: opt.trim(), votes: 0 })),
                }
            })
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
            setContent(prev => prev + flagTextCode);
            return;
        }

        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        const text = content;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setContent(newText);
        setFlagPickerOpen(false);

        // Focus and set cursor position after insertion
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + flagTextCode.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };
    
    const charCount = content.length;
    const isOverLimit = charCount > MAX_CHARS;
    const canPost = (content.trim().length > 0 || (isCreatingPoll && pollQuestion.trim().length > 0)) && !isPosting && !isOverLimit;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-full w-full animate-slide-up">
            <header className="flex items-center justify-between p-2 bg-black border-b border-gray-800 z-10 flex-shrink-0 safe-pt">
                <button onClick={close} className="p-2">
                    <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-bold">New Post</h1>
                <button
                    onClick={handlePost}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-opacity hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-900 disabled:cursor-not-allowed"
                    disabled={!canPost}
                >
                    {isPosting ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                        'Share'
                    )}
                </button>
            </header>
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
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
                
                {isCreatingPoll && (
                    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                        <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Poll question" className="w-full bg-gray-700 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {pollOptions.map((option, index) => (
                             <div key={index} className="flex items-center space-x-2">
                                <input type="text" value={option} onChange={(e) => handlePollOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} className="flex-1 bg-gray-700 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                {pollOptions.length > 2 && <button onClick={() => removePollOption(index)} className="text-red-400 hover:text-red-300 p-1"><XIcon className="w-5 h-5"/></button>}
                             </div>
                        ))}
                        {pollOptions.length < 4 && <button onClick={addPollOption} className="text-blue-400 font-semibold text-sm">Add option</button>}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 border-t border-gray-800 bg-black p-2 safe-pb">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setIsCreatingPoll(!isCreatingPoll)} className={`p-2 rounded-full ${isCreatingPoll ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}>
                           <PollIcon />
                        </button>
                        <button onClick={() => setFlagPickerOpen(true)} className={`p-2 rounded-full text-gray-400 hover:bg-gray-800`}>
                           <FlagIcon />
                        </button>
                    </div>
                    {content.length > 0 && <CharacterCounter count={charCount} />}
                </div>
            </div>
            {isFlagPickerOpen && (
                <FlagPicker
                    onFlagSelected={handleFlagSelect}
                    onClose={() => setFlagPickerOpen(false)}
                />
            )}
             <style>{`
            @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ComposePostScreen;