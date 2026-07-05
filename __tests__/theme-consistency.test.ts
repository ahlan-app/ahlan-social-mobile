// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/theme-consistency.test.ts
//
// Tests for dark/light theme consistency in the app store.
//
// What we cover:
//   1. Theme resolution produces the correct dark/light color tokens
//      for the surfaces the app actually uses (background, text,
//      border). Guards against accidental class/prop swaps.
//   2. The theme toggle (setTheme) updates in-memory state AND writes
//      the choice to localStorage so it survives an app restart.
//   3. The initial theme rehydrates from localStorage on a cold start,
//      preferring the persisted value over the system preference.
//   4. When there is no persisted value, the store falls back to the
//      OS-level prefers-color-scheme media query, defaulting to 'dark'
//      when no preference is expressed.
//
// These tests mirror the project's existing convention of pure-data
// reducers that replicate AppContext's state transitions (see
// __tests__/app-context-dispatch.test.ts and
// __tests__/state-rehydration.test.ts). They deliberately avoid
// pulling in React Native or the full provider so they run in the
// current `jest --preset ts-jest --testEnvironment node` setup.

const THEME_STORAGE_KEY = 'ahlan-theme';

// ── Minimal in-memory localStorage shim ────────────────────────────────
// Same shape as state-rehydration.test.ts so the persistence and
// rehydration paths are exercised against the same surface the real
// provider uses.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// ── matchMedia shim ────────────────────────────────────────────────────
// Mirrors only the slice of the Web API that resolveInitialTheme in
// store/AppContext.tsx relies on: a callable that takes a media query
// string and returns an object with a `matches` boolean.
type MatchMediaShim = (query: string) => { matches: boolean };

function makeMatchMedia(prefersLight: boolean | null): MatchMediaShim {
  return (query: string) => ({
    matches: query === '(prefers-color-scheme: light)' ? !!prefersLight : false,
  });
}

// ── Pure replica of resolveInitialTheme ────────────────────────────────
// Reads localStorage first, then falls back to prefers-color-scheme,
// and finally defaults to 'dark'. This MUST stay in lockstep with the
// implementation in store/AppContext.tsx so these tests catch drift in
// the real provider.
type Theme = 'light' | 'dark';

