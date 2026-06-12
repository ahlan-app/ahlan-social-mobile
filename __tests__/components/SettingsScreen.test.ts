// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/SettingsScreen.test.ts
// SettingsScreen pure-logic tests. The component delegates toggle updates,
// the delete-confirmation gate, section-header ordering, and the account
// action labels to a sidecar utils module so they can be exercised without
// rendering React Native or pulling in the AppContext provider.
//
// Coverage:
//   1. Toggle switches (state map transitions)
//   2. Logout action wiring (delete-confirmation gate)
//   3. Section headers (render order and membership)
//   4. Account action labels (Log Out / Delete)

import {
    DELETE_LABEL,
    LOGOUT_LABEL,
    SETTINGS_SECTIONS,
    isSettingsSection,
    nextSettingValue,
    shouldProceedWithDeletion,
    toggleSetting,
} from '../../components/screens/SettingsScreen.utils';

// ---------------------------------------------------------------------------
// 1. Toggle switches
// ---------------------------------------------------------------------------

describe('SettingsScreen – toggle switches', () => {
    it('flips a previously off setting to on', () => {
        const before = { notifications: false, sounds: true };
        const after = toggleSetting(before, 'notifications');

        expect(after.notifications).toBe(true);
        // Other settings are preserved.
        expect(after.sounds).toBe(true);
    });

    it('flips a previously on setting to off', () => {
        const before = { notifications: true };
        const after = toggleSetting(before, 'notifications');

        expect(after.notifications).toBe(false);
    });

    it('returns a new object and never mutates the previous state', () => {
        const before = { notifications: true };
        const after = toggleSetting(before, 'notifications');

        expect(after).not.toBe(before);
        expect(before.notifications).toBe(true);
    });

    it('treats a missing key as off and toggles it on', () => {
        const before: Record<string, boolean> = {};
        const after = toggleSetting(before, 'darkMode');

        expect(after.darkMode).toBe(true);
    });

    it('exposes the next persisted value via nextSettingValue', () => {
        expect(nextSettingValue({ notifications: false }, 'notifications')).toBe(true);
        expect(nextSettingValue({ notifications: true }, 'notifications')).toBe(false);
        expect(nextSettingValue({}, 'darkMode')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 2. Logout action (delete-confirmation gate)
// ---------------------------------------------------------------------------

describe('SettingsScreen – logout / delete action', () => {
    it('proceeds with the destructive action only when the user explicitly confirms', () => {
        // Simulates window.confirm returning true / false from the browser.
        expect(shouldProceedWithDeletion(true)).toBe(true);
        expect(shouldProceedWithDeletion(false)).toBe(false);
    });

    it('refuses to proceed on falsy, null, or undefined confirmations', () => {
        // window.confirm may return `null` on some browsers when the user
        // dismisses the dialog — the deletion must be aborted.
        expect(shouldProceedWithDeletion(null)).toBe(false);
        expect(shouldProceedWithDeletion(undefined)).toBe(false);
        expect(shouldProceedWithDeletion(0)).toBe(false);
        expect(shouldProceedWithDeletion('')).toBe(false);
    });

    it('treats truthy non-boolean values strictly — only `true` proceeds', () => {
        // Defensive: an attacker who somehow pipes a truthy object into the
        // confirmation flow should still be denied.
        expect(shouldProceedWithDeletion('yes')).toBe(false);
        expect(shouldProceedWithDeletion(1)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 3. Section headers
// ---------------------------------------------------------------------------

describe('SettingsScreen – section headers', () => {
    it('renders exactly three sections in a stable order', () => {
        expect(SETTINGS_SECTIONS).toEqual([
            'Account',
            'Legal & Information',
            'Danger Zone',
        ]);
    });

    it('recognises each renderable section header', () => {
        expect(isSettingsSection('Account')).toBe(true);
        expect(isSettingsSection('Legal & Information')).toBe(true);
        expect(isSettingsSection('Danger Zone')).toBe(true);
    });

    it('rejects unknown, empty, and non-string headers', () => {
        expect(isSettingsSection('account')).toBe(false); // case-sensitive
        expect(isSettingsSection('Notifications')).toBe(false);
        expect(isSettingsSection('')).toBe(false);
        expect(isSettingsSection(undefined)).toBe(false);
        expect(isSettingsSection(null)).toBe(false);
        expect(isSettingsSection(42)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 4. Account action labels
// ---------------------------------------------------------------------------

describe('SettingsScreen – account action labels', () => {
    it('exposes stable Log Out and Delete button labels', () => {
        expect(LOGOUT_LABEL).toBe('Log Out');
        expect(DELETE_LABEL).toBe('Delete');
    });

    it('keeps the labels distinct so a regression in one does not collapse both buttons', () => {
        expect(LOGOUT_LABEL).not.toBe(DELETE_LABEL);
    });
});
