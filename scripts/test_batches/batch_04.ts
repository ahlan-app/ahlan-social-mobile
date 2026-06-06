// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/types.edge.test.ts
// Batch 4/10: Type definitions edge case tests

import {
  normalizeNotification,
  normalizeNotifications,
  Notification,
  Post,
  Comment,
  SimpleUser,
  UserProfile,
  Story,
  Message,
} from '../types';

describe('SimpleUser — edge cases', () => {
  it('handles minimal user with no optional fields', () => {
    const user: SimpleUser = { id: 'u1', name: '', username: '', avatar: null };
    expect(user.isVerified).toBeUndefined();
    expect(user.bio).toBeUndefined();
  });

  it('handles unverified user explicitly', () => {
    const user: SimpleUser = { id: 'u2', name: 'Test', username: 'test', avatar: null, isVerified: false };
    expect(user.isVerified).toBe(false);
  });

  it('handles user with bio', () => {
    const user: SimpleUser = { id: 'u3', name: 'Bio User', username: 'bio', avatar: null, bio: 'Hello!' };
    expect(user.bio).toBe('Hello!');
  });
});

describe('UserProfile — edge cases', () => {
  it('handles public profile by default', () => {
    const profile: UserProfile = { id: 'p1', name: 'Public', username: 'public', bio: '', profilePicture: null };
    expect(profile.isPrivate).toBeUndefined();
    expect(profile.isVerified).toBeUndefined();
  });

  it('handles verified private profile', () => {
    const profile: UserProfile = { id: 'p2', name: 'VIP', username: 'vip', bio: 'VIP', profilePicture: 'https://example.com/pic.jpg', isVerified: true, isPrivate: true };
    expect(profile.isVerified).toBe(true);
    expect(profile.isPrivate).toBe(true);
    expect(profile.profilePicture).toBeTruthy();
  });
});

describe('Post — edge cases', () => {
  it('handles post with media as image', () => {
    const post: Post = { id: 'p1', username: 'u1', avatar: null, media: 'https://example.com/img.jpg', media_preview_url: 'https://example.com/thumb.jpg', content: 'Check this out', media_type: 'image', media_aspect_ratio: 1.5, likes: 10, reposts: 2, replies: 1 };
    expect(post.media).toBeTruthy();
    expect(post.media_type).toBe('image');
    expect(post.media_aspect_ratio).toBe(1.5);
  });

  it('handles post with name', () => {
    const post: Post = { id: 'p2', name: 'Display Name', username: 'u2', avatar: null, content: 'Named post', media_type: 'text', likes: 0, reposts: 0, replies: 0 };
    expect(post.name).toBe('Display Name');
  });

  it('handles post with timestamp', () => {
    const ts = new Date().toISOString();
    const post: Post = { id: 'p3', username: 'u3', avatar: null, content: 'Timed', media_type: 'text', likes: 0, reposts: 0, replies: 0, timestamp: ts };
    expect(post.timestamp).toBe(ts);
  });

  it('handles post with poll', () => {
    const post: Post = { id: 'p4', username: 'u4', avatar: null, content: 'Poll!', media_type: 'text', likes: 0, reposts: 0, replies: 0, poll: { question: 'Yes or no?', options: [{ text: 'Yes', votes: 5 }, { text: 'No', votes: 3 }] } };
    expect(post.poll).toBeDefined();
    expect(post.poll!.options).toHaveLength(2);
    expect(post.poll!.options[0].votes).toBe(5);
  });

  it('handles post with isVerified', () => {
    const post: Post = { id: 'p5', username: 'vip', avatar: null, content: 'Verified post', media_type: 'text', likes: 0, reposts: 0, replies: 0, isVerified: true };
    expect(post.isVerified).toBe(true);
  });
});

describe('Comment — edge cases', () => {
  it('handles comment with empty replies', () => {
    const comment: Comment = { id: 'c1', username: 'u1', avatar: null, text: 'Nice!', timestamp: new Date(), likes: 0, isLiked: false, replies: [] };
    expect(comment.replies).toHaveLength(0);
    expect(comment.isLiked).toBe(false);
  });

  it('handles liked comment with nested replies', () => {
    const reply: Comment = { id: 'c2', username: 'u2', avatar: null, text: 'Thanks!', timestamp: new Date(), likes: 1, isLiked: true, replies: [] };
    const parent: Comment = { id: 'c1', username: 'u1', avatar: null, text: 'Great post', timestamp: new Date(), likes: 5, isLiked: true, replies: [reply] };
    expect(parent.replies).toHaveLength(1);
    expect(parent.replies[0].isLiked).toBe(true);
  });
});

describe('Notification — edge cases', () => {
  it('handles read notification', () => {
    const n: Notification = { id: 'n1', type: 'like', is_read: true, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: null };
    expect(n.is_read).toBe(true);
    expect(n.type).toBe('like');
  });

  it('handles unread notification', () => {
    const n: Notification = { id: 'n2', type: 'follow', is_read: false, created_at: '2026-05-31T11:00:00Z', sender: { id: 's2', username: 'bob', avatar_url: null }, post: null };
    expect(n.is_read).toBe(false);
  });

  it('handles notification types', () => {
    const types: Notification['type'][] = ['like', 'comment', 'follow', 'comment_like', 'repost', 'mention', 'story_like'];
    types.forEach(t => {
      const n: Notification = { id: `n-${t}`, type: t, is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'u', avatar_url: null }, post: null };
      expect(n.type).toBe(t);
    });
  });

  it('handles notification with comment', () => {
    const n: Notification = { id: 'n3', type: 'comment', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: { id: 'p1', content: 'Post', media: null, media_type: 'text' }, comment_id: 'c1', comment: { id: 'c1', text: 'Nice!' } };
    expect(n.comment).toBeDefined();
    expect(n.comment!.text).toBe('Nice!');
  });

  it('handles notification with story', () => {
    const n: Notification = { id: 'n4', type: 'story_like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: null, story: { id: 's1', media_url: 'https://example.com/story.jpg' } };
    expect(n.story).toBeDefined();
    expect(n.story!.media_url).toBeTruthy();
  });

  it('handles notification with content', () => {
    const n: Notification = { id: 'n5', type: 'mention', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: null, content: '@testuser hello!' };
    expect(n.content).toBe('@testuser hello!');
  });
});

