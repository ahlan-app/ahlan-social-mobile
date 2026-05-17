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



import React, { useState } from 'react';
import type { Comment } from '../../types';
import { useApp } from '../../store/AppContext';
import { formatDistanceToNow } from 'date-fns';
import { HeartIcon, ArrowRightIcon } from '../Icons';
import { cleanHtml } from '../../services/apiService';
import UserAvatar from '../UserAvatar';

interface StoryCommentsScreenProps {
    storyId: string;
    close: () => void;
}

const StoryCommentsScreen: React.FC<StoryCommentsScreenProps> = ({ storyId, close }) => {
    const { getStoryComments, addStoryComment, setStoryComments, userProfile } = useApp();
    const [localComments, setLocalComments] = useState<Comment[]>(() => getStoryComments(storyId));
    const [newCommentText, setNewCommentText] = useState('');
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

    const handleAddTopLevelComment = () => {
        if (newCommentText.trim() === '') return;
        const newComment: Comment = {
            id: Date.now().toString(),
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            text: cleanHtml(newCommentText),
            timestamp: new Date(),
            replies: [],
            likes: 0,
            isLiked: false,
        };
        addStoryComment(storyId, newComment);
        setLocalComments(prev => [newComment, ...prev]);
        setNewCommentText('');
    };

    const handleAddReply = (parentId: string, replyText: string) => {
        const newReply: Comment = {
            id: Date.now().toString(),
            username: userProfile.username,
            avatar: userProfile.profilePicture,
            text: cleanHtml(replyText),
            timestamp: new Date(),
            replies: [],
            likes: 0,
            isLiked: false,
        };

        const addReplyToComment = (comments: Comment[], pId: string, reply: Comment): Comment[] => {
            return comments.map(comment => {
                if (comment.id === pId) {
                    return { ...comment, replies: [reply, ...comment.replies] };
                }
                if (comment.replies && comment.replies.length > 0) {
                    return { ...comment, replies: addReplyToComment(comment.replies, pId, reply) };
                }
                return comment;
            });
        };
        
        const updatedComments = addReplyToComment(localComments, parentId, newReply);
        setLocalComments(updatedComments);
        setStoryComments(storyId, updatedComments);
        setActiveReplyId(null);
    };

    const handleDeleteComment = (commentId: string) => {
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
        setStoryComments(storyId, updatedComments);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col h-screen" onClick={close}>
            <div className="flex-grow" />
            <div className="bg-gray-900 rounded-t-2xl shadow-xl flex flex-col h-[80vh] w-full" onClick={e => e.stopPropagation()}>
                <header className="bg-gray-900/80 rounded-t-2xl p-2 flex items-center justify-center flex-shrink-0 sticky top-0 border-b border-gray-700">
                    <h1 className="text-xl font-bold">Comments</h1>
                </header>

                <div className="flex-1 overflow-y-auto bg-gray-900">
                    {localComments.length === 0 ? (
                        <p className="text-center text-gray-500 p-8">No comments yet. Be the first to comment!</p>
                    ) : (
                        localComments.map(comment => 
                            <CommentItem 
                                key={comment.id} 
                                comment={comment} 
                                onReply={setActiveReplyId}
                                onAddReply={handleAddReply}
                                onDelete={handleDeleteComment}
                                activeReplyId={activeReplyId}
                                currentUserProfile={userProfile}
                            />)
                    )}
                </div>

                <div className="flex-shrink-0 border-t border-gray-700 bg-gray-900">
                    <div className="p-3 flex items-center space-x-3">
                        <UserAvatar username={userProfile.username} avatarUrl={userProfile.profilePicture} className="w-10 h-10 rounded-full" />
                        <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newCommentText.trim()) {
                                    handleAddTopLevelComment();
                                }
                            }}
                            placeholder="Add a comment..."
                            className="flex-1 bg-gray-800 rounded-full py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleAddTopLevelComment}
                            className="text-blue-500 font-semibold disabled:text-gray-500 transition-colors"
                            disabled={!newCommentText.trim()}>
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  onReply: (commentId: string | null) => void;
  onAddReply: (parentId: string, replyText: string) => void;
  onDelete: (commentId: string) => void;
  activeReplyId: string | null;
  currentUserProfile: { username: string, profilePicture: string | null };
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, depth = 0, onReply, onAddReply, onDelete, activeReplyId, currentUserProfile }) => {
    const [isLiked, setIsLiked] = useState(comment.isLiked);
    const [likes, setLikes] = useState(comment.likes);
    const [replyText, setReplyText] = useState('');

    const toggleLike = () => {
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(!isLiked);
    };
    
    const handleSubmitReply = () => {
        if (replyText.trim()) {
            onAddReply(comment.id, replyText);
            setReplyText('');
        }
    };

    return (
        <div className={`p-4 ${depth > 0 ? 'pt-2 pl-6' : 'border-b'} border-gray-800`}>
            <div className="flex space-x-3">
                <UserAvatar username={comment.username} avatarUrl={comment.avatar} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <p className="font-bold text-white">{comment.username} <span className="text-sm font-normal text-gray-500">{formatDistanceToNow(comment.timestamp, { addSuffix: true })}</span></p>
                    <p className="text-white mt-1 whitespace-pre-wrap">{comment.text}</p>
                    <div className="flex items-center space-x-4 mt-2 text-gray-500 text-sm">
                        <button onClick={toggleLike} className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}>
                            <HeartIcon liked={isLiked} />
                            <span>{likes}</span>
                        </button>
                        <button onClick={() => onReply(comment.id)} className="hover:text-blue-400">Reply</button>
                        {comment.username === currentUserProfile.username && (
                            <button onClick={() => onDelete(comment.id)} className="hover:text-red-400">Delete</button>
                        )}
                    </div>
                </div>
            </div>
            
            {activeReplyId === comment.id && (
                <div className="pl-12 pt-2">
                    <div className="flex items-center space-x-3">
                        <UserAvatar username={currentUserProfile.username} avatarUrl={currentUserProfile.profilePicture} className="w-8 h-8 rounded-full" />
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSubmitReply();
                            }}
                            placeholder={`Reply to @${comment.username}...`}
                            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none border-b border-gray-700"
                            autoFocus
                        />
                         <button
                            onClick={handleSubmitReply}
                            className="text-blue-500 font-semibold disabled:text-gray-500"
                            disabled={!replyText.trim()}
                        >
                            Post
                        </button>
                        <button onClick={() => onReply(null)} className="text-gray-400 text-2xl font-light">&times;</button>
                    </div>
                </div>
            )}
            
            {comment.replies.map(reply => (
                <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    depth={depth + 1} 
                    onReply={onReply}
                    onAddReply={onAddReply}
                    onDelete={onDelete}
                    activeReplyId={activeReplyId}
                    currentUserProfile={currentUserProfile}
                />
            ))}
        </div>
    );
};

export default StoryCommentsScreen;