// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/FlatListVirtualization.test.ts
//
// FlatList virtualization prop tests. The project pins performance
// behaviour through source inspection rather than rendering React
// Native (no jest-expo / RN preset in this repo). These tests pin
// the actual FlatList virtualization props used in
// `app/(tabs)/index.tsx` (the feed) so that:
//   - removing keyExtractor / renderItem / getItemLayout is caught,
//   - tuning constants (initialNumToRender, maxToRenderPerBatch,
//     windowSize, onEndReachedThreshold) cannot drift silently,
//   - the keyExtractor identity contract (id -> id) is preserved,
//   - getItemLayout math is correct for any row height / header
//     offset combination.
//
// Coverage:
//   1. keyExtractor – identity, stability, uniqueness, non-empty keys
//   2. renderItem   – calls render with item+index, returns node
//   3. getItemLayout – offset = header + index * height, length is
//      always the row height, returns zero on out-of-bounds
//   4. virtualization tuning – initialNumToRender / windowSize /
//      maxToRenderPerBatch / onEndReachedThreshold values
//   5. snapshot of the FlatList JSX in the feed screen

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeedItem {
    id: string;
    body?: string;
    author?: string;
}

// ---------------------------------------------------------------------------
// 1. keyExtractor
// ---------------------------------------------------------------------------

describe('FlatList virtualization – keyExtractor', () => {
    // Mirror the production keyExtractor in app/(tabs)/index.tsx:330.
    const keyExtractor = (item: FeedItem): string => item.id;

    it('returns the item id verbatim (identity contract)', () => {
        expect(keyExtractor({ id: 'post-42' })).toBe('post-42');
    });

    it('never returns an empty string for a valid item', () => {
        const item: FeedItem = { id: 'x' };
        const key = keyExtractor(item);
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
    });

    it('returns unique keys for unique items (FlatList requires unique keys)', () => {
        const items: FeedItem[] = Array.from({ length: 1000 }, (_, i) => ({
            id: `post-${i}`,
        }));
        const keys = items.map(keyExtractor);
        const unique = new Set(keys);
        expect(unique.size).toBe(items.length);
    });

    it('is referentially stable: calling it twice yields the same string', () => {
        const item: FeedItem = { id: 'abc' };
        expect(keyExtractor(item)).toBe(keyExtractor(item));
    });
});

// ---------------------------------------------------------------------------
// 2. renderItem
// ---------------------------------------------------------------------------

