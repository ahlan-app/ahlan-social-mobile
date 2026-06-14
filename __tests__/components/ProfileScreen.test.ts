// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/ProfileScreen.test.ts
// ProfileScreen pure-logic tests. The component delegates avatar source
// resolution, bio display, follower/following stat rendering, and the
// Edit Profile button label/target to a sidecar utils module so those
// rules can be exercised without spinning up React Native, expo-router,
// or the AppContext provider.
//
// Coverage:
//   1. Avatar rendering (source resolution + initials fallback)
//   2. Bio display (trimmed text vs null vs missing)
//   3. Follower / following counts (compact formatter + stat columns)
//   4. Edit button (label, target, enabled state)

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
// 1. Avatar rendering
// ---------------------------------------------------------------------------

describe('ProfileScreen – avatar rendering', () => {
    it('passes through a non-empty profilePicture URL unchanged', () => {
        const profile = { username: 'amelia', profilePicture: 'https://cdn.example.com/a.png' };
        expect(resolveAvatarSource(profile)).toBe('https://cdn.example.com/a.png');
    });

    it('trims surrounding whitespace from the picture URL', () => {
        const profile = { username: 'amelia', profilePicture: '   https://cdn.example.com/a.png  ' };
        expect(resolveAvatarSource(profile)).toBe('https://cdn.example.com/a.png');
    });

    it('returns null for an empty / whitespace-only profilePicture', () => {
        // Supabase sometimes stores `""` for users that have never
        // uploaded a photo — the avatar must fall back to initials.
        expect(resolveAvatarSource({ username: 'a', profilePicture: '' })).toBeNull();
        expect(resolveAvatarSource({ username: 'a', profilePicture: '   ' })).toBeNull();
    });

    it('returns null when profilePicture is null, undefined, or non-string', () => {
        expect(resolveAvatarSource({ username: 'a', profilePicture: null })).toBeNull();
        expect(resolveAvatarSource({ username: 'a' })).toBeNull();
        // @ts-expect-error – exercising runtime guard
        expect(resolveAvatarSource({ username: 'a', profilePicture: 42 })).toBeNull();
    });

    it('returns null when the whole profile is missing or invalid', () => {
        expect(resolveAvatarSource(null)).toBeNull();
        expect(resolveAvatarSource(undefined)).toBeNull();
        // @ts-expect-error – exercising runtime guard
        expect(resolveAvatarSource('not-a-profile')).toBeNull();
    });

    it('derives initials from `name` when available (single word → first 2 letters)', () => {
        expect(getAvatarInitials({ username: 'amelia', name: 'Amelia' })).toBe('AM');
    });

    it('derives initials from `name` (two words → first letter of each)', () => {
        expect(getAvatarInitials({ username: 'amelia', name: 'Amelia Clarke' })).toBe('AC');
    });

    it('falls back to the username when `name` is missing', () => {
        expect(getAvatarInitials({ username: 'amelia' })).toBe('AM');
    });

    it('handles a missing or empty name/username by returning an empty string', () => {
        expect(getAvatarInitials(null)).toBe('');
        expect(getAvatarInitials({})).toBe('');
        expect(getAvatarInitials({ username: '', name: '' })).toBe('');
        expect(getAvatarInitials({ username: '   ', name: '   ' })).toBe('');
    });
});

// ---------------------------------------------------------------------------
// 2. Bio display
// ---------------------------------------------------------------------------

