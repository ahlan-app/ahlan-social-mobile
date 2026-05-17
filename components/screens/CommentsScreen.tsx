// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Comment, UserProfile } from '../../types';
// FIX: Import missing functions to fetch comment like status and count.
import { cleanHtml, getCommentsForPost, toggleCommentLike, getCommentLikesCount, isCommentLikedByUser, deleteComment as apiDeleteComment } from '../../services/apiService';
import { useApp } from '../../store/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { HeartIcon, ArrowRightIcon, FlagIcon } from '../Icons';
import RenderUserContent from '../RenderUserContent';
import FlagPicker from '../FlagPicker';
import UserAvatar from '../UserAvatar';

interface CommentsScreenProps {
    postId: string;
    close: () => void;
    onViewProfile: (username: string, avatar?: string) => void;
}

const CommentsScreen: React.FC<CommentsScreenProps> = ({ postId, close, onViewProfile }) => {
    const { getComments, setComments, userProfile, isUserBlocked, postComment } = useApp();
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCommentText, setNewCommentText] = useState('');
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const commentsFromContext = getComments(postId);

    const loadAndSetComments = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedComments = await getCommentsForPost(postId);
            setComments(postId, fetchedComments);
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setLoading(false);
        }
    }, [postId, setComments]);

    useEffect(() => {
        loadAndSetComments();
    }, [loadAndSetComments]);

    useEffect(() => {
        const filterBlocked = (comments: Comment[]): Comment[] => {
            return comments
                .filter(c => !isUserBlocked(c.username))
                .map(c => ({ ...c, replies: c.replies ? filterBlocked(c.replies) : [] }));
        };
        setLocalComments(filterBlocked(commentsFromContext));
    }, [commentsFromContext, isUserBlocked]);


    const handleAddTopLevelComment = () => {
        const textToPost = newCommentText.trim();
        if (textToPost === '') return;
        
        // Clear input immediately for optimistic feel
        setNewCommentText('');
        
        // Context function is now optimistic
        postComment(postId, cleanHtml(textToPost));
    };

    const handleDeleteComment = (commentId: string) => {
        // Optimistic local delete + API call
        const removeComment = (comments: Comment[], idToRemove: string): Comment[] => {
            return comments
                .filter(comment => comment.id !== idToRemove)
                .map(comment => ({
                    ...comment,
                    replies: comment.replies ? removeComment(comment.replies, idToRemove) : [],
                }));
        };
    
        const updatedComments = removeComment(localComments, commentId);
        setLocalComments(updatedComments);
        setComments(postId, updatedComments);

        // Call API to delete from database
        apiDeleteComment(commentId).catch(err => {
            console.error('Failed to delete comment:', err);
        });
    };
    
     const handleFlagSelect = (flagTextCode: string) => {
        const input = inputRef.current;
        if (!input) {
            setNewCommentText(prev => prev + flagTextCode);
            return;
        }

        const start = input.selectionStart ?? newCommentText.length;
        const end = input.selectionEnd ?? newCommentText.length;
        const text = newCommentText;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setNewCommentText(newText);
        setFlagPickerOpen(false);

        setTimeout(() => {
            input.focus();
            const newCursorPos = start + flagTextCode.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen">
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 safe-pt">
                <div className="w-12" /> {/* Spacer */}
                <h1 className="text-xl font-bold">Comments</h1>
                <button onClick={close} className="text-blue-400 p-2">
                    <ArrowRightIcon className="w-8 h-8" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto bg-black">
                {loading ? (
                    <div className="flex justify-center items-center h-full p-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>
                ) : localComments.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No comments yet. Be the first to comment!</p>
                ) : (
                    localComments.map(comment => 
                        <CommentItem 
                            key={comment.id} 
                            comment={comment} 
                            onDelete={handleDeleteComment}
                            currentUserProfile={userProfile}
                            onViewProfile={onViewProfile}
                        />)
                )}
            </div>
            
            <div className="flex-shrink-0 border-t border-gray-800 bg-black safe-pb">
                <div className="p-3 flex items-center space-x-3">
                    <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 flex items-center bg-gray-800 rounded-full px-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newCommentText.trim()) {
                                    handleAddTopLevelComment();
                                }
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none py-2"
                        />
                        <button onClick={() => setFlagPickerOpen(true)} className="p-1 text-gray-400 hover:text-blue-400">
                            <FlagIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <button
                        onClick={handleAddTopLevelComment}
                        className="text-blue-500 font-semibold disabled:text-gray-500 transition-colors"
                        disabled={!newCommentText.trim()}>
                        Post
                    </button>
                </div>
            </div>
            {isFlagPickerOpen && (
                <FlagPicker
                    onFlagSelected={handleFlagSelect}
                    onClose={() => setFlagPickerOpen(false)}
                />
            )}
        </div>
    );
};

interface CommentItemProps {
  comment: Comment;
  onDelete: (commentId: string) => void;
  currentUserProfile: Pick<UserProfile, 'username' | 'profilePicture'>;
  onViewProfile: (username: string, avatar?: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onDelete, currentUserProfile, onViewProfile }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const { triggerHapticFeedback } = useApp();

    useEffect(() => {
        if (!comment.id || comment.id.startsWith('temp-')) return;
        const fetchLikes = async () => {
            try {
                const [count, liked] = await Promise.all([
                    getCommentLikesCount(comment.id),
                    isCommentLikedByUser(comment.id)
                ]);
                setLikesCount(count);
                setIsLiked(liked);
            } catch (error) {
                console.error('Failed to fetch comment likes', error);
            }
        };
        fetchLikes();
    }, [comment.id]);

    const handleLike = async () => {
        if (!comment.id || comment.id.startsWith('temp-')) return;
        triggerHapticFeedback();
        try {
            const newLiked = await toggleCommentLike(comment.id);
            setIsLiked(newLiked);
            setLikesCount(prev => newLiked ? prev + 1 : (prev > 0 ? prev - 1 : 0));
        } catch (error) {
            console.error('Failed to toggle like', error);
        }
    };
    
    const handleViewProfile = () => {
        onViewProfile(comment.username, comment.avatar ?? undefined);
    };

    return (
        <div className="p-4 border-b border-gray-800">
            <div className="flex space-x-3">
                 <button onClick={handleViewProfile} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black">
                    <UserAvatar username={comment.username} avatarUrl={comment.avatar} className="w-10 h-10 rounded-full" />
                </button>
                <div className="flex-1">
                    <button onClick={handleViewProfile} className="text-left hover:underline">
                        <p className="font-bold text-white">@{comment.username} <span className="text-sm font-normal text-gray-500">{formatDistanceToNow(comment.timestamp, { addSuffix: true })}</span></p>
                    </button>
                    <div className="text-white mt-1 whitespace-pre-wrap break-words">
                        <RenderUserContent text={comment.text} onViewProfile={onViewProfile} />
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-gray-500 text-sm">
                        <button onClick={handleLike} className={`flex items-center space-x-1 transition-none ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}>
                            <HeartIcon liked={isLiked} />
                            <span>{likesCount}</span>
                        </button>
                        {comment.username === currentUserProfile.username && (
                            <button onClick={() => onDelete(comment.id)} className="hover:text-red-400">Delete</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentsScreen;