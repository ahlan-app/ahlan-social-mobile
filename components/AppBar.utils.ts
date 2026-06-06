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
// AppBar – pure display-logic helpers (testable without react-native)
// ---------------------------------------------------------------------------

/**
 * Decide whether the back button should be visible.
 * Returns `false` whenever `showBack` is falsy (i.e. on root screens).
 */
export function shouldShowBack(showBack?: boolean): boolean {
  return Boolean(showBack);
}

/**
 * Decide whether the theme-toggle button should be visible.
 * Defaults to `true` when the prop is omitted so that most screens see it.
 */
export function shouldShowThemeToggle(showThemeToggle?: boolean): boolean {
  return showThemeToggle !== false;
}

/**
 * Return a human-readable emoji label for the current theme mode.
 * Defaults to ☀️ (light) when mode is undefined.
 */
export function themeLabel(mode?: 'dark' | 'light'): string {
  return mode === 'dark' ? '🌙' : '☀️';
}

/**
 * Build the accessibility-friendly title string for the app bar.
 */
export function formatTitle(title: string): string {
  return title.trim().length > 0 ? title.trim() : 'Ahlan Social';
}
