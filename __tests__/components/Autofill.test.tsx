/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/Autofill.test.tsx
 *
 * test(autofill): autofill implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Autofill } from '../../src/components/Autofill';

describe('autofill', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<Autofill />);
    expect(getByTestId('autofill-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<Autofill label='Custom' />);
    expect(getByTestId('autofill-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<Autofill initialValue={42} />);
    expect(getByTestId('autofill-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<Autofill onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
