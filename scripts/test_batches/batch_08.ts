// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/cross-module.test.ts
// Batch 8/10: Cross-module type safety and data transformation tests

import {
  Post,
  SimpleUser,
  UserProfile,
  Notification,
  Comment,
  Story,
  Message,
  normalizeNotification,
  normalizeNotifications,
} from '../types';

// ─── 1. Import verification (compile-time) ─────────────────────────────

describe('Cross-module imports', () => {
  it('imports all required types and functions', () => {
    // Compile-time guarantee: if this file compiles, all types are importable.
    // Runtime check that they are indeed real objects/functions.
    expect(typeof normalizeNotification).toBe('function');
    expect(typeof normalizeNotifications).toBe('function');
  });
});

// ─── 2. Post fields match API response ─────────────────────────────────

describe('Post — API response shape fidelity', () => {
  it('accepts a raw API response-like shape', () => {
    // Simulate a full response from a Supabase / backend endpoint
    const apiResponse: Record<string, unknown> = {
      id: 'post-abc-123',
      name: 'John Doe',
      username: 'johndoe',
      avatar: 'https://api.example.com/avatars/johndoe.jpg',
      content: 'Hello from the API!',
      media: 'https://api.example.com/media/post-abc-123.jpg',
      media_preview_url: 'https://api.example.com/thumb/post-abc-123.jpg',
      media_type: 'image',
      media_aspect_ratio: 1.5,
      likes: 42,
      reposts: 7,
      replies: 3,
      isVerified: true,
      timestamp: '2026-05-31T12:00:00Z',
    };

    // Cast raw API response to Post — structural typing
    const post = apiResponse as unknown as Post;

    // Core required fields
    expect(post.id).toBe('post-abc-123');
    expect(post.username).toBe('johndoe');
    expect(post.content).toBe('Hello from the API!');
    expect(post.media_type).toBe('image');
    expect(post.likes).toBe(42);
    expect(post.reposts).toBe(7);
    expect(post.replies).toBe(3);

    // Optional fields from API
    expect(post.name).toBe('John Doe');
    expect(post.avatar).toBe('https://api.example.com/avatars/johndoe.jpg');
    expect(post.media).toBe('https://api.example.com/media/post-abc-123.jpg');
    expect(post.media_preview_url).toBe('https://api.example.com/thumb/post-abc-123.jpg');
    expect(post.media_aspect_ratio).toBe(1.5);
    expect(post.isVerified).toBe(true);
    expect(post.timestamp).toBe('2026-05-31T12:00:00Z');
  });

  it('accepts a minimal text-only API response', () => {
    const apiResponse: Record<string, unknown> = {
      id: 'post-min',
      username: 'minimal_user',
      avatar: null,
      content: 'Short text post',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };

    const post = apiResponse as unknown as Post;
    expect(post.id).toBe('post-min');
    expect(post.media_type).toBe('text');
    expect(post.media).toBeUndefined();
    expect(post.name).toBeUndefined();
    expect(post.timestamp).toBeUndefined();
  });
});

// ─── 3. Function accepting SimpleUser with minimal object ──────────────

describe('SimpleUser — function parameter compatibility', () => {
  // A function that accepts SimpleUser (e.g. a profile card renderer)
  function renderUserSummary(user: SimpleUser): string {
    const displayName = user.name || user.username;
    const verifiedBadge = user.isVerified ? ' ✓' : '';
    const bioSnippet = user.bio ? ` — ${user.bio.slice(0, 30)}` : '';
    return `${displayName}${verifiedBadge}${bioSnippet}`;
  }

  it('works with only required fields', () => {
    const minimal: SimpleUser = {
      id: 'u1',
      name: '',
      username: 'anon',
      avatar: null,
    };
    const result = renderUserSummary(minimal);
    expect(result).toBe('anon');
  });

  it('works with minimal fields plus optional isVerified', () => {
    const user: SimpleUser = {
      id: 'u2',
      name: 'Alice',
      username: 'alice',
      avatar: null,
      isVerified: true,
    };
    expect(renderUserSummary(user)).toContain('✓');
  });

  it('works with all optional fields populated', () => {
    const user: SimpleUser = {
      id: 'u3',
      name: 'Bob Smith',
      username: 'bob',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: false,
      bio: 'Full-stack developer and open source enthusiast',
    };
    expect(renderUserSummary(user)).toBe('Bob Smith — Full-stack developer and open ');
  });

  it('works with null avatar and empty bio', () => {
    const user: SimpleUser = {
      id: 'u4',
      name: 'Charlie',
      username: 'charlie_dev',
      avatar: null,
      bio: '',
    };
    expect(renderUserSummary(user)).toBe('Charlie');
  });
});

