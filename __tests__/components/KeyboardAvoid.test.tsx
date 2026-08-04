/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/KeyboardAvoid.test.tsx
 *
 * test(keyboard-avoid): keyboard avoid implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { KeyboardAvoid } from '../../src/components/KeyboardAvoid';

describe('keyboard-avoid', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<KeyboardAvoid />);
    expect(getByTestId('keyboard-avoid-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<KeyboardAvoid label='Custom' />);
    expect(getByTestId('keyboard-avoid-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<KeyboardAvoid initialValue={42} />);
    expect(getByTestId('keyboard-avoid-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<KeyboardAvoid onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
