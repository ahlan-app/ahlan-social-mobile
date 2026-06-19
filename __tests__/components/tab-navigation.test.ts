// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/tab-navigation.test.ts
// Tab navigation tests — switching between Home / Search / Profile tabs and
// verifying that a "back" action restores the previously selected tab state.
//
// These tests use a small in-memory model of the expo-router Tabs navigation
// stack. The model is intentionally minimal: a tab switcher can only push
// a new active tab onto the stack and pop the top of the stack. The contract
// verified here is:
//
//   1. Switching from one tab to another always updates the active tab to
//      the new tab and leaves no ambiguity about which tab is foreground.
//   2. The Home → Search → Profile switch chain reports the right active tab
//      at every intermediate step.
//   3. Popping the top of the navigation history (the "back" gesture / button)
//      restores the previously active tab — i.e. state restoration works.
//   4. Back navigation is symmetric with forward navigation: the same sequence
//      of pushes and pops returns to the starting tab.
//   5. Back navigation when there is no prior tab leaves the active tab
//      unchanged (the root screen cannot be popped off the stack).
//
// We deliberately drive the navigation history with a tiny custom function
// (navigateTo / goBack) instead of mounting expo-router, so the test stays
// a pure-logic test that runs under the project's `ts-jest` Node preset.

import {
  TAB_ORDER,
  isTabActive,
  parseActiveScreen,
  type TabSlot,
  type ActiveScreen,
} from '../../components/BottomNavigationBar.utils';

// ---------------------------------------------------------------------------
// Test fixture: an in-memory tab navigation history.
//
//   navigateTo(tab):  pushes the new tab onto the stack and returns the
//                     updated active tab (top of stack).
//   goBack():         pops the top of the stack (but never pops the root).
//                     Returns the new active tab.
//
// This mirrors what the expo-router `Tabs` navigator does for tab switches:
// switching tabs replaces the foreground tab but the previous tab is kept
// in the per-tab stack so that returning to it restores its state.
// ---------------------------------------------------------------------------

interface TabNavigator {
  history: ReadonlyArray<TabSlot>;
  active(): TabSlot | null;
  navigateTo(tab: TabSlot): TabSlot;
  goBack(): TabSlot | null;
  goBackToRoot(): TabSlot | null;
}

