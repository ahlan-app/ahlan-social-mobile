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

import React, { useState } from 'react';
import type { SimpleUser } from '../../types';
import { ArrowLeftIcon, VerifiedIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import UserAvatar from '../UserAvatar';

interface UserListScreenProps {
    title: 'Followers' | 'Following' | 'Likes' | 'Reposts';
    users: SimpleUser[];
    close: () => void;
    onViewProfile: (username: string, avatar?: string) => void;
}

const UserRow: React.FC<{ user: SimpleUser; onViewProfile: (username: string, avatar?: string) => void; }> = ({ user, onViewProfile }) => {
    const { setTooltip, tooltip } = useApp();
    const [isFollowing, setIsFollowing] = useState(false);

    const handleIconClick = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (tooltip && tooltip.target === e.currentTarget) {
            setTooltip(null);
        } else {
            setTooltip({ text, target: e.currentTarget as HTMLElement });
        }
    };

    return (
        <div className="flex items-center space-x-4 p-3 hover:bg-gray-900 transition-colors border-b border-gray-800">
            <button onClick={() => onViewProfile(user.username, user.avatar ?? undefined)} className="flex items-center space-x-4 flex-1">
                <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full" />
                <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                        <p className="font-bold text-white">@{user.username}</p>
                        {user.isVerified && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-sm text-gray-400">{user.name}</p>
                </div>
            </button>
            <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors duration-200 w-28 text-center ${
                    isFollowing 
                    ? 'bg-transparent text-white border border-gray-700 hover:bg-gray-800'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
                {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
        </div>
    );
};


const UserListScreen: React.FC<UserListScreenProps> = ({ title, users, close, onViewProfile }) => {
    const { isUserBlocked } = useApp();
    const filteredUsers = users.filter(user => !isUserBlocked(user.username));

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen animate-fade-in">
             <style>{`.animate-fade-in { animation: fade-in 0.2s ease-out; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
            <header className="bg-black border-b border-gray-800 p-2 flex items-center flex-shrink-0 sticky top-0 safe-pt">
                <button onClick={close} className="p-2 text-white">
                    <ArrowLeftIcon className="w-8 h-8" />
                </button>
                <h1 className="text-xl font-bold ml-4">{title}</h1>
            </header>

            <div className="flex-1 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={user.username} user={user} onViewProfile={onViewProfile} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 p-8">No users to show.</p>
                )}
            </div>
        </div>
    );
};

export default UserListScreen;