// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/gestures.test.ts
// Gesture / swipe-handling tests.
//
// These tests exercise the pure decision functions used by HomeTab, SearchTab
// and ProfileTab to translate raw touch deltas into UI actions:
//   - pull-to-refresh threshold + indicator visibility + ease curve
//   - swipe-right action classifier (and the left-swipe / scroll rejection)
//   - the gesture-vs-scroll conflict gate (vertical scroll wins when the
//     user is mid-feed and drags downward)

import {
  PULL_REFRESH_THRESHOLD,
  PULL_EASING_EXPONENT,
  REFRESH_INDICATOR_VISIBILITY_MIN,
  SWIPE_RIGHT_MIN_DISTANCE,
  SWIPE_RIGHT_MAX_VERTICAL_DRIFT,
  SWIPE_RIGHT_MIN_DX_OVER_DY,
  computePullPosition,
  computePullProgress,
  shouldShowRefreshIndicator,
  shouldTriggerRefresh,
  shouldStartPullTracking,
  shouldUpdatePullPosition,
  classifySwipeRight,
  isSwipeRightAction,
} from '../../components/gestures.utils';

// ---------------------------------------------------------------------------
// 1. Pull-to-refresh: releasing the touch past the threshold triggers reload
// ---------------------------------------------------------------------------

