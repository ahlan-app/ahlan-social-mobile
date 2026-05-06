import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AhlanIcon } from './Icons';
import { useApp } from '../../store/AppContext.native';
import type { Story } from '../../types';

interface StoryCreatorProps {
  onAddStory: () => void;
  onViewStories: (stories: Story[], startIndex: number) => void;
}

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
        className="w-14 h-14 items-center justify-center"
        accessibilityLabel={hasAnyStory ? 'View your story' : 'Add to your story'}
      >
        <AhlanIcon
          color="#ffffff"
          size={56}
        />
      </Pressable>
      <Text className="text-xs text-white w-14 text-center mt-1" numberOfLines={1}>
        Your Time
      </Text>
    </View>
  );
};

export default React.memo(StoryCreator);
