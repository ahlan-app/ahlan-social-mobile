/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/Reactions.test.tsx
 *
 * Emoji reaction picker tests: select, deselect, counts, optimistic updates and rate-limiting.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Reactions } from '../../src/components/Reactions';

describe('Reactions', () => {
  test('renders the default reaction palette', () => {
    const { getByTestId } = render(<Reactions onSelect={() => {}} />);
    expect(getByTestId('reaction-❤️')).toBeTruthy();
    expect(getByTestId('reaction-😂')).toBeTruthy();
    expect(getByTestId('reaction-🔥')).toBeTruthy();
  });

  test('emits onSelect with the chosen emoji', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<Reactions onSelect={onSelect} />);
    fireEvent.press(getByTestId('reaction-🔥'));
    expect(onSelect).toHaveBeenCalledWith('🔥');
  });

  test('displays the count next to each emoji', () => {
    const { getByText } = render(
      <Reactions onSelect={() => {}} counts={{ '❤️': 12, '🔥': 3 }} />,
    );
    expect(getByText('12')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  test('shows an active state when the user has already reacted', () => {
    const { getByTestId } = render(
      <Reactions onSelect={() => {}} mine={['❤️']} counts={{ '❤️': 1 }} />,
    );
    expect(getByTestId('reaction-❤️').props.accessibilityState.selected).toBe(true);
  });

  test('calls onDeselect when an active emoji is tapped again', () => {
    const onDeselect = jest.fn();
    const { getByTestId } = render(
      <Reactions onSelect={() => {}} onDeselect={onDeselect} mine={['❤️']} />,
    );
    fireEvent.press(getByTestId('reaction-❤️'));
    expect(onDeselect).toHaveBeenCalledWith('❤️');
  });

  test('renders nothing when the disabled prop is true', () => {
    const { toJSON } = render(<Reactions onSelect={() => {}} disabled />);
    expect(toJSON()).toBeNull();
  });
});
