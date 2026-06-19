// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/HomeScreen.test.ts
//
// HomeScreen pure-logic snapshot tests. The component delegates the
// screen-shell decisions — header brand, empty-state copy, the
// unread-badge label, and the two header action routes — to a sidecar
// utils module (`app/(tabs)/home.utils.ts`) so those rules can be
// exercised without spinning up React Native, expo-router, or the
// AppContext provider. These tests pin every value the user actually
// sees on the Home / Feed tab so a refactor cannot silently change
// the screen shell.
//
// Coverage:
//   1. Header brand (the literal "Ahlan" string)
//   2. Empty-state copy (loading / "No posts yet" / "Welcome to Ahlan!")
//   3. Unread badge (truncation to "9+", zero handling, non-numeric input)
//   4. Header action targets (/notifications and /messages)

import {
    HOME_EMPTY_FOLLOWING_BODY,
    HOME_EMPTY_FOLLOWING_TITLE,
    HOME_EMPTY_NEW_USER_BODY,
    HOME_EMPTY_NEW_USER_TITLE,
    HOME_HEADER_ACTIONS,
    HOME_HEADER_BRAND,
    UNREAD_BADGE_MAX,
    getHomeEmptyState,
    getHomeHeaderTarget,
    getUnreadBadgeLabel,
} from '../../app/(tabs)/home.utils';

// ---------------------------------------------------------------------------
// 1. Header brand
// ---------------------------------------------------------------------------

