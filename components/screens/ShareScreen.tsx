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


import React, { useState, useEffect } from 'react';
import type { Post, SimpleUser } from '../../types';
import { useApp } from '../../store/AppContext';
import { ArrowRightIcon, SearchIcon, VerifiedIcon } from '../Icons';
import { getChatListUsers, sendMessage, searchUsers } from '../../services/apiService';
import UserAvatar from '../UserAvatar';

interface ShareScreenProps {
    post?: Post;
    user?: SimpleUser;
    close: () => void;
    onSent: (recipient: SimpleUser) => void;
}

const ShareScreen: React.FC<ShareScreenProps> = ({ post, user, close, onSent }) => {
    const { userProfile, addToast } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingToUserId, setSendingToUserId] = useState<string | null>(null);

    // State for recent chats
    const [recentChatUsers, setRecentChatUsers] = useState<SimpleUser[]>([]);
    const [isLoadingRecentUsers, setIsLoadingRecentUsers] = useState(true);

    // State for global user search
    const [userSearchResults, setUserSearchResults] = useState<SimpleUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchRecentChats = async () => {
            if (userProfile.id) {
                setIsLoadingRecentUsers(true);
                const users = await getChatListUsers(userProfile.id);
                setRecentChatUsers(users);
                setIsLoadingRecentUsers(false);
            }
        };
        fetchRecentChats();
    }, [userProfile.id]);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setUserSearchResults([]);
            return;
        }

        const handleSearch = async () => {
            setIsSearching(true);
            try {
                const usersFromApi = await searchUsers(searchTerm);
                const mappedUsers: SimpleUser[] = usersFromApi.map(u => ({
                    id: u.id,
                    name: u.full_name,
                    username: u.username,
                    avatar: u.avatar_url,
                    isVerified: u.is_verified,
                }));
                setUserSearchResults(mappedUsers.filter(u => u.id !== userProfile.id));
            } catch (error) {
                console.error("Error searching users:", error);
                addToast("Could not perform user search.", "error");
            } finally {
                setIsSearching(false);
            }
        };
        
        const timerId = setTimeout(handleSearch, 300);

        return () => clearTimeout(timerId);
    }, [searchTerm, userProfile.id, addToast]);

    const isSearchActive = searchTerm.trim().length > 0;
    const usersToList = isSearchActive ? userSearchResults : recentChatUsers;

    const handleSend = async (recipient: SimpleUser) => {
        if (sendingToUserId) return;
        setSendingToUserId(recipient.id);

        try {
            await sendMessage({
                sender_id: userProfile.id,
                receiver_id: recipient.id,
                post: post,
                user: user,
            });
            onSent(recipient);
        } catch (error) {
            addToast(`Failed to send to @${recipient.username}`, 'error');
            setSendingToUserId(null);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black z-[60] flex flex-col h-screen w-screen animate-slide-up"
        >
             <style>{`
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
            `}</style>
            <header className="flex items-center justify-between p-2 flex-shrink-0 safe-pt border-b border-gray-800">
                <div className="w-12"></div>
                <h1 className="text-xl font-bold">Share</h1>
                <button onClick={close} className="text-blue-400 p-2">
                    <ArrowRightIcon className="w-8 h-8" />
                </button>
            </header>

            <div className="p-4 flex items-center space-x-3 bg-gray-900 border-b border-gray-800">
                {post && post.media && <img src={post.media_preview_url || post.media} className="w-12 h-12 rounded-lg object-cover" alt="Post preview" />}
                {post && !post.media && <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center p-1"><p className="text-white text-xs text-center line-clamp-2">{post.content}</p></div>}
                {user && <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full object-cover" />}
                <div className="overflow-hidden">
                    <p className="font-semibold text-white truncate">
                        {post ? `Post by @${post.username}` : `Profile: @${user?.username}`}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                        {post ? post.content : user?.name}
                    </p>
                </div>
            </div>
            
            <div className="p-4">
                 <div className="relative">
                    <input
                        type="text"
                        placeholder="Search for users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <SearchIcon />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
                 { (isLoadingRecentUsers && !isSearchActive) || isSearching ? (
                    <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                 ) : usersToList.length > 0 ? (
                    usersToList.map(recipient => (
                        <div key={recipient.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-3">
                                <UserAvatar username={recipient.username} avatarUrl={recipient.avatar} className="w-12 h-12 rounded-full" />
                                <div>
                                    <div className="flex items-center space-x-1.5">
                                        <p className="font-bold text-white">@{recipient.username}</p>
                                        {recipient.isVerified && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                                    </div>
                                    <p className="text-sm text-gray-400">{recipient.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleSend(recipient)}
                                disabled={sendingToUserId === recipient.id}
                                className="px-5 py-2 rounded-full font-semibold text-sm transition-colors duration-200 w-28 text-center disabled:bg-gray-700 disabled:text-gray-400 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {sendingToUserId === recipient.id ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    ))
                 ) : (
                    <p className="text-center text-gray-500 pt-8">
                        {isSearchActive ? `No users found for "${searchTerm}".` : "No users to share with."}
                    </p>
                 )}
            </div>
        </div>
    );
};

export default ShareScreen;
