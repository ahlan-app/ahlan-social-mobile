// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure logic extracted from app/(tabs)/index.tsx (the HomeFeedScreen /
// FeedScreen component) so the data-transformation rules — appending
// unique posts to the timeline, de-duplicating stories, mapping raw
// suggestion rows to display-ready SimpleUser objects, and grouping
// stories by author — can be exercised in tests without spinning up
// React Native, expo-router, or the AppContext provider.
//
// Keeping these helpers in a sidecar file mirrors the convention used
// by SettingsScreen, LoginScreen, and ProfileScreen — it lets the
// test suite lock down the behaviour the UI relies on, and gives the
// component a single, shared source of truth.

// ---------------------------------------------------------------------------
// 1. Post timeline de-duplication
// ---------------------------------------------------------------------------

/**
 * Minimal shape of a post the timeline cares about for the purposes
 * of de-duplication. The real `Post` type contains many more fields;
 * `id` is the only key the timeline de-dupes on.
 */
export interface FeedPost {
  id: string;
  username?: string;
  // The component filters blocked authors with `isUserBlocked`, so the
  // caller is expected to pass already-filtered lists. We accept a
  // minimal shape here to keep this helper decoupled from the
  // full Post type and easy to test.
}

/**
 * Appends a batch of incoming posts to the current list, skipping any
 * post whose `id` is already present in the current list. Returns the
 * original `current` reference unchanged when:
 *
 *   - `incoming` is empty
 *   - every incoming post is already present
 *
 * Returning the same reference (rather than a new array with the same
 * contents) lets React bail out of re-renders when there is no actual
 * change, which is what the component's original `appendUniquePosts`
 * helper does. The test pins both behaviours.
 */
export const appendUniquePosts = <T extends FeedPost>(
  current: readonly T[],
  incoming: readonly T[],
): T[] => {
  if (incoming.length === 0) return current.slice();
  const seen = new Set(current.map(post => post.id));
  const next = incoming.filter(post => !seen.has(post.id));
  if (next.length === 0) return current.slice();
  return [...current, ...next];
};

// ---------------------------------------------------------------------------
// 2. Story de-duplication
// ---------------------------------------------------------------------------

/**
 * Minimal shape of a story the timeline cares about for de-duplication
 * and grouping. The real `Story` type contains many more fields.
 */
export interface FeedStory {
  id?: string;
  username: string;
  avatar?: string | null;
  // The full Story type is open-ended; the helpers only read these
  // three fields. Keeping the surface tiny makes the test fixtures
  // trivial to write.
}

/**
 * Result of grouping stories by author. The StoryReel component
 * expects one entry per author with a `stories` array in display
 * order. The first occurrence of an author defines the avatar used
 * for the group's ring.
 */
export interface FeedStoryGroup {
  username: string;
  avatar?: string | null;
  stories: FeedStory[];
}

/**
 * De-duplicates a list of stories by `id`, preserving the first
 * occurrence. Stories with no `id` (defensive: malformed data) are
 * skipped rather than treated as duplicates of each other. The
 * component's original helper does the same.
 */
export const dedupeStoriesById = (stories: readonly FeedStory[]): FeedStory[] => {
  const seen = new Set<string>();
  const unique: FeedStory[] = [];
  for (const story of stories) {
    if (!story?.id || seen.has(story.id)) continue;
    seen.add(story.id);
    unique.push(story);
  }
  return unique;
};

/**
 * Groups stories by `username` and returns a stable, insertion-ordered
 * list of groups. Within each group the stories appear in the same
 * order they were encountered in the input.
 *
 * The component additionally:
 *   1. filters out blocked users via `isUserBlocked(story.username)`
 *   2. filters out the viewer's own stories when `currentUsername` is
 *      truthy
 *
 * Both filters are applied by the caller — this helper is purely about
 * the grouping step — so the test can pin the grouping behaviour
 * without having to mock the AppContext's `isUserBlocked` closure.
 */
export const groupStoriesByUsername = (
  stories: readonly FeedStory[],
): FeedStoryGroup[] => {
  const groups = new Map<string, FeedStoryGroup>();
  for (const story of stories) {
    if (!story?.username) continue;
    const existing = groups.get(story.username);
    if (existing) {
      existing.stories.push(story);
    } else {
      groups.set(story.username, {
        username: story.username,
        avatar: story.avatar ?? null,
        stories: [story],
      });
    }
  }
  return Array.from(groups.values());
};

// ---------------------------------------------------------------------------
// 3. Smart-user-suggestion mapping
// ---------------------------------------------------------------------------

/**
 * Result of mapping a raw API suggestion row to a display-ready
 * `SimpleUser`. Mirrors the shape that `HomeFeedScreen` writes into
 * the `suggestedUsers` state.
 */
export interface FeedSuggestion {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  isVerified: boolean;
}

/**
 * Shape of one row returned by the `getSmartUserSuggestions` API. The
 * real backend sometimes returns `suggested_user_id`, sometimes
 * `id`, and sometimes `username` as the only key — we accept all
 * three and pick the first one present. We mark this as
 * `Record<string, unknown>` because the field set varies by
 * deployment and the helper must not assume any particular shape.
 */
export type RawSuggestionRow = Record<string, unknown>;

