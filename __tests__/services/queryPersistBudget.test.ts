// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: services/queryPersistBudget.ts
// The persisted query cache must stay small enough for Android AsyncStorage.

import {
  MAX_PERSISTED_CHARS,
  isPersistedRoot,
  serializePersistedClient,
  stripLargeDataUris,
} from '../../services/queryPersistBudget';

const query = (queryKey: unknown[], data: unknown) => ({
  queryKey,
  queryHash: JSON.stringify(queryKey),
  state: { data, dataUpdatedAt: 1, status: 'success' },
});

const client = (queries: ReturnType<typeof query>[]) => ({
  timestamp: 1,
  buster: '1.0.9',
  clientState: { mutations: [{ any: 'thing' }], queries },
});

describe('persisted cache budget', () => {
  it('only persists allowlisted roots', () => {
    expect(isPersistedRoot('feed')).toBe(true);
    expect(isPersistedRoot('chatList')).toBe(false);
    expect(isPersistedRoot('comments')).toBe(false);
    const out = JSON.parse(serializePersistedClient(client([
      query(['feed', 'me'], { pages: [{ posts: [] }], pageParams: [null] }),
      query(['chatList', 'me'], [{ id: 'secret' }]),
    ])));
    expect(out.clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0])).toEqual(['feed']);
    expect(out.clientState.mutations).toEqual([]);
  });

  it('keeps only the first page of infinite queries', () => {
    const out = JSON.parse(serializePersistedClient(client([
      query(['feed', 'me'], { pages: [{ n: 1 }, { n: 2 }, { n: 3 }], pageParams: [null, 'a', 'b'] }),
    ])));
    expect(out.clientState.queries[0].state.data).toEqual({ pages: [{ n: 1 }], pageParams: [null] });
  });

  it('drops large inline data URIs', () => {
    const big = `data:image/webp;base64,${'A'.repeat(5000)}`;
    expect(stripLargeDataUris({ media: big, small: 'data:x', url: 'https://x' }))
      .toEqual({ media: null, small: 'data:x', url: 'https://x' });
  });

  it('stays under the size budget, keeping higher-priority roots', () => {
    const huge = 'x'.repeat(MAX_PERSISTED_CHARS);
    const serialized = serializePersistedClient(client([
      query(['trending'], [{ content: huge }]),
      query(['feed', 'me'], { pages: [{ posts: [{ id: '1' }] }], pageParams: [null] }),
    ]));
    expect(serialized.length).toBeLessThan(MAX_PERSISTED_CHARS);
    const roots = JSON.parse(serialized).clientState.queries.map((q: { queryKey: string[] }) => q.queryKey[0]);
    expect(roots).toEqual(['feed']);
  });
});
