/**
 * @jest-environment jsdom
 *
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/useAppContext.test.tsx
 *
 * Tests for the `useApp` hook (exported from `store/AppContext.tsx`).
 *
 * NOTE on naming: the request referred to this hook as `useAppContext`, but
 * the actual export in `store/AppContext.tsx` is `useApp` (see line 1142).
 * The store file also defines the React context object internally as
 * `AppContext` (not exported). These tests therefore cover the public
 * `useApp` hook, which is the consumer-facing entry point for the
 * `AppProvider` state tree. This is the same hook the rest of the
 * codebase imports.
 *
 * Strategy:
 *   - We use `react-dom/client` + `react-dom/test-utils` (createRoot +
 *     act) instead of `react-test-renderer`, which is deprecated in
 *     React 19. jsdom supplies the DOM; we mount into a transient
 *     container element.
 *   - The provider's network-bound effects (Supabase auth listener,
 *     notification/message subscriptions) are stubbed via `jest.mock`
 *     so the test stays synchronous and offline.
 *   - The hook + provider tree is exercised by a tiny "Probe" component
 *     that calls the hook and writes the returned value to a ref the
 *     test can inspect.
 */

// ─── 1. Mock the Supabase service layer ─────────────────────────────────
// The AppProvider immediately calls `supabase.auth.onAuthStateChange` in
// a useEffect. We mock the methods to return safe, no-op shapes so the
// provider mounts cleanly.

// Tell React that we're in an act-capable environment so the
// "current testing environment is not configured to support act(...)"
// warning stops polluting the test output.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockOnAuthStateChange = jest.fn(() => ({
  data: { subscription: { unsubscribe: jest.fn() } },
}));

const mockAuthGetUser = jest.fn(async () => ({
  data: { user: null },
  error: null,
}));

jest.mock('../services/supabase.native', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getUser: mockAuthGetUser,
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}), { virtual: true });

// Mock the apiService that AppContext.tsx pulls in. We provide a no-op
// shape for every named import the file references. The provider uses
// some of these inside useCallbacks that aren't invoked by these tests,
// but the import must resolve cleanly. The `supabase` re-export is
// forwarded to the mock above so the provider's effects can call
// `supabase.auth.onAuthStateChange` against a fully-shaped client.
jest.mock('../services/apiService', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { supabase } = require('../services/supabase.native');
  return {
    publishPost: jest.fn(),
    deletePost: jest.fn(),
    updatePost: jest.fn(),
    supabase,
    toggleLike: jest.fn(),
    toggleRepost: jest.fn(),
    addComment: jest.fn(),
    getFollowingList: jest.fn(async () => []),
    unfollowUser: jest.fn(),
    followUser: jest.fn(),
    markNotificationsAsRead: jest.fn(),
    getMyStories: jest.fn(async () => []),
    deleteStoryFromDatabase: jest.fn(),
    toggleStoryLikeInDatabase: jest.fn(),
    markMessagesAsRead: jest.fn(),
    toggleSavePost: jest.fn(),
    adminDeletePost: jest.fn(),
    ensureCurrentUserProfile: jest.fn(),
  };
}, { virtual: true });

// ─── 2. Imports under test ──────────────────────────────────────────────
import React, { useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { AppProvider, useApp } from '../store/AppContext';
type AppContextType = ReturnType<typeof useApp>;

// ─── 3. Helpers ─────────────────────────────────────────────────────────

/**
 * Probe component that captures the current `useApp` value into a ref
 * we can read from the test. We also render a JSON tree of the captured
 * state so failures show useful diff output.
 */
type Captured = { current: AppContextType | null };

const Probe: React.FC<{ capture: Captured }> = ({ capture }) => {
  const ctx = useApp();
  useEffect(() => {
    capture.current = ctx;
  });
  return React.createElement('div', { 'data-testid': 'probe' }, JSON.stringify({
    hasToggleLike: typeof ctx.togglePostLike === 'function',
    hasAddToast: typeof ctx.addToast === 'function',
    theme: ctx.theme,
    userProfileName: ctx.userProfile.name,
    likedPostsSize: ctx.likedPosts.size,
    unreadMessageCount: ctx.unreadMessageCount,
    isAdmin: ctx.isAdmin,
  }));
};

interface MountedHandle {
  root: Root;
  container: HTMLDivElement;
  capture: Captured;
}

function mountWithProvider(): MountedHandle {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const capture: Captured = { current: null };
  const root = createRoot(container);
  act(() => {
    root.render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(Probe, { capture }),
      ),
    );
  });
  return { root, container, capture };
}

function unmount(handle: MountedHandle): void {
  act(() => {
    handle.root.unmount();
  });
  handle.container.remove();
}

// ─── 4. Tests ───────────────────────────────────────────────────────────

