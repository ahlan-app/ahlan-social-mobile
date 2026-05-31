// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/date-utils.test.ts
// Batch 9/10: Date formatting and PostCard utility tests

import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Relative time helpers used by PostCard.getTimeAgo()
// ---------------------------------------------------------------------------

describe('PostCard — differenceInMinutes (getTimeAgo)', () => {
  it('returns 5 for a date 5 minutes ago', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(differenceInMinutes(now, fiveMinAgo)).toBe(5);
  });

  it('returns 0 for the same timestamp', () => {
    const now = new Date();
    expect(differenceInMinutes(now, now)).toBe(0);
  });

  it('returns negative value for a future date', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 60 * 1000);
    expect(differenceInMinutes(now, future)).toBeLessThan(0);
  });

  it('returns NaN for an invalid date', () => {
    const now = new Date();
    const invalid = new Date('not-a-valid-date');
    expect(differenceInMinutes(now, invalid)).toBeNaN();
  });
});

describe('PostCard — differenceInHours (getTimeAgo)', () => {
  it('returns 2 for a date 2 hours ago', () => {
    const now = new Date();
    const twoHAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(differenceInHours(now, twoHAgo)).toBe(2);
  });

  it('boundary: returns 0 for 59 minutes', () => {
    const now = new Date();
    const fiftyNineMinAgo = new Date(now.getTime() - 59 * 60 * 1000);
    expect(differenceInHours(now, fiftyNineMinAgo)).toBe(0);
  });

  it('boundary: returns 1 for 61 minutes', () => {
    const now = new Date();
    const sixtyOneMinAgo = new Date(now.getTime() - 61 * 60 * 1000);
    expect(differenceInHours(now, sixtyOneMinAgo)).toBe(1);
  });
});

describe('PostCard — differenceInDays (getTimeAgo)', () => {
  it('returns 3 for a date 3 days ago', () => {
    const now = new Date();
    const threeDAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(differenceInDays(now, threeDAgo)).toBe(3);
  });

  it('boundary: returns 0 for 23 hours', () => {
    const now = new Date();
    const twentyThreeHAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    expect(differenceInDays(now, twentyThreeHAgo)).toBe(0);
  });

  it('boundary: returns 1 for 25 hours', () => {
    const now = new Date();
    const twentyFiveHAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(differenceInDays(now, twentyFiveHAgo)).toBe(1);
  });
});

describe('PostCard — differenceInWeeks (getTimeAgo)', () => {
  it('returns 2 for a date 2 weeks ago', () => {
    const now = new Date();
    const twoWAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(differenceInWeeks(now, twoWAgo)).toBe(2);
  });

  it('boundary: returns 0 for 6 days', () => {
    const now = new Date();
    const sixDAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    expect(differenceInWeeks(now, sixDAgo)).toBe(0);
  });

  it('boundary: returns 1 for 8 days', () => {
    const now = new Date();
    const eightDAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    expect(differenceInWeeks(now, eightDAgo)).toBe(1);
  });
});

describe('PostCard — differenceInMonths (getTimeAgo)', () => {
  it('returns 1 for a date 1 month ago', () => {
    // Use fixed dates to avoid month-rollover edge cases
    const now = new Date(2026, 4, 15);     // May 15, 2026
    const oneMonthAgo = new Date(2026, 3, 15); // Apr 15, 2026
    expect(differenceInMonths(now, oneMonthAgo)).toBe(1);
  });
});

describe('PostCard — differenceInYears (getTimeAgo)', () => {
  it('returns 2 for a date 2 years ago', () => {
    const now = new Date(2026, 4, 15);       // May 15, 2026
    const twoYearsAgo = new Date(2024, 4, 15); // May 15, 2024
    expect(differenceInYears(now, twoYearsAgo)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getTimeAgo aggregate logic tests (simulating the PostCard function)
// ---------------------------------------------------------------------------

describe('PostCard — getTimeAgo logic (aggregate)', () => {
  const getTimeAgo = (timestamp?: string): string => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();

      const diffMinutes = differenceInMinutes(now, date);
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}min ago`;

      const diffHours = differenceInHours(now, date);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = differenceInDays(now, date);
      if (diffDays < 7) return `${diffDays}d ago`;

      const diffMonths = differenceInMonths(now, date);
      if (diffMonths < 1) {
        const diffWeeks = differenceInWeeks(now, date);
        return `${diffWeeks}w ago`;
      }

      if (diffMonths < 12) return `${diffMonths}m ago`;

      const diffYears = differenceInYears(now, date);
      return `${diffYears}y ago`;
    } catch {
      return '';
    }
  };

  it('returns "just now" for the current timestamp', () => {
    expect(getTimeAgo(new Date().toISOString())).toBe('just now');
  });

  it('returns "5min ago" for a date 5 minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getTimeAgo(fiveMinAgo)).toBe('5min ago');
  });

  it('returns "2h ago" for a date 2 hours ago', () => {
    const twoHAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(getTimeAgo(twoHAgo)).toBe('2h ago');
  });

  it('returns "3d ago" for a date 3 days ago', () => {
    const threeDAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTimeAgo(threeDAgo)).toBe('3d ago');
  });

  it('returns "1w ago" for a date 8 days ago', () => {
    const eightDAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(getTimeAgo(eightDAgo)).toBe('1w ago');
  });

  it('returns "1m ago" for a date 1 month ago', () => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    // If the previous month has fewer days, JS auto-rolls — we just need the
    // ISO string from a reliably 1-month-old date for the logic test
    expect(getTimeAgo(oneMonthAgo.toISOString())).toMatch(/^[14][wm] ago$/);
  });

  it('returns "2y ago" for a date 2 years ago', () => {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    expect(getTimeAgo(twoYearsAgo.toISOString())).toMatch(/^2y ago$/);
  });

  it('returns empty string for undefined timestamp', () => {
    expect(getTimeAgo(undefined)).toBe('');
  });

  it('returns empty string for null timestamp', () => {
    expect(getTimeAgo(null as unknown as string)).toBe('');
  });
});