function createNavigator(initial: TabSlot = 'home'): TabNavigator {
  let history: TabSlot[] = [initial];

  return {
    get history() {
      return history;
    },
    active() {
      return history.length > 0 ? history[history.length - 1] : null;
    },
    navigateTo(tab: TabSlot): TabSlot {
      // A switch to the same tab is a no-op for the history stack — the
      // active tab doesn't change but no duplicate entry is created.
      if (history[history.length - 1] !== tab) {
        history.push(tab);
      }
      return tab;
    },
    goBack(): TabSlot | null {
      // The root tab cannot be popped — there must always be an active tab.
      if (history.length <= 1) return null;
      history.pop();
      return this.active();
    },
    goBackToRoot(): TabSlot | null {
      while (history.length > 1) {
        history.pop();
      }
      return this.active();
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Single tab switch updates the active tab and bottom-nav state.
// ---------------------------------------------------------------------------

describe('tab navigation – switching between Home / Search / Profile', () => {
  it('starts on the Home tab and reports exactly Home as active', () => {
    const nav = createNavigator('home');

    expect(nav.active()).toBe('home');
    expect(isTabActive('home', nav.active() as ActiveScreen)).toBe(true);
    expect(isTabActive('search', nav.active() as ActiveScreen)).toBe(false);
    expect(isTabActive('profile', nav.active() as ActiveScreen)).toBe(false);
    expect(isTabActive('camera', nav.active() as ActiveScreen)).toBe(false);
  });

  it('Home → Search changes the active tab to Search and deactivates Home', () => {
    const nav = createNavigator('home');

    const newActive = nav.navigateTo('search');

    expect(newActive).toBe('search');
    expect(nav.active()).toBe('search');
    expect(isTabActive('search', newActive)).toBe(true);
    expect(isTabActive('home', newActive)).toBe(false);
    expect(isTabActive('profile', newActive)).toBe(false);
  });

  it('Search → Profile changes the active tab to Profile and deactivates Search', () => {
    const nav = createNavigator('search');

    const newActive = nav.navigateTo('profile');

    expect(newActive).toBe('profile');
    expect(nav.active()).toBe('profile');
    expect(isTabActive('profile', newActive)).toBe(true);
    expect(isTabActive('search', newActive)).toBe(false);
    expect(isTabActive('home', newActive)).toBe(false);
  });

  it('a full Home → Search → Profile chain reports the correct active tab at every step', () => {
    const nav = createNavigator('home');
    const visited: TabSlot[] = [nav.active() as TabSlot];

    visited.push(nav.navigateTo('search'));
    visited.push(nav.navigateTo('profile'));

    expect(visited).toEqual(['home', 'search', 'profile']);
    // Each step in the chain has exactly one active tab and no ambiguity.
    visited.forEach((screen) => {
      const activeCount = TAB_ORDER.filter((t) =>
        isTabActive(t, parseActiveScreen(screen) as ActiveScreen),
      ).length;
      expect(activeCount).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Back navigation restores the previously selected tab state.
// ---------------------------------------------------------------------------

describe('tab navigation – back navigation restores the previous tab', () => {
  it('going back from Search restores Home as the active tab', () => {
    const nav = createNavigator('home');
    nav.navigateTo('search');
    expect(nav.active()).toBe('search');

    const restored = nav.goBack();

    expect(restored).toBe('home');
    expect(nav.active()).toBe('home');
    expect(isTabActive('home', 'home')).toBe(true);
    expect(isTabActive('search', 'home')).toBe(false);
  });

  it('going back step by step through Home → Search → Profile restores Home at the end', () => {
    const nav = createNavigator('home');
    nav.navigateTo('search');
    nav.navigateTo('profile');
    expect(nav.active()).toBe('profile');

    expect(nav.goBack()).toBe('search');
    expect(nav.goBack()).toBe('home');

    // The state is fully restored: Home is active again and the bottom-nav
    // contract is consistent with that.
    expect(nav.active()).toBe('home');
    TAB_ORDER.forEach((t) => {
      expect(isTabActive(t, nav.active() as ActiveScreen)).toBe(t === 'home');
    });
  });

  it('back navigation is symmetric with forward navigation', () => {
    // Forward:  home -> search -> profile
    // Backward: profile -> search -> home
    const nav = createNavigator('home');
    nav.navigateTo('search');
    nav.navigateTo('profile');

    const backChain: Array<TabSlot | null> = [];
    backChain.push(nav.goBack()); // -> search
    backChain.push(nav.goBack()); // -> home
    backChain.push(nav.goBack()); // -> null (root cannot be popped)

    expect(backChain).toEqual(['search', 'home', null]);
    // After the symmetric back-trip, we're back at the root tab.
    expect(nav.active()).toBe('home');
  });

  it('going back when only the root tab is present leaves the active tab unchanged', () => {
    const nav = createNavigator('profile');
    expect(nav.active()).toBe('profile');

    const result = nav.goBack();

    // The navigator refuses to pop the root — the user stays on Profile.
    expect(result).toBeNull();
    expect(nav.active()).toBe('profile');
    expect(isTabActive('profile', 'profile')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Repeat switches between the same two tabs preserve stack hygiene.
// ---------------------------------------------------------------------------

describe('tab navigation – repeated switches between two tabs', () => {
  it('toggling Home ↔ Search three times leaves Home active and back-walks land on each prior tab in reverse order', () => {
    const nav = createNavigator('home');

    nav.navigateTo('search');
    nav.navigateTo('home');
    nav.navigateTo('search');
    nav.navigateTo('home');

    expect(nav.active()).toBe('home');

    // Back-walking the bounce chain must land on each prior tab in reverse,
    // i.e. the stack is well-formed and the contract "back restores prior
    // state" holds even across many switches.
    expect(nav.goBack()).toBe('search');
    expect(nav.goBack()).toBe('home');
    expect(nav.goBack()).toBe('search');
    expect(nav.goBack()).toBe('home');
    // Eventually we hit the root and goBack refuses to pop further.
    expect(nav.goBack()).toBeNull();
    expect(nav.active()).toBe('home');
  });
});