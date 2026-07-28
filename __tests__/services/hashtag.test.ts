/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/hashtag.test.ts
 *
 * Hashtag parsing tests: detection in body text, unicode tag characters, deduplication, tap-to-search routing.
 */

import { parseHashtags, normaliseHashtag } from '../../src/services/hashtag';

describe('parseHashtags', () => {
  test('finds simple ASCII hashtags', () => {
    expect(parseHashtags('loving #cats and #dogs42')).toEqual(['cats', 'dogs42']);
  });

  test('strips trailing punctuation', () => {
    expect(parseHashtags('great show #yay!')).toEqual(['yay']);
  });

  test('keeps unicode characters inside the tag', () => {
    expect(parseHashtags('şehir dışı #İstanbul')).toEqual(['İstanbul']);
  });

  test('ignores hashtags that begin with a digit', () => {
    expect(parseHashtags('not a tag: #42things')).toEqual([]);
  });

  test('deduplicates while preserving first-seen order', () => {
    expect(parseHashtags('#cats #dogs #cats')).toEqual(['cats', 'dogs']);
  });
});

describe('normaliseHashtag', () => {
  test('lowercases ASCII and trims whitespace', () => {
    expect(normaliseHashtag('  CATs ')).toBe('cats');
  });
});
