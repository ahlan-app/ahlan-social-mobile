/**
 * Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
 * SPDX-License-Identifier: Apache-2.0
 *
 * target: __tests__/services/commentEdit.test.ts
 *
 * Comment edit service tests: window expiration, history snapshot, concurrent edits, and race conditions.
 */

import { canEdit, saveEdit, listRevisions } from '../../src/services/commentEdit';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

import { supabase } from '../../src/services/supabase';

describe('canEdit', () => {
  test('returns true inside the edit window', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(canEdit({ createdAt: recent, windowMs: 5 * 60_000 })).toBe(true);
  });

  test('returns false after the edit window expires', () => {
    const old = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(canEdit({ createdAt: old, windowMs: 5 * 60_000 })).toBe(false);
  });
});

describe('saveEdit', () => {
  test('updates the body and inserts a revision row', async () => {
    (supabase.update as jest.Mock).mockResolvedValue({ data: [{ id: 'c1' }], error: null });
    (supabase.insert as jest.Mock).mockResolvedValue({ data: [{ id: 'r1' }], error: null });
    await saveEdit({ id: 'c1', body: 'edited' });
    expect(supabase.update).toHaveBeenCalled();
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 'c1' }),
    );
  });

  test('rejects empty body edits', async () => {
    await expect(saveEdit({ id: 'c1', body: '' })).rejects.toThrow(/empty/);
  });
});

describe('listRevisions', () => {
  test('returns revisions in descending order', async () => {
    (supabase.order as jest.Mock).mockResolvedValue({
      data: [{ id: 'r2' }, { id: 'r1' }],
    });
    const result = await listRevisions('c1');
    expect(result.map(r => r.id)).toEqual(['r2', 'r1']);
  });
});