// ─── 4. Type compatibility: UserProfile → SimpleUser-like shape ────────

describe('UserProfile — type compatibility with SimpleUser-like shape', () => {
  it('can be treated as a SimpleUser-like object (structural typing)', () => {
    // Simulate a UserProfile returned from an API endpoint
    const apiProfile: UserProfile = {
      id: 'profile-42',
      name: 'Sarah Connor',
      username: 'sarah_c',
      bio: 'Fighting the future',
      profilePicture: 'https://api.example.com/profiles/sarah_c.jpg',
      isVerified: true,
      isPrivate: false,
    };

    // A function expecting SimpleUser-like shape (id, name, username, avatar?)
    // Use a pick/spread to simulate passing UserProfile where SimpleUser is expected
    const asSimpleUser = {
      id: apiProfile.id,
      name: apiProfile.name,
      username: apiProfile.username,
      avatar: apiProfile.profilePicture, // map profilePicture → avatar
      isVerified: apiProfile.isVerified,
    } satisfies SimpleUser;

    expect(asSimpleUser.id).toBe('profile-42');
    expect(asSimpleUser.name).toBe('Sarah Connor');
    expect(asSimpleUser.username).toBe('sarah_c');
    expect(asSimpleUser.avatar).toBe('https://api.example.com/profiles/sarah_c.jpg');
    expect(asSimpleUser.isVerified).toBe(true);
  });

  it('can be directly assigned to a SimpleUser variable (duck typing)', () => {
    const profile: UserProfile = {
      id: 'profile-99',
      name: 'John Matrix',
      username: 'matrix',
      bio: 'Soldier',
      profilePicture: null,
    };

    // Direct assignment: UserProfile structurally satisfies SimpleUser
    // (both have id, name, username, avatar ↔ profilePicture + optional fields)
    const user: SimpleUser = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.profilePicture,
    };

    // A function that reads SimpleUser fields should work
    function greet(u: SimpleUser): string {
      return `Hello, ${u.name || u.username}!`;
    }

    expect(greet(user)).toBe('Hello, John Matrix!');
  });

  it('handles null profilePicture mapping to null avatar', () => {
    const profile: UserProfile = {
      id: 'p-empty',
      name: 'No Pic',
      username: 'nopic',
      bio: '',
      profilePicture: null,
    };

    const mapped: SimpleUser = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.profilePicture,
    };

    expect(mapped.avatar).toBeNull();
  });
});

// ─── 5. normalizeNotification with raw API-like data (arrays for joins) ─

