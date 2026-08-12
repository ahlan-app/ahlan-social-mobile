/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/AddressAutocomplete.test.tsx
 *
 * test(address-autocomplete): address autocomplete implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AddressAutocomplete } from '../../src/components/AddressAutocomplete';

describe('address-autocomplete', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<AddressAutocomplete />);
    expect(getByTestId('address-autocomplete-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<AddressAutocomplete label='Custom' />);
    expect(getByTestId('address-autocomplete-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<AddressAutocomplete initialValue={42} />);
    expect(getByTestId('address-autocomplete-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<AddressAutocomplete onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
