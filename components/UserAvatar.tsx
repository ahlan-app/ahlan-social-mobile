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

import React from 'react';

const colors = [ '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899' ];

const getColorForUsername = (username: string): string => {
    if (!username) return '#64748b'; // slate-500
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
};

interface UserAvatarProps {
    username: string | null | undefined;
    avatarUrl: string | null | undefined;
    className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, avatarUrl, className }) => {
    if (avatarUrl) {
        return <img src={avatarUrl} alt={`@${username}`} className={className} loading="lazy" />;
    }

    const validUsername = username || '';
    const initial = validUsername?.[0]?.toUpperCase() || '?';
    const color = getColorForUsername(validUsername);

    const baseClasses = "flex items-center justify-center rounded-full font-bold text-white select-none";

    // Extract size from className, e.g., 'w-12 h-12' to calculate a font size
    const sizeMatch = className?.match(/\bw-(\d+)\b/);
    let fontSize = '1rem'; // Default font size
    if (sizeMatch) {
        const size = parseInt(sizeMatch[1], 10);
        if (size >= 24) fontSize = '2.25rem';      // w-24
        else if (size >= 20) fontSize = '1.875rem'; // w-20
        else if (size >= 16) fontSize = '1.5rem';     // w-16
        else if (size >= 12) fontSize = '1.25rem';    // w-12
        else if (size >= 10) fontSize = '1rem';       // w-10
        else if (size >= 8) fontSize = '0.875rem';    // w-8
        else if (size >= 6) fontSize = '0.75rem';     // w-6
        else fontSize = '0.625rem';   // w-5 or smaller
    }

    return (
        <div
            className={`${baseClasses} ${className}`}
            style={{ backgroundColor: color, fontSize }}
            aria-label={`@${username}`}
        >
            {initial}
        </div>
    );
};

export default UserAvatar;
