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

import React, { useCallback } from 'react';
import { Image } from 'expo-image';
import { useApp } from '../../store/AppContext.native';
import StoryBubble, { STORY_INNER_SIZE } from './StoryBubble';
import type { Story } from '../../types';

// Square crop of the Ahlan emblem so it fills the inner circle like an avatar.
const STORY_LOGO = require('../../assets/ahlan-logo-story.png');

interface StoryCreatorProps {
  onAddStory: () => void;
  onViewStories: (stories: Story[], startIndex: number) => void;
}

/**
 * "Your story" button — Ahlan logo inside the same ring as every other story.
 */
const StoryCreator: React.FC<StoryCreatorProps> = ({ onAddStory, onViewStories }) => {
  const { userStories } = useApp();
  const hasAnyStory = userStories.length > 0;

  const handlePress = useCallback(() => {
    if (hasAnyStory) {
      onViewStories(userStories, 0);
    } else {
      onAddStory();
    }
  }, [hasAnyStory, userStories, onViewStories, onAddStory]);

  return (
    <StoryBubble
      label="Your story"
      active={hasAnyStory}
      onPress={handlePress}
      accessibilityLabel={hasAnyStory ? 'View your story' : 'Add to your story'}
    >
      <Image
        source={STORY_LOGO}
        style={{ width: STORY_INNER_SIZE, height: STORY_INNER_SIZE }}
        contentFit="cover"
      />
    </StoryBubble>
  );
};

export default React.memo(StoryCreator);
