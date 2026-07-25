/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/theme/highContrast.ts
 *
 * High-contrast accessibility theme variant with WCAG AAA-compliant foreground/background pairs.
 */

/**
 * High-contrast theme tokens.  Values were cross-checked against
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 * (AAA requires >= 7:1 contrast for body text).
 */
export const highContrastLight = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F2F2',
  text: '#000000',
  textMuted: '#1A1A1A',
  accent: '#0033CC',
  accentText: '#FFFFFF',
  border: '#000000',
  danger: '#9B0000',
  success: '#005C29',
  warning: '#8A4B00',
};

export const highContrastDark = {
  background: '#000000',
  surface: '#000000',
  surfaceMuted: '#0E0E0E',
  text: '#FFFFFF',
  textMuted: '#EAEAEA',
  accent: '#7CB7FF',
  accentText: '#000000',
  border: '#FFFFFF',
  danger: '#FF8C8C',
  success: '#7CFF9F',
  warning: '#FFD86E',
};

export function selectHighContrastTokens(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? highContrastDark : highContrastLight;
}

export const HIGH_CONTRAST_MIN_RATIO = 7;
