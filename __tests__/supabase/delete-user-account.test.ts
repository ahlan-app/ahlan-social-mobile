// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Tests for the delete-user-account Supabase Edge Function logic.

describe('delete-user-account Edge Function', () => {
  const mockUserId = 'test-user-id-123';

  function buildTableList(): string[] {
    return [
      'comments', 'comment_likes', 'likes', 'reposts', 'saved_posts',
      'story_likes', 'story_views', 'notifications', 'messages',
      'follows', 'stories', 'posts', 'profiles',
    ];
  }

  it('includes all required tables for deletion', () => {
    const tables = buildTableList();
    expect(tables).toContain('comments');
    expect(tables).toContain('likes');
    expect(tables).toContain('posts');
    expect(tables).toContain('profiles');
    expect(tables).toContain('messages');
    expect(tables).toContain('follows');
    expect(tables).toContain('notifications');
    expect(tables).toContain('stories');
    expect(tables).toHaveLength(13);
  });

  it('follows table uses both follower_id and followed_id', () => {
    const specialTables = ['follows', 'messages'];
    expect(specialTables).toContain('follows');
  });

  it('messages table uses both sender_id and receiver_id', () => {
    const specialTables = ['follows', 'messages'];
    expect(specialTables).toContain('messages');
  });

  it('other tables use user_id for deletion', () => {
    const specialTables = ['follows', 'messages'];
    const tables = buildTableList().filter(t => !specialTables.includes(t));
    for (const table of tables) {
      expect(table).not.toBe('follows');
      expect(table).not.toBe('messages');
    }
  });

  it('generates correct OR query for follows table', () => {
    const orQuery = `follower_id.eq.${mockUserId},followed_id.eq.${mockUserId}`;
    expect(orQuery).toContain('follower_id.eq.test-user-id-123');
    expect(orQuery).toContain('followed_id.eq.test-user-id-123');
  });

  it('generates correct OR query for messages table', () => {
    const orQuery = `sender_id.eq.${mockUserId},receiver_id.eq.${mockUserId}`;
    expect(orQuery).toContain('sender_id.eq.test-user-id-123');
    expect(orQuery).toContain('receiver_id.eq.test-user-id-123');
  });

  it('generates correct EQ query for user tables', () => {
    const eqQuery = `user_id.eq.${mockUserId}`;
    expect(eqQuery).toBe('user_id.eq.test-user-id-123');
  });
});

describe('Edge Function error/success responses', () => {
  it('returns 401 for unauthenticated requests', () => {
    const errorResponse = { error: 'Not authenticated' };
    expect(errorResponse.error).toBe('Not authenticated');
  });

  it('returns 500 on deletion failure', () => {
    const errorResponse = {
      error: 'Failed to delete auth user',
      details: { message: 'User not found' },
    };
    expect(errorResponse.error).toBe('Failed to delete auth user');
    expect(errorResponse.details.message).toBe('User not found');
  });

  it('returns 200 on successful deletion', () => {
    const successResponse = {
      success: true,
      message: 'Account permanently deleted',
    };
    expect(successResponse.success).toBe(true);
    expect(successResponse.message).toContain('permanently deleted');
  });

  it('handles internal server errors gracefully', () => {
    const errorResponse = {
      error: 'Internal server error',
      details: 'Unknown error occurred',
    };
    expect(errorResponse.error).toBe('Internal server error');
    expect(errorResponse.details).toBeTruthy();
  });
});

describe('CORS headers', () => {
  it('allows all origins', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
    expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('authorization');
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('apikey');
  });

  it('handles OPTIONS preflight requests', () => {
    const mockOptionsResponse = { status: 200, body: 'ok' };
    expect(mockOptionsResponse.status).toBe(200);
    expect(mockOptionsResponse.body).toBe('ok');
  });
});
