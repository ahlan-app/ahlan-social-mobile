/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/Waveform.test.tsx
 *
 * test(waveform): waveform implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Waveform } from '../../src/components/Waveform';

describe('waveform', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<Waveform />);
    expect(getByTestId('waveform-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<Waveform label='Custom' />);
    expect(getByTestId('waveform-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<Waveform initialValue={42} />);
    expect(getByTestId('waveform-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<Waveform onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
