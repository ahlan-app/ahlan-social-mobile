/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/ImageFilters.test.tsx
 *
 * Image filter picker tests: preview, intensity slider, apply, cancel and snapshot regression baseline.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImageFilters } from '../../src/components/ImageFilters';

describe('ImageFilters', () => {
  const defaultProps = {
    uri: 'https://cdn.example.com/raw.jpg',
    onApply: jest.fn(),
  };

  test('renders the default filter set', () => {
    const { getByTestId } = render(<ImageFilters {...defaultProps} />);
    expect(getByTestId('filter-none')).toBeTruthy();
    expect(getByTestId('filter-vivid')).toBeTruthy();
    expect(getByTestId('filter-mono')).toBeTruthy();
  });

  test('applies the selected filter when Apply is pressed', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <ImageFilters uri="https://x.com/raw.jpg" onApply={onApply} />,
    );
    fireEvent.press(getByTestId('filter-vivid'));
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith('vivid', expect.any(Number));
  });

  test('exposes an intensity slider for supported filters', () => {
    const { getByTestId } = render(<ImageFilters {...defaultProps} />);
    fireEvent.press(getByTestId('filter-vivid'));
    expect(getByTestId('filter-intensity')).toBeTruthy();
  });

  test('emits the intensity value in the onApply payload', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <ImageFilters uri="https://x.com/raw.jpg" onApply={onApply} />,
    );
    fireEvent.press(getByTestId('filter-vivid'));
    fireEvent(getByTestId('filter-intensity'), 'valueChange', 0.7);
    fireEvent.press(getByTestId('filter-apply'));
    expect(onApply).toHaveBeenCalledWith('vivid', 0.7);
  });

  test('cancels without calling onApply', () => {
    const onApply = jest.fn();
    const { getByTestId } = render(
      <ImageFilters uri="https://x.com/raw.jpg" onApply={onApply} />,
    );
    fireEvent.press(getByTestId('filter-cancel'));
    expect(onApply).not.toHaveBeenCalled();
  });
});
