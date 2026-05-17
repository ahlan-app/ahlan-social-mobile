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




import React from 'react';
import type { Story } from '../types';
import { useApp } from '../store/AppContext';
import StoryViewer from './screens/StoryViewer';
import UserAvatar from './UserAvatar';

interface StoryGroup {
    username: string;
    avatar: string | null;
    stories: Story[];
}

interface StoryReelProps {
    storyGroups: StoryGroup[];
    allStories: Story[];
    onViewStories: (stories: Story[], startIndex: number) => void;
}

const StoryCircle: React.FC<{
    username: string;
    avatar: string | null;
    onClick: () => void;
    isViewed: boolean;
}> = React.memo(({ username, avatar, onClick, isViewed }) => {
    const ringClass = isViewed ? 'border-gray-600' : 'border-blue-500';
    const orderClass = isViewed ? 'order-1' : 'order-0';

    return (
        <div className={`flex flex-col items-center space-y-1 flex-shrink-0 transition-all duration-500 ease-in-out ${orderClass}`}>
            <button
                onClick={onClick}
                className={`w-14 h-14 rounded-full border-2 p-0.5 transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${ringClass}`}
            >
                <UserAvatar username={username} avatarUrl={avatar} className="w-full h-full rounded-full object-cover" />
            </button>
            <p className="text-xs text-white w-14 truncate text-center">@{username}</p>
        </div>
    );
});


const StoryReel: React.FC<StoryReelProps> = ({ storyGroups, allStories, onViewStories }) => {
    const { isStoryViewed } = useApp();
    
    const handleViewUserStories = (userStories: Story[]) => {
        if (!userStories || userStories.length === 0) return;
        
        const firstStory = userStories[0];
        const startIndex = allStories.findIndex(story => story.id === firstStory.id);
        
        if (startIndex !== -1) {
            onViewStories(allStories, startIndex);
        }
    };

    const areAllStoriesInGroupViewed = (stories: Story[]) => {
        return stories.every(story => isStoryViewed(story.timestamp));
    };

    return (
        <>
            {storyGroups.map((group) => (
                <StoryCircle 
                    key={group.username}
                    username={group.username}
                    avatar={group.avatar}
                    onClick={() => handleViewUserStories(group.stories)}
                    isViewed={areAllStoriesInGroupViewed(group.stories)}
                />
            ))}
        </>
    );
};

export default React.memo(StoryReel);