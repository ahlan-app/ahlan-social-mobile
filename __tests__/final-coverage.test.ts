// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/final-coverage.test.ts
// Batch 10/10: Final coverage and comprehensive edge case tests

import {
  Hashtag,
  Toast,
  Poll,
  PollOption,
  Comment,
  Post,
  Notification,
  Message,
  Story,
  SimpleUser,
  UserProfile,
} from '../types';

// ─── 1. Hashtag interface: tag + postCount fields ─────────────────────

describe('Hashtag — tag and postCount fields', () => {
  it('creates a hashtag with required fields', () => {
    const hashtag: Hashtag = {
      tag: 'ahlan',
      postCount: 42,
    };
    expect(hashtag.tag).toBe('ahlan');
    expect(hashtag.postCount).toBe(42);
  });

  it('handles zero postCount', () => {
    const hashtag: Hashtag = {
      tag: 'newtrend',
      postCount: 0,
    };
    expect(hashtag.postCount).toBe(0);
  });

  it('handles large postCount values', () => {
    const hashtag: Hashtag = {
      tag: 'viral',
      postCount: 1_000_000,
    };
    expect(hashtag.postCount).toBe(1_000_000);
  });

  it('handles multi-word and special character tags', () => {
    const hashtag: Hashtag = {
      tag: '我爱编程',
      postCount: 13,
    };
    expect(hashtag.tag.length).toBe(4);
    expect(hashtag.postCount).toBe(13);
  });
});

// ─── 2. Toast interface: id + message + optional type ─────────────────

describe('Toast — id, message, and optional type', () => {
  it('creates a toast with only required fields', () => {
    const toast: Toast = {
      id: 'toast-1',
      message: 'Operation successful',
    };
    expect(toast.id).toBe('toast-1');
    expect(toast.message).toBe('Operation successful');
    expect(toast.type).toBeUndefined();
  });

  it('creates a toast with info type', () => {
    const toast: Toast = {
      id: 'toast-2',
      message: 'New message received',
      type: 'info',
    };
    expect(toast.type).toBe('info');
  });

  it('creates a toast with success type', () => {
    const toast: Toast = {
      id: 'toast-3',
      message: 'Post published',
      type: 'success',
    };
    expect(toast.type).toBe('success');
  });

  it('creates a toast with error type', () => {
    const toast: Toast = {
      id: 'toast-4',
      message: 'Something went wrong',
      type: 'error',
    };
    expect(toast.type).toBe('error');
  });

  it('handles empty message string', () => {
    const toast: Toast = {
      id: 'toast-5',
      message: '',
    };
    expect(toast.message).toBe('');
  });

  it('handles very long messages', () => {
    const longMessage = 'x'.repeat(500);
    const toast: Toast = {
      id: 'toast-long',
      message: longMessage,
    };
    expect(toast.message.length).toBe(500);
  });
});

// ─── 3. Poll and PollOption interfaces ─────────────────────────────────

describe('Poll and PollOption — interfaces', () => {
  it('creates a poll option with required fields', () => {
    const option: PollOption = {
      text: 'Option A',
      votes: 15,
    };
    expect(option.text).toBe('Option A');
    expect(option.votes).toBe(15);
  });

  it('creates a poll with a question and options', () => {
    const poll: Poll = {
      question: 'What is your favorite color?',
      options: [
        { text: 'Red', votes: 30 },
        { text: 'Blue', votes: 45 },
        { text: 'Green', votes: 25 },
      ],
    };
    expect(poll.question).toBe('What is your favorite color?');
    expect(poll.options).toHaveLength(3);
    expect(poll.options[0].text).toBe('Red');
    expect(poll.options[1].votes).toBe(45);
  });

  it('handles poll with a single option', () => {
    const poll: Poll = {
      question: 'Do you agree?',
      options: [{ text: 'Yes', votes: 100 }],
    };
    expect(poll.options).toHaveLength(1);
  });

  it('handles poll with zero votes across all options', () => {
    const poll: Poll = {
      question: 'New poll',
      options: [
        { text: 'Option 1', votes: 0 },
        { text: 'Option 2', votes: 0 },
      ],
    };
    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
    expect(totalVotes).toBe(0);
  });

  it('handles poll with extreme vote counts', () => {
    const option: PollOption = {
      text: 'Overwhelming favorite',
      votes: 99_999_999,
    };
    expect(option.votes).toBe(99_999_999);
  });

  it('handles poll with empty option text', () => {
    const option: PollOption = {
      text: '',
      votes: 5,
    };
    expect(option.text).toBe('');
  });
});

// ─── 4. Optional fields across all types with undefined ────────────────

