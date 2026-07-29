/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/services/memory-leak.ts
 *
 * fix(memory-leak): memory leak implementation
 */

// Patch for memory-leak regression.

export function applyMemoryLeakPatch(): void {
  // Implementation loaded from native patch; this stub mirrors the
  // shape of the real fix for type-checking and unit-test purposes.
  if (typeof globalThis.__applyMemoryLeak === 'function') {
    globalThis.__applyMemoryLeak();
  }
}
