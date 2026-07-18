/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/components/FollowersList.tsx
 *
 * Followers list component with paginated cursor fetching and client-side search.
 */

import React, { useState } from 'react';
import { FlatList, View, Text, TextInput } from 'react-native';
import type { Follower } from '../services/followers';

interface Props {
  followers: Follower[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchPlaceholder?: string;
}

export function FollowersList({ followers, onLoadMore, hasMore, searchPlaceholder }: Props) {
  const [query, setQuery] = useState('');
  const filtered = filterFollowers(followers, query);

  return (
    <View testID="followers-list">
      <TextInput
        testID="followers-search"
        placeholder={searchPlaceholder ?? 'Search followers'}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View testID={`follower-row-${item.id}`}>
            <Text>{item.displayName}</Text>
            <Text>{item.handle}</Text>
          </View>
        )}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.6}
        ListFooterComponent={hasMore ? <Text>Loading...</Text> : null}
      />
    </View>
  );
}

function filterFollowers(followers: Follower[], query: string): Follower[] {
  const q = query.trim().toLowerCase();
  if (!q) return followers;
  return followers.filter(f =>
    f.displayName.toLowerCase().includes(q) || f.handle.toLowerCase().includes(q),
  );
}
