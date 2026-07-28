/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/StoryViewer.test.tsx
 *
 * Tests for the StoryViewer: tap-to-advance, progress timer, pause on hold, replies and reactions.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { StoryViewer } from '../../src/components/StoryViewer';

const stories = [
  { id: 's1', uri: 'https://cdn.example.com/s1.jpg', expiresAt: Date.now() + 86_400_000 },
  { id: 's2', uri: 'https://cdn.example.com/s2.jpg', expiresAt: Date.now() + 86_400_000 },
  { id: 's3', uri: 'https://cdn.example.com/s3.jpg', expiresAt: Date.now() + 86_400_000 },
];

describe('StoryViewer', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('renders the first story on mount', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} />);
    expect(getByTestId('story-0')).toBeTruthy();
  });

  test('advances to the next story on left-side tap', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} />);
    fireEvent.press(getByTestId('story-tap-right'));
    act(() => { jest.advanceTimersByTime(50); });
    expect(getByTestId('story-1')).toBeTruthy();
  });

  test('auto-advances after the configured duration', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} durationMs={5000} />);
    act(() => { jest.advanceTimersByTime(5100); });
    expect(getByTestId('story-1')).toBeTruthy();
  });

  test('pause is triggered when the user holds the story', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} />);
    fireEvent(getByTestId('story-tap-left'), 'longPress');
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(getByTestId('story-0')).toBeTruthy();
  });

  test('calls onComplete when the last story finishes', () => {
    const onComplete = jest.fn();
    render(<StoryViewer stories={stories} durationMs={1000} onComplete={onComplete} />);
    act(() => { jest.advanceTimersByTime(3500); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('renders reply input when reply is enabled', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} allowReply />);
    expect(getByTestId('story-reply-input')).toBeTruthy();
  });

  test('emits onReply when the user submits a reply', () => {
    const onReply = jest.fn();
    const { getByTestId } = render(
      <StoryViewer stories={stories} allowReply onReply={onReply} />,
    );
    fireEvent.changeText(getByTestId('story-reply-input'), 'hello');
    fireEvent.press(getByTestId('story-reply-send'));
    expect(onReply).toHaveBeenCalledWith('s1', 'hello');
  });

  test('renders the reaction picker when long-pressed from the right side', () => {
    const { getByTestId } = render(<StoryViewer stories={stories} allowReactions />);
    fireEvent(getByTestId('story-tap-right'), 'longPress');
    expect(getByTestId('reaction-picker')).toBeTruthy();
  });
});
