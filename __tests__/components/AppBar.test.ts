// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/AppBar.test.ts
// AppBar – rendering and display logic tests

import {
  shouldShowBack,
  shouldShowThemeToggle,
  themeLabel,
  formatTitle,
} from '../../components/AppBar.utils';

// ---------------------------------------------------------------------------
// 1. Title formatting
// ---------------------------------------------------------------------------

describe('AppBar – title rendering', () => {
  it('returns the trimmed title when non-empty', () => {
    expect(formatTitle('Ahlan Social')).toBe('Ahlan Social');
  });

  it('trims whitespace from the title', () => {
    expect(formatTitle('  Settings  ')).toBe('Settings');
  });

  it('falls back to "Ahlan Social" when title is empty', () => {
    expect(formatTitle('')).toBe('Ahlan Social');
    expect(formatTitle('   ')).toBe('Ahlan Social');
  });
});

// ---------------------------------------------------------------------------
// 2. Back button visibility (hides on root screens)
// ---------------------------------------------------------------------------

describe('AppBar – hides back on root, shows on child', () => {
  it('returns false when showBack is undefined (root screen default)', () => {
    expect(shouldShowBack(undefined)).toBe(false);
  });

  it('returns false when showBack is explicitly false', () => {
    expect(shouldShowBack(false)).toBe(false);
  });

  it('returns true when showBack is true (navigated screen)', () => {
    expect(shouldShowBack(true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Theme toggle visibility
// ---------------------------------------------------------------------------

describe('AppBar – shows theme toggle', () => {
  it('defaults to visible when prop is omitted', () => {
    expect(shouldShowThemeToggle(undefined)).toBe(true);
  });

  it('remains visible when explicitly set to true', () => {
    expect(shouldShowThemeToggle(true)).toBe(true);
  });

  it('hides only when explicitly set to false', () => {
    expect(shouldShowThemeToggle(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Theme label helper
// ---------------------------------------------------------------------------

describe('AppBar – theme label emoji', () => {
  it('returns 🌙 for dark mode', () => {
    expect(themeLabel('dark')).toBe('🌙');
  });

  it('returns ☀️ for light mode', () => {
    expect(themeLabel('light')).toBe('☀️');
  });

  it('defaults to ☀️ when mode is undefined', () => {
    expect(themeLabel(undefined)).toBe('☀️');
  });
});

// ---------------------------------------------------------------------------
// 5. Combined scenario – root screen (no back, toggle visible, dark theme)
// ---------------------------------------------------------------------------

describe('AppBar – combined root-screen scenario', () => {
  it('root screen: no back, toggle visible, dark theme label', () => {
    const back = shouldShowBack(undefined);
    const toggle = shouldShowThemeToggle(undefined);
    const label = themeLabel('dark');
    const title = formatTitle('Ahlan Social');

    expect(back).toBe(false);
    expect(toggle).toBe(true);
    expect(label).toBe('🌙');
    expect(title).toBe('Ahlan Social');
  });
});