describe('useApp (AppContext) — provider wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Make sure no stale blocked-users value carries over between tests.
    window.localStorage.removeItem('ahlan-blocked-users');
  });

  it('renders children inside the provider without throwing', () => {
    const handle = mountWithProvider();
    try {
      // The probe should be present in the rendered DOM.
      const probe = handle.container.querySelector('[data-testid="probe"]');
      expect(probe).not.toBeNull();
      expect(probe!.textContent).toContain('"hasToggleLike":true');
    } finally {
      unmount(handle);
    }
  });

  it('exposes the expected default state shape to consumers', () => {
    const handle = mountWithProvider();
    try {
      const ctx = handle.capture.current;
      expect(ctx).not.toBeNull();
      // The provider must hand consumers a fully-initialized state object,
      // not undefined. This guards the "must be used within a provider"
      // contract from the consumer side.
      expect(ctx).toBeDefined();
      // Default user profile (per the AppContext initial state).
      expect(ctx!.userProfile.name).toBe('Ahlan User');
      expect(ctx!.userProfile.username).toBe('ahlan_user');
      // Default theme.
      expect(ctx!.theme).toBe('dark');
      // Empty sets for interaction state.
      expect(ctx!.likedPosts).toBeInstanceOf(Set);
      expect(ctx!.likedPosts.size).toBe(0);
      expect(ctx!.repostedPosts.size).toBe(0);
      expect(ctx!.savedPosts.size).toBe(0);
      expect(ctx!.blockedUsers.size).toBe(0);
      expect(ctx!.unreadMessageCount).toBe(0);
      expect(ctx!.isAdmin).toBe(false);
      expect(ctx!.notifications).toBeNull();
    } finally {
      unmount(handle);
    }
  });

  it('exposes the action functions expected by the context type', () => {
    const handle = mountWithProvider();
    try {
      const ctx = handle.capture.current!;
      // Spot-check a representative slice of the action API. The full
      // surface is huge; we just confirm the provider is actually wiring
      // functions (not returning undefined) for the most-used actions.
      expect(typeof ctx.togglePostLike).toBe('function');
      expect(typeof ctx.togglePostRepost).toBe('function');
      expect(typeof ctx.toggleSavePost).toBe('function');
      expect(typeof ctx.postComment).toBe('function');
      expect(typeof ctx.addToast).toBe('function');
      expect(typeof ctx.removeToast).toBe('function');
      expect(typeof ctx.setTheme).toBe('function');
      expect(typeof ctx.refreshAllData).toBe('function');
      expect(typeof ctx.markAllNotificationsAsRead).toBe('function');
      expect(typeof ctx.markAllMessagesAsRead).toBe('function');
    } finally {
      unmount(handle);
    }
  });

  it('hydrates blocked users from localStorage when present', () => {
    // Seed localStorage as the real provider would encounter on a
    // returning visit, then mount and confirm the set is hydrated.
    window.localStorage.setItem(
      'ahlan-blocked-users',
      JSON.stringify(['spammer1', 'spammer2']),
    );
    const handle = mountWithProvider();
    try {
      const ctx = handle.capture.current!;
      expect(ctx.blockedUsers).toBeInstanceOf(Set);
      expect(ctx.blockedUsers.size).toBe(2);
      expect(ctx.blockedUsers.has('spammer1')).toBe(true);
      expect(ctx.blockedUsers.has('spammer2')).toBe(true);
    } finally {
      unmount(handle);
      window.localStorage.removeItem('ahlan-blocked-users');
    }
  });
});

describe('useApp (AppContext) — error when used outside provider', () => {
  // We suppress React's expected error log so the test output stays
  // readable. The provider's error path is exactly the thing we're
  // asserting on, so it WILL be logged by React.
  let errorSpy: jest.SpyInstance;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('throws a descriptive error when the hook is called without an AppProvider ancestor', () => {
    // The hook throws synchronously during render. createRoot surfaces
    // the error from the synchronous part of the render through React's
    // error logging, so we must capture it via console.error AND inspect
    // the captured value of the thrown Error.
    let caught: Error | null = null;
    const OutsideProbe: React.FC = () => {
      try {
        useApp();
      } catch (e) {
        caught = e as Error;
      }
      return null;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(OutsideProbe));
    });
    try {
      expect(caught).not.toBeNull();
      expect(caught!.message).toMatch(/useApp must be used within an AppProvider/);
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('the thrown error mentions the required provider by name', () => {
    // A second assertion on the same behavior with a tighter regex.
    // This guards against accidental rewording of the error message
    // that could mislead developers who hit it in production.
    let caught: Error | null = null;
    const OutsideProbe: React.FC = () => {
      try {
        useApp();
      } catch (e) {
        caught = e as Error;
      }
      return null;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(React.createElement(OutsideProbe));
    });
    try {
      expect(caught).not.toBeNull();
      expect(caught!.message).toMatch(/AppProvider/);
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });
});