describe('ProfileScreen – bio display', () => {
    it('returns the original bio string (preserving inner whitespace)', () => {
        const profile = { username: 'a', bio: 'I build things.\nOften with coffee.' };
        // We expose the *original* string (component renders verbatim)
        // but the trim check rejects empty content — so the input is
        // preserved here.
        expect(getBioText(profile)).toBe('I build things.\nOften with coffee.');
    });

    it('returns a non-empty bio as-is', () => {
        const profile = { username: 'a', bio: 'Hello world' };
        expect(getBioText(profile)).toBe('Hello world');
    });

    it('returns null for an empty or whitespace-only bio', () => {
        expect(getBioText({ username: 'a', bio: '' })).toBeNull();
        expect(getBioText({ username: 'a', bio: '   \n\t  ' })).toBeNull();
    });

    it('returns null when the bio is null, undefined, or non-string', () => {
        expect(getBioText({ username: 'a', bio: null })).toBeNull();
        expect(getBioText({ username: 'a' })).toBeNull();
        // @ts-expect-error – exercising runtime guard
        expect(getBioText({ username: 'a', bio: 42 })).toBeNull();
    });

    it('hasBio agrees with getBioText in every case', () => {
        expect(hasBio({ username: 'a', bio: 'real' })).toBe(true);
        expect(hasBio({ username: 'a', bio: '' })).toBe(false);
        expect(hasBio({ username: 'a', bio: '   ' })).toBe(false);
        expect(hasBio({ username: 'a' })).toBe(false);
        expect(hasBio(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 3. Follower / following counts
// ---------------------------------------------------------------------------

describe('ProfileScreen – follower / following counts', () => {
    it('formats small counts as exact integers', () => {
        expect(formatStatCount(0)).toBe('0');
        expect(formatStatCount(1)).toBe('1');
        expect(formatStatCount(42)).toBe('42');
        expect(formatStatCount(999)).toBe('999');
    });

    it('formats thousands with a single decimal, dropping trailing .0', () => {
        expect(formatStatCount(1_000)).toBe('1K');
        expect(formatStatCount(1_234)).toBe('1.2K');
        expect(formatStatCount(12_345)).toBe('12.3K');
        expect(formatStatCount(999_999)).toBe('1000K'); // exactly 1M → handled in the M branch
    });

    it('formats millions with a single decimal, dropping trailing .0', () => {
        expect(formatStatCount(1_000_000)).toBe('1M');
        expect(formatStatCount(1_234_567)).toBe('1.2M');
        expect(formatStatCount(12_500_000)).toBe('12.5M');
    });

    it('clamps negative values to zero rather than formatting a minus sign', () => {
        expect(formatStatCount(-5)).toBe('0');
        expect(formatStatCount(-1_234)).toBe('0');
    });

    it('treats non-finite or non-number input as zero', () => {
        expect(formatStatCount(NaN)).toBe('0');
        expect(formatStatCount(Infinity)).toBe('0');
        expect(formatStatCount(-Infinity)).toBe('0');
        // The signature allows `null | undefined`, so only the string
        // case needs the runtime-guard escape hatch.
        expect(formatStatCount(null)).toBe('0');
        expect(formatStatCount(undefined)).toBe('0');
        // @ts-expect-error – exercising runtime guard
        expect(formatStatCount('123')).toBe('0');
    });

    it('exposes the three stat columns in render order: Posts, Followers, Following', () => {
        expect(PROFILE_STAT_COLUMNS).toEqual(['Posts', 'Followers', 'Following']);
    });

    it('returns the matching formatted value for each stat column', () => {
        const stats = { posts: 12, followers: 1_234, following: 3_500_000 };
        expect(getStatCell(stats, 'Posts')).toEqual({ value: '12', label: 'Posts' });
        expect(getStatCell(stats, 'Followers')).toEqual({ value: '1.2K', label: 'Followers' });
        expect(getStatCell(stats, 'Following')).toEqual({ value: '3.5M', label: 'Following' });
    });

    it('fills in zero for any stat the caller omits', () => {
        expect(getStatCell({}, 'Posts').value).toBe('0');
        expect(getStatCell({}, 'Followers').value).toBe('0');
        expect(getStatCell({}, 'Following').value).toBe('0');
    });
});

// ---------------------------------------------------------------------------
// 4. Edit button
// ---------------------------------------------------------------------------

describe('ProfileScreen – edit button', () => {
    it('exposes a stable label and target so the component and the test never drift', () => {
        // Two separate symbols — assert both, and assert they are
        // distinct so a regression can't collapse them into the same
        // value.
        expect(EDIT_PROFILE_LABEL).toBe('Edit Profile');
        expect(EDIT_PROFILE_TARGET).toBe('/settings');
        expect(EDIT_PROFILE_LABEL).not.toBe(EDIT_PROFILE_TARGET);
    });

    it('renders the button as enabled when the profile has a username', () => {
        const props = getEditButtonProps({ username: 'amelia' });
        expect(props).toEqual({
            label: 'Edit Profile',
            target: '/settings',
            isEnabled: true,
        });
    });

    it('renders the button as enabled even if the profile has no id yet', () => {
        // The Edit button stays available — the route is `/settings`
        // which is reachable without a numeric id.
        const props = getEditButtonProps({ username: 'amelia' });
        expect(props.isEnabled).toBe(true);
    });

    it('disables the button when the profile is missing or has no username', () => {
        expect(getEditButtonProps(null).isEnabled).toBe(false);
        expect(getEditButtonProps(undefined).isEnabled).toBe(false);
        expect(getEditButtonProps({}).isEnabled).toBe(false);
        expect(getEditButtonProps({ username: '' }).isEnabled).toBe(false);
        expect(getEditButtonProps({ username: '   ' }).isEnabled).toBe(false);
    });

    it('keeps the label and target stable regardless of enabled state', () => {
        // The component's `{!userProfile ? null : <Edit />}` guard hides
        // the button entirely when disabled, but the props it would
        // render must still resolve to the canonical label/target so
        // swapping the guard for a disabled button does not silently
        // change the wording.
        const enabled = getEditButtonProps({ username: 'a' });
        const disabled = getEditButtonProps(null);
        expect(enabled.label).toBe(disabled.label);
        expect(enabled.target).toBe(disabled.target);
    });
});
