/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/components/MessageThread.test.tsx
 *
 * Message thread tests: ordering, unread state, auto-scroll, pagination and message grouping by day.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageThread } from '../../src/components/MessageThread';

const baseMessages = [
  { id: 'm1', authorId: 'u1', body: 'selam', createdAt: '2026-07-20T08:00:00Z' },
  { id: 'm2', authorId: 'u2', body: 'merhaba', createdAt: '2026-07-20T08:05:00Z' },
  { id: 'm3', authorId: 'u1', body: 'nasilsin', createdAt: '2026-07-20T08:06:00Z' },
];

describe('MessageThread', () => {
  test('renders messages in chronological order', () => {
    const { getAllByTestId } = render(
      <MessageThread currentUserId="u1" messages={baseMessages} />,
    );
    const rows = getAllByTestId(/^message-/);
    expect(rows.map(r => r.props.testID)).toEqual(['message-m1', 'message-m2', 'message-m3']);
  });

  test('aligns the current user messages to the right', () => {
    const { getByTestId } = render(
      <MessageThread currentUserId="u1" messages={baseMessages} />,
    );
    expect(getByTestId('message-m1').props.style.alignSelf).toBe('flex-end');
    expect(getByTestId('message-m2').props.style.alignSelf).toBe('flex-start');
  });

  test('shows the unread badge when the thread has unread messages', () => {
    const { getByTestId } = render(
      <MessageThread currentUserId="u1" messages={baseMessages} lastReadAt="2026-07-20T08:00:30Z" />,
    );
    expect(getByTestId('message-thread-unread-badge')).toBeTruthy();
  });

  test('calls onLoadMore when the user scrolls near the end', () => {
    const onLoadMore = jest.fn();
    const { getByTestId } = render(
      <MessageThread currentUserId="u1" messages={baseMessages} onLoadMore={onLoadMore} />,
    );
    fireEvent.scroll(getByTestId('message-thread-list'), {
      nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 1000 } },
    });
    expect(onLoadMore).toHaveBeenCalled();
  });

  test('groups consecutive messages from the same author on the same day', () => {
    const closePair = [
      { id: 'a', authorId: 'u1', body: 'a', createdAt: '2026-07-20T08:00:00Z' },
      { id: 'b', authorId: 'u1', body: 'b', createdAt: '2026-07-20T08:00:30Z' },
    ];
    const { queryAllByTestId } = render(
      <MessageThread currentUserId="u1" messages={closePair} />,
    );
    expect(queryAllByTestId(/^message-author-/)).toHaveLength(1);
  });
});
