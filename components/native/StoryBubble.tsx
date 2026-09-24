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
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Shared geometry for every bubble in the home story row ("Your story" and
// other users), so the rings are identical in size and sit on one line.
export const STORY_RING_SIZE = 64;
export const STORY_RING_WIDTH = 2;
export const STORY_RING_GAP = 2;
export const STORY_INNER_SIZE = STORY_RING_SIZE - 2 * (STORY_RING_WIDTH + STORY_RING_GAP);
export const STORY_ITEM_WIDTH = STORY_RING_SIZE + 8;
export const STORY_ITEM_SPACING = 4;
export const STORY_ROW_PADDING_H = 8;
export const STORY_RING_COLOR_ACTIVE = '#3b82f6';
export const STORY_RING_COLOR_IDLE = '#4b5563';

interface StoryBubbleProps {
  label: string;
  /** Blue ring when true, gray otherwise. */
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Content rendered inside the ring, sized STORY_INNER_SIZE. */
  children: React.ReactNode;
}

const StoryBubble: React.FC<StoryBubbleProps> = ({ label, active, onPress, accessibilityLabel, children }) => (
  <View style={styles.item}>
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.ring, { borderColor: active ? STORY_RING_COLOR_ACTIVE : STORY_RING_COLOR_IDLE }]}
    >
      <View style={styles.inner}>{children}</View>
    </Pressable>
    <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  item: {
    width: STORY_ITEM_WIDTH,
    marginRight: STORY_ITEM_SPACING,
    alignItems: 'center',
  },
  ring: {
    width: STORY_RING_SIZE,
    height: STORY_RING_SIZE,
    borderRadius: STORY_RING_SIZE / 2,
    borderWidth: STORY_RING_WIDTH,
    padding: STORY_RING_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: STORY_INNER_SIZE,
    height: STORY_INNER_SIZE,
    borderRadius: STORY_INNER_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    width: STORY_ITEM_WIDTH,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: '#fff',
    textAlign: 'center',
  },
});

export default React.memo(StoryBubble);
