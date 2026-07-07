// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Pure gesture / touch-handling helpers extracted from the inlined logic in
// HomeTab.tsx (and mirrored by SearchTab / ProfileTab / UserProfileScreen).
//
// Keeping these functions in one place means the touch-handling rules used by
// every feed screen share a single source of truth, and the pull-to-refresh,
// swipe-right and gesture-vs-scroll conflict decisions can be exercised in
// unit tests without rendering React Native or pulling in the gesture-handler
// native module.
//
// The math/constants below intentionally match the inlined values in
// HomeTab.tsx:248-289 so swapping the component to import from here is a
// behaviour-preserving refactor.

/**
 * Pull-to-refresh trigger threshold (in pixels of pull distance after the
 * easing curve is applied). Matches `HomeTab.tsx` touchend handler which
 * fires `handleRefresh` when `pullPositionRef.current > 80`.
 */
export const PULL_REFRESH_THRESHOLD = 80;

/**
 * Easing exponent applied to raw touch delta-Y in `computePullPosition`.
 * The `< 1` exponent (0.85) means the indicator moves quickly at first and
 * then ramps slower as the user pulls further — a common "rubber band"
 * feel. Mirrors `Math.pow(deltaY, 0.85)` in HomeTab.tsx:266.
 */
export const PULL_EASING_EXPONENT = 0.85;

/**
 * Minimum pull distance (in pixels, post-easing) before the refresh
 * indicator becomes visible. Matches `HomeTab.tsx:103` `pullPosition > 10`.
 */
export const REFRESH_INDICATOR_VISIBILITY_MIN = 10;

/**
 * Compute the eased pull position for the indicator.
 *
 * Mirrors the calculation in HomeTab.tsx:266:
 *   `setPullPosition(Math.pow(deltaY, 0.85))`
 *
 * @param deltaY Raw touch delta from `touchstart` to `touchmove`, in pixels.
 *               Negative values mean the user is scrolling up — those are
 *               treated as "no pull" and return 0.
 * @returns The eased pull distance, never negative, never NaN/Infinity.
 */
export const computePullPosition = (deltaY: number): number => {
  if (typeof deltaY !== 'number' || Number.isNaN(deltaY) || deltaY <= 0) {
    return 0;
  }
  const eased = Math.pow(deltaY, PULL_EASING_EXPONENT);
  if (!Number.isFinite(eased)) return 0;
  return eased;
};

/**
 * Normalised pull progress (0 → 1) for the rotating spinner graphic.
 *
 * Mirrors `HomeTab.tsx:96` `Math.min(pullPosition / PULL_THRESHOLD, 1)`.
 * Returns 1 once the threshold is reached so the spinner is fully rotated.
 */
export const computePullProgress = (pullPosition: number): number => {
  if (typeof pullPosition !== 'number' || Number.isNaN(pullPosition)) return 0;
  if (pullPosition <= 0) return 0;
  if (pullPosition >= PULL_REFRESH_THRESHOLD) return 1;
  return pullPosition / PULL_REFRESH_THRESHOLD;
};

/**
 * Whether the refresh spinner should be visible for a given pull position.
 *
 * Mirrors `HomeTab.tsx:103` `pullPosition > 10` (also re-used by SearchTab
 * and ProfileTab). Below this distance the indicator stays hidden so it
 * doesn't pop in for accidental tiny drags.
 */
export const shouldShowRefreshIndicator = (pullPosition: number): boolean => {
  return (
    typeof pullPosition === 'number' &&
    !Number.isNaN(pullPosition) &&
    pullPosition > REFRESH_INDICATOR_VISIBILITY_MIN
  );
};

/**
 * Decide whether releasing the touch at `pullPosition` should trigger the
 * refresh handler. Mirrors `HomeTab.tsx:273` `pullPositionRef.current > 80`.
 *
 * Guarded so a refresh that is already in flight cannot be re-triggered
 * by a second pull — this matches `handleRefresh`'s `if (isRefreshing) return;`
 * early-out (HomeTab.tsx:164).
 */
export const shouldTriggerRefresh = (params: {
  pullPosition: number;
  isRefreshing: boolean;
  scrollTop: number;
}): boolean => {
  const { pullPosition, isRefreshing, scrollTop } = params;
  if (isRefreshing) return false;
  if (typeof pullPosition !== 'number' || Number.isNaN(pullPosition)) return false;
  if (typeof scrollTop !== 'number' || Number.isNaN(scrollTop)) return false;
  // Only refresh when the user pulled from the top — never mid-scroll.
  if (scrollTop > 0) return false;
  return pullPosition > PULL_REFRESH_THRESHOLD;
};

/**
 * Resolve a vertical touch delta into a "should start tracking a pull"
 * decision.
 *
 * Mirrors HomeTab.tsx:252-257 + 259-268. A pull is "active" only when:
 *   - the scroll container is scrolled to the top (scrollTop === 0), AND
 *   - the user is dragging downward (deltaY > 0), AND
 *   - a refresh is not already in flight.
 */
