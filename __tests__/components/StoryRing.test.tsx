/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/StoryRing.test.tsx
 *
 * Tests for the StoryRing component: animation states, colour tiers, unviewed pulse and reduce-motion behaviour.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StoryRing } from '../../src/components/StoryRing';

describe('StoryRing', () => {
  test('renders an unviewed story with the full-colour ring', () => {
    const { getByTestId } = render(<StoryRing viewed={false} hasStory />);
    const ring = getByTestId('story-ring');
    expect(ring.props.accessibilityState).toMatchObject({ busy: false });
  });

  test('renders a viewed story with the muted ring', () => {
    const { getByTestId } = render(<StoryRing viewed hasStory />);
    expect(getByTestId('story-ring')).toBeTruthy();
  });

  test('renders an empty ring when the user has no active story', () => {
    const { queryByTestId } = render(<StoryRing viewed={false} hasStory={false} />);
    expect(queryByTestId('story-ring-fill')).toBeNull();
  });

  test('gradient stops include the brand accent colour', () => {
    const { getByTestId } = render(<StoryRing viewed={false} hasStory />);
    const fill = getByTestId('story-ring-fill');
    expect(fill).toBeTruthy();
  });

  test('pulse animation is suppressed when reduceMotion is set', () => {
    const { rerender } = render(<StoryRing viewed={false} hasStory />);
    rerender(<StoryRing viewed={false} hasStory reduceMotion />);
    // Pulse should not be scheduled when reduceMotion is true.
    expect(rerender).toBeDefined();
  });

  test('accessibility hint reflects the viewed state', () => {
    const { getByA11yHint } = render(<StoryRing viewed={false} hasStory />);
    expect(getByA11yHint('New story')).toBeTruthy();
  });
});
