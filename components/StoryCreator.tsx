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
import { useApp } from '../store/AppContext';
import { AhlanIcon } from './Icons';
import type { Story } from '../types';

interface StoryCreatorProps {
    onAddStory: () => void;
    onViewStories: (stories: Story[], startIndex: number) => void;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({ onAddStory, onViewStories }) => {
    const { userStories } = useApp();
    const hasAnyStory = userStories.length > 0;

    const handleClick = () => {
        if (hasAnyStory) {
            onViewStories(userStories, 0);
        } else {
            onAddStory();
        }
    };
    
    return (
        <div className="flex flex-col items-center space-y-1 flex-shrink-0">
            <button
                onClick={handleClick}
                className="relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-blue-500 rounded-full transition-transform duration-200 hover:scale-105"
                aria-label={hasAnyStory ? "View your story" : "Add to your story"}
            >
                {/* The main circle container */}
                <div className="w-14 h-14">
                    {hasAnyStory ? (
                         // View when story exists: Blue Ahlan Icon
                        <AhlanIcon className="w-full h-full text-blue-500" />
                    ) : (
                        // View when no story exists: White Ahlan Icon
                        <AhlanIcon className="w-full h-full text-white" />
                    )}
                </div>
            </button>
            <p className="text-xs text-white w-14 truncate text-center">Your Time</p>
        </div>
    );
};

export default React.memo(StoryCreator);