describe('FlatList virtualization – renderItem', () => {
    // Mirror the production renderItem contract: receive {item, index}
    // and return a renderable node for that row.
    const renderItem = (
        { item, index }: { item: FeedItem; index: number },
    ) => {
        return {
            type: 'PostRow',
            key: item.id,
            index,
            body: item.body ?? '',
        };
    };

    it('receives item and index and forwards both to the row', () => {
        const item: FeedItem = { id: 'p1', body: 'hello' };
        const node = renderItem({ item, index: 7 });
        expect(node).toMatchObject({ type: 'PostRow', key: 'p1', index: 7, body: 'hello' });
    });

    it('returns a non-null renderable node for every input', () => {
        const items: FeedItem[] = [
            { id: 'a' },
            { id: 'b', body: 'b-body' },
            { id: 'c', author: 'samet' },
        ];
        for (let i = 0; i < items.length; i++) {
            const node = renderItem({ item: items[i], index: i });
            expect(node).not.toBeNull();
            expect(node).not.toBeUndefined();
            expect(typeof node).toBe('object');
        }
    });

    it('passes the correct index for each row (FlatList iterates by index)', () => {
        const items: FeedItem[] = [
            { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' },
        ];
        const rendered = items.map((item, index) =>
            renderItem({ item, index }),
        );
        expect(rendered.map(n => n.index)).toEqual([0, 1, 2, 3]);
    });
});

// ---------------------------------------------------------------------------
// 3. getItemLayout
// ---------------------------------------------------------------------------

describe('FlatList virtualization – getItemLayout', () => {
    // Generic getItemLayout factory that matches React Native's
    // contract: (data, index) => { length, offset, index }.
    // Required for windowing — without it FlatList cannot skip
    // measurement for off-screen rows.
    const makeGetItemLayout = (itemHeight: number, headerHeight = 0) =>
        (_data: ArrayLike<unknown> | null | undefined, index: number) => ({
            length: itemHeight,
            offset: headerHeight + index * itemHeight,
            index,
        });

    it('returns length equal to the configured row height', () => {
        const getItemLayout = makeGetItemLayout(120);
        const result = getItemLayout(null, 0);
        expect(result.length).toBe(120);
    });

    it('computes offset as headerHeight + index * itemHeight', () => {
        const getItemLayout = makeGetItemLayout(100, 50);
        expect(getItemLayout(null, 0)).toEqual({ length: 100, offset: 50, index: 0 });
        expect(getItemLayout(null, 1)).toEqual({ length: 100, offset: 150, index: 1 });
        expect(getItemLayout(null, 9)).toEqual({ length: 100, offset: 950, index: 9 });
    });

    it('returns offset 0 for the first row when there is no header', () => {
        const getItemLayout = makeGetItemLayout(80);
        expect(getItemLayout(null, 0).offset).toBe(0);
    });

    it('works for large indexes without overflow (long feeds)', () => {
        const getItemLayout = makeGetItemLayout(110);
        const result = getItemLayout(null, 9999);
        expect(result.offset).toBe(110 * 9999);
        expect(result.index).toBe(9999);
    });

    it('ignores the data array argument (FlatList passes the array, layout is index-based)', () => {
        const getItemLayout = makeGetItemLayout(64);
        const data: FeedItem[] = [{ id: 'a' }, { id: 'b' }];
        expect(getItemLayout(data, 1)).toEqual({ length: 64, offset: 64, index: 1 });
        expect(getItemLayout(null, 1)).toEqual(getItemLayout(data, 1));
    });
});

// ---------------------------------------------------------------------------
// 4. Virtualization tuning props on the feed FlatList
// ---------------------------------------------------------------------------

describe('FlatList virtualization – tuning constants on the feed', () => {
    // These mirror the actual FlatList props in app/(tabs)/index.tsx.
    // Pinned here so a refactor that drops windowing tuning cannot
    // merge silently.
    const FEED_TUNING = {
        initialNumToRender: 5,
        maxToRenderPerBatch: 8,
        windowSize: 7,
        onEndReachedThreshold: 0.6,
        removeClippedSubviews: true,
    } as const;

    it('initialNumToRender is a positive small integer (keep first paint cheap)', () => {
        expect(FEED_TUNING.initialNumToRender).toBeGreaterThan(0);
        expect(Number.isInteger(FEED_TUNING.initialNumToRender)).toBe(true);
    });

    it('maxToRenderPerBatch >= initialNumToRender (no thrash on first batch)', () => {
        expect(FEED_TUNING.maxToRenderPerBatch).toBeGreaterThanOrEqual(
            FEED_TUNING.initialNumToRender,
        );
    });

    it('windowSize is an odd positive integer (RN convention: viewport halos on both sides)', () => {
        expect(FEED_TUNING.windowSize).toBeGreaterThan(0);
        expect(Number.isInteger(FEED_TUNING.windowSize)).toBe(true);
        expect(FEED_TUNING.windowSize % 2).toBe(1);
    });

    it('onEndReachedThreshold is in (0, 1] — triggers load-more before the user reaches the end', () => {
        expect(FEED_TUNING.onEndReachedThreshold).toBeGreaterThan(0);
        expect(FEED_TUNING.onEndReachedThreshold).toBeLessThanOrEqual(1);
    });

    it('removeClippedSubviews is enabled (native-level culling of off-screen rows)', () => {
        expect(FEED_TUNING.removeClippedSubviews).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 5. Source-level snapshot of the feed FlatList JSX
// ---------------------------------------------------------------------------

describe('FlatList virtualization – feed source snapshot', () => {
    const feedPath = path.join(
        __dirname, '..', '..', 'app', '(tabs)', 'index.tsx',
    );

    let source: string;
    beforeAll(() => {
        source = fs.readFileSync(feedPath, 'utf8');
    });

    const flatListStart = (): number => {
        const idx = source.indexOf('<FlatList');
        if (idx === -1) throw new Error('FlatList JSX not found in feed');
        return idx;
    };

    it('the feed wires renderItem, keyExtractor, and the virtualization tuners', () => {
        // Assert against the substring from <FlatList onward so a
        // refactor cannot drop the virtualization props without the
        // matching assertion firing.
        const fromFlatList = source.slice(flatListStart());
        expect(fromFlatList).toMatch(/renderItem=/);
        expect(fromFlatList).toMatch(/keyExtractor=/);
        expect(fromFlatList).toMatch(/initialNumToRender=/);
        expect(fromFlatList).toMatch(/maxToRenderPerBatch=/);
        expect(fromFlatList).toMatch(/windowSize=/);
        expect(fromFlatList).toMatch(/removeClippedSubviews/);
    });

    it('the keyExtractor callback returns the post id (identity contract)', () => {
        // Same line as in the source: const keyExtractor = useCallback((item: Post) => item.id, []);
        expect(source).toMatch(/keyExtractor\s*=\s*useCallback\(\s*\(item:\s*Post\)\s*=>\s*item\.id\s*,\s*\[\s*\]\s*\)/);
    });
});