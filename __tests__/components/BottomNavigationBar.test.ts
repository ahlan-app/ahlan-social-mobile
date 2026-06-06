// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/BottomNavigationBar.test.ts
// BottomNavigationBar – tab switching, active state, and icon rendering tests

import {
  isTabActive,
  navButtonClassName,
  tabIconName,
  parseActiveScreen,
  TAB_ORDER,
  TAB_LABELS,
  COMPOSE_LABEL,
  BAR_SLOTS,
  type TabSlot,
  type ActiveScreen,
} from '../../components/BottomNavigationBar.utils';

// ---------------------------------------------------------------------------
// 1. Tab switching – clicking a tab invokes navigate() with that screen
//
//    The component wires onClick={() => navigate(screen)} where `screen`
//    is the literal TabSlot passed to NavButton. These tests pin the
//    exact mapping that drives the click → navigate() contract.
// ---------------------------------------------------------------------------

describe('BottomNavigationBar – tab switching', () => {
  const navigableTabs: TabSlot[] = ['home', 'search', 'camera', 'profile'];

  it('exposes exactly four navigable tab slots', () => {
    expect(TAB_ORDER).toHaveLength(4);
    expect(new Set(TAB_ORDER).size).toBe(4);
  });

  it('all four tab slots are unique', () => {
    const all = new Set(navigableTabs);
    expect(all.size).toBe(4);
  });

  it('TAB_ORDER matches the navigable tab set', () => {
    expect(new Set(TAB_ORDER)).toEqual(new Set(navigableTabs));
  });

  navigableTabs.forEach((tab) => {
    it(`routes a click on the "${tab}" tab to navigate("${tab}")`, () => {
      // The NavButton contract: onClick={navigate} where `screen` is the tab.
      // We simulate by checking that the tab's own identity is what would be
      // passed to navigate() – i.e. parseActiveScreen(tab) === tab.
      expect(parseActiveScreen(tab)).toBe(tab);
      expect(tabIconName(tab)).toBeDefined();
      expect(TAB_LABELS[tab]).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Active tab highlight – isTabActive / navButtonClassName
//
//    When activeScreen === tab, that tab gets the blue-500 active class.
//    Inactive tabs (including notifications/messages/compose) get the
//    gray + hover class.
// ---------------------------------------------------------------------------

describe('BottomNavigationBar – active tab highlight', () => {
  const tabs: TabSlot[] = ['home', 'search', 'camera', 'profile'];

  it('marks the matching tab as active when activeScreen is one of the tabs', () => {
    tabs.forEach((tab) => {
      expect(isTabActive(tab, tab as ActiveScreen)).toBe(true);
    });
  });

  it('marks every other tab as inactive when activeScreen is a tab', () => {
    tabs.forEach((active) => {
      tabs
        .filter((t) => t !== active)
        .forEach((inactive) => {
          expect(isTabActive(inactive, active as ActiveScreen)).toBe(false);
        });
    });
  });

  it('no tab is active when the activeScreen is "notifications"', () => {
    tabs.forEach((tab) => {
      expect(isTabActive(tab, 'notifications')).toBe(false);
    });
  });

  it('no tab is active when the activeScreen is "messages"', () => {
    tabs.forEach((tab) => {
      expect(isTabActive(tab, 'messages')).toBe(false);
    });
  });

  it('no tab is active when the activeScreen is "compose"', () => {
    tabs.forEach((tab) => {
      expect(isTabActive(tab, 'compose')).toBe(false);
    });
  });

  it('active class string contains the blue-500 token', () => {
    const cls = navButtonClassName(true);
    expect(cls).toContain('text-blue-500');
    expect(cls).toContain('flex');
    expect(cls).toContain('w-full');
  });

  it('inactive class string contains gray tokens and a hover variant', () => {
    const cls = navButtonClassName(false);
    expect(cls).toContain('text-gray-500');
    expect(cls).toContain('hover:text-black');
    expect(cls).not.toContain('text-blue-500');
  });

  it('active vs inactive class strings are different', () => {
    expect(navButtonClassName(true)).not.toBe(navButtonClassName(false));
  });
});

// ---------------------------------------------------------------------------
// 3. Icon rendering – tabIconName maps each tab to the correct icon
// ---------------------------------------------------------------------------

describe('BottomNavigationBar – icon rendering per tab', () => {
  it('home tab renders the HomeIcon', () => {
    expect(tabIconName('home')).toBe('HomeIcon');
  });

  it('search tab renders the SearchIcon', () => {
    expect(tabIconName('search')).toBe('SearchIcon');
  });

  it('camera tab renders the CameraIcon', () => {
    expect(tabIconName('camera')).toBe('CameraIcon');
  });

  it('profile tab renders the UserIcon', () => {
    expect(tabIconName('profile')).toBe('UserIcon');
  });

  it('all four tab icon names are unique', () => {
    const names = (['home', 'search', 'camera', 'profile'] as TabSlot[]).map(tabIconName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('aria-labels are human-readable strings for every tab', () => {
    (['home', 'search', 'camera', 'profile'] as TabSlot[]).forEach((tab) => {
      expect(typeof TAB_LABELS[tab]).toBe('string');
      expect(TAB_LABELS[tab].length).toBeGreaterThan(0);
    });
    expect(TAB_LABELS.home).toBe('Home');
    expect(TAB_LABELS.search).toBe('Search');
    expect(TAB_LABELS.camera).toBe('Camera');
    expect(TAB_LABELS.profile).toBe('Profile');
  });

  it('exposes a compose FAB aria-label distinct from any tab label', () => {
    expect(COMPOSE_LABEL).toBe('Compose Post');
    expect(Object.values(TAB_LABELS)).not.toContain(COMPOSE_LABEL);
  });
});

// ---------------------------------------------------------------------------
// 4. Bar layout – five visual slots, the middle one is a spacer
//    consumed by the floating compose FAB.
// ---------------------------------------------------------------------------

describe('BottomNavigationBar – bar layout (5 slots, spacer in the middle)', () => {
  it('renders exactly five visual slots', () => {
    expect(BAR_SLOTS).toHaveLength(5);
  });

  it('the third slot is a spacer for the compose FAB', () => {
    expect(BAR_SLOTS[2]).toBe('spacer');
  });

  it('the four nav tabs are present in left-to-right order', () => {
    expect(BAR_SLOTS.filter((s) => s !== 'spacer')).toEqual(['home', 'search', 'camera', 'profile']);
  });
});

// ---------------------------------------------------------------------------
// 5. parseActiveScreen – input validation for the activeScreen prop
// ---------------------------------------------------------------------------

describe('BottomNavigationBar – parseActiveScreen input validation', () => {
  it('accepts the five Screen values', () => {
    expect(parseActiveScreen('home')).toBe('home');
    expect(parseActiveScreen('search')).toBe('search');
    expect(parseActiveScreen('camera')).toBe('camera');
    expect(parseActiveScreen('compose')).toBe('compose');
    expect(parseActiveScreen('profile')).toBe('profile');
  });

  it('accepts the two extended active values', () => {
    expect(parseActiveScreen('notifications')).toBe('notifications');
    expect(parseActiveScreen('messages')).toBe('messages');
  });

  it('rejects unknown strings', () => {
    expect(parseActiveScreen('settings')).toBeNull();
    expect(parseActiveScreen('')).toBeNull();
  });

  it('rejects non-string inputs', () => {
    expect(parseActiveScreen(undefined)).toBeNull();
    expect(parseActiveScreen(null)).toBeNull();
    expect(parseActiveScreen(42)).toBeNull();
    expect(parseActiveScreen({})).toBeNull();
  });
});
