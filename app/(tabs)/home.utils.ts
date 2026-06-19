// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from app/(tabs)/index.tsx (the HomeFeedScreen
// component) so the screen-shell decisions — header brand, empty-state
// copy, and unread-badge text — can be exercised in tests without
// spinning up React Native, expo-router, or the AppContext provider.
//
// The screen renders two distinct empty states depending on whether the
// viewer follows anyone yet, and a single brand word in the header.
// Centralising both keeps the visible text stable across refactors and
// makes the "9+" unread-badge truncation testable in isolation.

/**
 * Brand word rendered in the screen header. The header uses a custom
 * `DancingScript_700Bold` font but the literal string is just `"Ahlan"`.
 * Centralising the constant lets the test pin the brand to one place.
 */
export const HOME_HEADER_BRAND = 'Ahlan' as const;

/**
 * Top-level copy of the empty state shown when the user follows at
 * least one account but nobody has posted yet. The component renders
 * this as the primary `<Text>` and a softer second line below it.
 */
export const HOME_EMPTY_FOLLOWING_TITLE = 'No posts yet' as const;
export const HOME_EMPTY_FOLLOWING_BODY =
  "The people you follow haven't posted anything yet. Check back later!" as const;

/**
 * Top-level copy of the empty state shown when the viewer follows
 * nobody yet. The component uses this as a soft onboarding nudge.
 */
export const HOME_EMPTY_NEW_USER_TITLE = 'Welcome to Ahlan!' as const;
export const HOME_EMPTY_NEW_USER_BODY = 'Follow users to build your feed.' as const;

/**
 * Description of one of the two empty states the screen can render.
 * `kind` discriminates the two branches in the component; `title` and
 * `body` are the literal strings shown to the user.
 */
export type HomeEmptyState =
  | { kind: 'following-no-posts'; title: string; body: string }
  | { kind: 'new-user'; title: string; body: string }
  | { kind: 'loading' };

/**
 * Picks which empty-state copy block the screen should render.
 *
 * - While the initial feed fetch is in flight the component renders
 *   the skeleton stack instead of any empty state, so we return
 *   `{ kind: 'loading' }` to signal "render nothing here".
 * - Once loading has finished we branch on `hasFollows`:
 *     * `true`  → "No posts yet" copy
 *     * `false` → "Welcome to Ahlan!" onboarding copy
 *
 * The `hasFollows` flag matches the component's own
 * `followedUsernames && followedUsernames.size > 0` check.
 */
export const getHomeEmptyState = (
  isLoading: boolean,
  hasFollows: boolean,
): HomeEmptyState => {
  if (isLoading) return { kind: 'loading' };
  if (hasFollows) {
    return {
      kind: 'following-no-posts',
      title: HOME_EMPTY_FOLLOWING_TITLE,
      body: HOME_EMPTY_FOLLOWING_BODY,
    };
  }
  return {
    kind: 'new-user',
    title: HOME_EMPTY_NEW_USER_TITLE,
    body: HOME_EMPTY_NEW_USER_BODY,
  };
};

/**
 * Label rendered inside the unread-count badge in the screen header.
 * The component always caps the visible number at `9` and renders the
 * literal string `'9+'` when the true count is greater than nine.
 *
 * The input is intentionally permissive: any value that is not a
 * non-negative finite number (negative, NaN, null, undefined, string,
 * etc.) is treated as `0` so the badge never displays garbage.
 */
export const getUnreadBadgeLabel = (count: number | null | undefined): string => {
  if (typeof count !== 'number' || !Number.isFinite(count)) return '0';
  const truncated = Math.trunc(count);
  if (truncated <= 0) return '0';
  if (truncated > UNREAD_BADGE_MAX) return '9+';
  return String(truncated);
};

/**
 * Maximum numeric count that is still rendered verbatim in the badge
 * (i.e. before the "9+" truncation kicks in). Exposed as a constant
 * so the test and the component can never drift apart.
 */
export const UNREAD_BADGE_MAX = 9 as const;

/**
 * The two header action slots rendered on the right side of the
 * screen header (bell and send icons). Centralising the target routes
 * — `/notifications` and `/messages` — keeps the navigation contract
 * visible to the test suite.
 */
export const HOME_HEADER_ACTIONS = [
  { key: 'notifications' as const, target: '/notifications' as const, icon: 'bell' as const },
  { key: 'messages' as const, target: '/messages' as const, icon: 'send' as const },
];
export type HomeHeaderActionKey = (typeof HOME_HEADER_ACTIONS)[number]['key'];

/**
 * Returns the navigation target for a header action. The component
 * uses an `onPress` per icon and pushes the matching route; this
 * helper is a single source of truth so the test can pin both routes
 * without snapshotting the whole JSX.
 */
export const getHomeHeaderTarget = (key: HomeHeaderActionKey): string => {
  const match = HOME_HEADER_ACTIONS.find(action => action.key === key);
  // `match` is guaranteed non-undefined because `HomeHeaderActionKey`
  // is the union of the action keys, but we still guard for safety.
  return match ? match.target : '/';
};