describe('HomeScreen – header brand', () => {
    it('renders the literal brand word "Ahlan" in the header', () => {
        // The component uses a custom DancingScript font but the
        // displayed string is the same canonical brand word the rest
        // of the app uses.
        expect(HOME_HEADER_BRAND).toBe('Ahlan');
    });

    it('the brand is a non-empty string with no surrounding whitespace', () => {
        // A regression guard against accidental " Ahlan" / "Ahlan\n"
        // typos in the constant that would push whitespace into the
        // header.
        expect(typeof HOME_HEADER_BRAND).toBe('string');
        expect(HOME_HEADER_BRAND).toBe(HOME_HEADER_BRAND.trim());
        expect(HOME_HEADER_BRAND.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// 2. Empty-state copy
// ---------------------------------------------------------------------------

describe('HomeScreen – empty-state copy', () => {
    it('returns the loading sentinel while the initial feed fetch is in flight', () => {
        // The component renders the post-skeleton stack during the
        // first load and skips both empty-state branches entirely.
        const state = getHomeEmptyState(true, false);
        expect(state.kind).toBe('loading');
    });

    it('returns the "No posts yet" copy when the user follows at least one account', () => {
        const state = getHomeEmptyState(false, true);
        expect(state).toEqual({
            kind: 'following-no-posts',
            title: HOME_EMPTY_FOLLOWING_TITLE,
            body: HOME_EMPTY_FOLLOWING_BODY,
        });
    });

    it('the "No posts yet" copy is stable and non-empty', () => {
        expect(HOME_EMPTY_FOLLOWING_TITLE).toBe('No posts yet');
        expect(HOME_EMPTY_FOLLOWING_BODY.length).toBeGreaterThan(0);
        expect(HOME_EMPTY_FOLLOWING_BODY).toContain('Check back later');
    });

    it('returns the "Welcome to Ahlan!" copy when the viewer follows nobody yet', () => {
        const state = getHomeEmptyState(false, false);
        expect(state).toEqual({
            kind: 'new-user',
            title: HOME_EMPTY_NEW_USER_TITLE,
            body: HOME_EMPTY_NEW_USER_BODY,
        });
    });

    it('the "Welcome to Ahlan!" copy is stable and non-empty', () => {
        expect(HOME_EMPTY_NEW_USER_TITLE).toBe('Welcome to Ahlan!');
        expect(HOME_EMPTY_NEW_USER_BODY).toBe('Follow users to build your feed.');
    });

    it('the two empty states are mutually exclusive in body copy', () => {
        // Belt-and-braces: make sure nobody accidentally wires the
        // following copy into the new-user branch or vice versa.
        expect(HOME_EMPTY_FOLLOWING_BODY).not.toBe(HOME_EMPTY_NEW_USER_BODY);
        expect(HOME_EMPTY_FOLLOWING_TITLE).not.toBe(HOME_EMPTY_NEW_USER_TITLE);
    });

    it('returns the loading sentinel even when hasFollows is true', () => {
        // The component short-circuits on `isLoading` first; the
        // hasFollows flag must not leak through during the skeleton
        // render.
        const state = getHomeEmptyState(true, true);
        expect(state.kind).toBe('loading');
    });
});

// ---------------------------------------------------------------------------
// 3. Unread badge
// ---------------------------------------------------------------------------

describe('HomeScreen – unread badge label', () => {
    it('renders "0" for the zero count (no badge content shown)', () => {
        // The component wraps the badge in a conditional, but if the
        // count is ever passed through directly (e.g. during a hot
        // reload of state) it should never read as a non-zero number.
        expect(getUnreadBadgeLabel(0)).toBe('0');
    });

    it('renders the literal count for values from 1 up to the max', () => {
        for (let n = 1; n <= UNREAD_BADGE_MAX; n++) {
            expect(getUnreadBadgeLabel(n)).toBe(String(n));
        }
    });

    it('renders "9+" for any count above the max', () => {
        expect(getUnreadBadgeLabel(10)).toBe('9+');
        expect(getUnreadBadgeLabel(42)).toBe('9+');
        expect(getUnreadBadgeLabel(9_999)).toBe('9+');
    });

    it('treats negative values as zero (defensive against underflow)', () => {
        expect(getUnreadBadgeLabel(-1)).toBe('0');
        expect(getUnreadBadgeLabel(-99)).toBe('0');
    });

    it('treats non-finite or non-number input as zero', () => {
        // The component stores these counts in component state; the
        // helper is the boundary the test pins.
        expect(getUnreadBadgeLabel(NaN)).toBe('0');
        expect(getUnreadBadgeLabel(Infinity)).toBe('0');
        expect(getUnreadBadgeLabel(-Infinity)).toBe('0');
        expect(getUnreadBadgeLabel(null)).toBe('0');
        expect(getUnreadBadgeLabel(undefined)).toBe('0');
        // @ts-expect-error – exercising the runtime guard
        expect(getUnreadBadgeLabel('5')).toBe('0');
    });

    it('truncates fractional counts to their integer part', () => {
        // The component never produces fractional counts, but the
        // helper is the boundary so we lock the rounding behaviour.
        expect(getUnreadBadgeLabel(1.9)).toBe('1');
        expect(getUnreadBadgeLabel(9.4)).toBe('9');
        expect(getUnreadBadgeLabel(9.9)).toBe('9');
    });

    it('exposes a stable UNREAD_BADGE_MAX constant', () => {
        // The component hard-codes the literal 9; the helper exposes
        // the same number as a named constant. If a future refactor
        // changes one without the other the test will catch it.
        expect(UNREAD_BADGE_MAX).toBe(9);
    });
});

// ---------------------------------------------------------------------------
// 4. Header action targets
// ---------------------------------------------------------------------------

describe('HomeScreen – header action navigation targets', () => {
    it('exposes exactly two header actions: notifications and messages', () => {
        // The screen renders a bell icon and a send icon in the top
        // right; there are no other action slots. Lock the count and
        // the keys so a refactor cannot accidentally drop or rename
        // one.
        expect(HOME_HEADER_ACTIONS).toHaveLength(2);
        const keys = HOME_HEADER_ACTIONS.map(a => a.key);
        expect(keys).toEqual(['notifications', 'messages']);
    });

    it('routes the bell icon to /notifications', () => {
        expect(getHomeHeaderTarget('notifications')).toBe('/notifications');
    });

    it('routes the send icon to /messages', () => {
        expect(getHomeHeaderTarget('messages')).toBe('/messages');
    });

    it('the two target routes are distinct', () => {
        const targets = HOME_HEADER_ACTIONS.map(a => a.target);
        expect(new Set(targets).size).toBe(targets.length);
    });

    it('every action declares its target as a non-empty string starting with /', () => {
        // expo-router uses leading-slash paths; this guards against
        // someone rewriting one of the constants to a bare "messages"
        // or "https://..." URL.
        for (const action of HOME_HEADER_ACTIONS) {
            expect(typeof action.target).toBe('string');
            expect(action.target.startsWith('/')).toBe(true);
            expect(action.target.length).toBeGreaterThan(1);
        }
    });
});
