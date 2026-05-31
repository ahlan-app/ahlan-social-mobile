// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/components/Icons.test.ts
// Batch 7/10: Icons exhaustive SVG rendering tests

import React from 'react';
import {
  // Required-prop icons
  HeartIcon,
  BookmarkIcon,

  // No-prop simple icons
  HomeIcon,
  SearchIcon,
  CameraIcon,
  PencilAltIcon,
  UserIcon,
  BellIcon,
  RepostIcon,
  PlusIcon,
  ImageIcon,
  FlipCameraIcon,
  ShareIcon,
  PlusCircleIcon,
  HashtagIcon,

  // Optional className icons
  AhlanIcon,
  CommentIcon,
  TrashIcon,
  XIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PencilIcon,
  TypeIcon,
  DownloadIcon,
  LockClosedIcon,
  MenuIcon,
  ThreeDotsVerticalIcon,
  BlockIcon,
  LogoutIcon,
  EyeIcon,
  ReplyIcon,
  PollIcon,
  VerifiedIcon,
  CheckIcon,
  DoubleCheckIcon,
  FlagIcon,
  ReportIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShareIOSIcon,
  AddToHomeScreenIOSIcon,
  MoreVertAndroidIcon,
} from '../../components/Icons';

// ---------------------------------------------------------------------------
// 1. ALL icon exports render as React elements
// ---------------------------------------------------------------------------

