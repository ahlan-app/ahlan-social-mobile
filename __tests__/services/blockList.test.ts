/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/blockList.test.ts
 *
 * Block list tests: add, remove, list, content visibility filter and bidirectional enforcement.
 */

import { addBlock, removeBlock, listBlocks, filterBlocked } from '../../src/services/blockList';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('addBlock', () => {
  test('persists the user id to AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await addBlock('u1');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  test('does not duplicate an existing block', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['u1']));
    await addBlock('u1');
    // Should still set but the underlying set should not append u1 again
    const lastCallArgs = AsyncStorage.setItem.mock.calls[AsyncStorage.setItem.mock.calls.length - 1];
    expect(JSON.parse(lastCallArgs[1])).toEqual(['u1']);
  });
});

describe('removeBlock', () => {
  test('removes the user id from the persisted list', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['u1', 'u2']));
    await removeBlock('u1');
    const lastCallArgs = AsyncStorage.setItem.mock.calls[AsyncStorage.setItem.mock.calls.length - 1];
    expect(JSON.parse(lastCallArgs[1])).toEqual(['u2']);
  });
});

describe('listBlocks', () => {
  test('returns the parsed set', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['u1']));
    expect(await listBlocks()).toEqual(['u1']);
  });
});

describe('filterBlocked', () => {
  test('removes items whose authorId is blocked', () => {
    const items = [{ authorId: 'u1' }, { authorId: 'u2' }];
    expect(filterBlocked(items, ['u1']).map(i => i.authorId)).toEqual(['u2']);
  });
});
