// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/FlagContent.test.ts
// Batch 2/10: FlagContent SVG path math function tests

import {
  createWavyPath,
  createStarPath,
  getWavedY,
  createWavyVerticalPath,
  getWavedX,
  createSlightWavyPath,
  getSlightWavedY,
  createSlightWavyVerticalPath,
  getSlightWavedX,
} from '../../components/FlagContent';

describe('createWavyPath', () => {
  it('returns a string starting with M', () => {
    const path = createWavyPath(10, 20, 100, 60);
    expect(path).toBeDefined();
    expect(typeof path).toBe('string');
    expect(path.trim()).toMatch(/^M/);
  });

  it('contains L commands for the wave', () => {
    const path = createWavyPath(10, 20, 100, 60);
    expect(path).toContain('L');
  });

  it('ends with Z to close the path', () => {
    const path = createWavyPath(10, 20, 100, 60);
    expect(path.trim()).toMatch(/Z$/);
  });

  it('handles zero dimensions gracefully', () => {
    const path = createWavyPath(0, 0, 0, 0);
    expect(typeof path).toBe('string');
    expect(path.length).toBeGreaterThan(0);
  });

  it('produces different paths for different offsets', () => {
    const path1 = createWavyPath(10, 20, 100, 60);
    const path2 = createWavyPath(30, 20, 100, 60);
    expect(path1).not.toBe(path2);
  });

  it('produces different paths for different heights', () => {
    const path1 = createWavyPath(10, 20, 100, 60);
    const path2 = createWavyPath(10, 40, 100, 60);
    expect(path1).not.toBe(path2);
  });
});

describe('createStarPath', () => {
  it('returns a string starting with M', () => {
    const path = createStarPath(50, 50, 20);
    expect(path.trim()).toMatch(/^M/);
  });

  it('ends with Z to close the star', () => {
    const path = createStarPath(50, 50, 20);
    expect(path.trim()).toMatch(/Z$/);
  });

  it('generates 9 L commands for a 10-pointed star', () => {
    const path = createStarPath(50, 50, 20);
    // Path format: "M x yL x yL x yL ... Z" (no space before L)
    const lCount = (path.match(/(?<=\d)L/g) || []).length;
    expect(lCount).toBe(9); // 9 L commands for 10-pointed star (M + 9*L + Z + close)
  });

  it('produces different paths for different radii', () => {
    const path1 = createStarPath(50, 50, 20);
    const path2 = createStarPath(50, 50, 30);
    expect(path1).not.toBe(path2);
  });

  it('produces different paths for different centers', () => {
    const path1 = createStarPath(50, 50, 20);
    const path2 = createStarPath(100, 50, 20);
    expect(path1).not.toBe(path2);
  });
});

describe('getWavedY', () => {
  it('returns a number', () => {
    const y = getWavedY(0, 10, 100, 60);
    expect(typeof y).toBe('number');
  });

  it('returns original y when wave amplitude is 0 due to height=0', () => {
    const y = getWavedY(0, 10, 100, 0);
    expect(y).toBeCloseTo(10);
  });

  it('returns different values for different x positions', () => {
    const y1 = getWavedY(0, 10, 100, 60);
    const y2 = getWavedY(50, 10, 100, 60);
    expect(y1).not.toBeCloseTo(y2, 1); // Should differ due to wave
  });

  it('returns same y for same x (deterministic)', () => {
    const y1 = getWavedY(25, 10, 100, 60);
    const y2 = getWavedY(25, 10, 100, 60);
    expect(y1).toBeCloseTo(y2);
  });
});

describe('getWavedX', () => {
  it('returns a number', () => {
    const x = getWavedX(10, 0, 100, 60);
    expect(typeof x).toBe('number');
  });

  it('returns different values for different y positions', () => {
    const x1 = getWavedX(10, 0, 100, 60);
    const x2 = getWavedX(10, 30, 100, 60);
    expect(x1).not.toBeCloseTo(x2, 1);
  });

  it('is deterministic for same inputs', () => {
    const x1 = getWavedX(10, 15, 100, 60);
    const x2 = getWavedX(10, 15, 100, 60);
    expect(x1).toBeCloseTo(x2);
  });
});

describe('createSlightWavyPath', () => {
  it('returns a valid SVG path string', () => {
    const path = createSlightWavyPath(10, 20, 100, 60);
    expect(path.trim()).toMatch(/^M.*Z$/);
  });

  it('produces a different path than the regular wave', () => {
    const regular = createWavyPath(10, 20, 100, 60);
    const slight = createSlightWavyPath(10, 20, 100, 60);
    expect(slight).not.toBe(regular);
  });
});

describe('createWavyVerticalPath', () => {
  it('returns a valid SVG path string', () => {
    const path = createWavyVerticalPath(10, 20, 100, 60);
    expect(path.trim()).toMatch(/^M.*Z$/);
  });
});

describe('createSlightWavyVerticalPath', () => {
  it('returns a valid SVG path string', () => {
    const path = createSlightWavyVerticalPath(10, 20, 100, 60);
    expect(path.trim()).toMatch(/^M.*Z$/);
  });
});
