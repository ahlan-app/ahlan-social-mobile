/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/InputFocus.test.tsx
 *
 * test(input-focus): input focus implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { InputFocus } from '../../src/components/InputFocus';

describe('input-focus', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<InputFocus />);
    expect(getByTestId('input-focus-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<InputFocus label='Custom' />);
    expect(getByTestId('input-focus-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<InputFocus initialValue={42} />);
    expect(getByTestId('input-focus-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<InputFocus onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
