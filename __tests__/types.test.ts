// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Tests for shared type definitions and normalization helpers.

import {
  normalizeNotification,
  normalizeNotifications,
  Notification,
  Post,
  Comment,
  SimpleUser,
  UserProfile,
  Story,
  Hashtag,
  Message,
  Toast,
} from '../types';

// ─── SimpleUser ───────────────────────────────────────────────────────

describe('SimpleUser', () => {
  it('can represent a minimal user', () => {
    const user: SimpleUser = {
      id: 'user-1',
      name: 'Test User',
      username: 'testuser',
      avatar: null,
    };
    expect(user.id).toBe('user-1');
    expect(user.name).toBe('Test User');
    expect(user.avatar).toBeNull();
  });

  it('can represent a complete user with optional fields', () => {
    const user: SimpleUser = {
      id: 'user-2',
      name: 'Verified User',
      username: 'verified',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
      bio: 'A verified test user',
    };
    expect(user.isVerified).toBe(true);
    expect(user.bio).toBe('A verified test user');
  });
});

// ─── UserProfile ──────────────────────────────────────────────────────

describe('UserProfile', () => {
  it('can represent a private profile', () => {
    const profile: UserProfile = {
      id: 'profile-1',
      name: 'Private User',
      username: 'privateuser',
      bio: 'Private bio',
      profilePicture: null,
      isPrivate: true,
    };
    expect(profile.isPrivate).toBe(true);
    expect(profile.profilePicture).toBeNull();
  });
});

// ─── Post ─────────────────────────────────────────────────────────────

describe('Post', () => {
  it('can represent a text-only post', () => {
    const post: Post = {
      id: 'post-1',
      username: 'testuser',
      avatar: null,
      content: 'Hello world!',
      media_type: 'text',
      likes: 42,
      reposts: 5,
      replies: 3,
    };
    expect(post.content).toBe('Hello world!');
    expect(post.likes).toBe(42);
    expect(post.media_type).toBe('text');
  });

  it('can represent an image post with poll', () => {
    const post: Post = {
      id: 'post-2',
      username: 'pollster',
      avatar: 'https://example.com/avatar.png',
      content: 'What do you think?',
      media: 'https://example.com/image.jpg',
      media_type: 'image',
      media_aspect_ratio: 1.5,
      likes: 100,
      reposts: 10,
      replies: 25,
      isVerified: true,
      poll: {
        question: 'Option A or B?',
        options: [
          { text: 'Option A', votes: 30 },
          { text: 'Option B', votes: 70 },
        ],
      },
      timestamp: '2026-01-15T10:30:00Z',
    };
    expect(post.media_aspect_ratio).toBe(1.5);
    expect(post.poll?.options).toHaveLength(2);
    expect(post.poll?.options[1].votes).toBe(70);
  });
});

// ─── Comment ──────────────────────────────────────────────────────────

describe('Comment', () => {
  it('can represent a basic comment', () => {
    const comment: Comment = {
      id: 'comment-1',
      username: 'commenter',
      avatar: null,
      text: 'Nice post!',
      timestamp: new Date('2026-05-01T12:00:00Z'),
      likes: 5,
      isLiked: false,
      replies: [],
    };
    expect(comment.text).toBe('Nice post!');
    expect(comment.isLiked).toBe(false);
    expect(comment.replies).toHaveLength(0);
  });

  it('can represent a comment with replies', () => {
    const reply: Comment = {
      id: 'comment-2',
      username: 'replier',
      avatar: null,
      text: 'Thanks!',
      timestamp: new Date('2026-05-01T12:05:00Z'),
      likes: 1,
      isLiked: true,
      replies: [],
    };
    const parent: Comment = {
      id: 'comment-1',
      username: 'original',
      avatar: null,
      text: 'Great post!',
      timestamp: new Date('2026-05-01T12:00:00Z'),
      likes: 10,
      isLiked: true,
      replies: [reply],
    };
    expect(parent.replies).toHaveLength(1);
    expect(parent.replies[0].text).toBe('Thanks!');
  });
});

// ─── Notification ─────────────────────────────────────────────────────

describe('Notification', () => {
  const sampleNotification: Notification = {
    id: 'notif-1',
    type: 'like',
    is_read: false,
    created_at: '2026-05-01T12:00:00Z',
    sender: { id: 'user-1', username: 'liker', avatar_url: null },
    post: { id: 'post-1', content: 'Great post!', media: null, media_type: 'text' },
    comment: null,
    story: null,
  };

  it('can represent a like notification', () => {
    expect(sampleNotification.type).toBe('like');
    expect(sampleNotification.is_read).toBe(false);
  });

  it('can represent a follow notification', () => {
    const followNotif: Notification = {
      ...sampleNotification,
      type: 'follow',
      post: null,
    };
    expect(followNotif.type).toBe('follow');
    expect(followNotif.post).toBeNull();
  });

  it('can represent a comment_like notification', () => {
    const notif: Notification = {
      ...sampleNotification,
      type: 'comment_like',
      comment: { id: 'c-1', text: 'Nice!' },
    };
    expect(notif.type).toBe('comment_like');
    expect(notif.comment?.text).toBe('Nice!');
  });
});

