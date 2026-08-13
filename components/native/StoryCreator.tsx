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
import { View, Text, Pressable, Image } from 'react-native';
import { useApp } from '../../store/AppContext.native';
import type { Story } from '../../types';

interface StoryCreatorProps {
  onAddStory: () => void;
  onViewStories: (stories: Story[], startIndex: number) => void;
}

/**
 * "Your story" button — Ahlan logo inside a story ring, Instagram-style.
 */
const StoryCreator: React.FC<StoryCreatorProps> = ({ onAddStory, onViewStories }) => {
  const { userStories } = useApp();
  const hasAnyStory = userStories.length > 0;

  const handlePress = () => {
    if (hasAnyStory) {
      onViewStories(userStories, 0);
    } else {
      onAddStory();
    }
  };

  return (
    <View className="items-center mr-3">
      <Pressable
        onPress={handlePress}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 2,
          borderColor: hasAnyStory ? '#3b82f6' : '#4b5563',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
        accessibilityLabel={hasAnyStory ? 'View your story' : 'Add to your story'}
      >
        <Image
          source={require('../../assets/ahlan-logo.png')}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            position: 'absolute',
          }}
          resizeMode="cover"
        />
      </Pressable>
      <Text className="text-xs text-white w-14 text-center mt-1" numberOfLines={1}>
        Your story
      </Text>
    </View>
  );
};

export default React.memo(StoryCreator);
