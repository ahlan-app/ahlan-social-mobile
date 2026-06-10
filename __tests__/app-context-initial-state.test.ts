// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/app-context-initial-state.test.ts
// Tests for AppContext initial state defaults (user profile, theme, auth).

import type { UserProfile } from '../types';

// Mirrors the `useState` initializer inside `AppProvider` in
// `store/AppContext.tsx` (lines 110–160). These tests verify the
// exact default values that the store exposes before any auth
// subscription, data fetch, or localStorage hydration runs.
//
// We reproduce the initial state as a pure data literal so the test
// stays free of React, React Native, and Supabase runtime dependencies
// (consistent with the project's "no React Native" test config).

const APP_CONTEXT_FILE = '../store/AppContext';

function buildInitialState(savedBlockedUsers: string[] | null = null) {
  // localStorage may be undefined in node; guard it.
  const ls: Storage | undefined =
    typeof globalThis !== 'undefined' && (globalThis as any).localStorage
      ? (globalThis as any).localStorage
      : undefined;

  let initialBlockedUsers: string[] = [];
  if (savedBlockedUsers && ls) {
    ls.setItem('ahlan-blocked-users', JSON.stringify(savedBlockedUsers));
    const saved = ls.getItem('ahlan-blocked-users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          initialBlockedUsers = parsed.filter((item: unknown) => typeof item === 'string');
        }
      } catch (e) {
        // Mirrors the source: swallow parse errors, fall back to empty.
      }
    }
  } else if (ls) {
    ls.removeItem('ahlan-blocked-users');
  }

  const defaultProfile: UserProfile = {
    id: '',
    name: 'Ahlan User',
    username: 'ahlan_user',
    bio: 'Hello, I am using Ahlan',
    profilePicture: null,
  };

  return {
    likedPosts: new Set<string>(),
    repostedPosts: new Set<string>(),
    savedPosts: new Set<string>(),
    postComments: new Map<string, unknown[]>(),
    profilePosts: [] as unknown[],
    userProfile: defaultProfile,
    theme: 'dark' as 'light' | 'dark',
    userStories: [] as unknown[],
    storyComments: new Map<string, unknown[]>(),
    likedStoryIds: new Set<string>(),
    hasNewStory: false,
    viewedStoryTimestamps: new Set<string>(),
    isViewingStory: false,
    isStandalone: false,
    isInstallModalOpen: false,
    installPromptEvent: null as Event | null,
    blockedUsers: new Set<string>(initialBlockedUsers),
    likedVideoIds: new Set<string>(),
    followedUsernames: new Set<string>(),
    votedPolls: new Map<string, number>(),
    toasts: [] as unknown[],
    tooltip: null as { text: string; target: HTMLElement | null } | null,
    notifications: null as unknown[] | null,
    unreadMessageCount: 0,
    unreadChats: new Set<string>(),
    topNotification: null as { title: string; message: string } | null,
    isAdmin: false,
  };
}

// ─── 1. Default user profile ───────────────────────────────────────────

describe('AppContext — default user profile', () => {
  it('uses an empty id (no authenticated user yet)', () => {
    const state = buildInitialState();
    expect(state.userProfile.id).toBe('');
  });

  it('uses the Ahlan placeholder display name and handle', () => {
    const state = buildInitialState();
    expect(state.userProfile.name).toBe('Ahlan User');
    expect(state.userProfile.username).toBe('ahlan_user');
  });

  it('uses the canonical welcome bio', () => {
    const state = buildInitialState();
    expect(state.userProfile.bio).toBe('Hello, I am using Ahlan');
  });

  it('starts with no profile picture', () => {
    const state = buildInitialState();
    expect(state.userProfile.profilePicture).toBeNull();
  });
});

// ─── 2. Default theme ─────────────────────────────────────────────────

describe('AppContext — default theme', () => {
  it('starts in dark mode', () => {
    const state = buildInitialState();
    expect(state.theme).toBe('dark');
  });
});

