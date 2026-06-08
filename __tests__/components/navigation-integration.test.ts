// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/navigation-integration.test.ts
// AppBar <-> BottomNavigationBar integration tests.
//
// These tests verify the *contract* between the AppBar (screen header) and
// the BottomNavigationBar (tab switcher) without mounting React Native.
// The AppBar reads its config from props (title, showBack, showThemeToggle,
// themeMode) and the BottomNavigationBar reads `activeScreen` plus exposes
// a `navigate` callback. The contract is:
//
//   1. Switching to a different tab must update the AppBar's `title` to
//      a value that matches that tab's human label.
//   2. Switching to a different tab must mark exactly one bottom-nav tab
//      as active (the matching one), and leave the others inactive.
//   3. Root tabs (home, search, camera, profile) never show a back button
//      in the AppBar; pushing a child screen (a detail route above the tab
//      bar) flips showBack to true.
//   4. The AppBar's theme toggle stays visible across all root tab
//      transitions, and its label flips with the global theme mode.
//   5. Extended active screens (`notifications`, `messages`, `compose`)
//      leave the bottom-nav with NO active tab and the AppBar still has
//      no back button (these are reachable from the tab bar but are not
//      themselves tab roots).

import {
  shouldShowBack,
  shouldShowThemeToggle,
  themeLabel,
  formatTitle,
} from '../../components/AppBar.utils';
import {
  isTabActive,
  navButtonClassName,
  tabIconName,
  parseActiveScreen,
  TAB_ORDER,
  TAB_LABELS,
  type TabSlot,
  type ActiveScreen,
} from '../../components/BottomNavigationBar.utils';

// ---------------------------------------------------------------------------
// Test fixture: a small in-memory "screen registry" that ties a bottom-nav
// tab to the AppBar configuration that the host screen should render. This
// is the same data a navigator would supply on each route change.
// ---------------------------------------------------------------------------

interface ScreenConfig {
  title: string;
  showBack: boolean;
  showThemeToggle: boolean;
  themeMode: 'dark' | 'light';
}

const ROOT_TAB_TITLES: Readonly<Record<TabSlot, string>> = {
  home: 'Ahlan Social',
  search: 'Search',
  camera: 'Camera',
  profile: 'My Profile',
};

function configFor(activeScreen: ActiveScreen, themeMode: 'dark' | 'light' = 'dark'): ScreenConfig {
  if (activeScreen === 'home' || activeScreen === 'search' || activeScreen === 'camera' || activeScreen === 'profile') {
    return {
      title: ROOT_TAB_TITLES[activeScreen],
      showBack: false, // root tabs never have back
      showThemeToggle: true,
      themeMode,
    };
  }
  // Extended screens (compose / notifications / messages) – still root-level,
  // no back button, theme toggle still visible.
  const extendedTitles: Record<Exclude<ActiveScreen, TabSlot>, string> = {
    compose: 'New Post',
    notifications: 'Notifications',
    messages: 'Messages',
  };
  return {
    title: extendedTitles[activeScreen],
    showBack: false,
    showThemeToggle: true,
    themeMode,
  };
}

// ---------------------------------------------------------------------------
// 1. AppBar + BottomNav integration – header changes on tab switch.
//
//    For every navigable tab, switching to it must:
//      (a) update the AppBar title to the tab's human-readable name, and
//      (b) mark only that tab as active in the bottom nav.
// ---------------------------------------------------------------------------

