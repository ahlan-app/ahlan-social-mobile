// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Local ambient declarations for test-only modules without bundled types.
// `@types/react-dom` is not installed; we declare the minimum surface we
// need from `react-dom/client` and `react-dom/test-utils` for the
// hook/provider tests in `__tests__/useAppContext.test.tsx`.

declare module 'react-dom/client' {
  import type { ReactNode, ReactElement } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare module 'react-dom/test-utils' {
  export function act(callback: () => void | Promise<void>): Promise<void>;
}
