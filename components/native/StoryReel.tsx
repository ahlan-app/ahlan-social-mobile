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

import React from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import UserAvatar from './UserAvatar';
import { useApp } from '../../store/AppContext.native';
import type { Story } from '../../types';

export interface StoryGroup {
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
  onPress: () => void;
  isViewed: boolean;
}> = React.memo(({ username, avatar, onPress, isViewed }) => {
  const borderColor = isViewed ? '#4b5563' : '#3b82f6';

  return (
    <View className="items-center mr-3">
      <Pressable
        onPress={onPress}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 2,
          borderColor,
          padding: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UserAvatar username={username} avatarUrl={avatar} size={48} />
      </Pressable>
      <Text className="text-xs text-white w-14 text-center mt-1" numberOfLines={1}>
        @{username}
      </Text>
    </View>
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

  // Sort: unviewed groups first
  const sortedGroups = [...storyGroups].sort((a, b) => {
    const aViewed = areAllStoriesInGroupViewed(a.stories);
    const bViewed = areAllStoriesInGroupViewed(b.stories);
    if (aViewed === bViewed) return 0;
    return aViewed ? 1 : -1;
  });

  const renderItem = ({ item }: { item: StoryGroup }) => (
    <StoryCircle
      username={item.username}
      avatar={item.avatar}
      onPress={() => handleViewUserStories(item.stories)}
      isViewed={areAllStoriesInGroupViewed(item.stories)}
    />
  );

  return (
    <FlatList
      data={sortedGroups}
      renderItem={renderItem}
      keyExtractor={item => item.username}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4 }}
    />
  );
};

export default React.memo(StoryReel);