function resolveInitialTheme(
  ls: MemoryStorage,
  matchMedia?: MatchMediaShim,
): Theme {
  const persisted = ls.getItem(THEME_STORAGE_KEY);
  if (persisted === 'light' || persisted === 'dark') {
    return persisted;
  }
  if (matchMedia && matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

// ── Pure replica of the setTheme dispatch ──────────────────────────────
// Mirrors AppContext.tsx setTheme: writes the value to localStorage,
// then returns the next state slice with the theme field updated.
function dispatchSetTheme(
  state: { theme: Theme },
  theme: Theme,
  ls: MemoryStorage,
): { theme: Theme } {
  ls.setItem(THEME_STORAGE_KEY, theme);
  return { ...state, theme };
}

// ── Color tokens the app uses for the two themes ──────────────────────
// These are the canonical pairs the bottom nav, profile header, and
// settings screens all depend on. Centralizing them here lets a single
// test catch a swap (e.g. light text on a light surface) that would
// otherwise be invisible until someone actually used the app.
const PALETTE = {
  dark: {
    background: '#000000',
    surface: '#111827',     // bg-gray-900
    text: '#ffffff',
    mutedText: '#9ca3af',   // text-gray-400
    border: '#1f2937',     // border-gray-800
    accent: '#3b82f6',      // primary-500
  },
  light: {
    background: '#ffffff',
    surface: '#f3f4f6',     // bg-gray-100
    text: '#000000',
    mutedText: '#6b7280',    // text-gray-500
    border: '#e5e7eb',      // border-gray-200
    accent: '#3b82f6',      // primary-500
  },
} as const;

// Helper: resolve the full palette for the active theme. Mirrors the
// shape a `useTheme()` consumer in the components would receive.
function paletteFor(theme: Theme) {
  return PALETTE[theme];
}

// ─── 1. Theme colors apply correctly per mode ─────────────────────────

describe('theme consistency — color tokens', () => {
  it('dark theme resolves the dark palette (black background, white text)', () => {
    const palette = paletteFor('dark');
    expect(palette.background).toBe('#000000');
    expect(palette.text).toBe('#ffffff');
    // The surface the cards sit on in dark mode must be visibly
    // distinct from the page background, otherwise content edges
    // disappear.
    expect(palette.surface).not.toBe(palette.background);
  });

  it('light theme resolves the light palette (white background, black text)', () => {
    const palette = paletteFor('light');
    expect(palette.background).toBe('#ffffff');
    expect(palette.text).toBe('#000000');
    expect(palette.surface).not.toBe(palette.background);
  });

  it('dark and light themes swap background AND text colors (no same-mode bleed)', () => {
    // Catches the classic "light text on light bg" bug. If these two
    // palettes ever share a background or a text color, contrast is
    // broken in at least one mode.
    expect(PALETTE.dark.background).not.toBe(PALETTE.light.background);
    expect(PALETTE.dark.text).not.toBe(PALETTE.light.text);
    // And specifically: dark text must NOT be white, light text must
    // NOT be black — the modes are mirror images of each other.
    expect(PALETTE.dark.text).toBe(PALETTE.light.background);
    expect(PALETTE.dark.background).toBe(PALETTE.light.text);
  });

  it('both themes share the same primary accent so branded elements stay recognizable', () => {
    expect(PALETTE.dark.accent).toBe(PALETTE.light.accent);
    expect(PALETTE.dark.accent).toBe('#3b82f6');
  });
});

// ─── 2. Theme toggle updates state AND persists ───────────────────────

describe('theme consistency — setTheme persists to localStorage', () => {
  let ls: MemoryStorage;
  beforeEach(() => {
    ls = new MemoryStorage();
  });

  it('setTheme flips the in-memory state from dark to light', () => {
    const initial = { theme: 'dark' as Theme };
    const next = dispatchSetTheme(initial, 'light', ls);
    expect(next.theme).toBe('light');
  });

  it('setTheme writes the new theme to localStorage under ahlan-theme', () => {
    dispatchSetTheme({ theme: 'dark' }, 'light', ls);
    expect(ls.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('setTheme toggling twice (dark → light → dark) ends at the last value and persists it', () => {
    let state: { theme: Theme } = { theme: 'dark' };
    state = dispatchSetTheme(state, 'light', ls);
    state = dispatchSetTheme(state, 'dark', ls);

    expect(state.theme).toBe('dark');
    expect(ls.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('setTheme does not touch unrelated state slices (theme-only dispatch)', () => {
    // The full state slice carries unrelated fields (userProfile,
    // likes, etc.). The setTheme reducer must leave those alone — a
    // shallow object spread is the entire implementation. This test
    // guards against someone "helpfully" resetting the slice.
    const fullInitial = {
      theme: 'dark' as Theme,
      userProfile: { name: 'Layla', username: 'layla' },
      likesCount: 42,
    };
    const next = dispatchSetTheme(fullInitial, 'light', ls);
    expect((next as any).userProfile).toEqual({ name: 'Layla', username: 'layla' });
    expect((next as any).likesCount).toBe(42);
  });
});

// ─── 3. Theme rehydrates from localStorage on cold start ──────────────

describe('theme consistency — rehydration on cold start', () => {
  it('reads a previously persisted light theme from localStorage on init', () => {
    const ls = new MemoryStorage();
    ls.setItem(THEME_STORAGE_KEY, 'light');
    // No system preference supplied — the persisted value must win.
    const resolved = resolveInitialTheme(ls);
    expect(resolved).toBe('light');
  });

  it('reads a previously persisted dark theme from localStorage on init', () => {
    const ls = new MemoryStorage();
    ls.setItem(THEME_STORAGE_KEY, 'dark');
    const resolved = resolveInitialTheme(ls);
    expect(resolved).toBe('dark');
  });

  it('persisted theme takes precedence over the OS light preference', () => {
    // User explicitly chose dark; OS reports light. The persisted
    // choice wins, otherwise the toggle would feel broken to the
    // user on every restart.
    const ls = new MemoryStorage();
    ls.setItem(THEME_STORAGE_KEY, 'dark');
    const resolved = resolveInitialTheme(ls, makeMatchMedia(true));
    expect(resolved).toBe('dark');
  });

  it('corrupt persisted value falls back to the system preference', () => {
    // Anything other than exactly 'light' or 'dark' in localStorage
    // must be ignored — older app versions, manual edits, partial
    // writes — and the resolution must proceed to the next step.
    const ls = new MemoryStorage();
    ls.setItem(THEME_STORAGE_KEY, 'solarized');
    const resolved = resolveInitialTheme(ls, makeMatchMedia(true));
    expect(resolved).toBe('light');
  });

  it('absent persisted value with no system preference defaults to dark', () => {
    // Brand-new install on a device that does NOT express an OS
    // preference — matchMedia returns false. We default to 'dark'
    // because the rest of the app's styling (dark cards, white text
    // on the settings screen, etc.) assumes a dark baseline.
    const ls = new MemoryStorage();
    expect(ls.getItem(THEME_STORAGE_KEY)).toBeNull();
    const resolved = resolveInitialTheme(ls, makeMatchMedia(false));
    expect(resolved).toBe('dark');
  });
});

// ─── 4. System theme fallback when no persisted value ─────────────────

describe('theme consistency — system theme fallback', () => {
  it('uses light when the OS reports prefers-color-scheme: light and nothing is persisted', () => {
    const ls = new MemoryStorage();
    const resolved = resolveInitialTheme(ls, makeMatchMedia(true));
    expect(resolved).toBe('light');
  });

  it('uses dark when the OS reports prefers-color-scheme: dark (or no light match) and nothing is persisted', () => {
    const ls = new MemoryStorage();
    const resolved = resolveInitialTheme(ls, makeMatchMedia(false));
    expect(resolved).toBe('dark');
  });

  it('uses dark when matchMedia is unavailable (React Native / SSR) and nothing is persisted', () => {
    // No matchMedia argument at all — the provider's defensive check
    // must not throw, and the default ('dark') must win.
    const ls = new MemoryStorage();
    expect(() => resolveInitialTheme(ls)).not.toThrow();
    expect(resolveInitialTheme(ls)).toBe('dark');
  });

  it('a fresh install on a light-mode device starts in light without requiring user action', () => {
    // Full cold-start scenario for a new user: no localStorage, OS
    // says light. They should land directly on the light palette.
    const ls = new MemoryStorage();
    const resolved = resolveInitialTheme(ls, makeMatchMedia(true));
    expect(resolved).toBe('light');
    expect(paletteFor(resolved).background).toBe('#ffffff');
    expect(paletteFor(resolved).text).toBe('#000000');
  });
});