/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/mention.test.ts
 *
 * Mention parser tests: detection, autocomplete windows, unicode and trailing punctuation handling.
 */

import { parseMentions, findMentionAt, extractUniqueHandles } from '../../src/services/mention';

describe('parseMentions', () => {
  test('extracts simple @username mentions from the body text', () => {
    const result = parseMentions('hello @alice and @bob_42');
    expect(result).toEqual([
      { handle: 'alice', index: 6, length: 6 },
      { handle: 'bob_42', index: 16, length: 7 },
    ]);
  });

  test('ignores email addresses that contain an @ symbol', () => {
    const result = parseMentions('contact me at samet@example.com');
    expect(result).toEqual([]);
  });

  test('respects trailing punctuation boundaries', () => {
    const result = parseMentions('thanks @samet, also @eda.');
    expect(result[0]).toMatchObject({ handle: 'samet' });
    expect(result[1]).toMatchObject({ handle: 'eda' });
  });

  test('accepts unicode display names inside the body text', () => {
    const result = parseMentions('merhaba @Şengül, görüşürüz');
    expect(result[0]).toMatchObject({ handle: 'Şengül' });
  });

  test('returns an empty list when there are no mentions', () => {
    expect(parseMentions('just a normal message')).toEqual([]);
  });

  test('deduplicates repeated mentions across the text', () => {
    const result = parseMentions('@alice @alice @alice');
    expect(result).toHaveLength(3);
    const unique = extractUniqueHandles('@alice @alice @alice');
    expect(unique).toEqual(['alice']);
  });

  test('finds the in-progress mention under the cursor', () => {
    const text = 'hello @al';
    const cursor = text.length;
    const found = findMentionAt(text, cursor);
    expect(found).toMatchObject({ handle: 'al', start: 6 });
  });
});
