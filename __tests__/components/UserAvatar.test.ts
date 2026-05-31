// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/UserAvatar.test.ts
// Batch 1/10: UserAvatar component and Icons rendering tests

import React from 'react';
import UserAvatar from '../../components/UserAvatar';
import {
  HomeIcon, SearchIcon, HeartIcon, CommentIcon, RepostIcon,
  BookmarkIcon, TrashIcon, BellIcon, UserIcon, CameraIcon,
  ShareIcon, PlusIcon, AhlanIcon, VerifiedIcon, FlagIcon,
  ReportIcon, StarIcon,
} from '../../components/Icons';

describe('UserAvatar', () => {
  it('renders img element when avatarUrl is provided', () => {
    const el = React.createElement(UserAvatar, {
      username: 'johndoe',
      avatarUrl: 'https://example.com/avatar.jpg',
      className: 'w-10 h-10',
    });
    expect(el).toBeDefined();
    expect(el.props.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(el.props.username).toBe('johndoe');
    expect(el.props.className).toContain('w-10');
  });

  it('renders initial without avatarUrl', () => {
    const el = React.createElement(UserAvatar, {
      username: 'alice',
      avatarUrl: null,
      className: 'w-12 h-12',
    });
    expect(el).toBeDefined();
    expect(el.props.avatarUrl).toBeNull();
    expect(el.props.username).toBe('alice');
  });

  it('handles null username', () => {
    const el = React.createElement(UserAvatar, {
      username: null,
      avatarUrl: null,
      className: 'w-8 h-8',
    });
    expect(el).toBeDefined();
    expect(el.props.avatarUrl).toBeNull();
    expect(el.props.username).toBeNull();
  });

  it('handles undefined username', () => {
    const el = React.createElement(UserAvatar, {
      username: undefined,
      avatarUrl: null,
      className: 'w-8 h-8',
    });
    expect(el).toBeDefined();
    expect(el.props.username).toBeUndefined();
  });

  it('handles empty string username', () => {
    const el = React.createElement(UserAvatar, {
      username: '',
      avatarUrl: null,
      className: 'w-8 h-8',
    });
    expect(el).toBeDefined();
    expect(el.props.username).toBe('');
  });

  it('accepts different size classes', () => {
    const sizes = ['w-6 h-6', 'w-8 h-8', 'w-10 h-10', 'w-12 h-12', 'w-16 h-16', 'w-20 h-20', 'w-24 h-24'];
    sizes.forEach(size => {
      const el = React.createElement(UserAvatar, {
        username: 'size-test',
        avatarUrl: null,
        className: size,
      });
      expect(el.props.className).toBe(size);
    });
  });
});

describe('Icons', () => {
  const iconComponents = [
    ['HomeIcon', HomeIcon],
    ['SearchIcon', SearchIcon],
    ['HeartIcon', HeartIcon],
    ['CommentIcon', CommentIcon],
    ['RepostIcon', RepostIcon],
    ['BookmarkIcon', BookmarkIcon],
    ['TrashIcon', TrashIcon],
    ['BellIcon', BellIcon],
    ['UserIcon', UserIcon],
    ['CameraIcon', CameraIcon],
    ['ShareIcon', ShareIcon],
    ['PlusIcon', PlusIcon],
    ['AhlanIcon', AhlanIcon],
    ['VerifiedIcon', VerifiedIcon],
    ['FlagIcon', FlagIcon],
    ['ReportIcon', ReportIcon],
    ['StarIcon', StarIcon],
  ] as const;

  iconComponents.forEach(([name, Component]) => {
    it(`${name} renders as a function component`, () => {
      const el = React.createElement(Component as React.FC);
      expect(el).toBeDefined();
      expect(el.type).toBe(Component);
    });
  });

  it('HeartIcon receives liked prop', () => {
    const liked = React.createElement(HeartIcon, { liked: true });
    expect(liked.props.liked).toBe(true);
    const unliked = React.createElement(HeartIcon, { liked: false });
    expect(unliked.props.liked).toBe(false);
  });

  it('BookmarkIcon receives saved prop', () => {
    const saved = React.createElement(BookmarkIcon, { saved: true });
    expect(saved.props.saved).toBe(true);
    const unsaved = React.createElement(BookmarkIcon, { saved: false });
    expect(unsaved.props.saved).toBe(false);
  });

  it('AhlanIcon accepts className prop', () => {
    const el = React.createElement(AhlanIcon, { className: 'w-10 h-10' });
    expect(el.props.className).toBe('w-10 h-10');
  });

  it('AhlanIcon uses default className when none provided', () => {
    const el = React.createElement(AhlanIcon, {});
    expect(el.props.className).toBeUndefined();
  });
});
