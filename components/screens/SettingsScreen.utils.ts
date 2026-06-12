// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from SettingsScreen.tsx so the toggle, logout and
// section-header behaviour can be exercised in tests without rendering
// React Native components or pulling in the AppContext provider.

/**
 * Toggles a single boolean setting in a `Record<string, boolean>` map and
 * returns a new map (the SettingsScreen stores all toggles in immutable
 * state). A missing key is treated as `false`, so callers can omit defaults.
 */
export const toggleSetting = (
    settings: Record<string, boolean>,
    key: string,
): Record<string, boolean> => {
    if (typeof settings !== 'object' || settings === null) {
        return { [key]: true };
    }
    if (typeof key !== 'string' || key === '') {
        return { ...settings };
    }
    return {
        ...settings,
        [key]: !settings[key],
    };
};

/**
 * Resolves the next persisted value for a named setting without mutating
 * the previous value. Useful when the UI needs to decide whether to
 * `updateProfile` based on the toggled state.
 */
export const nextSettingValue = (
    settings: Record<string, boolean>,
    key: string,
): boolean => {
    if (typeof settings !== 'object' || settings === null) {
        return true;
    }
    return !Boolean(settings[key]);
};

/**
 * Confirms the user's intent to delete their account. The native Settings
 * screen uses `window.confirm`; the web build calls this with the
 * `isConfirmed` argument directly. Returns `true` only when the caller
 * has explicitly confirmed — never on `undefined`.
 */
export const shouldProceedWithDeletion = (isConfirmed: unknown): boolean => {
    return isConfirmed === true;
};

/**
 * Stable list of section headers rendered by the SettingsScreen, in
 * render order. Keeping the array in one place keeps the test and the
 * component perfectly aligned.
 */
export const SETTINGS_SECTIONS = [
    'Account',
    'Legal & Information',
    'Danger Zone',
] as const;

export type SettingsSection = typeof SETTINGS_SECTIONS[number];

/**
 * Returns true when a section header is recognised as one of the
 * SettingsScreen's renderable sections. The function is intentionally
 * case-sensitive — the UI renders these exact strings.
 */
export const isSettingsSection = (header: unknown): header is SettingsSection => {
    if (typeof header !== 'string') return false;
    return (SETTINGS_SECTIONS as readonly string[]).includes(header);
};

/**
 * Resolves the action label rendered next to each account-level entry.
 * Centralised so the Log Out and Delete buttons share the same wording
 * across the UI and the test suite.
 */
export const LOGOUT_LABEL = 'Log Out';
export const DELETE_LABEL = 'Delete';
