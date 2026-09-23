// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// What the persisted TanStack Query cache may write to disk, and how much.
// Android AsyncStorage is a ~6 MB SQLite database that also holds the
// Supabase session, and a single value over ~2 MB cannot be read back, so
// the cache is limited to an allowlist, one feed page, and ~1 MB in total.
// Pure module (no React Native imports) so it can be unit tested.

/** Query roots written to disk, most important first (dropped from the end when over budget). */
export const PERSISTED_ROOTS = [
  'feed',
  'stories',
  'profile',
  'followCounts',
  'userPosts',
  'suggestions',
  'trending',
] as const;

export const MAX_PERSISTED_CHARS = 1_000_000;
/** Inline data: URIs (upload fallbacks) larger than this are not persisted. */
export const MAX_INLINE_DATA_URI_CHARS = 2048;

const persistedRoots = new Set<string>(PERSISTED_ROOTS);

export function isPersistedRoot(root: unknown): boolean {
  return persistedRoots.has(String(root ?? ''));
}

interface DehydratedQueryLike {
  queryKey: readonly unknown[];
  state: { data?: unknown } & Record<string, unknown>;
  [key: string]: unknown;
}

interface PersistedClientLike {
  timestamp: number;
  buster: string;
  clientState: { mutations: unknown[]; queries: DehydratedQueryLike[] };
}

const isInfiniteData = (data: unknown): data is { pages: unknown[]; pageParams: unknown[] } =>
  !!data && typeof data === 'object'
  && Array.isArray((data as { pages?: unknown }).pages)
  && Array.isArray((data as { pageParams?: unknown }).pageParams);

/** Replaces large inline data: URIs with null (recursively). */
export function stripLargeDataUris<T>(value: T): T {
  if (typeof value === 'string') {
    return (value.startsWith('data:') && value.length > MAX_INLINE_DATA_URI_CHARS ? null : value) as T;
  }
  if (Array.isArray(value)) return value.map(stripLargeDataUris) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = stripLargeDataUris(v);
    return out as T;
  }
  return value;
}

const priority = (query: DehydratedQueryLike): number => {
  const index = (PERSISTED_ROOTS as readonly string[]).indexOf(String(query.queryKey[0]));
  return index === -1 ? PERSISTED_ROOTS.length : index;
};

/** Serialises the persisted client within the allowlist and size budget. */
export function serializePersistedClient(client: PersistedClientLike): string {
  const candidates = client.clientState.queries
    .filter(q => isPersistedRoot(q.queryKey[0]))
    .map(q => {
      let data = q.state.data;
      if (isInfiniteData(data)) {
        data = { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
      }
      return { ...q, state: { ...q.state, data: stripLargeDataUris(data) } };
    })
    .sort((a, b) => priority(a) - priority(b));

  const kept: DehydratedQueryLike[] = [];
  let size = 0;
  for (const query of candidates) {
    const length = JSON.stringify(query).length;
    if (size + length > MAX_PERSISTED_CHARS) continue;
    kept.push(query);
    size += length;
  }

  return JSON.stringify({
    ...client,
    clientState: { mutations: [], queries: kept },
  });
}
