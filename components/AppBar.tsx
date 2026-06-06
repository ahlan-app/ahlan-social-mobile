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
import {
  shouldShowBack,
  shouldShowThemeToggle,
  themeLabel,
  formatTitle,
} from './AppBar.utils';

export interface AppBarProps {
  /** Screen title displayed in the bar */
  title: string;
  /** Whether to show a back-navigation button (hidden on root screens) */
  showBack?: boolean;
  /** Whether to show the dark/light theme toggle */
  showThemeToggle?: boolean;
  /** Current theme mode label (e.g. "dark", "light") */
  themeMode?: 'dark' | 'light';
  /** Callback when back is pressed */
  onBack?: () => void;
  /** Callback when theme toggle is pressed */
  onToggleTheme?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({
  title,
  showBack,
  showThemeToggle,
  themeMode,
  onBack,
  onToggleTheme,
}) => {
  const backVisible = shouldShowBack(showBack);
  const toggleVisible = shouldShowThemeToggle(showThemeToggle);
  const displayTitle = formatTitle(title);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
      {backVisible && (
        <Pressable
          testID="appbar-back"
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text testID="appbar-back-text">← Back</Text>
        </Pressable>
      )}

      <Text testID="appbar-title" style={{ flex: 1, fontWeight: '600', fontSize: 18 }}>
        {displayTitle}
      </Text>

      {toggleVisible && (
        <Pressable
          testID="appbar-theme-toggle"
          onPress={onToggleTheme}
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
        >
          <Text testID="appbar-theme-label">{themeLabel(themeMode)}</Text>
        </Pressable>
      )}
    </View>
  );
};

export default AppBar;
