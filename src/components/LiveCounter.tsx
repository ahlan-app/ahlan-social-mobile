/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/components/LiveCounter.tsx
 *
 * feat(live-counter): live counter implementation
 */

import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  initialValue?: number;
  onChange?: (value: number) => void;
  label?: string;
}

export function LiveCounter({ initialValue = 0, onChange, label = 'live-counter' }: Props) {
  const [value, setValue] = React.useState(initialValue);
  React.useEffect(() => onChange?.(value), [value]);
  return (
    <View testID='live-counter-root'>
      <Text testID='live-counter-label'>{label}</Text>
      <Text testID='live-counter-value'>{value}</Text>
    </View>
  );
}
