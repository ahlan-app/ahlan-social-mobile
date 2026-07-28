/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/VideoPlayer.test.tsx
 *
 * Tests for the VideoPlayer component: poster loading, play/pause, scrubbing, fullscreen, error reporting.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VideoPlayer } from '../../src/components/VideoPlayer';

describe('VideoPlayer', () => {
  const defaultProps = {
    uri: 'https://cdn.example.com/story/abc.mp4',
    poster: 'https://cdn.example.com/story/abc.jpg',
  };

  test('renders the poster while the video is loading', () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} />);
    expect(getByTestId('video-poster')).toBeTruthy();
  });

  test('toggles play state when the play overlay is tapped', () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('video-play-overlay'));
    expect(getByTestId('video-controls')).toBeTruthy();
  });

  test('reports an error state when the source cannot load', () => {
    const { getByTestId } = render(<VideoPlayer uri="https://cdn.example.com/broken.mp4" />);
    fireEvent(getByTestId('video-element'), 'error', { code: -1002 });
    expect(getByTestId('video-error')).toBeTruthy();
  });

  test('seeks to the requested position when the scrubber is moved', () => {
    const onSeek = jest.fn();
    const { getByTestId } = render(
      <VideoPlayer {...defaultProps} onSeek={onSeek} duration={30} />,
    );
    fireEvent(getByTestId('video-scrubber'), 'valueChange', 12.5);
    expect(onSeek).toHaveBeenCalledWith(12.5);
  });

  test('enters fullscreen when the fullscreen button is pressed', () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} />);
    fireEvent.press(getByTestId('video-fullscreen'));
    expect(getByTestId('video-fullscreen-layer')).toBeTruthy();
  });

  test('autoplay starts when the autoPlay prop is true', () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} autoPlay />);
    expect(getByTestId('video-controls')).toBeTruthy();
  });

  test('respects muted prop and shows the unmute toggle', () => {
    const { getByTestId } = render(<VideoPlayer {...defaultProps} muted />);
    expect(getByTestId('video-mute-toggle')).toBeTruthy();
  });

  test('emits onEnd when the playback finishes', () => {
    const onEnd = jest.fn();
    const { getByTestId } = render(
      <VideoPlayer {...defaultProps} duration={0.2} onEnd={onEnd} />,
    );
    fireEvent(getByTestId('video-element'), 'end');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