// ─── normalizeNotification ────────────────────────────────────────────

describe('normalizeNotification', () => {
  it('normalizes array fields (Supabase join format)', () => {
    const raw = {
      id: 'n1',
      type: 'comment' as const,
      is_read: false,
      created_at: '2026-01-01T00:00:00Z',
      sender: [{ id: 'u1', username: 'alice', avatar_url: 'https://example.com/avatar.jpg' }],
      post: [{ id: 'p1', content: 'Hello', media: null, media_type: 'text' }],
      comment: null,
      story: null,
    };
    const normalized = normalizeNotification(raw);
    expect(normalized.sender.id).toBe('u1');
    expect(normalized.sender.username).toBe('alice');
    expect(normalized.post?.id).toBe('p1');
  });

  it('falls back to defaults for missing data', () => {
    const raw = {
      id: 'n2',
      type: 'follow' as const,
      is_read: true,
      created_at: '2026-01-01T00:00:00Z',
      sender: null,
      post: null,
      comment: null,
      story: null,
    };
    const normalized = normalizeNotification(raw);
    expect(normalized.sender.id).toBe('');
    expect(normalized.sender.username).toBe('');
    expect(normalized.post).toBeNull();
  });

  it('handles empty sender array', () => {
    const raw = {
      id: 'n3',
      type: 'like' as const,
      is_read: false,
      created_at: '2026-01-01T00:00:00Z',
      sender: [],
      post: null,
      comment: null,
      story: null,
    };
    const normalized = normalizeNotification(raw);
    expect(normalized.sender.id).toBe('');
  });
});

// ─── normalizeNotifications ───────────────────────────────────────────

describe('normalizeNotifications', () => {
  it('normalizes an array of notifications', () => {
    const rawNotifications = [
      { id: 'n1', type: 'like' as const, is_read: false, created_at: '2026-01-01T00:00:00Z', sender: [{ id: 'u1', username: 'alice', avatar_url: null }], post: null, comment: null, story: null },
      { id: 'n2', type: 'follow' as const, is_read: true, created_at: '2026-01-01T01:00:00Z', sender: [{ id: 'u2', username: 'bob', avatar_url: 'https://example.com/bob.jpg' }], post: null, comment: null, story: null },
    ];
    const normalized = normalizeNotifications(rawNotifications);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].sender.username).toBe('alice');
    expect(normalized[1].sender.username).toBe('bob');
  });

  it('returns empty array for null/undefined input', () => {
    expect(normalizeNotifications(null as any)).toHaveLength(0);
    expect(normalizeNotifications(undefined as any)).toHaveLength(0);
    expect(normalizeNotifications([])).toHaveLength(0);
  });
});

// ─── Story ────────────────────────────────────────────────────────────

describe('Story', () => {
  it('can represent a story', () => {
    const story: Story = {
      id: 'story-1',
      userId: 'user-1',
      username: 'storyteller',
      avatar: 'https://example.com/avatar.jpg',
      timestamp: '2026-05-01T12:00:00Z',
      imageUrl: 'https://example.com/story.jpg',
      content: 'My story',
    };
    expect(story.id).toBe('story-1');
    expect(story.imageUrl).toBe('https://example.com/story.jpg');
  });
});

// ─── Hashtag ──────────────────────────────────────────────────────────

describe('Hashtag', () => {
  it('can represent a hashtag', () => {
    const hashtag: Hashtag = {
      tag: 'ahlan',
      postCount: 1234,
    };
    expect(hashtag.tag).toBe('ahlan');
    expect(hashtag.postCount).toBe(1234);
  });
});

// ─── Toast ────────────────────────────────────────────────────────────

describe('Toast', () => {
  it('can represent a success toast', () => {
    const toast: Toast = {
      id: 'toast-1',
      message: 'Operation successful',
      type: 'success',
    };
    expect(toast.type).toBe('success');
  });

  it('can represent an info toast without type', () => {
    const toast: Toast = {
      id: 'toast-2',
      message: 'Something happened',
    };
    expect(toast.type).toBeUndefined();
  });
});

// ─── Message ──────────────────────────────────────────────────────────

describe('Message', () => {
  it('can represent a text message', () => {
    const msg: Message = {
      id: 'msg-1',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      text: 'Hello!',
      created_at: '2026-05-01T12:00:00Z',
      seen: false,
    };
    expect(msg.text).toBe('Hello!');
    expect(msg.seen).toBe(false);
  });

  it('can represent a post share message', () => {
    const msg: Message = {
      id: 'msg-2',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      text: 'Check this out!',
      created_at: '2026-05-01T12:00:00Z',
      type: 'post_share',
      shared_post_id: 'post-1',
    };
    expect(msg.type).toBe('post_share');
    expect(msg.shared_post_id).toBe('post-1');
  });

  it('can represent a story reply message', () => {
    const msg: Message = {
      id: 'msg-3',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      text: 'Nice story!',
      created_at: '2026-05-01T12:00:00Z',
      type: 'story_reply',
      replied_story_id: 'story-1',
    };
    expect(msg.type).toBe('story_reply');
    expect(msg.replied_story_id).toBe('story-1');
  });
});
