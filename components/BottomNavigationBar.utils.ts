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

// ---------------------------------------------------------------------------
// BottomNavigationBar – pure display-logic helpers (testable without react-native)
// ---------------------------------------------------------------------------

export type Screen = 'home' | 'search' | 'camera' | 'compose' | 'profile';

export type ActiveScreen = Screen | 'notifications' | 'messages';

/**
 * The five tab slots rendered by the bar. The middle slot is reserved
 * for the floating compose button and has no nav button.
 */
export type TabSlot = 'home' | 'search' | 'camera' | 'profile';

/**
 * Ordered list of the four navigable tab slots. Index 2 is the
 * placeholder slot where the floating compose button sits.
 */
export const TAB_ORDER: ReadonlyArray<TabSlot> = ['home', 'search', 'camera', 'profile'];

/**
 * Ordered list of the five visual slots in the bar. Index 2 is a
 * 1/5-wide spacer consumed by the floating compose FAB.
 */
export const BAR_SLOTS: ReadonlyArray<TabSlot | 'spacer'> = [
  'home',
  'search',
  'spacer',
  'camera',
  'profile',
];

/**
 * Human-readable aria-labels for each nav tab.
 */
export const TAB_LABELS: Readonly<Record<TabSlot, string>> = {
  home: 'Home',
  search: 'Search',
  camera: 'Camera',
  profile: 'Profile',
};

/**
 * aria-label for the floating compose button.
 */
export const COMPOSE_LABEL = 'Compose Post';

/**
 * Resolve whether a given tab slot is the currently active screen.
 *
 * Only the four nav tab slots can be active. The compose FAB and
 * spacer slot are never returned as active.
 */
export function isTabActive(tab: TabSlot, activeScreen: ActiveScreen): boolean {
  if (activeScreen === 'notifications' || activeScreen === 'messages') {
    return false;
  }
  return activeScreen === tab;
}

/**
 * Return the Tailwind class string that styles a NavButton.
 *
 * Active tab uses the brand-blue foreground; inactive tabs use the
 * gray foreground with a hover transition to the theme foreground.
 */
export function navButtonClassName(isActive: boolean): string {
  return isActive
    ? 'flex flex-col items-center justify-center w-full h-full transition-colors duration-200 text-blue-500'
    : 'flex flex-col items-center justify-center w-full h-full transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white';
}

/**
 * Pick the correct icon component for a given tab slot.
 *
 * Decoupled from React Native / SVG so it can be unit-tested as
 * pure data: returns the icon name rather than the component.
 */
export function tabIconName(tab: TabSlot): 'HomeIcon' | 'SearchIcon' | 'CameraIcon' | 'UserIcon' {
  switch (tab) {
    case 'home':
      return 'HomeIcon';
    case 'search':
      return 'SearchIcon';
    case 'camera':
      return 'CameraIcon';
    case 'profile':
      return 'UserIcon';
  }
}

/**
 * Validate a screen value. Returns the narrowed `ActiveScreen` if
 * it is one of the known values, otherwise `null`.
 */
export function parseActiveScreen(value: unknown): ActiveScreen | null {
  const valid: ReadonlyArray<ActiveScreen> = [
    'home',
    'search',
    'camera',
    'compose',
    'profile',
    'notifications',
    'messages',
  ];
  return valid.includes(value as ActiveScreen) ? (value as ActiveScreen) : null;
}