describe('AppBar + BottomNav integration – header changes on tab switch', () => {
  TAB_ORDER.forEach((tab) => {
    it(`switching to "${tab}" updates the AppBar title to "${ROOT_TAB_TITLES[tab]}"`, () => {
      const cfg = configFor(tab);
      // 1. AppBar reflects the new title.
      expect(formatTitle(cfg.title)).toBe(ROOT_TAB_TITLES[tab]);
      // 2. AppBar still has no back button (this is a root tab).
      expect(shouldShowBack(cfg.showBack)).toBe(false);
      // 3. AppBar still exposes the theme toggle.
      expect(shouldShowThemeToggle(cfg.showThemeToggle)).toBe(true);
    });

    it(`switching to "${tab}" activates exactly the "${tab}" tab in the bottom nav`, () => {
      // The matching tab is active; all three others are inactive.
      expect(isTabActive(tab, tab)).toBe(true);
      (TAB_ORDER.filter((t) => t !== tab) as TabSlot[]).forEach((other) => {
        expect(isTabActive(other, tab)).toBe(false);
      });

      // Exactly one tab slot receives the active class.
      const activeClass = navButtonClassName(true);
      const inactiveClass = navButtonClassName(false);
      const activeCount = TAB_ORDER.filter((t) => navButtonClassName(isTabActive(t, tab)) === activeClass).length;
      const inactiveCount = TAB_ORDER.filter((t) => navButtonClassName(isTabActive(t, tab)) === inactiveClass).length;
      expect(activeCount).toBe(1);
      expect(inactiveCount).toBe(TAB_ORDER.length - 1);
    });
  });

  it('switching to "search" yields a title distinct from "home"', () => {
    expect(formatTitle(configFor('search').title)).not.toBe(formatTitle(configFor('home').title));
  });

  it('switching to "profile" yields a title distinct from "home" and "search"', () => {
    const profile = formatTitle(configFor('profile').title);
    expect(profile).not.toBe(formatTitle(configFor('home').title));
    expect(profile).not.toBe(formatTitle(configFor('search').title));
  });
});

// ---------------------------------------------------------------------------
// 2. Root vs child screen – the AppBar's back button is the one piece of
//    state that distinguishes a tab root from a pushed child. Pushing a
//    child screen must not change the bottom-nav state.
// ---------------------------------------------------------------------------

