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

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { QueryClient, focusManager, onlineManager, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { removeOldestQuery } from '@tanstack/react-query-persist-client';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { NON_PERSISTED_ROOTS, queryKeys } from './queryKeys';
import { isPersistedRoot, serializePersistedClient } from './queryPersistBudget';

// Aggressive caching: data counts as fresh for 5 minutes (remounting a
// screen does not refetch), stays in memory for a week, and the most useful
// queries (first feed page, stories, profiles, ...) are written to disk
// within a size budget so the next launch renders instantly. Stale data is
// refreshed quietly in the background when the app comes to the foreground.
export const QUERY_STALE_TIME = 1000 * 60 * 5;
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
export const QUERY_CACHE_STORAGE_KEY = 'ahlan-query-cache-v1';

// Permission, missing-row and missing-function errors will not succeed on retry.
const NON_RETRYABLE_CODES = new Set(['42501', 'PGRST116', 'PGRST202', '28000']);

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && NON_RETRYABLE_CODES.has(code)) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_CACHE_MAX_AGE,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Offline, queries pause instead of running, so a failed fetch can never
      // replace good cached data with an empty list.
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 3000,
  serialize: serializePersistedClient as never,
  retry: removeOldestQuery,
});

/**
 * Allowlisted queries that have data are written to disk (never private
 * messages) — also when their latest refresh failed, so the last good data
 * survives an offline launch.
 */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  const root = String(query.queryKey[0] ?? '');
  return query.state.data !== undefined && isPersistedRoot(root) && !NON_PERSISTED_ROOTS.has(root);
}

// Online state from NetInfo: queries pause offline and refetch on reconnect.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

// "Window focus" on React Native = the app returning to the foreground.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      handleFocus(status === 'active');
    });
    return () => subscription.remove();
  });
}

/** Drops every cached query (memory and disk), e.g. on sign-out. */
export async function clearQueryCache(): Promise<void> {
  // Cancel first so an in-flight request cannot write the old account's rows back.
  await queryClient.cancelQueries().catch(() => {});
  queryClient.clear();
  try {
    await queryPersister.removeClient();
  } catch {
    // nothing persisted yet
  }
}

/**
 * Keeps only the first page of every cached home feed before it is refetched,
 * so an invalidation downloads one page instead of every page scrolled so far.
 */
export function trimFeedToFirstPage(): void {
  queryClient.setQueriesData<{ pages: unknown[]; pageParams: unknown[] }>({ queryKey: ['feed'] }, (data) =>
    data && Array.isArray(data.pages) && data.pages.length > 1
      ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) }
      : data,
  );
}

/** After a block/unblock almost every list can change. */
export function invalidateAfterBlockChange(): Promise<unknown> {
  trimFeedToFirstPage();
  return Promise.all(
    ['feed', 'stories', 'suggestions', 'profile', 'userPosts', 'userReposts', 'followCounts', 'post',
      'comments', 'trending', 'userSearch', 'userList', 'chatList']
      .map(root => queryClient.invalidateQueries({ queryKey: [root] })),
  );
}

/** Own post created, edited or deleted (pass the post id for edits/deletes). */
export function invalidateAfterPostChange(viewerId?: string | null, postId?: string | null): Promise<unknown> {
  trimFeedToFirstPage();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    postId ? queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }) : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: queryKeys.trending() }),
    viewerId ? queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(viewerId) }) : Promise.resolve(),
  ]);
}

/** Follow / unfollow changes the feed, stories, suggestions and counts. */
export function invalidateAfterFollowChange(targetUserId?: string | null): Promise<unknown> {
  trimFeedToFirstPage();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: ['stories'] }),
    queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
    queryClient.invalidateQueries({ queryKey: ['followCounts'] }),
    targetUserId ? queryClient.invalidateQueries({ queryKey: queryKeys.userList('followers', targetUserId) }) : Promise.resolve(),
  ]);
}
