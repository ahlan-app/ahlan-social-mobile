// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/storage.test.ts
// Tests for the thin AsyncStorage wrapper in `services/storage.ts`.
//
// Covers:
//   1. write then read returns the same string value
//   2. missing key returns null (no throw)
//   3. JSON: write an object, read it back with the correct shape
//   4. JSON: missing key returns null
//   5. JSON: malformed payload returns null instead of throwing
//
// The wrapper is exercised against a jest-mocked AsyncStorage, so no
// native module is required and tests run under the pure-logic preset.

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      getItem: jest.fn(async (key: string) => {
        return store.has(key) ? store.get(key)! : null;
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
    },
  };
});

// ---------------------------------------------------------------------------
// Imports (resolved after the mock above is hoisted)
// ---------------------------------------------------------------------------
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem, getJSON, setJSON, removeItem } from '../../services/storage';

const mockedStorage = AsyncStorage as unknown as {
  setItem: jest.Mock;
  getItem: jest.Mock;
  removeItem: jest.Mock;
  getAllKeys: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// Test 1 — write then read
// ===========================================================================
describe('setItem + getItem (string values)', () => {
  it('persists a string value and returns it on read', async () => {
    await setItem('auth_token', 'abc-123');

    expect(mockedStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockedStorage.setItem).toHaveBeenCalledWith('auth_token', 'abc-123');

    const result = await getItem('auth_token');

    expect(mockedStorage.getItem).toHaveBeenCalledWith('auth_token');
    expect(result).toBe('abc-123');
  });
});

// ===========================================================================
// Test 2 — missing key returns null
// ===========================================================================
describe('getItem — missing key', () => {
  it('returns null (and does not throw) when the key was never written', async () => {
    const result = await getItem('never-stored');

    expect(result).toBeNull();
    expect(mockedStorage.getItem).toHaveBeenCalledWith('never-stored');
  });

  it('returns null after the key has been removed', async () => {
    await setItem('temp', 'value');
    await removeItem('temp');

    const result = await getItem('temp');

    expect(result).toBeNull();
    expect(mockedStorage.removeItem).toHaveBeenCalledWith('temp');
  });
});

// ===========================================================================
// Test 3 — JSON: write object, read it back
// ===========================================================================
describe('setJSON + getJSON (serialized objects)', () => {
  it('serializes an object on write and parses it back on read', async () => {
    const payload = { userId: 'u-1', roles: ['admin', 'editor'], count: 7 };

    await setJSON('session', payload);
    const result = await getJSON<typeof payload>('session');

    // The wrapper must have handed JSON.stringify'd form to AsyncStorage
    expect(mockedStorage.setItem).toHaveBeenCalledWith(
      'session',
      JSON.stringify(payload),
    );

    // And the round-trip value must equal the original object
    expect(result).toEqual(payload);
  });
});

// ===========================================================================
// Test 4 — JSON: missing key returns null
// ===========================================================================
describe('getJSON — missing key', () => {
  it('returns null when the JSON key was never written', async () => {
    const result = await getJSON<{ token: string }>('missing');

    expect(result).toBeNull();
  });
});

// ===========================================================================
// Test 5 — JSON: malformed payload returns null
// ===========================================================================
describe('getJSON — malformed payload', () => {
  it('returns null (and does not throw) when the stored value is not valid JSON', async () => {
    // Bypass the wrapper to plant a corrupted payload directly.
    await mockedStorage.setItem('bad', '{not json');

    const result = await getJSON('bad');

    expect(result).toBeNull();
  });
});