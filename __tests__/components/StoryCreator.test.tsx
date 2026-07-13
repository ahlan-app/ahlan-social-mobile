/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/StoryCreator.test.tsx
 *
 * Story creator tests: media picker, overlay drawing, caption, audience picker and publish flow.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoryCreator } from '../../src/components/StoryCreator';

describe('StoryCreator', () => {
  test('renders the media picker by default', () => {
    const { getByTestId } = render(<StoryCreator onPublish={() => {}} />);
    expect(getByTestId('story-media-picker')).toBeTruthy();
  });

  test('shows the overlay editor after a media is selected', () => {
    const { getByTestId } = render(<StoryCreator onPublish={() => {}} />);
    fireEvent.press(getByTestId('story-media-pick'));
    expect(getByTestId('story-overlay-editor')).toBeTruthy();
  });

  test('captures caption text', () => {
    const { getByTestId } = render(<StoryCreator onPublish={() => {}} />);
    fireEvent.changeText(getByTestId('story-caption-input'), 'sunset');
    expect(getByTestId('story-caption-input').props.value).toBe('sunset');
  });

  test('opens the audience picker', () => {
    const { getByTestId } = render(<StoryCreator onPublish={() => {}} />);
    fireEvent.press(getByTestId('story-audience-button'));
    expect(getByTestId('story-audience-picker')).toBeTruthy();
  });

  test('calls onPublish with the chosen media and caption', () => {
    const onPublish = jest.fn();
    const { getByTestId } = render(<StoryCreator onPublish={onPublish} />);
    fireEvent.press(getByTestId('story-media-pick'));
    fireEvent.changeText(getByTestId('story-caption-input'), 'sunset');
    fireEvent.press(getByTestId('story-publish'));
    expect(onPublish).toHaveBeenCalled();
  });

  test('disables publish when there is no media', () => {
    const onPublish = jest.fn();
    const { getByTestId } = render(<StoryCreator onPublish={onPublish} />);
    fireEvent.press(getByTestId('story-publish'));
    expect(onPublish).not.toHaveBeenCalled();
  });
});