describe('normalizeNotification', () => {
  it('normalizes array sender to single object', () => {
    const raw = { id: 'n1', type: 'like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: [{ id: 's1', username: 'alice', avatar_url: null }], post: null };
    const result = normalizeNotification(raw);
    expect(result.sender).toBeDefined();
    expect(Array.isArray(result.sender)).toBe(false);
    expect(result.sender.username).toBe('alice');
  });

  it('normalizes array post to single or null', () => {
    const raw = { id: 'n2', type: 'like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: [{ id: 'p1', content: 'Post', media: null, media_type: 'text' }] };
    const result = normalizeNotification(raw);
    expect(result.post).toBeDefined();
    expect(Array.isArray(result.post)).toBe(false);
    expect(result.post!.id).toBe('p1');
  });

  it('provides fallback for empty sender', () => {
    const raw = { id: 'n3', type: 'like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: [], post: null };
    const result = normalizeNotification(raw);
    expect(result.sender).toEqual({ id: '', username: '', avatar_url: null });
  });

  it('provides fallback for empty post', () => {
    const raw = { id: 'n4', type: 'like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: [] };
    const result = normalizeNotification(raw);
    expect(result.post).toBeNull();
  });
});

describe('normalizeNotifications', () => {
  it('handles empty array', () => {
    expect(normalizeNotifications([])).toEqual([]);
  });

  it('handles null input', () => {
    expect(normalizeNotifications(null as any)).toEqual([]);
  });

  it('handles undefined input', () => {
    expect(normalizeNotifications(undefined as any)).toEqual([]);
  });

  it('normalizes multiple notifications', () => {
    const raw = [
      { id: 'n1', type: 'like', is_read: false, created_at: '2026-05-31T12:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: null },
      { id: 'n2', type: 'follow', is_read: true, created_at: '2026-05-31T11:00:00Z', sender: { id: 's2', username: 'bob', avatar_url: 'https://example.com/av.jpg' }, post: null },
    ];
    const result = normalizeNotifications(raw);
    expect(result).toHaveLength(2);
    expect(result[0].sender.username).toBe('alice');
    expect(result[1].sender.username).toBe('bob');
  });
});

describe('Message — edge cases', () => {
  it('handles message with type', () => {
    const msg: Message = { id: 'm1', sender_id: 'u1', receiver_id: 'u2', text: 'Hello', created_at: '2026-05-31T12:00:00Z', type: 'text' };
    expect(msg.type).toBe('text');
  });

  it('handles profile share message', () => {
    const msg: Message = { id: 'm2', sender_id: 'u1', receiver_id: 'u2', text: '', created_at: '2026-05-31T12:00:00Z', type: 'profile_share', shared_profile_id: 'u3' };
    expect(msg.type).toBe('profile_share');
    expect(msg.shared_profile_id).toBe('u3');
  });

  it('handles post share with hydrated data', () => {
    const sharedPost: Post = { id: 'sp1', username: 'u1', avatar: null, content: 'Shared!', media_type: 'text', likes: 0, reposts: 0, replies: 0 };
    const msg: Message = { id: 'm3', sender_id: 'u1', receiver_id: 'u2', text: '', created_at: '2026-05-31T12:00:00Z', type: 'post_share', shared_post_id: 'sp1', sharedPost };
    expect(msg.shared_post_id).toBe('sp1');
    expect(msg.sharedPost).toBeDefined();
    expect(msg.sharedPost!.content).toBe('Shared!');
  });

  it('handles seen message', () => {
    const msg: Message = { id: 'm4', sender_id: 'u1', receiver_id: 'u2', text: 'Seen!', created_at: '2026-05-31T12:00:00Z', seen: true };
    expect(msg.seen).toBe(true);
  });

  it('handles reply with replied message', () => {
    const replyMsg: Message = { id: 'm5', sender_id: 'u1', receiver_id: 'u2', text: 'Original', created_at: '2026-05-31T11:00:00Z' };
    const msg: Message = { id: 'm6', sender_id: 'u2', receiver_id: 'u1', text: 'Reply', created_at: '2026-05-31T12:00:00Z', reply_to: 'm5', repliedMessage: replyMsg };
    expect(msg.reply_to).toBe('m5');
    expect(msg.repliedMessage).toBeDefined();
    expect(msg.repliedMessage!.text).toBe('Original');
  });
});

describe('Story — edge cases', () => {
  it('handles story with imageUrl', () => {
    const story: Story = { id: 's1', userId: 'u1', username: 'u1', avatar: null, timestamp: new Date().toISOString(), imageUrl: 'https://example.com/story.jpg' };
    expect(story.imageUrl).toBeTruthy();
  });

  it('handles story with content', () => {
    const story: Story = { id: 's2', userId: 'u2', username: 'u2', avatar: null, timestamp: new Date().toISOString(), content: 'My story text' };
    expect(story.content).toBe('My story text');
  });

  it('handles story without image', () => {
    const story: Story = { id: 's3', userId: 'u3', username: 'u3', avatar: null, timestamp: new Date().toISOString() };
    expect(story.imageUrl).toBeUndefined();
  });
});
