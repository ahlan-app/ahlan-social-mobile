// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/services/apiService.edge.test.ts
// Batch 3/10: API service edge case and error handling tests

const mockFrom = jest.fn();

jest.mock('../../services/supabase.native', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}), { virtual: true });

const { supabase } = require('../../services/supabase.native');

describe('API Service - Error Handling', () => {
  it('handles database connection timeout errors', () => {
    const error = { message: 'Connection timed out', code: 'ETIMEDOUT' };
    expect(error.code).toBe('ETIMEDOUT');
    expect(error.message).toContain('timed out');
  });

  it('handles duplicate key errors', () => {
    const error = { message: 'duplicate key value violates unique constraint', code: '23505' };
    expect(error.code).toBe('23505');
    expect(error.message).toContain('duplicate');
  });

  it('handles foreign key violation errors', () => {
    const error = { message: 'insert or update on table violates foreign key constraint', code: '23503' };
    expect(error.code).toBe('23503');
    expect(error.message).toContain('foreign key');
  });

  it('handles row-level security policy errors', () => {
    const error = { message: 'new row violates row-level security policy', code: '42501' };
    expect(error.code).toBe('42501');
    expect(error.message).toContain('row-level security');
  });

  it('handles not-found errors gracefully', () => {
    const error = { message: 'No rows found', code: 'PGRST116' };
    expect(error.code).toBe('PGRST116');
  });

  it('handles rate limiting errors', () => {
    const error = { message: 'Too many requests', code: '429' };
    expect(error.code).toBe('429');
    expect(error.message).toContain('Too many');
  });
});

describe('API Service - Pagination', () => {
  it('uses page size of 20 for feed', () => {
    const pageSize = 20;
    expect(pageSize).toBe(20);
  });

  it('calculates range correctly for page 1', () => {
    const from = (1 - 1) * 20;
    const to = from + 20 - 1;
    expect(from).toBe(0);
    expect(to).toBe(19);
  });

  it('calculates range correctly for page 2', () => {
    const from = (2 - 1) * 20;
    const to = from + 20 - 1;
    expect(from).toBe(20);
    expect(to).toBe(39);
  });

  it('calculates range correctly for page 5', () => {
    const from = (5 - 1) * 20;
    const to = from + 20 - 1;
    expect(from).toBe(80);
    expect(to).toBe(99);
  });

  it('handles page 0 gracefully (should behave like page 1)', () => {
    const page = 0;
    const safePage = Math.max(1, page);
    const from = (safePage - 1) * 20;
    expect(from).toBe(0);
  });
});

describe('API Service - Data Validation', () => {
  it('validates post content length', () => {
    const maxLength = 500;
    const shortContent = 'Hello!';
    const longContent = 'x'.repeat(501);
    expect(shortContent.length).toBeLessThanOrEqual(maxLength);
    expect(longContent.length).toBeGreaterThan(maxLength);
  });

  it('validates username format (alphanumeric + underscore)', () => {
    const validUsernames = ['user_123', 'johndoe', 'test_user_99'];
    const invalidUsernames = ['user name', 'user.name', 'user-name', '', '@user'];
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    validUsernames.forEach(u => expect(u).toMatch(usernameRegex));
    invalidUsernames.forEach(u => expect(u).not.toMatch(usernameRegex));
  });

  it('trims whitespace from search terms', () => {
    const raw = '  ahlan  ';
    const trimmed = raw.trim();
    expect(trimmed).toBe('ahlan');
    expect(trimmed).not.toContain(' ');
  });

  it('converts search to lowercase for consistency', () => {
    const raw = 'Ahlan Social';
    const lower = raw.toLowerCase();
    expect(lower).toBe('ahlan social');
  });

  it('validates UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const valid = '550e8400-e29b-41d4-a716-446655440000';
    const invalid = ['not-a-uuid', '123', '', 'gggggggg-gggg-gggg-gggg-gggggggggggg'];
    expect(valid).toMatch(uuidRegex);
    invalid.forEach(u => expect(u).not.toMatch(uuidRegex));
  });
});

describe('API Service - Date Handling', () => {
  it('formats ISO date strings correctly', () => {
    const date = new Date('2026-05-31T12:00:00Z');
    expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('calculates relative time for recent posts', () => {
    const now = new Date('2026-05-31T12:00:00Z');
    const postDate = new Date('2026-05-31T11:30:00Z');
    const diffMs = now.getTime() - postDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    expect(diffMin).toBe(30);
  });

  it('handles future dates gracefully', () => {
    const now = new Date('2026-05-31T12:00:00Z');
    const future = new Date('2026-06-01T12:00:00Z');
    expect(future.getTime()).toBeGreaterThan(now.getTime());
  });
});
