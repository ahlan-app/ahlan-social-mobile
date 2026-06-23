// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Thin wrapper around `@react-native-async-storage/async-storage`.
//
// Provides:
//   - setItem / getItem       (string values, missing key → null)
//   - setJSON / getJSON       (JSON-serialized values, malformed → null)
//   - removeItem              (explicit deletion)
//   - getKeys                 (snapshot of all keys)
//
// All operations are async and surface underlying AsyncStorage errors to
// the caller. `getItem` and `getJSON` return `null` when the key is missing
// so callers can treat "not yet stored" and "explicitly nulled" the same.

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persist a string value under `key`. Resolves once the write is committed.
 */
export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

/**
 * Read a string value. Returns `null` if the key has never been written
 * (or has been removed). Throws if AsyncStorage itself rejects.
 */
export async function getItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

/**
 * Remove the value stored under `key`. Idempotent — no error if the
 * key was already missing.
 */
export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/**
 * Persist a JSON-serializable value. The value is `JSON.stringify`'d
 * before being handed to AsyncStorage.
 */
export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Read a JSON value previously written with `setJSON`. Returns `null` if
 * the key is missing OR if the stored payload is not valid JSON.
 */
export async function getJSON<T = unknown>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Snapshot of all keys currently in AsyncStorage.
 */
export async function getKeys(): Promise<readonly string[]> {
  return AsyncStorage.getAllKeys();
}