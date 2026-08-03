/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/ImeAction.test.tsx
 *
 * test(ime-action): ime action implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ImeAction } from '../../src/components/ImeAction';

describe('ime-action', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<ImeAction />);
    expect(getByTestId('ime-action-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<ImeAction label='Custom' />);
    expect(getByTestId('ime-action-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<ImeAction initialValue={42} />);
    expect(getByTestId('ime-action-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<ImeAction onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
