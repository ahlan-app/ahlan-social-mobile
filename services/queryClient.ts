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
import { QueryClient, focusManager, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { NON_PERSISTED_ROOTS, queryKeys } from './queryKeys';

// Aggressive caching: everything shown once is kept (memory + disk) for a
// week and rendered instantly on the next launch; data counts as fresh for
// 5 minutes, so remounting a screen does not refetch, and stale data is
// refreshed quietly in the background when the app comes to the foreground.
export const QUERY_STALE_TIME = 1000 * 60 * 5;
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
export const QUERY_CACHE_STORAGE_KEY = 'ahlan-query-cache-v1';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_CACHE_MAX_AGE,
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
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
  throttleTime: 1000,
});

/** Only successful, non-private queries are written to disk. */
export function shouldPersistQuery(query: Pick<Query, 'queryKey' | 'state'>): boolean {
  const root = String(query.queryKey[0] ?? '');
  return query.state.status === 'success' && !NON_PERSISTED_ROOTS.has(root);
}

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
  queryClient.clear();
  try {
    await queryPersister.removeClient();
  } catch {
    // nothing persisted yet
  }
}

/** After a block/unblock almost every list can change: refetch all of them. */
export function invalidateAfterBlockChange(): Promise<void> {
  return queryClient.invalidateQueries();
}

/** Own post created, edited or deleted. */
export function invalidateAfterPostChange(viewerId?: string | null): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.trending() }),
    viewerId ? queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(viewerId) }) : Promise.resolve(),
  ]);
}

/** Follow / unfollow changes the feed, stories, suggestions and counts. */
export function invalidateAfterFollowChange(targetUserId?: string | null): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: ['stories'] }),
    queryClient.invalidateQueries({ queryKey: ['suggestions'] }),
    queryClient.invalidateQueries({ queryKey: ['followCounts'] }),
    targetUserId ? queryClient.invalidateQueries({ queryKey: queryKeys.userList('followers', targetUserId) }) : Promise.resolve(),
  ]);
}
