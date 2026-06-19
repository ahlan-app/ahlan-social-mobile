// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/ProfileScreen.snapshot.test.ts
//
// ProfileScreen snapshot baseline tests. The component delegates
// avatar-source resolution, bio display, follower/following stat
// rendering, and the Edit Profile button label/target to a sidecar
// utils module (`app/(tabs)/profile.utils.ts`). The existing
// `__tests__/components/ProfileScreen.test.ts` already covers the
// behaviour of every helper in detail; this file pins the *public
// surface* of the utils module so any future refactor cannot
// accidentally drop a symbol, reorder a constant, or change a
// public-type contract without breaking the build.
//
// Coverage:
//   1. Public symbol inventory (every export the screen depends on)
//   2. Constant values (labels, targets, column order)
//   3. Type contracts (return shapes from each helper)
//   4. Cross-helper invariants (getStatCell vs PROFILE_STAT_COLUMNS,
//      getEditButtonProps vs its label/target constants)

import * as ProfileUtils from '../../app/(tabs)/profile.utils';
import {
    EDIT_PROFILE_LABEL,
    EDIT_PROFILE_TARGET,
    PROFILE_STAT_COLUMNS,
    formatStatCount,
    getAvatarInitials,
    getBioText,
    getEditButtonProps,
    getStatCell,
    hasBio,
    resolveAvatarSource,
} from '../../app/(tabs)/profile.utils';

// ---------------------------------------------------------------------------
// 1. Public symbol inventory
// ---------------------------------------------------------------------------

describe('ProfileScreen utils – public symbol inventory', () => {
    it('exports the avatar helpers (resolveAvatarSource, getAvatarInitials)', () => {
        expect(typeof ProfileUtils.resolveAvatarSource).toBe('function');
        expect(typeof ProfileUtils.getAvatarInitials).toBe('function');
    });

    it('exports the bio helpers (getBioText, hasBio)', () => {
        expect(typeof ProfileUtils.getBioText).toBe('function');
        expect(typeof ProfileUtils.hasBio).toBe('function');
    });

    it('exports the stat helpers (formatStatCount, getStatCell) and the column constant', () => {
        expect(typeof ProfileUtils.formatStatCount).toBe('function');
        expect(typeof ProfileUtils.getStatCell).toBe('function');
        expect(ProfileUtils.PROFILE_STAT_COLUMNS).toBeDefined();
    });

    it('exports the Edit button constants and the props helper', () => {
        expect(ProfileUtils.EDIT_PROFILE_LABEL).toBeDefined();
        expect(ProfileUtils.EDIT_PROFILE_TARGET).toBeDefined();
        expect(typeof ProfileUtils.getEditButtonProps).toBe('function');
    });
});

// ---------------------------------------------------------------------------
// 2. Constant values
// ---------------------------------------------------------------------------