describe('Optional fields — undefined across all types', () => {
  it('Post has undefined optional fields', () => {
    const post: Post = {
      id: 'post-opt',
      username: 'user',
      avatar: null,
      content: 'Hello',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    expect(post.name).toBeUndefined();
    expect(post.media).toBeUndefined();
    expect(post.media_preview_url).toBeUndefined();
    expect(post.media_aspect_ratio).toBeUndefined();
    expect(post.isVerified).toBeUndefined();
    expect(post.poll).toBeUndefined();
    expect(post.timestamp).toBeUndefined();
  });

  it('SimpleUser has undefined optional fields', () => {
    const user: SimpleUser = {
      id: 'u-opt',
      name: 'Test User',
      username: 'testuser',
      avatar: null,
    };
    expect(user.isVerified).toBeUndefined();
    expect(user.bio).toBeUndefined();
  });

  it('UserProfile has undefined optional fields', () => {
    const profile: UserProfile = {
      id: 'p-opt',
      name: 'Profile User',
      username: 'profileuser',
      bio: 'A bio',
      profilePicture: null,
    };
    expect(profile.isVerified).toBeUndefined();
    expect(profile.isPrivate).toBeUndefined();
  });

  it('Message has undefined optional fields', () => {
    const msg: Message = {
      id: 'msg-opt',
      sender_id: 's1',
      receiver_id: 'r1',
      text: 'Hey',
      created_at: '2026-06-01T12:00:00Z',
    };
    expect(msg.type).toBeUndefined();
    expect(msg.shared_post_id).toBeUndefined();
    expect(msg.shared_profile_id).toBeUndefined();
    expect(msg.replied_story_id).toBeUndefined();
    expect(msg.seen).toBeUndefined();
    expect(msg.reply_to).toBeUndefined();
    expect(msg.sharedPost).toBeUndefined();
    expect(msg.sharedUser).toBeUndefined();
    expect(msg.repliedStory).toBeUndefined();
    expect(msg.repliedMessage).toBeUndefined();
  });

  it('Comment has undefined optional userId field', () => {
    const comment: Comment = {
      id: 'c-opt',
      username: 'commenter',
      avatar: null,
      text: 'Nice post',
      timestamp: new Date('2026-06-01T12:00:00Z'),
      likes: 5,
      isLiked: false,
      replies: [],
    };
    expect(comment.userId).toBeUndefined();
  });

  it('Story has undefined optional fields', () => {
    const story: Story = {
      id: 's-opt',
      userId: 'u1',
      username: 'storyuser',
      avatar: null,
      timestamp: '2026-06-01T12:00:00Z',
    };
    expect(story.imageUrl).toBeUndefined();
    expect(story.content).toBeUndefined();
  });
});

// ─── 5. Extreme values: very long strings, zero counts ─────────────────

describe('Extreme values — long strings and zero counts', () => {
  it('Post with very long content string', () => {
    const longContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
    const post: Post = {
      id: 'post-long',
      username: 'long_writer',
      avatar: null,
      content: longContent,
      media_type: 'text',
      likes: 999,
      reposts: 50,
      replies: 10,
    };
    expect(post.content.length).toBeGreaterThan(1000);
    expect(post.content.startsWith('Lorem ipsum')).toBe(true);
  });

  it('Comment with very long text', () => {
    const longText = 'A'.repeat(2000);
    const comment: Comment = {
      id: 'c-long',
      username: 'verbose_user',
      avatar: null,
      text: longText,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      replies: [],
    };
    expect(comment.text.length).toBe(2000);
  });

  it('Post with all zero numeric fields', () => {
    const post: Post = {
      id: 'post-zero',
      username: 'zero_user',
      avatar: null,
      content: 'Zero everything',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    expect(post.likes).toBe(0);
    expect(post.reposts).toBe(0);
    expect(post.replies).toBe(0);
  });

  it('Story with very long imageUrl', () => {
    const longUrl = 'https://cdn.example.com/' + 'x'.repeat(500) + '/image.jpg';
    const story: Story = {
      id: 'story-long-url',
      userId: 'u1',
      username: 'cdn_user',
      avatar: null,
      timestamp: '2026-06-01T12:00:00Z',
      imageUrl: longUrl,
    };
    expect(story.imageUrl!.length).toBeGreaterThan(500);
  });

  it('SimpleUser with very long name and username', () => {
    const longName = 'A'.repeat(100);
    const longUsername = 'user_' + 'b'.repeat(90);
    const user: SimpleUser = {
      id: 'u-extreme',
      name: longName,
      username: longUsername,
      avatar: null,
    };
    expect(user.name.length).toBe(100);
    expect(user.username.length).toBe(95);
  });

  it('UserProfile with very long bio', () => {
    const longBio = 'Bio line 1\nBio line 2\n' + 'C'.repeat(300);
    const profile: UserProfile = {
      id: 'p-long-bio',
      name: 'Biographer',
      username: 'biographer',
      bio: longBio,
      profilePicture: null,
    };
    expect(profile.bio.length).toBeGreaterThan(300);
    expect(profile.bio).toContain('Bio line 1');
  });
});

// ─── 6. Comment nested replies (2-3 levels) ────────────────────────────

describe('Comment — 2-3 level nested replies', () => {
  it('builds a 2-level nested reply chain', () => {
    const leaf: Comment = {
      id: 'c-leaf',
      username: 'leaf_user',
      avatar: null,
      text: 'Leaf level reply',
      timestamp: new Date('2026-06-01T12:02:00Z'),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    const parent: Comment = {
      id: 'c-parent',
      username: 'parent_user',
      avatar: null,
      text: 'Parent comment with a reply',
      timestamp: new Date('2026-06-01T12:01:00Z'),
      likes: 3,
      isLiked: true,
      replies: [leaf],
    };

    expect(parent.replies).toHaveLength(1);
    expect(parent.replies[0].id).toBe('c-leaf');
    expect(parent.replies[0].text).toBe('Leaf level reply');
    expect(parent.replies[0].replies).toHaveLength(0);
  });

  it('builds a 3-level nested reply chain', () => {
    const level3: Comment = {
      id: 'c-l3',
      username: 'third_level',
      avatar: null,
      text: 'Third level nested reply',
      timestamp: new Date('2026-06-01T12:03:00Z'),
      likes: 1,
      isLiked: false,
      replies: [],
    };

    const level2: Comment = {
      id: 'c-l2',
      username: 'second_level',
      avatar: null,
      text: 'Second level reply',
      timestamp: new Date('2026-06-01T12:02:00Z'),
      likes: 2,
      isLiked: true,
      replies: [level3],
    };

    const level1: Comment = {
      id: 'c-l1',
      username: 'first_level',
      avatar: 'https://example.com/avatar.jpg',
      text: 'Top level comment',
      timestamp: new Date('2026-06-01T12:01:00Z'),
      likes: 5,
      isLiked: true,
      replies: [level2],
    };

    // Verify the chain depth and data integrity
    expect(level1.replies).toHaveLength(1);
    expect(level1.replies[0].id).toBe('c-l2');
    expect(level1.replies[0].replies).toHaveLength(1);
    expect(level1.replies[0].replies[0].id).toBe('c-l3');
    expect(level1.replies[0].replies[0].replies).toHaveLength(0);

    // Traverse and verify text at each level
    expect(level1.replies[0].replies[0].text).toBe('Third level nested reply');
    expect(level1.replies[0].replies[0].likes).toBe(1);
  });

  it('handles mixed depth where some replies have nested and others do not', () => {
    const deep: Comment = {
      id: 'c-deep',
      username: 'deep_commenter',
      avatar: null,
      text: 'Deep reply',
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    const shallow: Comment = {
      id: 'c-shallow',
      username: 'shallow_commenter',
      avatar: null,
      text: 'Shallow reply (no nesting)',
      timestamp: new Date(),
      likes: 2,
      isLiked: false,
      replies: [],
    };

    const top: Comment = {
      id: 'c-top-mixed',
      username: 'top_user',
      avatar: null,
      text: 'Mixed depth replies',
      timestamp: new Date(),
      likes: 10,
      isLiked: true,
      replies: [deep, shallow],
    };

    expect(top.replies).toHaveLength(2);
    expect(top.replies[0].replies).toHaveLength(0);
    expect(top.replies[0].replies).toEqual([]);
    expect(top.replies[1].replies).toHaveLength(0);

    // Now nest under deep
    const deeper: Comment = {
      id: 'c-deeper',
      username: 'deeper_user',
      avatar: null,
      text: 'One more level down',
      timestamp: new Date(),
      likes: 1,
      isLiked: true,
      replies: [],
    };
    top.replies[0].replies = [deeper];

    expect(top.replies[0].replies).toHaveLength(1);
    expect(top.replies[0].replies[0].id).toBe('c-deeper');
  });
});

// ─── 7. Explicit false for all boolean flags ──────────────────────────

describe('Boolean flags — explicit false across all types', () => {
  it('Post with isVerified explicitly false', () => {
    const post: Post = {
      id: 'post-not-verified',
      username: 'regular_user',
      avatar: null,
      content: 'Not verified content',
      media_type: 'text',
      likes: 10,
      reposts: 1,
      replies: 0,
      isVerified: false,
    };
    expect(post.isVerified).toBe(false);
  });

  it('SimpleUser with isVerified explicitly false', () => {
    const user: SimpleUser = {
      id: 'u-not-verified',
      name: 'Regular User',
      username: 'regular',
      avatar: null,
      isVerified: false,
    };
    expect(user.isVerified).toBe(false);
  });

  it('UserProfile with isVerified and isPrivate explicitly false', () => {
    const profile: UserProfile = {
      id: 'p-public-unverified',
      name: 'Public User',
      username: 'public_user',
      bio: 'Open profile',
      profilePicture: null,
      isVerified: false,
      isPrivate: false,
    };
    expect(profile.isVerified).toBe(false);
    expect(profile.isPrivate).toBe(false);
  });

  it('Comment with isLiked explicitly false', () => {
    const comment: Comment = {
      id: 'c-not-liked',
      username: 'commenter',
      avatar: null,
      text: 'Not liked by viewer',
      timestamp: new Date(),
      likes: 5,
      isLiked: false,
      replies: [],
    };
    expect(comment.isLiked).toBe(false);
  });

  it('Notification with is_read explicitly false', () => {
    const notification: Notification = {
      id: 'n-unread',
      type: 'like',
      is_read: false,
      created_at: '2026-06-01T12:00:00Z',
      sender: { id: 's1', username: 'alice', avatar_url: null },
      post: null,
      comment: null,
      story: null,
    };
    expect(notification.is_read).toBe(false);
  });

  it('Message with seen explicitly false', () => {
    const msg: Message = {
      id: 'msg-unseen',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Have you seen this?',
      created_at: '2026-06-01T12:00:00Z',
      seen: false,
    };
    expect(msg.seen).toBe(false);
  });

  it('distinguishes false from undefined across all boolean fields', () => {
    const postWithFalse: Post = {
      id: 'p-bool-check',
      username: 'user',
      avatar: null,
      content: 'Check',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      isVerified: false,
    };
    const postWithout: Post = {
      id: 'p-bool-missing',
      username: 'user',
      avatar: null,
      content: 'Check missing',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    // false is defined and false; undefined is not false
    expect(postWithFalse.isVerified).toBe(false);
    expect(postWithout.isVerified).toBeUndefined();
    expect(postWithFalse.isVerified).not.toBeUndefined();
    expect(postWithout.isVerified).not.toBe(false);
  });
});

// ─── 8. Array of Comments with mixed properties ────────────────────────

describe('Array of Comments — mixed properties', () => {
  it('contains comments with varying like counts and isLiked states', () => {
    const comments: Comment[] = [
      {
        id: 'c-array-1',
        username: 'user_a',
        avatar: 'https://example.com/av1.jpg',
        text: 'First comment',
        timestamp: new Date('2026-06-01T10:00:00Z'),
        likes: 10,
        isLiked: true,
        replies: [],
      },
      {
        id: 'c-array-2',
        username: 'user_b',
        avatar: null,
        text: 'Second comment with no avatar',
        timestamp: new Date('2026-06-01T11:00:00Z'),
        likes: 0,
        isLiked: false,
        replies: [],
      },
      {
        id: 'c-array-3',
        username: 'user_c',
        avatar: 'https://example.com/av3.jpg',
        text: '',
        timestamp: new Date('2026-06-01T12:00:00Z'),
        likes: 100,
        isLiked: false,
        replies: [],
      },
    ];

    expect(comments).toHaveLength(3);

    // Varying likes
    const sortedByLikes = [...comments].sort((a, b) => b.likes - a.likes);
    expect(sortedByLikes[0].id).toBe('c-array-3');
    expect(sortedByLikes[0].likes).toBe(100);

    // Avatar presence check
    const withAvatar = comments.filter(c => c.avatar !== null);
    const withoutAvatar = comments.filter(c => c.avatar === null);
    expect(withAvatar).toHaveLength(2);
    expect(withoutAvatar).toHaveLength(1);

    // isLiked states
    const liked = comments.filter(c => c.isLiked);
    const notLiked = comments.filter(c => !c.isLiked);
    expect(liked).toHaveLength(1);
    expect(notLiked).toHaveLength(2);

    // Empty text
    expect(comments[2].text).toBe('');
  });

  it('includes comments with nested replies in the array', () => {
    const reply: Comment = {
      id: 'c-nested-in-array',
      username: 'nested_user',
      avatar: null,
      text: 'A nested reply',
      timestamp: new Date(),
      likes: 2,
      isLiked: true,
      replies: [],
    };

    const comments: Comment[] = [
      {
        id: 'c-top-with-reply',
        username: 'top_user',
        avatar: null,
        text: 'Top level with a reply',
        timestamp: new Date(),
        likes: 7,
        isLiked: false,
        replies: [reply],
      },
      {
        id: 'c-standalone',
        username: 'standalone_user',
        avatar: 'https://example.com/av.jpg',
        text: 'Standalone comment',
        timestamp: new Date(),
        likes: 3,
        isLiked: false,
        replies: [],
      },
    ];

    expect(comments).toHaveLength(2);
    expect(comments[0].replies).toHaveLength(1);
    expect(comments[0].replies[0].text).toBe('A nested reply');
    expect(comments[1].replies).toHaveLength(0);
  });

  it('handles comments with userId field set and unset', () => {
    const comments: Comment[] = [
      {
        id: 'c-with-userid',
        userId: 'uid-123',
        username: 'has_userid',
        avatar: null,
        text: 'Has userId',
        timestamp: new Date(),
        likes: 1,
        isLiked: false,
        replies: [],
      },
      {
        id: 'c-without-userid',
        username: 'no_userid',
        avatar: null,
        text: 'No userId',
        timestamp: new Date(),
        likes: 0,
        isLiked: false,
        replies: [],
      },
    ];

    expect(comments[0].userId).toBe('uid-123');
    expect(comments[1].userId).toBeUndefined();
  });

  it('maps over a comments array to extract fields', () => {
    const comments: Comment[] = [
      { id: 'm1', username: 'u1', avatar: null, text: 'Text 1', timestamp: new Date(), likes: 5, isLiked: true, replies: [] },
      { id: 'm2', username: 'u2', avatar: 'https://ex.com/av.jpg', text: 'Text 2', timestamp: new Date(), likes: 3, isLiked: false, replies: [] },
      { id: 'm3', username: 'u3', avatar: null, text: 'Text 3', timestamp: new Date(), likes: 0, isLiked: false, replies: [] },
    ];

    const ids = comments.map(c => c.id);
    const usernames = comments.map(c => c.username);
    const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);

    expect(ids).toEqual(['m1', 'm2', 'm3']);
    expect(usernames).toEqual(['u1', 'u2', 'u3']);
    expect(totalLikes).toBe(8);
  });
});

// ─── 9. Type narrowing: string | null handles both states ──────────────

describe('Type narrowing — string | null handles both states', () => {
  it('narrows avatar from string | null to string when not null', () => {
    const avatar: string | null = 'https://example.com/avatar.jpg';
    // Type narrowing: if (avatar) treats it as string
    if (avatar) {
      const avatarStr: string = avatar; // narrowed to string
      expect(avatarStr.startsWith('https://')).toBe(true);
      expect(avatarStr).toBe('https://example.com/avatar.jpg');
    } else {
      // Should not reach here
      expect(true).toBe(false);
    }
  });

  it('narrows avatar from string | null to null when null', () => {
    const avatar: string | null = null;
    if (avatar) {
      // Should not reach here
      expect(true).toBe(false);
    } else {
      // null is falsy, so it enters this branch
      expect(avatar).toBeNull();
    }
  });

  it('handles null profilePicture via type narrowing', () => {
    const profilePicture: string | null = null;
    // Default to a placeholder when null
    const displayUrl = profilePicture ?? 'https://default-avatar.com/placeholder.png';
    expect(displayUrl).toBe('https://default-avatar.com/placeholder.png');
  });

  it('handles non-null profilePicture via type narrowing', () => {
    const profilePicture: string | null = 'https://example.com/profile.jpg';
    const displayUrl = profilePicture ?? 'https://default-avatar.com/placeholder.png';
    expect(displayUrl).toBe('https://example.com/profile.jpg');
  });

  it('narrows avatar across a SimpleUser object', () => {
    const user: SimpleUser = {
      id: 'u-narrow',
      name: 'Narrow User',
      username: 'narrow_user',
      avatar: 'https://example.com/av.jpg',
    };

    // Narrow the union type
    const avatar = user.avatar;
    if (avatar !== null) {
      const safeAvatar: string = avatar;
      expect(safeAvatar.length).toBeGreaterThan(0);
    }
  });

  it('narrows null avatar on a SimpleUser object', () => {
    const user: SimpleUser = {
      id: 'u-narrow-null',
      name: 'Null Avatar',
      username: 'null_avatar',
      avatar: null,
    };

    const displayAvatar = user.avatar ?? 'https://default-avatar.com/placeholder.png';
    expect(displayAvatar).toBe('https://default-avatar.com/placeholder.png');
  });

  it('narrows profilePicture on a UserProfile object', () => {
    const profile: UserProfile = {
      id: 'p-narrow',
      name: 'Narrow Profile',
      username: 'narrow_profile',
      bio: 'Bio text',
      profilePicture: null,
    };

    // Simulate a render helper that handles null
    const getProfilePic = (p: UserProfile): string =>
      p.profilePicture ?? 'https://default-avatar.com/profile-placeholder.png';

    expect(getProfilePic(profile)).toBe('https://default-avatar.com/profile-placeholder.png');

    const profileWithPic: UserProfile = {
      ...profile,
      profilePicture: 'https://example.com/pic.jpg',
    };
    expect(getProfilePic(profileWithPic)).toBe('https://example.com/pic.jpg');
  });
});

// ─── 10. Post with undefined poll field ────────────────────────────────

describe('Post — undefined poll field', () => {
  it('creates a Post without a poll (poll is undefined)', () => {
    const post: Post = {
      id: 'post-no-poll',
      username: 'poll_creator',
      avatar: null,
      content: 'What do you think?',
      media_type: 'text',
      likes: 15,
      reposts: 2,
      replies: 5,
    };
    expect(post.poll).toBeUndefined();
  });

  it('creates a Post with a poll defined', () => {
    const post: Post = {
      id: 'post-with-poll',
      username: 'poll_creator',
      avatar: null,
      content: 'Cast your vote!',
      media_type: 'text',
      likes: 20,
      reposts: 3,
      replies: 10,
      poll: {
        question: 'Yes or no?',
        options: [
          { text: 'Yes', votes: 50 },
          { text: 'No', votes: 30 },
        ],
      },
    };
    expect(post.poll).toBeDefined();
    expect(post.poll!.question).toBe('Yes or no?');
    expect(post.poll!.options).toHaveLength(2);
  });

  it('checks poll presence with optional chaining', () => {
    const postWithoutPoll: Post = {
      id: 'post-poll-check-1',
      username: 'user',
      avatar: null,
      content: 'No poll here',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };

    const postWithPoll: Post = {
      id: 'post-poll-check-2',
      username: 'user',
      avatar: null,
      content: 'Has a poll',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      poll: {
        question: 'Q?',
        options: [{ text: 'A', votes: 1 }],
      },
    };

    // Use optional chaining
    expect(postWithoutPoll.poll?.question).toBeUndefined();
    expect(postWithPoll.poll?.question).toBe('Q?');

    // Nullish coalescing for fallback
    const pollTitle1 = postWithoutPoll.poll?.question ?? 'No poll available';
    const pollTitle2 = postWithPoll.poll?.question ?? 'No poll available';
    expect(pollTitle1).toBe('No poll available');
    expect(pollTitle2).toBe('Q?');
  });
});

// ─── 11. Message with all optional fields present ──────────────────────

describe('Message — all optional fields present', () => {
  const sharedPost: Post = {
    id: 'shared-post-1',
    username: 'poster',
    avatar: null,
    content: 'Shared post content',
    media_type: 'text',
    likes: 42,
    reposts: 7,
    replies: 3,
    isVerified: true,
  };

  const sharedUser: SimpleUser = {
    id: 'shared-user-1',
    name: 'Shared User',
    username: 'shared_user',
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
    bio: 'Shared user bio',
  };

  const repliedStory: Story = {
    id: 'replied-story-1',
    userId: 'story-user',
    username: 'storyteller',
    avatar: null,
    timestamp: '2026-06-01T11:00:00Z',
    imageUrl: 'https://example.com/story.jpg',
    content: 'Story content',
  };

  const repliedMessage: Message = {
    id: 'original-msg',
    sender_id: 'u2',
    receiver_id: 'u1',
    text: 'Original message being replied to',
    created_at: '2026-06-01T10:00:00Z',
  };

  it('includes all optional fields on a text message', () => {
    const msg: Message = {
      id: 'msg-all-optional',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Full featured message',
      created_at: '2026-06-01T12:00:00Z',
      type: 'text',
      shared_post_id: null,
      shared_profile_id: null,
      replied_story_id: null,
      seen: true,
      reply_to: null,
      sharedPost: null,
      sharedUser: null,
      repliedStory: null,
      repliedMessage: null,
    };

    expect(msg.type).toBe('text');
    expect(msg.seen).toBe(true);
    expect(msg.shared_post_id).toBeNull();
    expect(msg.shared_profile_id).toBeNull();
    expect(msg.replied_story_id).toBeNull();
    expect(msg.reply_to).toBeNull();
    expect(msg.sharedPost).toBeNull();
    expect(msg.sharedUser).toBeNull();
    expect(msg.repliedStory).toBeNull();
    expect(msg.repliedMessage).toBeNull();
  });

  it('includes all optional fields with share data', () => {
    const msg: Message = {
      id: 'msg-full-share',
      sender_id: 'u1',
      receiver_id: 'u2',
      text: 'Full share message',
      created_at: '2026-06-01T12:00:00Z',
      type: 'post_share',
      shared_post_id: 'shared-post-1',
      shared_profile_id: 'shared-user-1',
      replied_story_id: 'replied-story-1',
      seen: false,
      reply_to: 'original-msg',
      sharedPost,
      sharedUser,
      repliedStory,
      repliedMessage,
    };

    expect(msg.type).toBe('post_share');
    expect(msg.shared_post_id).toBe('shared-post-1');
    expect(msg.shared_profile_id).toBe('shared-user-1');
    expect(msg.replied_story_id).toBe('replied-story-1');
    expect(msg.seen).toBe(false);
    expect(msg.reply_to).toBe('original-msg');

    // Hydrated objects
    expect(msg.sharedPost).toBeDefined();
    expect(msg.sharedPost!.content).toBe('Shared post content');
    expect(msg.sharedPost!.isVerified).toBe(true);

    expect(msg.sharedUser).toBeDefined();
    expect(msg.sharedUser!.username).toBe('shared_user');
    expect(msg.sharedUser!.bio).toBe('Shared user bio');

    expect(msg.repliedStory).toBeDefined();
    expect(msg.repliedStory!.id).toBe('replied-story-1');
    expect(msg.repliedStory!.content).toBe('Story content');

    expect(msg.repliedMessage).toBeDefined();
    expect(msg.repliedMessage!.text).toBe('Original message being replied to');
  });
});

// ─── 12. Notification with all optional fields present ─────────────────

describe('Notification — all optional fields present', () => {
  it('includes all optional fields with values', () => {
    const notification: Notification = {
      id: 'n-full',
      type: 'comment',
      is_read: true,
      created_at: '2026-06-01T12:00:00Z',
      content: 'This is the notification content',
      sender: {
        id: 'sender-1',
        username: 'alice',
        avatar_url: 'https://example.com/av.jpg',
      },
      user: {
        id: 'user-1',
        username: 'bob',
      },
      post: {
        id: 'post-1',
        content: 'Post content here',
        media: 'https://example.com/media.jpg',
        media_type: 'image',
      },
      comment_id: 'comment-1',
      comment: {
        id: 'comment-1',
        text: 'Great post!',
      },
      story: {
        id: 'story-1',
        media_url: 'https://example.com/story.mp4',
      },
    };

    expect(notification.id).toBe('n-full');
    expect(notification.type).toBe('comment');
    expect(notification.is_read).toBe(true);
    expect(notification.content).toBe('This is the notification content');

    // Sender
    expect(notification.sender.username).toBe('alice');
    expect(notification.sender.avatar_url).toBe('https://example.com/av.jpg');

    // User
    expect(notification.user).toBeDefined();
    expect(notification.user!.id).toBe('user-1');
    expect(notification.user!.username).toBe('bob');

    // Post
    expect(notification.post).not.toBeNull();
    expect(notification.post!.id).toBe('post-1');
    expect(notification.post!.media_type).toBe('image');

    // Comment
    expect(notification.comment_id).toBe('comment-1');
    expect(notification.comment).not.toBeNull();
    expect(notification.comment!.text).toBe('Great post!');

    // Story
    expect(notification.story).not.toBeNull();
    expect(notification.story!.media_url).toBe('https://example.com/story.mp4');
  });

  it('handles null optional fields', () => {
    const notification: Notification = {
      id: 'n-null-opt',
      type: 'follow',
      is_read: false,
      created_at: '2026-06-01T12:00:00Z',
      sender: {
        id: 'sender-2',
        username: 'charlie',
        avatar_url: null,
      },
      user: null,
      post: null,
      comment: null,
      story: null,
    };

    expect(notification.content).toBeUndefined();
    expect(notification.user).toBeNull();
    expect(notification.post).toBeNull();
    expect(notification.comment).toBeNull();
    expect(notification.story).toBeNull();
    expect(notification.comment_id).toBeUndefined();
  });

  it('handles content being null', () => {
    const notification: Notification = {
      id: 'n-null-content',
      type: 'like',
      is_read: false,
      created_at: '2026-06-01T12:00:00Z',
      content: null,
      sender: { id: 's1', username: 'alice', avatar_url: null },
      post: null,
      comment: null,
      story: null,
    };
    expect(notification.content).toBeNull();
  });
});

// ─── 13. Timestamps as ISO 8601 across Post, Comment, Story ────────────

describe('Timestamps — ISO 8601 across Post, Comment, Story', () => {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

  it('Post timestamp is ISO 8601 compliant', () => {
    const post: Post = {
      id: 'post-ts',
      username: 'ts_user',
      avatar: null,
      content: 'Timestamp check',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      timestamp: '2026-06-01T12:00:00Z',
    };
    expect(post.timestamp).toMatch(isoDatePattern);
    expect(new Date(post.timestamp!).toISOString()).toBeDefined();
    expect(isNaN(new Date(post.timestamp!).getTime())).toBe(false);
  });

  it('Post timestamp with milliseconds', () => {
    const post: Post = {
      id: 'post-ts-ms',
      username: 'ts_user',
      avatar: null,
      content: 'Precise timestamp',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      timestamp: '2026-06-01T12:00:00.123Z',
    };
    expect(post.timestamp).toMatch(isoDatePattern);
    const date = new Date(post.timestamp!);
    expect(date.getMilliseconds()).toBe(123);
  });

  it('Post timestamp without trailing Z (timezone offset)', () => {
    const post: Post = {
      id: 'post-ts-offset',
      username: 'ts_user',
      avatar: null,
      content: 'Offset timestamp',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      timestamp: '2026-06-01T12:00:00+05:30',
    };
    expect(post.timestamp).toMatch(isoDatePattern);
    const date = new Date(post.timestamp!);
    expect(isNaN(date.getTime())).toBe(false);
    expect(date.toISOString()).toBeDefined();
  });

  it('Comment timestamp is a valid Date object', () => {
    const comment: Comment = {
      id: 'c-ts',
      username: 'ts_commenter',
      avatar: null,
      text: 'Timestamped comment',
      timestamp: new Date('2026-06-01T12:00:00Z'),
      likes: 0,
      isLiked: false,
      replies: [],
    };
    expect(comment.timestamp instanceof Date).toBe(true);
    expect(comment.timestamp.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('Comment timestamp with timezone offset', () => {
    const comment: Comment = {
      id: 'c-ts-offset',
      username: 'ts_commenter',
      avatar: null,
      text: 'Offset comment',
      timestamp: new Date('2026-06-01T17:30:00+05:30'),
      likes: 2,
      isLiked: true,
      replies: [],
    };
    expect(comment.timestamp instanceof Date).toBe(true);
    // The underlying UTC time should be correct
    expect(comment.timestamp.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('Story timestamp is ISO 8601 string', () => {
    const story: Story = {
      id: 's-ts',
      userId: 'u1',
      username: 'ts_storyteller',
      avatar: null,
      timestamp: '2026-06-01T12:00:00.000Z',
    };
    expect(story.timestamp).toMatch(isoDatePattern);
    const parsed = new Date(story.timestamp);
    expect(isNaN(parsed.getTime())).toBe(false);
    expect(parsed.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('Story timestamp with date-only format', () => {
    const story: Story = {
      id: 's-ts-dateonly',
      userId: 'u1',
      username: 'ts_storyteller',
      avatar: null,
      timestamp: '2026-06-01',
    };
    const parsed = new Date(story.timestamp);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  it('compares timestamps across Post, Comment, and Story', () => {
    const post: Post = {
      id: 'p-compare',
      username: 'u',
      avatar: null,
      content: 'Compare',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
      timestamp: '2026-06-01T12:00:00Z',
    };

    const comment: Comment = {
      id: 'c-compare',
      username: 'u',
      avatar: null,
      text: 'Compare',
      timestamp: new Date('2026-06-01T12:30:00Z'),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    const story: Story = {
      id: 's-compare',
      userId: 'u',
      username: 'u',
      avatar: null,
      timestamp: '2026-06-01T13:00:00Z',
    };

    const postTime = new Date(post.timestamp!).getTime();
    const commentTime = comment.timestamp.getTime();
    const storyTime = new Date(story.timestamp).getTime();

    // Post < Comment < Story timeline
    expect(postTime).toBeLessThan(commentTime);
    expect(commentTime).toBeLessThan(storyTime);
  });
});

// ─── 14. Post disabled/empty states: empty content, zero likes, zero replies ─

describe('Post — disabled/empty states', () => {
  it('has empty content', () => {
    const post: Post = {
      id: 'post-empty-content',
      username: 'empty_post',
      avatar: null,
      content: '',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    expect(post.content).toBe('');
    expect(post.content.length).toBe(0);
  });

  it('has zero likes, zero reposts, zero replies', () => {
    const post: Post = {
      id: 'post-zero-engagement',
      username: 'lurker',
      avatar: null,
      content: 'No engagement post',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    expect(post.likes).toBe(0);
    expect(post.reposts).toBe(0);
    expect(post.replies).toBe(0);
  });

  it('has empty content AND zero engagement simultaneously', () => {
    const post: Post = {
      id: 'post-fully-empty',
      username: 'ghost',
      avatar: null,
      content: '',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    expect(post.content).toBe('');
    expect(post.likes + post.reposts + post.replies).toBe(0);
  });

  it('has image media type but no media URL', () => {
    const post: Post = {
      id: 'post-image-no-url',
      username: 'broken_image',
      avatar: null,
      content: 'Image failed to load',
      media_type: 'image',
      likes: 5,
      reposts: 1,
      replies: 0,
    };
    expect(post.media_type).toBe('image');
    expect(post.media).toBeUndefined();
  });

  it('handles missing name field gracefully', () => {
    const post: Post = {
      id: 'post-no-name',
      username: 'noname_user',
      avatar: null,
      content: 'No display name',
      media_type: 'text',
      likes: 3,
      reposts: 0,
      replies: 1,
    };
    // Display name fallback: use username
    const displayName = post.name || post.username;
    expect(displayName).toBe('noname_user');
    expect(post.name).toBeUndefined();
  });

  it('handles missing isVerified gracefully (defaults to falsy)', () => {
    const post: Post = {
      id: 'post-no-verified',
      username: 'regular',
      avatar: null,
      content: 'Not verified',
      media_type: 'text',
      likes: 0,
      reposts: 0,
      replies: 0,
    };
    // undefined is falsy, so a verification check should pass
    const isVerified = post.isVerified ?? false;
    expect(isVerified).toBe(false);
  });
});

// ─── 15. User with empty bio, null avatar, null profilePicture ─────────

describe('User — empty bio, null avatar, null profilePicture', () => {
  it('SimpleUser with empty bio and null avatar', () => {
    const user: SimpleUser = {
      id: 'u-empty-1',
      name: 'Empty Bio User',
      username: 'empty_bio',
      avatar: null,
      bio: '',
    };
    expect(user.avatar).toBeNull();
    expect(user.bio).toBe('');
    expect(user.bio!.length).toBe(0);
  });

  it('SimpleUser with null avatar and no bio field', () => {
    const user: SimpleUser = {
      id: 'u-empty-2',
      name: 'No Bio',
      username: 'no_bio',
      avatar: null,
    };
    expect(user.avatar).toBeNull();
    expect(user.bio).toBeUndefined();
  });

  it('UserProfile with null profilePicture', () => {
    const profile: UserProfile = {
      id: 'p-empty-1',
      name: 'No Pic Profile',
      username: 'no_pic',
      bio: 'Has a bio but no picture',
      profilePicture: null,
    };
    expect(profile.profilePicture).toBeNull();
  });

  it('UserProfile with null profilePicture and empty bio', () => {
    const profile: UserProfile = {
      id: 'p-empty-2',
      name: 'Minimal Profile',
      username: 'minimal',
      bio: '',
      profilePicture: null,
    };
    expect(profile.profilePicture).toBeNull();
    expect(profile.bio).toBe('');
  });

  it('maps null profilePicture to avatar field for SimpleUser compatibility', () => {
    const profile: UserProfile = {
      id: 'p-map-test',
      name: 'Mapping Test',
      username: 'mapper',
      bio: 'Profile to SimpleUser mapping',
      profilePicture: null,
    };

    // Simulate mapping UserProfile to SimpleUser-like structure
    const asSimpleUser: SimpleUser = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.profilePicture,
    };

    expect(asSimpleUser.avatar).toBeNull();
    expect(asSimpleUser.bio).toBeUndefined();
  });

  it('renders an avatar display helper that handles null avatar gracefully', () => {
    // Simulate a function that returns avatar or initial
    const getAvatarDisplay = (user: SimpleUser): string => {
      if (user.avatar) {
        return user.avatar;
      }
      return user.username.charAt(0).toUpperCase();
    };

    const userWithNull: SimpleUser = {
      id: 'u-avatar-null',
      name: 'Null Avatar',
      username: 'null_avatar',
      avatar: null,
    };

    const userWithAvatar: SimpleUser = {
      id: 'u-avatar-exists',
      name: 'Has Avatar',
      username: 'has_avatar',
      avatar: 'https://example.com/av.jpg',
    };

    expect(getAvatarDisplay(userWithNull)).toBe('N');
    expect(getAvatarDisplay(userWithAvatar)).toBe('https://example.com/av.jpg');
  });

  it('handles bio display logic with empty string', () => {
    const renderBio = (user: SimpleUser): string | null => {
      if (user.bio && user.bio.length > 0) {
        return user.bio;
      }
      return null;
    };

    const userWithEmptyBio: SimpleUser = {
      id: 'u-bio-empty',
      name: 'Empty Bio',
      username: 'empty_bio',
      avatar: null,
      bio: '',
    };

    const userWithBio: SimpleUser = {
      id: 'u-bio-present',
      name: 'Has Bio',
      username: 'has_bio',
      avatar: null,
      bio: 'This is my bio',
    };

    const userWithoutBio: SimpleUser = {
      id: 'u-bio-undefined',
      name: 'No Bio Field',
      username: 'no_bio_field',
      avatar: null,
    };

    expect(renderBio(userWithEmptyBio)).toBeNull();
    expect(renderBio(userWithBio)).toBe('This is my bio');
    expect(renderBio(userWithoutBio)).toBeNull();
  });
});