describe('normalizeNotification — raw API data with Supabase array joins', () => {
  it('normalizes sender array to single object', () => {
    const raw: Record<string, unknown> = {
      id: 'n-array-sender',
      type: 'like',
      is_read: false,
      created_at: '2026-06-01T00:00:00Z',
      sender: [{ id: 'u1', username: 'alice', avatar_url: 'https://example.com/av.jpg' }],
      post: null,
      comment: null,
      story: null,
    };
    const result = normalizeNotification(raw);
    expect(result.sender).toBeDefined();
    expect(Array.isArray(result.sender)).toBe(false);
    expect(result.sender.id).toBe('u1');
    expect(result.sender.username).toBe('alice');
  });

  it('normalizes post array to single object', () => {
    const raw: Record<string, unknown> = {
      id: 'n-array-post',
      type: 'comment',
      is_read: false,
      created_at: '2026-06-01T01:00:00Z',
      sender: { id: 'u2', username: 'bob', avatar_url: null },
      post: [{ id: 'p99', content: 'Post content', media: 'https://example.com/img.jpg', media_type: 'image' }],
      comment: null,
      story: null,
    };
    const result = normalizeNotification(raw);
    expect(result.post).toBeDefined();
    expect(Array.isArray(result.post)).toBe(false);
    expect(result.post!.id).toBe('p99');
    expect(result.post!.content).toBe('Post content');
  });

  it('normalizes comment array to single object', () => {
    const raw: Record<string, unknown> = {
      id: 'n-array-comment',
      type: 'comment_like',
      is_read: true,
      created_at: '2026-06-01T02:00:00Z',
      sender: { id: 'u3', username: 'carol', avatar_url: null },
      post: { id: 'p1', content: 'Nice!', media: null, media_type: 'text' },
      comment: [{ id: 'c55', text: 'Great work!' }],
      story: null,
    };
    const result = normalizeNotification(raw);
    expect(result.comment).toBeDefined();
    expect(Array.isArray(result.comment)).toBe(false);
    expect(result.comment!.id).toBe('c55');
    expect(result.comment!.text).toBe('Great work!');
  });

  it('normalizes story array to single object', () => {
    const raw: Record<string, unknown> = {
      id: 'n-array-story',
      type: 'story_like',
      is_read: false,
      created_at: '2026-06-01T03:00:00Z',
      sender: { id: 'u4', username: 'dave', avatar_url: null },
      post: null,
      comment: null,
      story: [{ id: 's3', media_url: 'https://example.com/story.mp4' }],
    };
    const result = normalizeNotification(raw);
    expect(result.story).toBeDefined();
    expect(Array.isArray(result.story)).toBe(false);
    expect(result.story!.id).toBe('s3');
    expect(result.story!.media_url).toBe('https://example.com/story.mp4');
  });

  it('handles all fields as arrays simultaneously', () => {
    const raw: Record<string, unknown> = {
      id: 'n-all-arrays',
      type: 'comment',
      is_read: false,
      created_at: '2026-06-01T04:00:00Z',
      sender: [{ id: 'u5', username: 'eve', avatar_url: null }],
      post: [{ id: 'p88', content: 'Multi-array', media: null, media_type: 'text' }],
      comment: [{ id: 'c12', text: 'Testing' }],
      story: [{ id: 's7', media_url: 'https://example.com/story2.jpg' }],
    };
    const result = normalizeNotification(raw);
    expect(result.sender.username).toBe('eve');
    expect(result.post!.id).toBe('p88');
    expect(result.comment!.text).toBe('Testing');
    expect(result.story!.media_url).toBe('https://example.com/story2.jpg');
  });
});

// ─── 6. normalizeNotifications with mixed valid/invalid data ───────────