describe('ProfileScreen utils – constant values', () => {
    it('the stat columns are exactly Posts, Followers, Following in that order', () => {
        // The component renders the three stat cells in the order
        // given by PROFILE_STAT_COLUMNS. Locking the order here
        // catches any accidental reorder during refactors.
        expect(PROFILE_STAT_COLUMNS).toEqual(['Posts', 'Followers', 'Following']);
    });

    it('the Edit button label and target are stable canonical strings', () => {
        expect(EDIT_PROFILE_LABEL).toBe('Edit Profile');
        expect(EDIT_PROFILE_TARGET).toBe('/settings');
    });

    it('the Edit button label and target are distinct (no accidental collapse)', () => {
        expect(EDIT_PROFILE_LABEL).not.toBe(EDIT_PROFILE_TARGET);
    });

    it('the Edit button target is a leading-slash expo-router path', () => {
        expect(EDIT_PROFILE_TARGET.startsWith('/')).toBe(true);
        expect(EDIT_PROFILE_TARGET.length).toBeGreaterThan(1);
    });

    it('PROFILE_STAT_COLUMNS has no duplicates', () => {
        const set = new Set<string>(PROFILE_STAT_COLUMNS);
        expect(set.size).toBe(PROFILE_STAT_COLUMNS.length);
    });

    it('PROFILE_STAT_COLUMNS has exactly three columns', () => {
        expect(PROFILE_STAT_COLUMNS).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// 3. Type contracts
// ---------------------------------------------------------------------------

describe('ProfileScreen utils – type contracts', () => {
    it('resolveAvatarSource returns a string-or-null shape', () => {
        const hit = resolveAvatarSource({ username: 'a', profilePicture: 'https://x' });
        const miss = resolveAvatarSource({ username: 'a' });
        expect(typeof hit).toBe('string');
        expect(miss).toBeNull();
    });

    it('getAvatarInitials returns a string (possibly empty)', () => {
        expect(typeof getAvatarInitials({ username: 'amelia', name: 'Amelia' })).toBe('string');
        expect(typeof getAvatarInitials(null)).toBe('string');
    });

    it('getBioText returns a string-or-null shape', () => {
        expect(getBioText({ username: 'a', bio: 'real' })).toBe('real');
        expect(getBioText({ username: 'a' })).toBeNull();
    });

    it('hasBio is a boolean', () => {
        expect(typeof hasBio({ username: 'a', bio: 'real' })).toBe('boolean');
        expect(typeof hasBio({ username: 'a' })).toBe('boolean');
    });

    it('formatStatCount always returns a string', () => {
        const samples: Array<number | null | undefined> = [0, 1, 999, 1_000, 1_234_567, null, undefined, NaN];
        for (const s of samples) {
            expect(typeof formatStatCount(s)).toBe('string');
        }
    });

    it('getStatCell returns a { value, label } object where label is one of the columns', () => {
        const cell = getStatCell({ posts: 1, followers: 2, following: 3 }, 'Posts');
        expect(cell).toEqual({ value: '1', label: 'Posts' });
        expect(PROFILE_STAT_COLUMNS).toContain(cell.label);
    });

    it('getStatCell covers every column in PROFILE_STAT_COLUMNS', () => {
        // The component maps over the column list to render the
        // cells, so getStatCell must accept every member of that
        // list as a valid input. We exercise each one.
        for (const column of PROFILE_STAT_COLUMNS) {
            const cell = getStatCell({}, column);
            expect(cell.label).toBe(column);
        }
    });

    it('getEditButtonProps returns { label, target, isEnabled } with the canonical label/target', () => {
        const props = getEditButtonProps({ username: 'a' });
        expect(props).toEqual({
            label: EDIT_PROFILE_LABEL,
            target: EDIT_PROFILE_TARGET,
            isEnabled: true,
        });
    });
});

// ---------------------------------------------------------------------------
// 4. Cross-helper invariants
// ---------------------------------------------------------------------------

describe('ProfileScreen utils – cross-helper invariants', () => {
    it('getEditButtonProps keeps the label and target stable regardless of enabled state', () => {
        const enabled = getEditButtonProps({ username: 'a' });
        const disabled = getEditButtonProps(null);
        expect(enabled.label).toBe(disabled.label);
        expect(enabled.target).toBe(disabled.target);
    });

    it('getEditButtonProps.isEnabled is true exactly when a non-empty username is present', () => {
        const truthy: Array<Parameters<typeof getEditButtonProps>[0]> = [
            { username: 'a' },
            { username: 'amelia' },
            { username: 'a', name: 'A', bio: 'hi' },
        ];
        for (const input of truthy) {
            expect(getEditButtonProps(input).isEnabled).toBe(true);
        }
        const falsy: Array<Parameters<typeof getEditButtonProps>[0]> = [
            null,
            undefined,
            {},
            { username: '' },
            { username: '   ' },
        ];
        for (const input of falsy) {
            expect(getEditButtonProps(input).isEnabled).toBe(false);
        }
    });

    it('hasBio agrees with getBioText for every input shape', () => {
        // The component uses one of the two interchangeably; this
        // guards against a future refactor that drifts them apart.
        const samples: Array<Parameters<typeof getBioText>[0]> = [
            null,
            undefined,
            {},
            { username: 'a' },
            { username: 'a', bio: '' },
            { username: 'a', bio: '   ' },
            { username: 'a', bio: 'real' },
            { username: 'a', bio: 'multi\nline' },
        ];
        for (const sample of samples) {
            const text = getBioText(sample);
            expect(hasBio(sample)).toBe(text !== null);
        }
    });

    it('resolveAvatarSource and getAvatarInitials are not redundant: a valid URL still has initials', () => {
        // The component renders initials *inside* the avatar bubble
        // as a fallback layer; even when the URL is present the
        // initials helper must still return a sensible string.
        const profile = {
            username: 'amelia',
            name: 'Amelia Clarke',
            profilePicture: 'https://cdn.example.com/a.png',
        };
        expect(resolveAvatarSource(profile)).toBe('https://cdn.example.com/a.png');
        expect(getAvatarInitials(profile)).toBe('AC');
    });

    it('formatStatCount never returns a value with a leading minus sign for any numeric input', () => {
        const samples = [-1, -999, -1_000, 0, 1, 999, 1_000, 1_234_567];
        for (const s of samples) {
            expect(formatStatCount(s).startsWith('-')).toBe(false);
        }
    });
});