export const shouldStartPullTracking = (params: {
  scrollTop: number;
  isRefreshing: boolean;
}): boolean => {
  const { scrollTop, isRefreshing } = params;
  if (isRefreshing) return false;
  if (typeof scrollTop !== 'number' || Number.isNaN(scrollTop)) return false;
  return scrollTop === 0;
};

/**
 * Resolve whether a vertical touch delta should update the pull position.
 * Pull-tracking must already be active (see `shouldStartPullTracking`).
 *
 * Mirrors HomeTab.tsx:259-268 — `if (deltaY > 0) ... setPullPosition(...)`.
 * Upward drags (deltaY <= 0) do not contribute to the pull.
 */
export const shouldUpdatePullPosition = (params: {
  deltaY: number;
  scrollTop: number;
  isRefreshing: boolean;
}): boolean => {
  const { deltaY, scrollTop, isRefreshing } = params;
  if (isRefreshing) return false;
  if (typeof deltaY !== 'number' || Number.isNaN(deltaY)) return false;
  if (typeof scrollTop !== 'number' || Number.isNaN(scrollTop)) return false;
  if (deltaY <= 0) return false;
  return true;
};

// ---------------------------------------------------------------------------
// Swipe-right action
// ---------------------------------------------------------------------------
//
// On Android/iOS posts the user can swipe a row right to trigger a quick
// action (reply / share / save). The screens below the feed use a similar
// horizontal gesture. These helpers give the screens a pure decision
// function so they don't have to inline the same magic numbers.

/**
 * Minimum horizontal distance (px) before a horizontal swipe counts as an
 * intentional swipe-right and not a sloppy tap. Anything below this is
 * treated as a tap candidate.
 */
export const SWIPE_RIGHT_MIN_DISTANCE = 60;

/**
 * Maximum allowed vertical drift (px) for a gesture to still be considered
 * a horizontal swipe. If the user moves vertically more than this while
 * also moving horizontally, the gesture is treated as a scroll instead and
 * the swipe action is NOT fired — this is the conflict gate.
 */
export const SWIPE_RIGHT_MAX_VERTICAL_DRIFT = 24;

/**
 * Minimum absolute horizontal velocity ratio (|dx| / |dy|) above which the
 * gesture is unambiguously horizontal. Mirrors the convention used by
 * react-native-gesture-handler's `activeOffsetX` thresholds.
 */
export const SWIPE_RIGHT_MIN_DX_OVER_DY = 1.5;

export type SwipeRightVerdict =
  | { kind: 'swipe-right'; distance: number }
  | { kind: 'not-enough-distance'; distance: number; deltaY: number }
  | { kind: 'too-much-vertical-drift'; distance: number; deltaY: number }
  | { kind: 'scroll'; distance: number; deltaY: number }
  | { kind: 'left-swipe'; distance: number };

/**
 * Classify the end of a horizontal touch interaction as a swipe-right
 * action or as "not a swipe" (in which case the scroll handler should
 * take over).
 *
 * @param deltaX End x minus start x (positive = swiped right).
 * @param deltaY End y minus start y (positive = dragged down).
 *
 * The classification rules, in order:
 *   1. deltaX > 0 and |deltaX| < SWIPE_RIGHT_MIN_DISTANCE  → not-enough-distance
 *   2. deltaX > 0 and |deltaY| > SWIPE_RIGHT_MAX_VERTICAL_DRIFT → too-much-vertical-drift
 *      (i.e. user was clearly scrolling, fire nothing)
 *   3. deltaX > 0 and |deltaY| > 0 and |dx|/|dy| < SWIPE_RIGHT_MIN_DX_OVER_DY → scroll
 *   4. deltaX >= SWIPE_RIGHT_MIN_DISTANCE (vertical drift OK) → swipe-right
 *   5. deltaX <= 0 → left-swipe (deliberately ignored)
 */
export const classifySwipeRight = (deltaX: number, deltaY: number): SwipeRightVerdict => {
  const distance = typeof deltaX === 'number' && !Number.isNaN(deltaX) ? deltaX : 0;
  const vertical = typeof deltaY === 'number' && !Number.isNaN(deltaY) ? deltaY : 0;

  if (distance <= 0) {
    return { kind: 'left-swipe', distance };
  }
  if (distance < SWIPE_RIGHT_MIN_DISTANCE) {
    return { kind: 'not-enough-distance', distance, deltaY: vertical };
  }
  if (Math.abs(vertical) > SWIPE_RIGHT_MAX_VERTICAL_DRIFT) {
    return { kind: 'too-much-vertical-drift', distance, deltaY: vertical };
  }
  if (vertical !== 0) {
    const ratio = distance / Math.abs(vertical);
    if (ratio < SWIPE_RIGHT_MIN_DX_OVER_DY) {
      return { kind: 'scroll', distance, deltaY: vertical };
    }
  }
  return { kind: 'swipe-right', distance };
};

/**
 * Convenience boolean wrapper around `classifySwipeRight` for screens that
 * just want to know "did this gesture commit to a swipe-right action?"
 */
export const isSwipeRightAction = (deltaX: number, deltaY: number): boolean => {
  return classifySwipeRight(deltaX, deltaY).kind === 'swipe-right';
};