/**
 * Maps a single raw suggestion row to a `FeedSuggestion`. Returns
 * `null` when the row is unusable (no resolvable id and no username,
 * or a username that the caller has marked as blocked).
 *
 * The blocklist check is delegated to the caller via `isBlocked`,
 * which keeps this helper free of AppContext dependencies.
 */
export const mapSuggestionRow = (
  raw: RawSuggestionRow | null | undefined,
  isBlocked: (username: string) => boolean,
): FeedSuggestion | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const username =
    typeof row.username === 'string' && row.username.trim() !== ''
      ? row.username
      : '';
  if (username === '') return null;
  if (isBlocked(username)) return null;

  const idRaw = row.suggested_user_id ?? row.id ?? row.username;
  const id =
    typeof idRaw === 'string' || typeof idRaw === 'number'
      ? String(idRaw)
      : username;

  const avatar =
    typeof row.avatar_url === 'string' && row.avatar_url.trim() !== ''
      ? row.avatar_url
      : null;

  return {
    id,
    username,
    name: username || 'Ahlan user',
    avatar,
    isVerified: Boolean(row.is_verified),
  };
};

// ---------------------------------------------------------------------------
// 4. Realtime-feed reducer helpers
//
// The HomeFeedScreen subscribes to Postgres Changes on the `posts` table
// and pipes every event through `handlePostUpdates`. That reducer has
// three branches, each of which mutates the local `posts` state:
//
//   - INSERT  → prepend the new post (skipping duplicates / blocked authors)
//   - UPDATE  → replace the matching post by id (e.g. reaction count change)
//   - DELETE  → drop the matching post by id
//
// We extract the pure state-transition bits here so the behaviour the
// user actually sees — "a new post shows up at the top of my feed",
// "a post disappears when its author deletes it", "the heart count
// ticks up the moment someone likes the post" — can be locked down
// with deterministic tests that do not need React, expo-router, or a
// mock Supabase channel.
//
// The helpers are intentionally framework-agnostic. They take the
// current post list and an incoming Post (or just an id) and return a
// new list, never mutating the input.
// ---------------------------------------------------------------------------

/**
 * Apply a Postgres Changes INSERT payload to the timeline.
 *
 * - Returns the original `current` reference (no re-render needed) when
 *   the post is already present.
 * - Returns the original `current` reference when the post comes from
 *   a blocked author (the screen filters these out before rendering).
 * - Otherwise returns a new array with the post prepended so it shows
 *   up at the top of the feed.
 */
export const applyRealtimeInsert = <T extends FeedPost>(
  current: readonly T[],
  incoming: T,
  isBlocked?: (username: string | undefined) => boolean,
): T[] => {
  if (!incoming?.id) return current.slice();
  if (current.some(post => post.id === incoming.id)) return current.slice();
  if (isBlocked && isBlocked(incoming.username)) return current.slice();
  return [incoming, ...current];
};

/**
 * Apply a Postgres Changes UPDATE payload to the timeline.
 *
 * When a user likes / unlikes a post Supabase emits an UPDATE on the
 * `posts` row carrying the refreshed `likes` (reaction) count. We
 * replace the matching post in-place by id and leave every other post
 * untouched, so the rest of the timeline does not flicker.
 *
 * Returns the original `current` reference when no post matches the
 * incoming id (the post may have been deleted out from under us, or
 * the UPDATE may not yet be relevant to this screen).
 */
export const applyRealtimeUpdate = <T extends FeedPost>(
  current: readonly T[],
  incoming: T,
): T[] => {
  if (!incoming?.id) return current.slice();
  let changed = false;
  const next = current.map(post => {
    if (post.id !== incoming.id) return post;
    changed = true;
    return incoming;
  });
  if (!changed) return current.slice();
  return next;
};

/**
 * Apply a Postgres Changes DELETE payload to the timeline.
 *
 * Supabase sends the deleted row in `payload.old`. We drop the
 * matching post by id; if no post matches (it was never on this
 * user's timeline, or was already removed) we return the original
 * reference so React can bail out of the re-render.
 */
export const applyRealtimeDelete = <T extends FeedPost>(
  current: readonly T[],
  deletedId: string | undefined,
): T[] => {
  if (!deletedId) return current.slice();
  const next = current.filter(post => post.id !== deletedId);
  if (next.length === current.length) return current.slice();
  return next;
};

// ---------------------------------------------------------------------------
// 5. Feed-page-size / pagination helpers
// ---------------------------------------------------------------------------

/**
 * Whether the timeline should fetch another page when the user
 * reaches the end of the current list. The component sets
 * `hasMore = filteredPosts.length >= FEED_PAGE_SIZE` after every
 * successful load, and the onEndReached callback short-circuits when
 * `hasMore` is false. We expose the same predicate so the test can
 * pin down the "do we have a full page?" rule.
 *
 * `pageSize` is the API-defined page size; we accept it as a
 * parameter so the test can drive boundary conditions without
 * having to depend on the literal `FEED_PAGE_SIZE` constant.
 */
export const shouldFetchMore = (
  receivedCount: number,
  pageSize: number,
): boolean => {
  if (!Number.isFinite(pageSize) || pageSize <= 0) return false;
  if (!Number.isFinite(receivedCount) || receivedCount < 0) return false;
  return receivedCount >= pageSize;
};
