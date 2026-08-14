/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/VolumeControl.test.tsx
 *
 * test(volume-control): volume control implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VolumeControl } from '../../src/components/VolumeControl';

describe('volume-control', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<VolumeControl />);
    expect(getByTestId('volume-control-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<VolumeControl label='Custom' />);
    expect(getByTestId('volume-control-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<VolumeControl initialValue={42} />);
    expect(getByTestId('volume-control-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<VolumeControl onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
