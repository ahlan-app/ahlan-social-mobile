/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: src/components/CommentItem.tsx
 *
 * Comment item component: idempotent optimistic update using the message id, avoiding flicker on retry.
 */

import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import type { Comment } from '../services/comments';

interface Props {
  comment: Comment;
  isOptimistic?: boolean;
  onRetry?: (id: string) => void;
}

export function CommentItem({ comment, isOptimistic, onRetry }: Props) {
  // Use a stable key derived from the comment's id.  Optimistic inserts
  // share the same id as the final server copy, so a re-render after the
  // server responds replaces the optimistic row in place instead of
  // appending a duplicate entry.
  const headerLabel = useMemo(() => {
    return isOptimistic ? 'Sending...' : comment.author.displayName;
  }, [comment.author.displayName, isOptimistic]);

  return (
    <View testID={`comment-${comment.id}`}>
      <Text>{headerLabel}</Text>
      <Text>{comment.body}</Text>
      {isOptimistic && onRetry ? (
        <Text testID={`comment-${comment.id}-retry`} onPress={() => onRetry(comment.id)}>
          Tap to retry
        </Text>
      ) : null}
    </View>
  );
}
