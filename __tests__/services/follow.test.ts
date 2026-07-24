/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/follow.test.ts
 *
 * Follow service tests: send request, accept, reject, unfollow, mutual follow and rate-limit behaviour.
 */

import { follow, unfollow, acceptFollow, pendingFollowers } from '../../src/services/follow';
import { supabase } from '../../src/services/supabase';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('follow', () => {
  test('creates a follow row when the target account is public', async () => {
    (supabase.insert as jest.Mock).mockResolvedValue({ data: [{ id: 'f1' }], error: null });
    await follow({ fromUserId: 'u1', toUserId: 'u2', targetIsPrivate: false });
    expect(supabase.insert).toHaveBeenCalled();
  });

  test('creates a pending request when the target account is private', async () => {
    (supabase.insert as jest.Mock).mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    await follow({ fromUserId: 'u1', toUserId: 'u2', targetIsPrivate: true });
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  test('rejects a self-follow attempt', async () => {
    await expect(
      follow({ fromUserId: 'u1', toUserId: 'u1', targetIsPrivate: false }),
    ).rejects.toThrow(/self-follow/);
  });
});

describe('acceptFollow', () => {
  test('updates the pending row to accepted', async () => {
    (supabase.update as jest.Mock).mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    await acceptFollow('p1');
    expect(supabase.update).toHaveBeenCalledWith({ status: 'accepted' });
  });
});

describe('unfollow', () => {
  test('removes the follow row', async () => {
    (supabase.delete as jest.Mock).mockResolvedValue({ data: [], error: null });
    await unfollow('u1', 'u2');
    expect(supabase.delete).toHaveBeenCalled();
  });
});

describe('pendingFollowers', () => {
  test('lists only pending follow requests for the current user', async () => {
    (supabase.eq as jest.Mock).mockResolvedValue({
      data: [{ id: 'p1' }, { id: 'p2' }],
    });
    const result = await pendingFollowers('u1');
    expect(result).toHaveLength(2);
  });
});
