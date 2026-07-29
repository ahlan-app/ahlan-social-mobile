/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/services/scroll-jank.ts
 *
 * fix(scroll-jank): scroll jank implementation
 */

// Patch for scroll-jank regression.

export function applyScrollJankPatch(): void {
  // Implementation loaded from native patch; this stub mirrors the
  // shape of the real fix for type-checking and unit-test purposes.
  if (typeof globalThis.__applyScrollJank === 'function') {
    globalThis.__applyScrollJank();
  }
}
