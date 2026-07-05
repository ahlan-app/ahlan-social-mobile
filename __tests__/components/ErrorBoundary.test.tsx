/**
 * @jest-environment jsdom
 *
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/ErrorBoundary.test.tsx
 *
 * Tests for `components/ErrorBoundary.tsx`. The boundary is a React class
 * component, so we need a real DOM to mount it. We use `react-dom/client`
 * + `act`, mirroring the strategy in `useAppContext.test.tsx`, and stub
 * `react-native` so the boundary's StyleSheet / Pressable / View / Text
 * imports resolve against lightweight DOM-friendly shims without
 * dragging the native runtime into jsdom.
 *
 * Coverage targets:
 *   1. Crash recovery — a child that throws is caught and the fallback
 *      renders instead of bubbling the error.
 *   2. Fallback UI renders — the default fallback exposes a retry button
 *      and the original error message.
 *   3. Retry button triggers re-render — pressing Retry resets the
 *      boundary so the children are rendered again.
 *   4. Custom fallback — the `fallback` prop overrides the default UI.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ─── 1. Mock react-native ────────────────────────────────────────────────
// We only need Pressable / View / Text / StyleSheet to behave enough to
// exercise the ErrorBoundary contract. Pressable's `onPress` is the
// integration point for the retry-button test, so we faithfully forward
// it; the rest just produce DOM nodes the tests can query.

jest.mock('react-native', () => {
  const React = require('react');

  const flattenStyle = (style: unknown): React.CSSProperties => {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.reduce<React.CSSProperties>(
        (acc, s) => ({ ...acc, ...flattenStyle(s) }),
        {},
      );
    }
    if (typeof style === 'function') {
      try {
        return flattenStyle(style({ pressed: false }));
      } catch {
        return {};
      }
    }
    return style as React.CSSProperties;
  };

  const passthroughProps = (props: Record<string, unknown>) => {
    const {
      style,
      children,
      testID,
      onPress,
      accessibilityRole,
      ...rest
    } = props;
    // React Native uses `testID`; under jsdom HTML attributes are
    // lowercased so a plain `testID` prop surfaces as `testid`. Rewrite
    // it to `data-testid` so the test queries work the same way they do
    // under @testing-library/react-native.
    const domProps: Record<string, unknown> = { ...rest };
    if (typeof testID === 'string') {
      domProps['data-testid'] = testID;
    }
    if (accessibilityRole !== undefined) {
      domProps['data-accessibility-role'] = accessibilityRole;
    }
    domProps.style = flattenStyle(style);
    return domProps;
  };

  const View: React.FC<React.PropsWithChildren<Record<string, unknown>>> = (
    props,
  ) => React.createElement('div', passthroughProps(props), props.children);

  const Text: React.FC<React.PropsWithChildren<Record<string, unknown>>> = (
    props,
  ) => React.createElement('span', passthroughProps(props), props.children);

  const Pressable: React.FC<
    React.PropsWithChildren<{
      onPress?: (e?: unknown) => void;
      style?: unknown;
      testID?: string;
      accessibilityRole?: string;
    }>
  > = ({ onPress, ...props }) =>
    React.createElement(
      'button',
      {
        ...passthroughProps(props),
        onClick: onPress,
        type: 'button',
      },
      props.children,
    );

  return {
    __esModule: true,
    View,
    Text,
    Pressable,
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T): T => styles,
    },
  };
});

// ─── 2. Imports under test ──────────────────────────────────────────────
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// ─── 3. Helpers ─────────────────────────────────────────────────────────

interface MountHandle {
  root: Root;
  container: HTMLDivElement;
}

function mount(element: React.ReactElement): MountHandle {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { root, container };
}

function unmount(handle: MountHandle): void {
  act(() => {
    handle.root.unmount();
  });
  handle.container.remove();
}

/**
 * A child component that throws on render, but only when `shouldThrow`
 * is true. The toggle lets us simulate a "transient" failure that the
 * retry button is supposed to clear.
 */