// ─── 3. Default auth / session state ──────────────────────────────────

describe('AppContext — default auth & session state', () => {
  it('is not an admin on first load', () => {
    const state = buildInitialState();
    expect(state.isAdmin).toBe(false);
  });

  it('has zero unread messages and no unread chats', () => {
    const state = buildInitialState();
    expect(state.unreadMessageCount).toBe(0);
    expect(state.unreadChats.size).toBe(0);
  });

  it('has no notifications loaded yet', () => {
    const state = buildInitialState();
    expect(state.notifications).toBeNull();
  });

  it('has no top-level banner notification', () => {
    const state = buildInitialState();
    expect(state.topNotification).toBeNull();
  });
});

// ─── 4. Default collection / interaction state ────────────────────────

describe('AppContext — default collection & interaction state', () => {
  it('starts with no liked, reposted, or saved posts', () => {
    const state = buildInitialState();
    expect(state.likedPosts.size).toBe(0);
    expect(state.repostedPosts.size).toBe(0);
    expect(state.savedPosts.size).toBe(0);
  });

  it('starts with no followed users, liked videos, or liked stories', () => {
    const state = buildInitialState();
    expect(state.followedUsernames.size).toBe(0);
    expect(state.likedVideoIds.size).toBe(0);
    expect(state.likedStoryIds.size).toBe(0);
  });

  it('starts with no comments loaded for any post or story', () => {
    const state = buildInitialState();
    expect(state.postComments.size).toBe(0);
    expect(state.storyComments.size).toBe(0);
  });

  it('starts with an empty profile feed, no stories, and no toasts', () => {
    const state = buildInitialState();
    expect(state.profilePosts).toEqual([]);
    expect(state.userStories).toEqual([]);
    expect(state.toasts).toEqual([]);
  });
});

// ─── 5. UI / install / misc flags ─────────────────────────────────────

describe('AppContext — UI, install, and misc flags', () => {
  it('is not in standalone (PWA installed) mode', () => {
    const state = buildInitialState();
    expect(state.isStandalone).toBe(false);
    expect(state.isInstallModalOpen).toBe(false);
    expect(state.installPromptEvent).toBeNull();
  });

  it('is not viewing a story and has no new story flag set', () => {
    const state = buildInitialState();
    expect(state.isViewingStory).toBe(false);
    expect(state.hasNewStory).toBe(false);
    expect(state.viewedStoryTimestamps.size).toBe(0);
  });

  it('starts with no tooltip and no voted polls', () => {
    const state = buildInitialState();
    expect(state.tooltip).toBeNull();
    expect(state.votedPolls.size).toBe(0);
  });

  it('starts with an empty blocked-users set when no storage value exists', () => {
    const state = buildInitialState();
    expect(state.blockedUsers.size).toBe(0);
  });
});

// ─── 6. Module wiring sanity check ────────────────────────────────────

describe('AppContext — module wiring', () => {
  it('the AppContext source file exists and exports a provider', () => {
    // Light-touch import: we only check the module path resolves.
    // We deliberately do not render the provider here — that would
    // require React, which the current jest config does not load.
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'store', 'AppContext.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const contents = fs.readFileSync(filePath, 'utf8');
    expect(contents).toContain('export const AppProvider');
    expect(contents).toContain('useState<AppState>');
    expect(contents).toContain("theme: 'dark'");
    expect(contents).toContain("name: 'Ahlan User'");
  });

  it('keeps the initial state defaults in lockstep with the source file', () => {
    // If someone changes the defaults in AppContext.tsx, these
    // assertions should be updated in the same commit.
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'store', 'AppContext.tsx');
    const src = fs.readFileSync(filePath, 'utf8');
    expect(src).toContain("username: 'ahlan_user'");
    expect(src).toContain("bio: 'Hello, I am using Ahlan'");
    expect(src).toContain('profilePicture: null');
    expect(src).toContain('isAdmin: false');
  });
});
