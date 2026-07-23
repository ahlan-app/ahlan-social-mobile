/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/Onboarding.test.tsx
 *
 * Onboarding flow tests: permission prompts, skip behaviour, progress state, and final CTA.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Onboarding } from '../../src/components/Onboarding';

describe('Onboarding', () => {
  const steps = [
    { id: 'welcome', kind: 'intro' as const, title: 'Welcome to Ahlan' },
    { id: 'camera', kind: 'permission' as const, title: 'Camera access' },
    { id: 'notifications', kind: 'permission' as const, title: 'Notifications' },
  ];

  test('renders the welcome step first', () => {
    const { getByText } = render(<Onboarding steps={steps} onComplete={() => {}} />);
    expect(getByText('Welcome to Ahlan')).toBeTruthy();
  });

  test('advances to the next step on Continue', () => {
    const { getByText, queryByText } = render(
      <Onboarding steps={steps} onComplete={() => {}} />,
    );
    fireEvent.press(getByText('Continue'));
    expect(queryByText('Welcome to Ahlan')).toBeNull();
    expect(getByText('Camera access')).toBeTruthy();
  });

  test('Skip is allowed for permission steps', () => {
    const { getByText } = render(<Onboarding steps={steps} onComplete={() => {}} />);
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Skip'));
    expect(getByText('Notifications')).toBeTruthy();
  });

  test('calls onComplete when the user finishes the last step', () => {
    const onComplete = jest.fn();
    const { getByText } = render(<Onboarding steps={steps} onComplete={onComplete} />);
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Allow'));
    fireEvent.press(getByText('Allow'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('hides Skip when allowSkip is false', () => {
    const { queryByText, getByText } = render(
      <Onboarding steps={steps} onComplete={() => {}} allowSkip={false} />,
    );
    fireEvent.press(getByText('Continue'));
    expect(queryByText('Skip')).toBeNull();
  });
});