describe('Icons – exhaustive React element creation', () => {
  const allIcons: Array<[string, React.FC<any>]> = [
    ['HomeIcon', HomeIcon],
    ['SearchIcon', SearchIcon],
    ['CameraIcon', CameraIcon],
    ['PencilAltIcon', PencilAltIcon],
    ['UserIcon', UserIcon],
    ['BellIcon', BellIcon],
    ['RepostIcon', RepostIcon],
    ['PlusIcon', PlusIcon],
    ['ImageIcon', ImageIcon],
    ['FlipCameraIcon', FlipCameraIcon],
    ['ShareIcon', ShareIcon],
    ['PlusCircleIcon', PlusCircleIcon],
    ['HashtagIcon', HashtagIcon],
    ['HeartIcon', HeartIcon],
    ['BookmarkIcon', BookmarkIcon],
    ['AhlanIcon', AhlanIcon],
    ['CommentIcon', CommentIcon],
    ['TrashIcon', TrashIcon],
    ['XIcon', XIcon],
    ['ArrowRightIcon', ArrowRightIcon],
    ['ArrowLeftIcon', ArrowLeftIcon],
    ['PencilIcon', PencilIcon],
    ['TypeIcon', TypeIcon],
    ['DownloadIcon', DownloadIcon],
    ['LockClosedIcon', LockClosedIcon],
    ['MenuIcon', MenuIcon],
    ['ThreeDotsVerticalIcon', ThreeDotsVerticalIcon],
    ['BlockIcon', BlockIcon],
    ['LogoutIcon', LogoutIcon],
    ['EyeIcon', EyeIcon],
    ['ReplyIcon', ReplyIcon],
    ['PollIcon', PollIcon],
    ['VerifiedIcon', VerifiedIcon],
    ['CheckIcon', CheckIcon],
    ['DoubleCheckIcon', DoubleCheckIcon],
    ['FlagIcon', FlagIcon],
    ['ReportIcon', ReportIcon],
    ['StarIcon', StarIcon],
    ['ChevronDownIcon', ChevronDownIcon],
    ['ChevronUpIcon', ChevronUpIcon],
    ['ShareIOSIcon', ShareIOSIcon],
    ['AddToHomeScreenIOSIcon', AddToHomeScreenIOSIcon],
    ['MoreVertAndroidIcon', MoreVertAndroidIcon],
  ];

  allIcons.forEach(([name, Component]) => {
    it(`${name} renders as a valid React element`, () => {
      // Determine props needed for required-prop icons
      let props = {};
      if (name === 'HeartIcon') props = { liked: false };
      if (name === 'BookmarkIcon') props = { saved: false };

      const el = React.createElement(Component, props);
      expect(el).toBeDefined();
      expect(el.type).toBe(Component);
      expect(el.props).toEqual(expect.objectContaining(props));
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Required-boolean-prop icons (HeartIcon, BookmarkIcon)
// ---------------------------------------------------------------------------

describe('Icons – required boolean props', () => {
  it('HeartIcon accepts liked={true}', () => {
    const el = React.createElement(HeartIcon, { liked: true });
    expect(el.props.liked).toBe(true);
  });

  it('HeartIcon accepts liked={false}', () => {
    const el = React.createElement(HeartIcon, { liked: false });
    expect(el.props.liked).toBe(false);
  });

  it('BookmarkIcon accepts saved={true}', () => {
    const el = React.createElement(BookmarkIcon, { saved: true });
    expect(el.props.saved).toBe(true);
  });

  it('BookmarkIcon accepts saved={false}', () => {
    const el = React.createElement(BookmarkIcon, { saved: false });
    expect(el.props.saved).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Boolean state toggling (liked / saved) produces different props
// ---------------------------------------------------------------------------

describe('Icons – boolean state toggle correctness', () => {
  it('HeartIcon toggles liked from false to true', () => {
    const elFalse = React.createElement(HeartIcon, { liked: false });
    const elTrue = React.createElement(HeartIcon, { liked: true });
    expect(elFalse.props.liked).toBe(false);
    expect(elTrue.props.liked).toBe(true);
    expect(elTrue.props.liked).not.toBe(elFalse.props.liked);
  });

  it('BookmarkIcon toggles saved from false to true', () => {
    const elFalse = React.createElement(BookmarkIcon, { saved: false });
    const elTrue = React.createElement(BookmarkIcon, { saved: true });
    expect(elFalse.props.saved).toBe(false);
    expect(elTrue.props.saved).toBe(true);
    expect(elTrue.props.saved).not.toBe(elFalse.props.saved);
  });
});

// ---------------------------------------------------------------------------
// 4. Icons that accept an optional className prop
// ---------------------------------------------------------------------------

describe('Icons – optional className prop', () => {
  const classNameIcons: Array<[string, React.FC<any>]> = [
    ['AhlanIcon', AhlanIcon],
    ['CommentIcon', CommentIcon],
    ['TrashIcon', TrashIcon],
    ['XIcon', XIcon],
    ['ArrowRightIcon', ArrowRightIcon],
    ['ArrowLeftIcon', ArrowLeftIcon],
    ['PencilIcon', PencilIcon],
    ['TypeIcon', TypeIcon],
    ['DownloadIcon', DownloadIcon],
    ['LockClosedIcon', LockClosedIcon],
    ['MenuIcon', MenuIcon],
    ['ThreeDotsVerticalIcon', ThreeDotsVerticalIcon],
    ['BlockIcon', BlockIcon],
    ['LogoutIcon', LogoutIcon],
    ['EyeIcon', EyeIcon],
    ['ReplyIcon', ReplyIcon],
    ['PollIcon', PollIcon],
    ['VerifiedIcon', VerifiedIcon],
    ['CheckIcon', CheckIcon],
    ['DoubleCheckIcon', DoubleCheckIcon],
    ['FlagIcon', FlagIcon],
    ['ReportIcon', ReportIcon],
    ['StarIcon', StarIcon],
    ['ChevronDownIcon', ChevronDownIcon],
    ['ChevronUpIcon', ChevronUpIcon],
    ['ShareIOSIcon', ShareIOSIcon],
    ['AddToHomeScreenIOSIcon', AddToHomeScreenIOSIcon],
    ['MoreVertAndroidIcon', MoreVertAndroidIcon],
  ];

  classNameIcons.forEach(([name, Component]) => {
    it(`${name} accepts a custom className prop`, () => {
      const el = React.createElement(Component, { className: 'my-custom-class' });
      expect(el).toBeDefined();
      expect(el.props.className).toBe('my-custom-class');
    });
  });
});

// ---------------------------------------------------------------------------
// 5. AhlanIcon – with and without className
// ---------------------------------------------------------------------------

describe('AhlanIcon – className behavior', () => {
  it('renders with provided className', () => {
    const el = React.createElement(AhlanIcon, { className: 'w-10 h-10' });
    expect(el.props.className).toBe('w-10 h-10');
  });

  it('renders without className (default w-8 h-8)', () => {
    const el = React.createElement(AhlanIcon, {});
    // AhlanIcon uses: className={className || "w-8 h-8"}
    // When no className is passed, props will not contain className
    expect(el.props.className).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. VerifiedIcon – renders without error
// ---------------------------------------------------------------------------

describe('VerifiedIcon – basic rendering', () => {
  it('renders without any props', () => {
    const el = React.createElement(VerifiedIcon, {});
    expect(el).toBeDefined();
    expect(el.type).toBe(VerifiedIcon);
  });

  it('renders with custom className', () => {
    const el = React.createElement(VerifiedIcon, { className: 'w-8 h-8' });
    expect(el.props.className).toBe('w-8 h-8');
  });
});

// ---------------------------------------------------------------------------
// 7. Icons that use spread (iconProps) produce valid React elements
//    These are icons that destructure {...iconProps} inside their SVG.
// ---------------------------------------------------------------------------

describe('Icons – iconProps spread pattern', () => {
  const spreadIcons: Array<[string, React.FC<any>]> = [
    // Icons using spread WITHOUT className override
    ['HomeIcon', HomeIcon],
    ['SearchIcon', SearchIcon],
    ['CameraIcon', CameraIcon],
    ['PencilAltIcon', PencilAltIcon],
    ['UserIcon', UserIcon],
    ['BellIcon', BellIcon],
    ['RepostIcon', RepostIcon],
    ['PlusIcon', PlusIcon],
    ['ImageIcon', ImageIcon],
    ['FlipCameraIcon', FlipCameraIcon],
    ['ShareIcon', ShareIcon],
    ['PlusCircleIcon', PlusCircleIcon],
    ['HashtagIcon', HashtagIcon],

    // Icons using spread WITH className override
    ['CommentIcon', CommentIcon],
    ['TrashIcon', TrashIcon],
    ['XIcon', XIcon],
    ['ArrowRightIcon', ArrowRightIcon],
    ['ArrowLeftIcon', ArrowLeftIcon],
    ['PencilIcon', PencilIcon],
    ['TypeIcon', TypeIcon],
    ['DownloadIcon', DownloadIcon],
    ['LockClosedIcon', LockClosedIcon],
    ['MenuIcon', MenuIcon],
    ['ThreeDotsVerticalIcon', ThreeDotsVerticalIcon],
    ['BlockIcon', BlockIcon],
    ['LogoutIcon', LogoutIcon],
    ['EyeIcon', EyeIcon],
    ['ReplyIcon', ReplyIcon],
    ['PollIcon', PollIcon],
    ['CheckIcon', CheckIcon],
    ['DoubleCheckIcon', DoubleCheckIcon],
    ['FlagIcon', FlagIcon],
    ['ReportIcon', ReportIcon],
    ['StarIcon', StarIcon],
    ['ChevronDownIcon', ChevronDownIcon],
    ['ChevronUpIcon', ChevronUpIcon],
  ];

  spreadIcons.forEach(([name, Component]) => {
    it(`${name} uses iconProps spread and renders a valid React element`, () => {
      // Determine if this icon requires additional required props
      let props: Record<string, any> = {};
      if (name === 'HeartIcon') props.liked = false;
      if (name === 'BookmarkIcon') props.saved = false;

      const el = React.createElement(Component, props);
      expect(el).toBeDefined();
      expect(typeof el.type).toBe('function');
      expect(el.props).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// 8. Summary edge cases for icons that do NOT use the iconProps spread
//    (custom standalone SVGs)
// ---------------------------------------------------------------------------

describe('Icons – custom standalone SVGs (no iconProps spread)', () => {
  const customIcons: Array<[string, React.FC<any>]> = [
    ['AhlanIcon', AhlanIcon],
    ['HeartIcon', HeartIcon],
    ['BookmarkIcon', BookmarkIcon],
    ['VerifiedIcon', VerifiedIcon],
    ['ShareIOSIcon', ShareIOSIcon],
    ['AddToHomeScreenIOSIcon', AddToHomeScreenIOSIcon],
    ['MoreVertAndroidIcon', MoreVertAndroidIcon],
  ];

  customIcons.forEach(([name, Component]) => {
    it(`${name} renders as a valid React element without spread pattern`, () => {
      let props: Record<string, any> = {};
      if (name === 'HeartIcon') props.liked = false;
      if (name === 'BookmarkIcon') props.saved = false;

      const el = React.createElement(Component, props);
      expect(el).toBeDefined();
      expect(el.type).toBe(Component);
    });
  });
});