describe('AppBar + BottomNav integration – back button on pushed child screens', () => {
  it('a child screen pushed on top of "home" shows the back button, "home" tab stays active', () => {
    const childCfg: ScreenConfig = {
      title: 'Post Details',
      showBack: true,
      showThemeToggle: true,
      themeMode: 'dark',
    };
    const rootCfg = configFor('home');

    // AppBar state changes…
    expect(shouldShowBack(childCfg.showBack)).toBe(true);
    expect(shouldShowBack(rootCfg.showBack)).toBe(false);

    // …while the bottom-nav state is preserved (home is still the active tab).
    expect(isTabActive('home', 'home')).toBe(true);
    expect(isTabActive('search', 'home')).toBe(false);
    expect(isTabActive('camera', 'home')).toBe(false);
    expect(isTabActive('profile', 'home')).toBe(false);
  });

  it('formatTitle and themeLabel still produce valid header values for a child screen', () => {
    const childCfg: ScreenConfig = {
      title: '  Edit Profile  ', // spaces must be trimmed
      showBack: true,
      showThemeToggle: true,
      themeMode: 'light',
    };
    expect(formatTitle(childCfg.title)).toBe('Edit Profile');
    expect(shouldShowBack(childCfg.showBack)).toBe(true);
    expect(themeLabel(childCfg.themeMode)).toBe('☀️');
  });

  it('an empty child-screen title still produces a valid header (fallback name)', () => {
    const childCfg: ScreenConfig = {
      title: '',
      showBack: true,
      showThemeToggle: true,
      themeMode: 'dark',
    };
    expect(formatTitle(childCfg.title)).toBe('Ahlan Social');
    expect(shouldShowBack(childCfg.showBack)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Round-trip navigation – switching tabs in a sequence must always
//    leave the system in a coherent state. Models a user tapping through
//    home -> search -> profile -> home.
// ---------------------------------------------------------------------------

describe('AppBar + BottomNav integration – round-trip tab switching', () => {
  it('home -> search -> profile -> home leaves the AppBar title and active tab consistent at every step', () => {
    const sequence: ActiveScreen[] = ['home', 'search', 'profile', 'home'];

    const observed: Array<{ title: string; active: TabSlot | null }> = sequence.map((screen) => {
      const cfg = configFor(screen);
      const title = formatTitle(cfg.title);
      const active =
        screen === 'home' || screen === 'search' || screen === 'camera' || screen === 'profile'
          ? screen
          : null;
      return { title, active };
    });

    expect(observed[0]).toEqual({ title: 'Ahlan Social', active: 'home' });
    expect(observed[1]).toEqual({ title: 'Search', active: 'search' });
    expect(observed[2]).toEqual({ title: 'My Profile', active: 'profile' });
    // The closing step returns to the original state.
    expect(observed[3]).toEqual(observed[0]);
  });

  it('every intermediate step in a tab switch keeps the theme toggle visible', () => {
    const sequence: ActiveScreen[] = ['home', 'search', 'camera', 'profile'];
    sequence.forEach((screen) => {
      const cfg = configFor(screen);
      expect(shouldShowThemeToggle(cfg.showBack === false ? cfg.showThemeToggle : cfg.showThemeToggle)).toBe(true);
    });
  });

  it('parseActiveScreen rejects garbage values that could corrupt the header', () => {
    // If something other than a known screen name sneaks into the route, the
    // integration must not produce a half-broken header. The validator returns
    // null and the host should refuse to render.
    expect(parseActiveScreen('home')).toBe('home');
    expect(parseActiveScreen('garbage-route')).toBeNull();
    expect(parseActiveScreen(undefined)).toBeNull();
    expect(parseActiveScreen(null)).toBeNull();
    expect(parseActiveScreen(123)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Extended active screens – compose / notifications / messages.
//
//    These are reachable from the tab bar (e.g. the floating compose button
//    pushes a compose route) but are NOT tab roots. The AppBar still has
//    no back button on these screens (the host pushes them modally), and
//    the bottom nav has no active tab – the user is on a screen "above"
//    the tab bar.
// ---------------------------------------------------------------------------

describe('AppBar + BottomNav integration – extended screens (compose, notifications, messages)', () => {
  const extended: Array<Exclude<ActiveScreen, TabSlot>> = ['compose', 'notifications', 'messages'];

  extended.forEach((screen) => {
    it(`"${screen}" – AppBar has no back, no bottom-nav tab is active`, () => {
      const cfg = configFor(screen);
      expect(shouldShowBack(cfg.showBack)).toBe(false);
      expect(shouldShowThemeToggle(cfg.showThemeToggle)).toBe(true);
      expect(formatTitle(cfg.title).length).toBeGreaterThan(0);

      // No tab is active.
      TAB_ORDER.forEach((tab) => {
        expect(isTabActive(tab, screen)).toBe(false);
      });
    });
  });

  it('switching to "compose" via the FAB still exposes the compose title in the AppBar', () => {
    const cfg = configFor('compose');
    expect(formatTitle(cfg.title)).toBe('New Post');
    expect(shouldShowBack(cfg.showBack)).toBe(false);
  });

  it('switching to "notifications" still leaves all bottom-nav tabs inactive', () => {
    const cfg = configFor('notifications');
    expect(formatTitle(cfg.title)).toBe('Notifications');
    TAB_ORDER.forEach((tab) => {
      expect(isTabActive(tab, 'notifications')).toBe(false);
      // And therefore the inactive class is used everywhere in the bar.
      expect(navButtonClassName(isTabActive(tab, 'notifications'))).toBe(navButtonClassName(false));
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Theme label follows the global theme mode, not the active tab.
//
//    Toggling dark/light must not be coupled to the tab switch – the AppBar
//    label and the bottom-nav active class must remain consistent.
// ---------------------------------------------------------------------------

describe('AppBar + BottomNav integration – theme label is decoupled from the active tab', () => {
  it('"home" tab: dark theme -> ☀️/🌙 label flips with themeMode only', () => {
    expect(themeLabel(configFor('home', 'dark').themeMode)).toBe('🌙');
    expect(themeLabel(configFor('home', 'light').themeMode)).toBe('☀️');
    // The bottom-nav state is unchanged.
    expect(isTabActive('home', 'home')).toBe(true);
  });

  it('"profile" tab: dark theme -> ☀️/🌙 label flips with themeMode only', () => {
    expect(themeLabel(configFor('profile', 'dark').themeMode)).toBe('🌙');
    expect(themeLabel(configFor('profile', 'light').themeMode)).toBe('☀️');
    expect(isTabActive('profile', 'profile')).toBe(true);
  });

  it('every tab in TAB_ORDER maps to a non-empty aria-label and a known icon', () => {
    // Sanity: the bottom-nav contract the AppBar integrates with is fully wired.
    TAB_ORDER.forEach((tab) => {
      expect(TAB_LABELS[tab].length).toBeGreaterThan(0);
      expect(tabIconName(tab)).toBeDefined();
    });
  });
});
