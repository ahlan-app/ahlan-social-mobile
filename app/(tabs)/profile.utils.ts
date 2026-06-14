// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from app/(tabs)/profile.tsx so the avatar fallback,
// bio display, follower/following stat rendering, and the Edit Profile
// button label/target can be exercised in tests without spinning up React
// Native, expo-router, or the AppContext provider.
//
// Keeping this logic in a sidecar file mirrors the convention used by
// SettingsScreen and LoginScreen — it lets the test suite lock down the
// behaviour the UI relies on, and gives the component a single, shared
// source of truth.

/**
 * Minimal shape of the user profile fields the ProfileScreen reads from
 * its `useApp()` context. The real `UserProfile` type contains many more
 * fields; this subset is what every helper here actually needs.
 */
export interface ProfileScreenProfile {
    id?: string;
    username: string;
    name?: string;
    bio?: string | null;
    profilePicture?: string | null;
    isVerified?: boolean;
}

// ---------------------------------------------------------------------------
// 1. Avatar rendering
// ---------------------------------------------------------------------------

/**
 * Resolves the image source the avatar component should render. Returns
 * `null` when the profile has no usable picture so the caller can fall
 * back to the initials-based avatar (which `UserAvatar` already handles
 * internally — we just have to decide whether to pass a URL at all).
 *
 * Empty strings and pure-whitespace strings are treated the same as
 * `null`/`undefined` because Supabase sometimes returns `""` for
 * users that have never uploaded a photo.
 */
export const resolveAvatarSource = (
    profile: Partial<ProfileScreenProfile> | null | undefined,
): string | null => {
    if (!profile || typeof profile !== 'object') return null;
    const pic = profile.profilePicture;
    if (typeof pic !== 'string') return null;
    const trimmed = pic.trim();
    if (trimmed === '') return null;
    return trimmed;
};

/**
 * Returns the two-letter initials shown inside the avatar fallback
 * bubble. The ProfileScreen delegates the actual rendering to
 * `UserAvatar`, but the initials are derived from `name` (preferred) or
 * `username` so the test can pin down the exact fallback string.
 */
export const getAvatarInitials = (
    profile: Partial<ProfileScreenProfile> | null | undefined,
): string => {
    if (!profile || typeof profile !== 'object') return '';
    const source = (profile.name && profile.name.trim()) || (profile.username && profile.username.trim()) || '';
    if (source === '') return '';

    // Split on any whitespace and pick the first letter of up to two
    // words. This matches what the existing UserAvatar component does
    // for the `name`-based fallback path.
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
    return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
};

// ---------------------------------------------------------------------------
// 2. Bio display
// ---------------------------------------------------------------------------

/**
 * Returns the bio text the ProfileScreen should render inside the
 * header. The component guards with `{userProfile.bio ? <Bio /> : null}`
 * — this helper centralises the same "is there anything to show?"
 * decision and trims stray whitespace from copy-pasted bios.
 *
 * Returns `null` when there is no bio to display so the caller can
 * short-circuit with a single nullish check.
 */
export const getBioText = (
    profile: Partial<ProfileScreenProfile> | null | undefined,
): string | null => {
    if (!profile || typeof profile !== 'object') return null;
    if (typeof profile.bio !== 'string') return null;
    const trimmed = profile.bio.trim();
    if (trimmed === '') return null;
    return profile.bio;
};

/**
 * Type guard mirroring the `{userProfile.bio ? … : null}` branch in the
 * component. Useful for components that want to call `getBioText` only
 * when this returns `true`.
 */
export const hasBio = (
    profile: Partial<ProfileScreenProfile> | null | undefined,
): boolean => getBioText(profile) !== null;

// ---------------------------------------------------------------------------
// 3. Follower / following counts
// ---------------------------------------------------------------------------

/**
 * Compact-format a stat count for display in the header row. The UI
 * shows raw integers today, but the helper is in place so the test can
 * pin down the threshold logic if/when the component starts abbreviating
 * large numbers (e.g. `1234` → `"1.2K"`). The current callers pass the
 * result straight into a `<Text>` so we keep it stringly-typed.
 *
 * Rules:
 *   - non-finite / non-number → `"0"`
 *   - negative values are clamped to `0` (a follow count should never
 *     be negative, but defensive code in the UI treats it as zero)
 *   - < 1_000            → exact integer (`"0"`, `"42"`, `"999"`)
 *   - < 1_000_000        → `"<n.n>K"` with one decimal, trailing `.0` stripped
 *   - >= 1_000_000       → `"<n.n>M"` with one decimal, trailing `.0` stripped
 */
export const formatStatCount = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    const safe = Math.max(0, value);
    if (safe < 1_000) return Math.trunc(safe).toString();
    if (safe < 1_000_000) {
        const k = safe / 1_000;
        return `${trimTrailingZero(k.toFixed(1))}K`;
    }
    const m = safe / 1_000_000;
    return `${trimTrailingZero(m.toFixed(1))}M`;
};

const trimTrailingZero = (formatted: string): string => {
    if (formatted.endsWith('.0')) return formatted.slice(0, -2);
    return formatted;
};

/**
 * Describes the three stat columns the header renders, in display order
 * (Posts, Followers, Following). The component renders exactly these
 * three columns, so locking the order and labels in a test catches any
 * accidental reorder during refactors.
 */
export const PROFILE_STAT_COLUMNS = ['Posts', 'Followers', 'Following'] as const;
export type ProfileStatColumn = typeof PROFILE_STAT_COLUMNS[number];

export interface ProfileStats {
    posts: number;
    followers: number;
    following: number;
}

/**
 * Resolves the `[value, label]` pair rendered inside each stat column.
 * Centralised so the test can verify the label is stable ("Followers"
 * not "Follower", etc.) and the value is formatted with `formatStatCount`.
 */
export const getStatCell = (
    stats: Partial<ProfileStats>,
    column: ProfileStatColumn,
): { value: string; label: ProfileStatColumn } => {
    switch (column) {
        case 'Posts':
            return { value: formatStatCount(stats.posts), label: 'Posts' };
        case 'Followers':
            return { value: formatStatCount(stats.followers), label: 'Followers' };
        case 'Following':
            return { value: formatStatCount(stats.following), label: 'Following' };
    }
};

// ---------------------------------------------------------------------------
// 4. Edit button
// ---------------------------------------------------------------------------

/**
 * Describes the rendered Edit Profile button. The component always
 * pushes the user to `/settings` (the same target as the standalone
 * Settings icon in the header) — centralising the label and target
 * keeps both call sites aligned.
 */
export const EDIT_PROFILE_LABEL = 'Edit Profile';
export const EDIT_PROFILE_TARGET = '/settings';

export interface EditButtonProps {
    label: string;
    target: string;
    isEnabled: boolean;
}

/**
 * Resolves the props for the Edit Profile button. The button is hidden
 * when there is no logged-in user (`!userProfile` in the component),
 * which we surface here as `isEnabled: false` so the caller can apply
 * the same guard.
 */
export const getEditButtonProps = (
    profile: Partial<ProfileScreenProfile> | null | undefined,
): EditButtonProps => {
    const isEnabled = Boolean(profile && typeof profile.username === 'string' && profile.username.trim() !== '');
    return {
        label: EDIT_PROFILE_LABEL,
        target: EDIT_PROFILE_TARGET,
        isEnabled,
    };
};
