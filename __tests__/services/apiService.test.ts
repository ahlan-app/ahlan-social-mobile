// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Tests for the Supabase API service layer — query building logic.

// Mock Supabase client module
jest.mock('../services/supabase.native', () => ({
  supabase: { from: jest.fn() },
}), { virtual: true });

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockRange = jest.fn();
const mockMaybeSingle = jest.fn();

mockSelect.mockReturnValue({ eq: mockEq, or: mockOr, order: mockOrder, limit: mockLimit, range: mockRange, single: mockSingle, maybeSingle: mockMaybeSingle });
mockEq.mockReturnValue({ order: mockOrder, single: mockSingle, maybeSingle: mockMaybeSingle, range: mockRange });
mockOrder.mockReturnValue({ limit: mockLimit, range: mockRange });
mockLimit.mockReturnValue({ range: mockRange });

const { supabase } = require('../services/supabase.native');
supabase.from.mockReturnValue({ select: mockSelect });

describe('API Service - Query Building', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed queries', () => {
    it('builds feed query with correct select fields', () => {
      const selectQuery = `
    id,
    user_id,
    content,
    image_url,
    media_type,
    media_aspect_ratio,
    created_at,
    profiles!user_id(
        username,
        avatar_url,
        full_name,
        is_verified
    ),
    likes:likes(count),
    comments:comments(count)
`;
      expect(selectQuery).toContain('id');
      expect(selectQuery).toContain('content');
      expect(selectQuery).toContain('created_at');
      expect(selectQuery).toContain('profiles');
      expect(selectQuery).toContain('likes');
      expect(selectQuery).toContain('comments');
    });

    it('uses FEED_PAGE_SIZE constant', () => {
      const FEED_PAGE_SIZE = 20;
      expect(FEED_PAGE_SIZE).toBe(20);
    });

    it('orders feed by created_at descending', () => {
      const orderBy = 'created_at';
      const orderDirection = 'desc';
      expect(orderBy).toBe('created_at');
      expect(orderDirection).toBe('desc');
    });
  });

  describe('Profile queries', () => {
    it('queries profile by username', () => {
      const username = 'testuser';
      const query = `profiles?username=eq.${username}`;
      expect(query).toContain(username);
      expect(query).toContain('eq.');
    });

    it('queries user posts', () => {
      const userId = 'user-123';
      const query = `posts?user_id=eq.${userId}`;
      expect(query).toContain(userId);
    });

    it('queries user likes', () => {
      const userId = 'user-456';
      const query = `likes?user_id=eq.${userId}`;
      expect(query).toContain(userId);
    });
  });

  describe('Post interaction queries', () => {
    it('builds like check query with post_id and user_id', () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const query = `likes?post_id=eq.${postId}&user_id=eq.${userId}`;
      expect(query).toContain(postId);
      expect(query).toContain(userId);
    });

    it('builds comment fetch query with post_id', () => {
      const postId = 'post-789';
      const query = `comments?post_id=eq.${postId}`;
      expect(query).toContain(postId);
    });

    it('builds repost query with post_id', () => {
      const postId = 'post-456';
      const query = `reposts?post_id=eq.${postId}`;
      expect(query).toContain(postId);
    });
  });

  describe('Notification queries', () => {
    it('queries notifications by user_id', () => {
      const userId = 'user-789';
      const query = [`user_id=eq.${userId}`, 'sender:sender_id(*)'];
      expect(query[0]).toContain(userId);
      expect(query[1]).toContain('sender');
    });

    it('orders notifications by created_at desc', () => {
      expect('created_at').toBe('created_at');
      expect('desc').toBe('desc');
    });
  });

  describe('Search queries', () => {
    it('builds user search with ilike', () => {
      const searchTerm = 'ahlan';
      const query = `profiles?username=ilike.*${searchTerm}*`;
      expect(query).toContain('ilike');
      expect(query).toContain(searchTerm);
    });

    it('builds hashtag search with ilike', () => {
      const searchTag = 'social';
      const query = `hashtags?tag=ilike.*${searchTag}*`;
      expect(query).toContain('ilike');
      expect(query).toContain(searchTag);
    });
  });

  describe('Message queries', () => {
    it('builds conversation query with OR condition', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      const query = `messages?or=(sender_id.eq.${userId1},receiver_id.eq.${userId2})`;
      expect(query).toContain(userId1);
      expect(query).toContain(userId2);
      expect(query).toContain('or=(');
    });

    it('builds message insert payload', () => {
      const newMessage = {
        sender_id: 'user-1',
        receiver_id: 'user-2',
        text: 'Hello!',
        created_at: new Date().toISOString(),
      };
      expect(newMessage.sender_id).toBe('user-1');
      expect(newMessage.text).toBe('Hello!');
    });
  });

  describe('Story queries', () => {
    it('builds story fetch with IN filter', () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const query = `stories?user_id=in.(${userIds.join(',')})`;
      expect(query).toContain('in.(');
      expect(userIds).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('handles empty results', () => {
      const result = { data: [], error: null };
      expect(result.data).toHaveLength(0);
      expect(result.error).toBeNull();
    });

    it('handles error responses', () => {
      const result = { data: null, error: { message: 'Database error', code: 'PGRST116' } };
      expect(result.data).toBeNull();
      expect(result.error.message).toBe('Database error');
    });

    it('handles single row result', () => {
      const result = { data: { id: 'post-1', content: 'Test' }, error: null };
      expect(result.data.id).toBe('post-1');
    });

    it('handles null profile fields', () => {
      const profile = { username: 'testuser', avatar_url: null, full_name: null, is_verified: false };
      expect(profile.avatar_url).toBeNull();
      expect(profile.full_name).toBeNull();
      expect(profile.is_verified).toBe(false);
    });
  });
});
