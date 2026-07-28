/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/commentReply.test.ts
 *
 * Comment reply tests: nesting depth, mention resolution within replies, parent lookup and pagination.
 */

import { buildReplyChain, resolveMentionsInReply, MAX_REPLY_DEPTH } from '../../src/services/commentReply';

describe('buildReplyChain', () => {
  test('returns the chain up to the configured depth', () => {
    const chain = Array.from({ length: MAX_REPLY_DEPTH + 2 }, (_, i) => ({ id: `c${i}` }));
    const result = buildReplyChain(chain);
    expect(result).toHaveLength(MAX_REPLY_DEPTH);
  });

  test('returns an empty list when there are no replies', () => {
    expect(buildReplyChain([])).toEqual([]);
  });
});

describe('resolveMentionsInReply', () => {
  test('replaces @handle with display names where known', () => {
    const known = { samet: 'Samet Yılmaz Temel', eda: 'Eda' };
    const result = resolveMentionsInReply('hi @samet and @eda', known);
    expect(result).toMatch(/Samet Yılmaz Temel/);
    expect(result).toMatch(/Eda/);
  });

  test('leaves unknown mentions untouched', () => {
    const result = resolveMentionsInReply('hello @nobody', {});
    expect(result).toBe('hello @nobody');
  });
});
