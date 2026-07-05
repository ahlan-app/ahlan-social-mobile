// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: components/ErrorBoundary.tsx
//
// A React error boundary that catches render-time exceptions thrown by
// its children and renders a fallback UI instead. The fallback includes a
// "Retry" button that, when pressed, resets the internal error state and
// re-renders the children — giving consumers a way to recover from
// transient failures (network blips, race conditions, etc.) without
// remounting the whole tree.
//
// Usage:
//   <ErrorBoundary>
//     <SomeUnstableComponent />
//   </ErrorBoundary>
//
// Optional props:
//   - `fallback`: a custom ReactNode to render instead of the default UI.
//     Useful for tests or branded screens.
//   - `onError`: a callback invoked with the caught error and the React
//     error info; useful for logging.
//   - `onReset`: a callback invoked whenever the user presses "Retry".

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ErrorBoundaryProps {
  /**
   * The subtree to render when no error is present. Marked optional in
   * the type because JSX children are supplied positionally and the
   * component can be used purely for its fallback rendering; runtime
   * undefined is treated as rendering nothing.
   */
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const INITIAL_STATE: ErrorBoundaryState = { hasError: false, error: null };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // React invokes this during the render phase. Returning a new state
    // object flips the boundary into its fallback UI on the next render.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Side-effects (logging, telemetry) belong here, not in
    // getDerivedStateFromError. We honour the optional onError prop so
    // hosts can plug their own reporter.
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  /**
   * Reset internal error state and notify the host via `onReset`. Called
   * by the "Retry" button in the default fallback UI; consumers can also
   * expose it through a ref if they need to programmatically recover.
   */
  reset = (): void => {
    this.setState(INITIAL_STATE);
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render(): React.ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <View style={styles.container} testID="error-boundary-fallback">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message} testID="error-boundary-message">
          {error?.message ?? 'Unknown error'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={this.reset}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          testID="error-boundary-retry"
        >
          <Text style={styles.buttonLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1f6feb',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default ErrorBoundary;