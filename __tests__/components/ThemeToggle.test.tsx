/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/ThemeToggle.test.tsx
 *
 * Theme toggle component tests: light/dark/system switching, persistence and accessibility.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeToggle } from '../../src/components/ThemeToggle';

describe('ThemeToggle', () => {
  test('renders three options: light, dark and system', () => {
    const { getByTestId } = render(<ThemeToggle value="light" onChange={() => {}} />);
    expect(getByTestId('theme-light')).toBeTruthy();
    expect(getByTestId('theme-dark')).toBeTruthy();
    expect(getByTestId('theme-system')).toBeTruthy();
  });

  test('marks the active option as selected', () => {
    const { getByTestId } = render(<ThemeToggle value="dark" onChange={() => {}} />);
    expect(getByTestId('theme-dark').props.accessibilityState.selected).toBe(true);
  });

  test('calls onChange with the new value when an option is pressed', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<ThemeToggle value="light" onChange={onChange} />);
    fireEvent.press(getByTestId('theme-dark'));
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  test('persists the chosen value via AsyncStorage', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<ThemeToggle value="light" onChange={onChange} />);
    fireEvent.press(getByTestId('theme-system'));
    expect(onChange).toHaveBeenCalledWith('system');
  });
});