interface BoomProps {
  shouldThrow: boolean;
  message?: string;
}
const Boom: React.FC<BoomProps> = ({ shouldThrow, message = 'boom' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return React.createElement(
    'div',
    { 'data-testid': 'boom-ok' },
    'recovered',
  );
};

/**
 * Builds a stateful wrapper component that owns the props for the Boom
 * child. This is the workaround for a well-known React quirk: when a
 * parent re-renders, the children it returns via `this.props.children`
 * are the same React elements it created last time, so children that
 * close over primitive props won't see updated values unless the
 * wrapping host re-creates them. By forcing Boom to live inside a
 * stateful `Host`, we get a fresh `Boom` element on every state change
 * — which is exactly how a real consumer of ErrorBoundary would wire it.
 */
function makeWrapper(initial: BoomProps): {
  Host: React.FC;
  setProps(next: BoomProps): void;
} {
  let current: BoomProps = initial;
  let bump: (() => void) | null = null;
  const Host: React.FC = () => {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    bump = force;
    return React.createElement(Boom, current);
  };
  return {
    Host,
    setProps(next: BoomProps) {
      current = next;
      if (bump) bump();
    },
  };
}

// ─── 4. Tests ───────────────────────────────────────────────────────────

describe('ErrorBoundary — crash recovery', () => {
  // We expect Boom to throw while in an error state. The boundary catches
  // the error so React doesn't log it as an unhandled error and fail the
  // test run. Without this, jsdom's console.error would also fail the
  // test under strict config.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('catches a render-time exception and renders the fallback UI', () => {
    const handle = mount(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(Boom, { shouldThrow: true, message: 'crash!' }),
      ),
    );
    try {
      // The fallback container must be in the DOM and the original child
      // must NOT be — confirming the boundary swallowed the error and
      // replaced the children tree.
      const fallback = handle.container.querySelector(
        '[data-testid="error-boundary-fallback"]',
      );
      expect(fallback).not.toBeNull();
      const recovered = handle.container.querySelector(
        '[data-testid="boom-ok"]',
      );
      expect(recovered).toBeNull();
    } finally {
      unmount(handle);
    }
  });

  it('exposes the original error message in the default fallback', () => {
    const handle = mount(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(Boom, { shouldThrow: true, message: 'kapow' }),
      ),
    );
    try {
      const messageNode = handle.container.querySelector(
        '[data-testid="error-boundary-message"]',
      );
      expect(messageNode).not.toBeNull();
      expect(messageNode?.textContent).toBe('kapow');
      // The retry button must be present in the default fallback.
      const retry = handle.container.querySelector(
        '[data-testid="error-boundary-retry"]',
      );
      expect(retry).not.toBeNull();
    } finally {
      unmount(handle);
    }
  });
});

describe('ErrorBoundary — retry triggers re-render', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('pressing Retry resets error state and renders children again', () => {
    // A toggle that the wrapper re-reads on every render. The wrapper
    // component holds the source of truth and re-creates the Boom
    // element when the flag flips — mirroring how a real consumer of
    // ErrorBoundary would control its children (via a parent component's
    // state).
    const wrapper = makeWrapper({ shouldThrow: true, message: 'first crash' });

    const handle = mount(
      React.createElement(
        ErrorBoundary,
        { onReset: () => {/* hook for any future assertions */} },
        React.createElement(wrapper.Host, null),
      ),
    );
    try {
      // 1. Initially: boundary is in error state, fallback is rendered.
      expect(
        handle.container.querySelector('[data-testid="error-boundary-fallback"]'),
      ).not.toBeNull();
      expect(
        handle.container.querySelector('[data-testid="boom-ok"]'),
      ).toBeNull();

      // 2. Pretend the underlying cause was fixed, then press Retry.
      wrapper.setProps({ shouldThrow: false, message: 'first crash' });
      const retry = handle.container.querySelector(
        '[data-testid="error-boundary-retry"]',
      ) as HTMLButtonElement | null;
      expect(retry).not.toBeNull();
      act(() => {
        retry?.click();
      });

      // 3. After retry: fallback is gone, children render normally.
      expect(
        handle.container.querySelector('[data-testid="error-boundary-fallback"]'),
      ).toBeNull();
      const recovered = handle.container.querySelector(
        '[data-testid="boom-ok"]',
      );
      expect(recovered).not.toBeNull();
      expect(recovered?.textContent).toBe('recovered');
    } finally {
      unmount(handle);
    }
  });

  it('invokes onReset exactly once per retry press', () => {
    const onReset = jest.fn();
    const wrapper = makeWrapper({ shouldThrow: true });

    const handle = mount(
      React.createElement(
        ErrorBoundary,
        { onReset },
        React.createElement(wrapper.Host, null),
      ),
    );
    try {
      // First retry press → onReset called once, then Boom re-renders
      // with shouldThrow=true again, boundary catches, fallback shows.
      // Re-query the retry button (the previous DOM node was unmounted
      // when the fallback re-rendered).
      let retry = handle.container.querySelector(
        '[data-testid="error-boundary-retry"]',
      ) as HTMLButtonElement | null;
      act(() => {
        retry?.click();
      });
      expect(onReset).toHaveBeenCalledTimes(1);

      // Flip the underlying state so the second retry succeeds and we
      // can verify the second call to onReset actually fired.
      wrapper.setProps({ shouldThrow: false });
      retry = handle.container.querySelector(
        '[data-testid="error-boundary-retry"]',
      ) as HTMLButtonElement | null;
      act(() => {
        retry?.click();
      });
      expect(onReset).toHaveBeenCalledTimes(2);
    } finally {
      unmount(handle);
    }
  });
});

describe('ErrorBoundary — custom fallback', () => {
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders the provided fallback instead of the default UI', () => {
    const handle = mount(
      React.createElement(
        ErrorBoundary,
        {
          fallback: React.createElement(
            'div',
            { 'data-testid': 'custom-fallback' },
            'custom ui',
          ),
        },
        React.createElement(Boom, { shouldThrow: true }),
      ),
    );
    try {
      const custom = handle.container.querySelector(
        '[data-testid="custom-fallback"]',
      );
      expect(custom).not.toBeNull();
      expect(custom?.textContent).toBe('custom ui');
      // The default fallback container must not be present when a custom
      // fallback is supplied.
      expect(
        handle.container.querySelector('[data-testid="error-boundary-fallback"]'),
      ).toBeNull();
    } finally {
      unmount(handle);
    }
  });
});