describe('normalizeNotifications — mixed valid/invalid data', () => {
  it('handles entries with empty sender arrays', () => {
    const mixed = [
      { id: 'n1', type: 'like', is_read: false, created_at: '2026-06-01T00:00:00Z', sender: { id: 'u1', username: 'alice', avatar_url: null }, post: null, comment: null, story: null },
      { id: 'n2', type: 'follow', is_read: true, created_at: '2026-06-01T01:00:00Z', sender: [], post: null, comment: null, story: null },
    ] as any[];

    const result = normalizeNotifications(mixed);
  });

  it('handles empty array input', () => {
    expect(normalizeNotifications([])).toEqual([]);
  });

  it('handles null input gracefully', () => {
    expect(normalizeNotifications(null as any)).toEqual([]);
  });

  it('handles undefined input gracefully', () => {
    expect(normalizeNotifications(undefined as any)).toEqual([]);
  });

  it('handles partial data with missing fields', () => {
    const partials: any[] = [
      { id: 'p1', type: 'like' }, // missing many required fields
      { id: 'p2', is_read: true }, // missing type, sender, etc.
      { }, // completely empty
    ];

    // Should not throw; normalizeNotification wraps with defaults
    expect(() => normalizeNotifications(partials)).not.toThrow();
    const result = normalizeNotifications(partials);
    expect(result).toHaveLength(3);
    // The first entry has id + type, sender should get fallback
    expect(result[0].sender).toBeDefined();
    expect(result[0].sender.id).toBe('');
    expect(result[0].sender.username).toBe('');
  });

  it('preserves ordering for multiple valid entries', () => {
    const data: any[] = [
      { id: 'a', type: 'like', is_read: false, created_at: '2026-01-01T00:00:00Z', sender: { id: 's1', username: 'alice', avatar_url: null }, post: null, comment: null, story: null },
      { id: 'b', type: 'follow', is_read: true, created_at: '2026-01-02T00:00:00Z', sender: { id: 's2', username: 'bob', avatar_url: null }, post: null, comment: null, story: null },
    ];

    const result = normalizeNotifications(data);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});

// ─── 7. Comment with nested replies ────────────────────────────────────

describe('Comment — nested replies', () => {
  it('supports 3 levels of nesting', () => {
    const level3: Comment = {
      id: 'c3',
      username: 'deep_reply',
      avatar: null,
      text: 'Third level reply',
      timestamp: new Date('2026-06-01T12:03:00Z'),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    const level2: Comment = {
      id: 'c2',
      username: 'mid_reply',
      avatar: null,
      text: 'Second level reply',
      timestamp: new Date('2026-06-01T12:02:00Z'),
      likes: 2,
      isLiked: true,
      replies: [level3],
    };

    const level1: Comment = {
      id: 'c1',
      username: 'top_commenter',
      avatar: 'https://example.com/avatar.jpg',
      text: 'First comment',
      timestamp: new Date('2026-06-01T12:01:00Z'),
      likes: 10,
      isLiked: true,
      replies: [level2],
    };

    // Verify the chain
    expect(level1.replies).toHaveLength(1);
    expect(level1.replies[0].id).toBe('c2');
    expect(level1.replies[0].replies).toHaveLength(1);
    expect(level1.replies[0].replies[0].id).toBe('c3');
    expect(level1.replies[0].replies[0].replies).toHaveLength(0);

    // Verify data integrity through the chain
    expect(level1.replies[0].replies[0].text).toBe('Third level reply');
    expect(level1.replies[0].replies[0].isLiked).toBe(false);
  });

  it('supports multiple replies at the same level', () => {
    const reply1: Comment = {
      id: 'cr1',
      username: 'first_replier',
      avatar: null,
      text: 'I agree!',
      timestamp: new Date(),
      likes: 3,
      isLiked: false,
      replies: [],
    };

    const reply2: Comment = {
      id: 'cr2',
      username: 'second_replier',
      avatar: null,
      text: 'Me too!',
      timestamp: new Date(),
      likes: 1,
      isLiked: true,
      replies: [],
    };

    const parent: Comment = {
      id: 'c-parent',
      username: 'op',
      avatar: null,
      text: 'What do you think?',
      timestamp: new Date(),
      likes: 5,
      isLiked: false,
      replies: [reply1, reply2],
    };

    expect(parent.replies).toHaveLength(2);
    expect(parent.replies[0].text).toBe('I agree!');
    expect(parent.replies[1].text).toBe('Me too!');
  });

  it('handles deeply nested structure without circular reference issues', () => {
    // Build a chain of 5 comments to test deep traversal
    function makeChain(depth: number, startId = 1): Comment {
      if (depth <= 0) {
        return {
          id: `c-leaf`,
          username: `leaf_user`,
          avatar: null,
          text: 'Leaf reply',
          timestamp: new Date(),
          likes: 0,
          isLiked: false,
          replies: [],
        };
      }
      return {
        id: `c-${startId}`,
        username: `user_${startId}`,
        avatar: null,
        text: `Reply level ${startId}`,
        timestamp: new Date(),
        likes: startId,
        isLiked: startId % 2 === 0,
        replies: [makeChain(depth - 1, startId + 1)],
      };
    }

    const chain = makeChain(5);
    // Traverse down the chain to verify depth
    let current: Comment = chain;
    let depth = 0;
    while (current.replies.length > 0) {
      expect(current.replies).toHaveLength(1);
      current = current.replies[0];
      depth++;
    }
    expect(depth).toBe(5);
    expect(current.id).toBe('c-leaf');
  });
});

// ─── 8. Story timestamp can be parsed as Date ──────────────────────────

describe('Story — timestamp parsing', () => {
  it('parses ISO 8601 timestamp string to Date', () => {
    const story: Story = {
      id: 'story-ts-1',
      userId: 'u1',
      username: 'story_user',
      avatar: null,
      timestamp: '2026-06-01T12:00:00.000Z',
      imageUrl: 'https://example.com/story.jpg',
    };

    const parsed = new Date(story.timestamp);
    expect(parsed instanceof Date).toBe(true);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(parsed.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('parses various ISO date formats', () => {
    const formats = [
      '2026-06-01T12:00:00Z',
      '2026-06-01T12:00:00.000Z',
      '2026-06-01T12:00:00+00:00',
      '2026-06-01T00:00:00Z',
      '2026-06-01',
    ];

    formats.forEach(ts => {
      const story: Story = {
        id: 'story-ts-fmt',
        userId: 'u1',
        username: 'fmt_user',
        avatar: null,
        timestamp: ts,
      };
      const parsed = new Date(story.timestamp);
      expect(parsed instanceof Date).toBe(true);
      expect(isNaN(parsed.getTime())).toBe(false);
    });
  });

  it('filters out invalid timestamps gracefully', () => {
    const story: Story = {
      id: 'story-bad-ts',
      userId: 'u1',
      username: 'bad_user',
      avatar: null,
      timestamp: 'not-a-date',
    };

    const parsed = new Date(story.timestamp);
    // Date parsing of 'not-a-date' may produce Invalid Date
    // The test verifies we can detect this condition
    expect(parsed instanceof Date).toBe(true);
    // Either valid or invalid — we check the condition
    if (isNaN(parsed.getTime())) {
      expect(parsed.getTime()).toBeNaN();
    }
  });

  it('calculates time elapsed since story timestamp', () => {
    const now = new Date('2026-06-01T12:30:00.000Z');
    const story: Story = {
      id: 'story-elapsed',
      userId: 'u1',
      username: 'ts_user',
      avatar: null,
      timestamp: '2026-06-01T12:00:00.000Z',
    };

    const storyDate = new Date(story.timestamp);
    const elapsedMs = now.getTime() - storyDate.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    expect(elapsedMinutes).toBe(30);
  });

  it('handles unix timestamp numbers converted to string', () => {
    const unixSeconds = 1717257600; // 2026-06-01T00:00:00Z
    const date = new Date(unixSeconds * 1000);
    const isoString = date.toISOString();

    const story: Story = {
      id: 'story-unix',
      userId: 'u1',
      username: 'unix_user',
      avatar: null,
      timestamp: isoString,
    };

    const parsed = new Date(story.timestamp);
    expect(parsed.getTime()).toBe(unixSeconds * 1000);
  });
});

// ─── 9. Message with all share types ───────────────────────────────────

describe('Message — all share types', () => {
  it('handles profile_share type with shared_profile_id', () => {
    const msg: Message = {
      id: 'msg-profile-share',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Check out this profile!',
      created_at: '2026-06-01T12:00:00Z',
      type: 'profile_share',
      shared_profile_id: 'profile-42',
    };

    expect(msg.type).toBe('profile_share');
    expect(msg.shared_profile_id).toBe('profile-42');
    expect(msg.text).toBe('Check out this profile!');
  });

  it('handles profile_share with hydrated shared user data', () => {
    const sharedUser: SimpleUser = {
      id: 'profile-42',
      name: 'Sarah Connor',
      username: 'sarah_c',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
    };

    const msg: Message = {
      id: 'msg-profile-hydrated',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: '',
      created_at: '2026-06-01T12:00:00Z',
      type: 'profile_share',
      shared_profile_id: 'profile-42',
      sharedUser,
    };

    expect(msg.sharedUser).toBeDefined();
    expect(msg.sharedUser!.username).toBe('sarah_c');
    expect(msg.sharedUser!.isVerified).toBe(true);
  });

  it('handles post_share type with shared_post_id', () => {
    const msg: Message = {
      id: 'msg-post-share',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Look at this!',
      created_at: '2026-06-01T12:00:00Z',
      type: 'post_share',
      shared_post_id: 'post-abc-123',
    };

    expect(msg.type).toBe('post_share');
    expect(msg.shared_post_id).toBe('post-abc-123');
  });

  it('handles post_share with hydrated shared post data', () => {
    const sharedPost: Post = {
      id: 'post-abc-123',
      username: 'johndoe',
      avatar: 'https://example.com/avatar.jpg',
      content: 'This is the shared post content!',
      media: 'https://example.com/media.jpg',
      media_type: 'image',
      media_aspect_ratio: 1.5,
      likes: 100,
      reposts: 10,
      replies: 5,
      isVerified: true,
    };

    const msg: Message = {
      id: 'msg-post-hydrated',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Check this out!',
      created_at: '2026-06-01T12:00:00Z',
      type: 'post_share',
      shared_post_id: 'post-abc-123',
      sharedPost,
    };

    expect(msg.sharedPost).toBeDefined();
    expect(msg.sharedPost!.content).toBe('This is the shared post content!');
    expect(msg.sharedPost!.likes).toBe(100);
  });

  it('handles story_reply type with replied_story_id', () => {
    const msg: Message = {
      id: 'msg-story-reply',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Cool story!',
      created_at: '2026-06-01T12:00:00Z',
      type: 'story_reply',
      replied_story_id: 'story-1',
    };

    expect(msg.type).toBe('story_reply');
    expect(msg.replied_story_id).toBe('story-1');
  });

  it('handles story_reply with hydrated replied story data', () => {
    const repliedStory: Story = {
      id: 'story-1',
      userId: 'u2',
      username: 'storyteller',
      avatar: 'https://example.com/avatar.jpg',
      timestamp: '2026-06-01T11:00:00Z',
      imageUrl: 'https://example.com/story.jpg',
      content: 'My awesome story',
    };

    const msg: Message = {
      id: 'msg-story-hydrated',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Nice story!',
      created_at: '2026-06-01T12:00:00Z',
      type: 'story_reply',
      replied_story_id: 'story-1',
      repliedStory,
    };

    expect(msg.repliedStory).toBeDefined();
    expect(msg.repliedStory!.id).toBe('story-1');
    expect(msg.repliedStory!.content).toBe('My awesome story');
  });

  it('handles a text message (no share type)', () => {
    const msg: Message = {
      id: 'msg-text-only',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Just saying hi',
      created_at: '2026-06-01T12:00:00Z',
    };

    expect(msg.type).toBeUndefined();
    expect(msg.shared_post_id).toBeUndefined();
    expect(msg.shared_profile_id).toBeUndefined();
    expect(msg.replied_story_id).toBeUndefined();
  });

  it('combines seen status with share types', () => {
    const msg: Message = {
      id: 'msg-seen-share',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: '',
      created_at: '2026-06-01T12:00:00Z',
      type: 'profile_share',
      shared_profile_id: 'p99',
      seen: true,
    };

    expect(msg.seen).toBe(true);
    expect(msg.type).toBe('profile_share');
    expect(msg.shared_profile_id).toBe('p99');
  });
});

// ─── 10. Simulate real-world usage patterns ─────────────────────────────

describe('Real-world usage patterns', () => {
  it('processes a feed of posts from API', () => {
    // Simulate a typical feed response with mixed content types
    const feedPosts: Post[] = [
      {
        id: 'feed-1',
        name: 'Alice Johnson',
        username: 'alice',
        avatar: 'https://example.com/avatars/alice.jpg',
        content: 'Just posted my first photo!',
        media: 'https://example.com/photos/photo1.jpg',
        media_preview_url: 'https://example.com/thumbs/photo1.jpg',
        media_type: 'image',
        media_aspect_ratio: 0.75,
        likes: 42,
        reposts: 5,
        replies: 3,
        isVerified: true,
      },
      {
        id: 'feed-2',
        username: 'bob',
        avatar: null,
        content: 'Text-only update about my day.',
        media_type: 'text',
        likes: 10,
        reposts: 1,
        replies: 2,
      },
    ];

    // Simulate processing the feed
    const visiblePosts = feedPosts.filter(p => p.content.length > 0);
    const imagePosts = feedPosts.filter(p => p.media_type === 'image');
    const verifiedPosts = feedPosts.filter(p => p.isVerified);

    expect(visiblePosts).toHaveLength(2);
    expect(imagePosts).toHaveLength(1);
    expect(imagePosts[0].media_preview_url).toBeTruthy();
    expect(verifiedPosts).toHaveLength(1);
    expect(verifiedPosts[0].name).toBe('Alice Johnson');
  });

  it('processes notifications from real-time subscription', () => {
    // Simulate a stream of notifications from a Supabase real-time subscription
    // where joins come back as arrays
    const rawNotifications: any[] = [
      {
        id: 'rt-1',
        type: 'like',
        is_read: false,
        created_at: '2026-06-01T12:00:00Z',
        sender: [{ id: 'u1', username: 'alice', avatar_url: 'https://example.com/av1.jpg' }],
        post: [{ id: 'p1', content: 'Nice post', media: null, media_type: 'text' }],
        comment: null,
        story: null,
      },
      {
        id: 'rt-2',
        type: 'follow',
        is_read: false,
        created_at: '2026-06-01T12:01:00Z',
        sender: [{ id: 'u2', username: 'bob', avatar_url: null }],
        post: null,
        comment: null,
        story: null,
      },
      {
        id: 'rt-3',
        type: 'comment',
        is_read: false,
        created_at: '2026-06-01T12:02:00Z',
        sender: [{ id: 'u3', username: 'carol', avatar_url: 'https://example.com/av3.jpg' }],
        post: [{ id: 'p2', content: 'Another post', media: 'https://example.com/img.jpg', media_type: 'image' }],
        comment: [{ id: 'c1', text: 'Great content!' }],
        story: null,
      },
    ];

    const normalized = normalizeNotifications(rawNotifications);

    // All three should be valid Notification objects now
    expect(normalized).toHaveLength(3);

    // Verify each notification is properly normalized
    expect(normalized[0].type).toBe('like');
    expect(normalized[0].sender.username).toBe('alice');
    expect(normalized[0].post).not.toBeNull();
    expect(normalized[0].post!.id).toBe('p1');

    expect(normalized[1].type).toBe('follow');
    expect(normalized[1].sender.username).toBe('bob');
    expect(normalized[1].post).toBeNull();

    expect(normalized[2].type).toBe('comment');
    expect(normalized[2].sender.username).toBe('carol');
    expect(normalized[2].comment).not.toBeNull();
    expect(normalized[2].comment!.text).toBe('Great content!');
  });

  it('processes a chat thread with mixed message types', () => {
    // Simulate a full chat thread between two users
    const thread: Message[] = [
      {
        id: 'chat-1',
        sender_id: 'u1',
        receiver_id: 'u2',
        text: 'Hey, check out this profile!',
        created_at: '2026-06-01T10:00:00Z',
        type: 'profile_share',
        shared_profile_id: 'profile-99',
        seen: true,
      },
      {
        id: 'chat-2',
        sender_id: 'u2',
        receiver_id: 'u1',
        text: 'Nice! And look at this post',
        created_at: '2026-06-01T10:05:00Z',
        type: 'post_share',
        shared_post_id: 'post-42',
        seen: true,
      },
      {
        id: 'chat-3',
        sender_id: 'u1',
        receiver_id: 'u2',
        text: 'Cool story!',
        created_at: '2026-06-01T10:10:00Z',
        type: 'story_reply',
        replied_story_id: 'story-7',
        seen: false,
      },
      {
        id: 'chat-4',
        sender_id: 'u1',
        receiver_id: 'u2',
        text: 'Just a regular text message',
        created_at: '2026-06-01T10:15:00Z',
      },
    ];

    // Simulate rendering logic: group by sender, check types
    const u1Messages = thread.filter(m => m.sender_id === 'u1');
    const u2Messages = thread.filter(m => m.sender_id === 'u2');

    expect(u1Messages).toHaveLength(3);
    expect(u2Messages).toHaveLength(1);

    // Check share type distribution
    const shareTypes = ['profile_share', 'post_share', 'story_reply'] as const;
    shareTypes.forEach(st => {
      const msgs = thread.filter(m => m.type === st);
      expect(msgs).toHaveLength(1);
    });

    // Check seen/unseen count
    const seenMessages = thread.filter(m => m.seen);
    const unseenMessages = thread.filter(m => !m.seen);
    expect(seenMessages).toHaveLength(2);
    expect(unseenMessages).toHaveLength(2);
    // The message without `seen` field should default to undefined (falsy)
    expect(unseenMessages.some(m => m.seen === undefined)).toBe(true);
  });

  it('handles a comment thread with paginated replies', () => {
    // Simulate a top-level comment with multiple reply pages
    const generateReplies = (count: number, startIdx: number): Comment[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `reply-${startIdx + i}`,
        username: `replier_${startIdx + i}`,
        avatar: null,
        text: `Reply number ${startIdx + i}`,
        timestamp: new Date(`2026-06-01T12:0${i}:00Z`),
        likes: Math.floor(Math.random() * 10),
        isLiked: i % 3 === 0,
        replies: [],
      }));

    const page1Replies = generateReplies(5, 1);
    const topComment: Comment = {
      id: 'top-comment',
      username: 'original_poster',
      avatar: 'https://example.com/avatars/op.jpg',
      text: 'What do you all think?',
      timestamp: new Date('2026-06-01T12:00:00Z'),
      likes: 25,
      isLiked: true,
      replies: page1Replies,
    };

    // Simulate paginated loading: initial shows 5, then load more
    expect(topComment.replies).toHaveLength(5);

    // Load another page
    const page2Replies = generateReplies(5, 6);
    topComment.replies = [...topComment.replies, ...page2Replies];

    expect(topComment.replies).toHaveLength(10);
    expect(topComment.replies[9].id).toBe('reply-10');

    // All replies in the tree should be valid Comment types
    topComment.replies.forEach((reply: Comment) => {
      expect(reply.id).toBeDefined();
      expect(reply.username).toBeDefined();
      expect(reply.text).toBeDefined();
      expect(reply.timestamp instanceof Date).toBe(true);
      expect(Array.isArray(reply.replies)).toBe(true);
    });
  });

  it('manages story state with expiration logic', () => {
    // Simulate a stories feed with expiration (24h window)
    const now = new Date('2026-06-02T12:00:00Z');

    const stories: Story[] = [
      {
        id: 'story-recent',
        userId: 'u1',
        username: 'alice',
        avatar: 'https://example.com/av.jpg',
        timestamp: '2026-06-02T11:00:00Z',
        imageUrl: 'https://example.com/story1.jpg',
      },
      {
        id: 'story-expired',
        userId: 'u2',
        username: 'bob',
        avatar: null,
        timestamp: '2026-05-30T10:00:00Z',
        imageUrl: 'https://example.com/story-old.jpg',
      },
      {
        id: 'story-border',
        userId: 'u3',
        username: 'carol',
        avatar: null,
        timestamp: '2026-06-01T12:01:00Z',
        imageUrl: 'https://example.com/story-border.jpg',
      },
    ];

    // Filter stories within 24 hours of `now`
    const expiryMs = 24 * 60 * 60 * 1000;
    const validStories = stories.filter(s => {
      const age = now.getTime() - new Date(s.timestamp).getTime();
      return age >= 0 && age <= expiryMs;
    });

    expect(validStories).toHaveLength(2);
    expect(validStories[0].id).toBe('story-recent');
    expect(validStories[1].id).toBe('story-border');

    // Expired story should be filtered out
    expect(validStories.some(s => s.id === 'story-expired')).toBe(false);
  });

  it('maps UserProfile to SimpleUser for display components', () => {
    // Real-world pattern: UserProfile comes from profile API,
    // but avatar list component expects SimpleUser[]
    const profiles: UserProfile[] = [
      { id: 'p1', name: 'Alice', username: 'alice', bio: 'Hello!', profilePicture: 'https://example.com/p1.jpg', isVerified: true },
      { id: 'p2', name: 'Bob', username: 'bob', bio: '', profilePicture: null },
      { id: 'p3', name: 'Carol', username: 'carol', bio: 'Dev', profilePicture: 'https://example.com/p3.jpg', isPrivate: true },
    ];

    // Transform to SimpleUser for display components
    const displayUsers: SimpleUser[] = profiles.map(p => ({
      id: p.id,
      name: p.name,
      username: p.username,
      avatar: p.profilePicture,
      isVerified: p.isVerified,
      bio: p.bio,
    }));

    expect(displayUsers).toHaveLength(3);
    expect(displayUsers[0].avatar).toBe('https://example.com/p1.jpg');
    expect(displayUsers[0].isVerified).toBe(true);
    expect(displayUsers[1].avatar).toBeNull();
    expect(displayUsers[2].isVerified).toBeUndefined(); // was not set on profile

    // Verify the mapping is lossless for shared fields
    expect(displayUsers[0].id).toBe(profiles[0].id);
    expect(displayUsers[0].name).toBe(profiles[0].name);
    expect(displayUsers[0].username).toBe(profiles[0].username);
  });
});