describe('pull-to-refresh — triggers reload when pull crosses threshold', () => {
  it('uses the documented 80px threshold constant', () => {
    expect(PULL_REFRESH_THRESHOLD).toBe(80);
  });

  it('does not trigger refresh for a small pull (well below threshold)', () => {
    expect(
      shouldTriggerRefresh({ pullPosition: 40, isRefreshing: false, scrollTop: 0 }),
    ).toBe(false);
  });

  it('does not trigger refresh exactly at the threshold (> not >=)', () => {
    // HomeTab.tsx:273 uses `pullPositionRef.current > 80`, so 80 itself does
    // not fire. This pins that exact behaviour.
    expect(
      shouldTriggerRefresh({ pullPosition: 80, isRefreshing: false, scrollTop: 0 }),
    ).toBe(false);
  });

  it('triggers refresh when pull is just past the threshold (81px)', () => {
    expect(
      shouldTriggerRefresh({ pullPosition: 81, isRefreshing: false, scrollTop: 0 }),
    ).toBe(true);
  });

  it('triggers refresh for a long pull (200px)', () => {
    expect(
      shouldTriggerRefresh({ pullPosition: 200, isRefreshing: false, scrollTop: 0 }),
    ).toBe(true);
  });

  it('does not re-trigger when a refresh is already in flight', () => {
    expect(
      shouldTriggerRefresh({ pullPosition: 500, isRefreshing: true, scrollTop: 0 }),
    ).toBe(false);
  });

  it('does not trigger refresh if the user is mid-scroll (scrollTop > 0)', () => {
    // Scroll-vs-pull conflict: a downward drag while scrolled must NOT be
    // treated as a refresh.
    expect(
      shouldTriggerRefresh({ pullPosition: 300, isRefreshing: false, scrollTop: 50 }),
    ).toBe(false);
  });

  it('returns false for NaN / non-numeric pullPosition (defensive)', () => {
    expect(
      shouldTriggerRefresh({ pullPosition: NaN, isRefreshing: false, scrollTop: 0 }),
    ).toBe(false);
    expect(
      // @ts-expect-error — testing runtime guard against bad input
      shouldTriggerRefresh({ pullPosition: undefined, isRefreshing: false, scrollTop: 0 }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Pull-to-refresh: easing curve + progress + indicator visibility
// ---------------------------------------------------------------------------

describe('pull-to-refresh — easing curve, progress and indicator visibility', () => {
  it('uses the rubber-band easing exponent (0.85) that HomeTab inlines', () => {
    expect(PULL_EASING_EXPONENT).toBeCloseTo(0.85, 5);
  });

  it('returns 0 for negative / zero delta (user scrolling up, not down)', () => {
    expect(computePullPosition(0)).toBe(0);
    expect(computePullPosition(-10)).toBe(0);
    expect(computePullPosition(-1000)).toBe(0);
  });

  it('returns 0 for NaN / non-numeric delta', () => {
    expect(computePullPosition(NaN)).toBe(0);
    // @ts-expect-error — runtime guard
    expect(computePullPosition(undefined)).toBe(0);
  });

  it('applies the pow(deltaY, 0.85) easing to a raw touch delta', () => {
    // 100^0.85 ≈ 50.12 — the rubber-band curve compresses large pulls so
    // the indicator doesn't shoot off-screen.
    expect(computePullPosition(100)).toBeCloseTo(Math.pow(100, 0.85), 5);
    expect(computePullPosition(100)).toBeCloseTo(50.1187, 3);
  });

  it('keeps pull progress in [0, 1] across the full range', () => {
    expect(computePullProgress(0)).toBe(0);
    expect(computePullProgress(40)).toBeCloseTo(0.5, 5);
    expect(computePullProgress(PULL_REFRESH_THRESHOLD)).toBe(1);
    expect(computePullProgress(PULL_REFRESH_THRESHOLD + 1)).toBe(1);
    expect(computePullProgress(10_000)).toBe(1);
  });

  it('hides the refresh indicator below the 10px visibility floor', () => {
    expect(REFRESH_INDICATOR_VISIBILITY_MIN).toBe(10);
    expect(shouldShowRefreshIndicator(0)).toBe(false);
    expect(shouldShowRefreshIndicator(9)).toBe(false);
  });

  it('shows the refresh indicator once the eased pull crosses 10px', () => {
    expect(shouldShowRefreshIndicator(11)).toBe(true);
    expect(shouldShowRefreshIndicator(50)).toBe(true);
    expect(shouldShowRefreshIndicator(PULL_REFRESH_THRESHOLD)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Swipe-right action: classifier recognises the gesture
// ---------------------------------------------------------------------------

describe('swipe-right action — classifier recognises the gesture', () => {
  it('uses sane defaults: 60px min distance, 24px max vertical drift', () => {
    expect(SWIPE_RIGHT_MIN_DISTANCE).toBe(60);
    expect(SWIPE_RIGHT_MAX_VERTICAL_DRIFT).toBe(24);
    expect(SWIPE_RIGHT_MIN_DX_OVER_DY).toBe(1.5);
  });

  it('commits a clean horizontal swipe-right (large dx, near-zero dy)', () => {
    const verdict = classifySwipeRight(120, 4);
    expect(verdict.kind).toBe('swipe-right');
    if (verdict.kind === 'swipe-right') {
      expect(verdict.distance).toBe(120);
    }
    expect(isSwipeRightAction(120, 4)).toBe(true);
  });

  it('commits a longer swipe-right with a moderate vertical wobble', () => {
    // 200px right, 20px down — within the 24px drift budget.
    expect(isSwipeRightAction(200, 20)).toBe(true);
  });

  it('does NOT commit a swipe below the minimum distance (treated as a tap)', () => {
    const verdict = classifySwipeRight(40, 0);
    expect(verdict.kind).toBe('not-enough-distance');
    expect(isSwipeRightAction(40, 0)).toBe(false);
  });

  it('does NOT commit a left-swipe (deltaX <= 0)', () => {
    const verdict = classifySwipeRight(-120, 0);
    expect(verdict.kind).toBe('left-swipe');
    expect(isSwipeRightAction(-120, 0)).toBe(false);
  });

  it('does NOT commit when the horizontal move is too small (just under 60px)', () => {
    expect(isSwipeRightAction(59, 0)).toBe(false);
    expect(isSwipeRightAction(60, 0)).toBe(true); // exactly at threshold is OK
  });

  it('returns a stable verdict shape for downstream UI (no surprise fields)', () => {
    const verdict = classifySwipeRight(150, 5);
    // Exactly the keys we documented — no leakage of internal state.
    expect(Object.keys(verdict).sort()).toEqual(['distance', 'kind']);
  });
});

// ---------------------------------------------------------------------------
// 4. Gesture conflict: scroll wins when the user is mid-feed and drags down
// ---------------------------------------------------------------------------

describe('gesture conflict — scroll wins over swipe/pull when vertical motion dominates', () => {
  it('rejects a swipe-right whose vertical drift exceeds the 24px budget', () => {
    const verdict = classifySwipeRight(150, 60);
    expect(verdict.kind).toBe('too-much-vertical-drift');
    expect(isSwipeRightAction(150, 60)).toBe(false);
  });

  it('treats a near-diagonal drag as a scroll (dx/dy ratio below 1.5)', () => {
    // To reach the 'scroll' branch we need: dx >= 60 (passed min-distance),
    // |dy| <= 24 (passed vertical-drift), AND dx/|dy| < 1.5. With the
    // current SWIPE_RIGHT_MIN_DISTANCE=60 / SWIPE_RIGHT_MAX_VERTICAL_DRIFT=24
    // constants, those three constraints are mutually exclusive — a swipe
    // that's far enough to be a swipe is by definition more horizontal
    // than 60/24 = 2.5x, so the ratio check always passes once we get here.
    // This test therefore asserts the documented unreachable-by-design
    // contract so a future tweak of the constants doesn't accidentally
    // change the gesture pipeline's behaviour.
    expect(SWIPE_RIGHT_MIN_DISTANCE / SWIPE_RIGHT_MAX_VERTICAL_DRIFT).toBeGreaterThan(
      SWIPE_RIGHT_MIN_DX_OVER_DY,
    );
  });

  it('rejects a large-but-very-vertical drag before even checking the ratio', () => {
    // 80px right, 100px down — |dy|=100 blows past the 24px drift budget,
    // so we short-circuit to 'too-much-vertical-drift' (a stricter
    // rejection than 'scroll').
    const verdict = classifySwipeRight(80, 100);
    expect(verdict.kind).toBe('too-much-vertical-drift');
    expect(isSwipeRightAction(80, 100)).toBe(false);
  });

  it('does not start pull tracking mid-scroll (scrollTop > 0)', () => {
    expect(shouldStartPullTracking({ scrollTop: 0, isRefreshing: false })).toBe(true);
    expect(shouldStartPullTracking({ scrollTop: 1, isRefreshing: false })).toBe(false);
    expect(shouldStartPullTracking({ scrollTop: 500, isRefreshing: false })).toBe(false);
  });

  it('does not start pull tracking while a refresh is already in flight', () => {
    expect(shouldStartPullTracking({ scrollTop: 0, isRefreshing: true })).toBe(false);
  });

  it('does not update the pull position for upward drags (deltaY <= 0)', () => {
    expect(
      shouldUpdatePullPosition({ deltaY: 0, scrollTop: 0, isRefreshing: false }),
    ).toBe(false);
    expect(
      shouldUpdatePullPosition({ deltaY: -50, scrollTop: 0, isRefreshing: false }),
    ).toBe(false);
  });

  it('does update the pull position for downward drags from the top', () => {
    expect(
      shouldUpdatePullPosition({ deltaY: 50, scrollTop: 0, isRefreshing: false }),
    ).toBe(true);
    expect(
      shouldUpdatePullPosition({ deltaY: 120, scrollTop: 0, isRefreshing: false }),
    ).toBe(true);
  });

  it('keeps updating the pull position mid-scroll once tracking has started (intentional)', () => {
    // Pull tracking is gated at *start* (scrollTop === 0 is required to
    // begin). Once a touch is already being tracked, mid-scroll updates
    // are still processed — the scroll-vs-pull conflict is enforced
    // upstream by `shouldStartPullTracking`, not here. This test pins the
    // contract so a future "double-gate" doesn't accidentally break the
    // refresh flow.
    expect(
      shouldUpdatePullPosition({ deltaY: 200, scrollTop: 100, isRefreshing: false }),
    ).toBe(true);
  });

  it('does not update the pull position while a refresh is already running', () => {
    expect(
      shouldUpdatePullPosition({ deltaY: 200, scrollTop: 0, isRefreshing: true }),
    ).toBe(false);
  });

  it('returns safe defaults for NaN inputs (never throws)', () => {
    expect(shouldUpdatePullPosition({ deltaY: NaN, scrollTop: 0, isRefreshing: false })).toBe(false);
    expect(shouldUpdatePullPosition({ deltaY: 50, scrollTop: NaN, isRefreshing: false })).toBe(false);
    expect(shouldStartPullTracking({ scrollTop: NaN, isRefreshing: false })).toBe(false);
    expect(classifySwipeRight(NaN, NaN).kind).toBe('left-swipe');
  });
});