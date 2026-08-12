/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/MapView.test.tsx
 *
 * test(map-view): map view implementation
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapView } from '../../src/components/MapView';

describe('map-view', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<MapView />);
    expect(getByTestId('map-view-root')).toBeTruthy();
  });

  test('renders the configured label', () => {
    const { getByTestId } = render(<MapView label='Custom' />);
    expect(getByTestId('map-view-label')).toBeTruthy();
  });

  test('renders the initial value', () => {
    const { getByTestId } = render(<MapView initialValue={42} />);
    expect(getByTestId('map-view-value')).toBeTruthy();
  });

  test('calls onChange when the value updates', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<MapView onChange={onChange} />);
    expect(onChange).toHaveBeenCalled();
  });
});
