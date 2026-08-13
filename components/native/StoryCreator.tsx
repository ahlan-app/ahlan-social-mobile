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
import { View, Text, Pressable } from 'react-native';
import { useApp } from '../../store/AppContext.native';
import type { Story } from '../../types';

interface StoryCreatorProps {
  onAddStory: () => void;
  onViewStories: (stories: Story[], startIndex: number) => void;
}

/**
 * "Your story" button — Instagram-style: two nested circles with a white + in the middle.
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
          borderColor: '#4b5563',
          padding: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={hasAnyStory ? 'View your story' : 'Add to your story'}
      >
        {/* Inner circle */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#6b7280',
            backgroundColor: '#111827',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* White + sign */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: '#fff' }} />
            <View
              style={{
                width: 3,
                height: 20,
                borderRadius: 2,
                backgroundColor: '#fff',
                position: 'absolute',
              }}
            />
          </View>
        </View>
      </Pressable>
      <Text className="text-xs text-white w-14 text-center mt-1" numberOfLines={1}>
        Your story
      </Text>
    </View>
  );
};

export default React.memo(StoryCreator);
