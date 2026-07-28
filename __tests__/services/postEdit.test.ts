/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/postEdit.test.ts
 *
 * Post edit window tests: expiration, revision history, audit log entry and edit-permission guard.
 */

import { canEditPost, editPost, listPostRevisions } from '../../src/services/postEdit';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

import { supabase } from '../../src/services/supabase';

describe('canEditPost', () => {
  test('returns true for the author inside the edit window', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(canEditPost({ authorId: 'u1', currentUserId: 'u1', createdAt: recent })).toBe(true);
  });

  test('returns false when the current user is not the author', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(canEditPost({ authorId: 'u1', currentUserId: 'u2', createdAt: recent })).toBe(false);
  });

  test('returns false after the edit window expires', () => {
    const old = new Date(Date.now() - 30 * 60_000).toISOString();
    expect(canEditPost({ authorId: 'u1', currentUserId: 'u1', createdAt: old })).toBe(false);
  });
});

describe('editPost', () => {
  test('updates the post and appends a revision entry', async () => {
    (supabase.update as jest.Mock).mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    (supabase.insert as jest.Mock).mockResolvedValue({ data: [{ id: 'rev1' }], error: null });
    await editPost({ id: 'p1', body: 'edited' });
    expect(supabase.update).toHaveBeenCalled();
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ post_id: 'p1' }),
    );
  });
});

describe('listPostRevisions', () => {
  test('returns revisions in descending order', async () => {
    (supabase.order as jest.Mock).mockResolvedValue({
      data: [{ id: 'r3' }, { id: 'r2' }, { id: 'r1' }],
    });
    const result = await listPostRevisions('p1');
    expect(result.map(r => r.id)).toEqual(['r3', 'r2', 'r1']);
  });
});
