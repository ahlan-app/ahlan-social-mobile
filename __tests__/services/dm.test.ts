/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/dm.test.ts
 *
 * Direct message service tests: send, read receipts, retry on transport failure, message ordering.
 */

import { sendDirectMessage, fetchThread, markRead } from '../../src/services/dm';
import { supabase } from '../../src/services/supabase';

jest.mock('../../src/services/supabase', () => {
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
  };
  return {
    supabase: {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn(),
      update: jest.fn(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    },
  };
});

describe('sendDirectMessage', () => {
  test('persists the message and returns the generated id', async () => {
    (supabase.insert as jest.Mock).mockResolvedValue({ data: [{ id: 'm1' }], error: null });
    const id = await sendDirectMessage({ threadId: 't1', body: 'selam' });
    expect(id).toBe('m1');
    expect(supabase.insert).toHaveBeenCalled();
  });

  test('retries the insert when the first call returns a transport error', async () => {
    (supabase.insert as jest.Mock)
      .mockResolvedValueOnce({ data: null, error: { code: 'ECONNRESET' } })
      .mockResolvedValueOnce({ data: [{ id: 'm2' }], error: null });

    const id = await sendDirectMessage({ threadId: 't1', body: 'retry me' });
    expect(id).toBe('m2');
    expect(supabase.insert).toHaveBeenCalledTimes(2);
  });

  test('throws on non-recoverable persistence errors', async () => {
    (supabase.insert as jest.Mock).mockResolvedValue({
      data: null,
      error: { code: 'PERSIST_FAIL', message: 'fatal' },
    });
    await expect(
      sendDirectMessage({ threadId: 't1', body: 'doomed' }),
    ).rejects.toThrow(/PERSIST_FAIL/);
  });
});

describe('markRead', () => {
  test('updates the message read_at timestamp', async () => {
    (supabase.update as jest.Mock).mockResolvedValue({ data: [{ id: 'm1' }], error: null });
    await markRead('m1');
    expect(supabase.update).toHaveBeenCalledWith({ read_at: expect.any(String) });
  });
});

describe('fetchThread', () => {
  test('orders messages by ascending created_at', async () => {
    (supabase.order as jest.Mock).mockResolvedValue({
      data: [
        { id: 'a', created_at: '2026-07-20T09:00:00Z' },
        { id: 'b', created_at: '2026-07-20T09:05:00Z' },
      ],
    });
    const result = await fetchThread('t1');
    expect(result.map(m => m.id)).toEqual(['a', 'b']);
  });
});
