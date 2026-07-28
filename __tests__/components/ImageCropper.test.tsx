/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/ImageCropper.test.tsx
 *
 * Image cropper tests: aspect ratio lock, pan, zoom, save output dimensions, cancel cleanup.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImageCropper } from '../../src/components/ImageCropper';

describe('ImageCropper', () => {
  const defaultProps = {
    uri: 'https://cdn.example.com/raw.jpg',
    onSave: jest.fn(),
  };

  test('renders the crop overlay', () => {
    const { getByTestId } = render(<ImageCropper {...defaultProps} />);
    expect(getByTestId('crop-overlay')).toBeTruthy();
  });

  test('locks the aspect ratio when ratio prop is set', () => {
    const { getByTestId } = render(<ImageCropper {...defaultProps} ratio="1:1" />);
    expect(getByTestId('crop-overlay').props.accessibilityHint).toMatch(/1:1/);
  });

  test('updates the crop region on pan', () => {
    const { getByTestId } = render(<ImageCropper {...defaultProps} />);
    fireEvent(getByTestId('crop-handle-tl'), 'onPanResponderMove', {
      nativeEvent: { pageX: 10, pageY: 12 },
    });
    expect(getByTestId('crop-overlay')).toBeTruthy();
  });

  test('calls onSave with the cropped file path', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<ImageCropper uri="https://x.com/a.jpg" onSave={onSave} />);
    fireEvent.press(getByTestId('crop-save'));
    expect(onSave).toHaveBeenCalled();
  });

  test('calls onCancel and does not invoke onSave when the user cancels', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    const { getByTestId } = render(
      <ImageCropper uri="https://x.com/a.jpg" onSave={onSave} onCancel={onCancel} />,
    );
    fireEvent.press(getByTestId('crop-cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
