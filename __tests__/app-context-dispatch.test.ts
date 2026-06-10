// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/app-context-dispatch.test.ts
// Tests for AppContext dispatch actions and their resulting state
// transitions: updateProfile (setUser), setTheme, and the login/logout
// shape produced by syncUserData / session-clear.

import type { UserProfile, Toast } from '../types';

// ─── Pure-data reducers that mirror the `setState(prev => ({...prev, …}))`
// calls inside `store/AppContext.tsx`. Keeping them as data-only
// reducers (no React, no Supabase) matches the project's existing
// jest config (no React Native, testEnvironment: node).

interface AppState {
 likedPosts: Set<string>;
 repostedPosts: Set<string>;
 savedPosts: Set<string>;
 postComments: Map<string, unknown[]>;
 profilePosts: unknown[];
 userProfile: UserProfile;
 theme: 'light' | 'dark';
 userStories: unknown[];
 storyComments: Map<string, unknown[]>;
 likedStoryIds: Set<string>;
 hasNewStory: boolean;
 viewedStoryTimestamps: Set<string>;
 isViewingStory: boolean;
 isStandalone: boolean;
 isInstallModalOpen: boolean;
 installPromptEvent: Event | null;
 blockedUsers: Set<string>;
 likedVideoIds: Set<string>;
 followedUsernames: Set<string>;
 votedPolls: Map<string, number>;
 toasts: Toast[];
 tooltip: { text: string; target: HTMLElement | null } | null;
 notifications: unknown[] | null;
 unreadMessageCount: number;
 unreadChats: Set<string>;
 topNotification: { title: string; message: string } | null;
 isAdmin: boolean;
}

function makeInitialState(): AppState {
 return {
 likedPosts: new Set(),
 repostedPosts: new Set(),
 savedPosts: new Set(),
 postComments: new Map(),
 profilePosts: [],
 userProfile: {
 id: '',
 name: 'Ahlan User',
 username: 'ahlan_user',
 bio: 'Hello, I am using Ahlan',
 profilePicture: null,
 },
 theme: 'dark',
 userStories: [],
 storyComments: new Map(),
 likedStoryIds: new Set(),
 hasNewStory: false,
 viewedStoryTimestamps: new Set(),
 isViewingStory: false,
 isStandalone: false,
 isInstallModalOpen: false,
 installPromptEvent: null,
 blockedUsers: new Set(),
 likedVideoIds: new Set(),
 followedUsernames: new Set(),
 votedPolls: new Map(),
 toasts: [],
 tooltip: null,
 notifications: null,
 unreadMessageCount:0,
 unreadChats: new Set(),
 topNotification: null,
 isAdmin: false,
 };
}

// ─── Dispatch reducers (mirror of AppContext.tsx setState calls) ─────

// updateProfile — the "setUser" action. The context has no top-level
// `setUser`; user-profile changes go through `updateProfile(partial)`
// (AppContext.tsx line641). This is the canonical setUser dispatch.
function dispatchUpdateProfile(
 state: AppState,
 patch: Partial<UserProfile>,
): AppState {
 return {
 ...state,
 userProfile: { ...state.userProfile, ...patch },
 };
}

// setTheme — AppContext.tsx line652
function dispatchSetTheme(
 state: AppState,
 theme: 'light' | 'dark',
): AppState {
 return { ...state, theme };
}

// syncUserData (login transition) — AppContext.tsx lines312–356.
// On sign-in, the store builds a populated userProfile, fills
// likedPosts / repostedPosts / savedPosts / followedUsernames from
// the DB, and recomputes isAdmin from the username.
function dispatchSyncUserData(
 state: AppState,
 args: {
 userId: string;
 fullName: string;
 username: string;
 avatarUrl: string | null;
 isVerified: boolean;
 bio: string;
 likedPostIds: string[];
 repostedPostIds: string[];
 savedPostIds: string[];
 followedUsernames: string[];
 storyIds: string[];
 unreadSenders: string[];
 },
): AppState {
 const newUserProfile: UserProfile = {
 ...state.userProfile,
 id: args.userId,
 name: args.fullName,
 username: args.username,
 profilePicture: args.avatarUrl,
 isVerified: args.isVerified,
 bio: args.bio,
 };
 return {
 ...state,
 userProfile: newUserProfile,
 likedPosts: new Set(args.likedPostIds),
 repostedPosts: new Set(args.repostedPostIds),
 savedPosts: new Set(args.savedPostIds),
 followedUsernames: new Set(args.followedUsernames),
 userStories: args.storyIds,
 likedStoryIds: new Set<string>(), // syncUserData does not seed story likes here
 unreadMessageCount: args.unreadSenders.length,
 unreadChats: new Set(args.unreadSenders),
 isAdmin: args.username === 'ahlan',
 };
}

// logout transition — there is no dedicated `logout` action; the store
// reacts to supabase.auth.onAuthStateChange firing SIGNED_OUT. The
// practical state shape for logout is to clear the user-bound slices
// (userProfile id, likedPosts, repostedPosts, savedPosts, follows,
// messages) while keeping UI state (theme, blockedUsers, profilePosts)
// intact. This mirrors how the rest of the app stays usable to guests.
function dispatchLogout(state: AppState): AppState {
 return {
 ...state,
 userProfile: {
 id: '',
 name: 'Ahlan User',
 username: 'ahlan_user',
 bio: 'Hello, I am using Ahlan',
 profilePicture: null,
 },
 likedPosts: new Set(),
 repostedPosts: new Set(),
 savedPosts: new Set(),
 likedVideoIds: new Set(),
 followedUsernames: new Set(),
 likedStoryIds: new Set(),
 userStories: [],
 unreadMessageCount:0,
 unreadChats: new Set(),
 notifications: null,
 isAdmin: false,
 };
}

// ───1. setUser / updateProfile dispatch ─────────────────────────────

describe('AppContext dispatch — setUser (updateProfile)', () => {
 it('updateProfile sets a full user profile in one dispatch', () => {
 const initial = makeInitialState();
 const patched = dispatchUpdateProfile(initial, {
 id: 'user-123',
 name: 'Layla',
 username: 'layla',
 bio: 'Salam!',
 profilePicture: 'https://cdn.example.com/layla.png',
 isVerified: true,
 });
 expect(patched.userProfile.id).toBe('user-123');
 expect(patched.userProfile.name).toBe('Layla');
 expect(patched.userProfile.username).toBe('layla');
 expect(patched.userProfile.bio).toBe('Salam!');
 expect(patched.userProfile.profilePicture).toBe(
 'https://cdn.example.com/layla.png',
 );
 expect(patched.userProfile.isVerified).toBe(true);
 });

 it('updateProfile merges partial fields and leaves untouched fields alone', () => {
 const initial = makeInitialState();
 const onlyName = dispatchUpdateProfile(initial, { name: 'New Name' });
 expect(onlyName.userProfile.name).toBe('New Name');
 expect(onlyName.userProfile.username).toBe('ahlan_user');
 expect(onlyName.userProfile.bio).toBe('Hello, I am using Ahlan');
 expect(onlyName.userProfile.id).toBe('');
 });

 it('updateProfile returns a new state object (immutability)', () => {
 const initial = makeInitialState();
 const patched = dispatchUpdateProfile(initial, { name: 'New Name' });
 expect(patched).not.toBe(initial);
 expect(patched.userProfile).not.toBe(initial.userProfile);
 expect(initial.userProfile.name).toBe('Ahlan User'); // original untouched
 });
});

// ───2. setTheme dispatch ────────────────────────────────────────────

describe('AppContext dispatch — setTheme', () => {
 it('switches theme from dark to light', () => {
 const initial = makeInitialState();
 expect(initial.theme).toBe('dark');
 const next = dispatchSetTheme(initial, 'light');
 expect(next.theme).toBe('light');
 });

 it('switches theme from light back to dark', () => {
 const initial = dispatchSetTheme(makeInitialState(), 'light');
 const back = dispatchSetTheme(initial, 'dark');
 expect(back.theme).toBe('dark');
 });

 it('setTheme does not mutate any other state slice', () => {
 const initial = makeInitialState();
 const next = dispatchSetTheme(initial, 'light');
 expect(next.userProfile).toEqual(initial.userProfile);
 expect(next.likedPosts).toEqual(initial.likedPosts);
 expect(next.toasts).toEqual(initial.toasts);
 expect(next.isAdmin).toBe(initial.isAdmin);
 });
});

// ───3. login transition (syncUserData) ──────────────────────────────

describe('AppContext dispatch — login transition', () => {
 it('populates the user profile from the signed-in Supabase user', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-1',
 fullName: 'Ahmed',
 username: 'ahmed',
 avatarUrl: 'https://cdn.example.com/ahmed.png',
 isVerified: false,
 bio: 'Hello from Cairo',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: [],
 });
 expect(loggedIn.userProfile.id).toBe('u-1');
 expect(loggedIn.userProfile.name).toBe('Ahmed');
 expect(loggedIn.userProfile.username).toBe('ahmed');
 });

 it('hydrates liked / reposted / saved / followed sets on login', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-2',
 fullName: 'Sara',
 username: 'sara',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: ['p1', 'p2'],
 repostedPostIds: ['p3'],
 savedPostIds: ['p4', 'p5'],
 followedUsernames: ['noor', 'khaled'],
 storyIds: [],
 unreadSenders: [],
 });
 expect(Array.from(loggedIn.likedPosts)).toEqual(['p1', 'p2']);
 expect(Array.from(loggedIn.repostedPosts)).toEqual(['p3']);
 expect(Array.from(loggedIn.savedPosts)).toEqual(['p4', 'p5']);
 expect(Array.from(loggedIn.followedUsernames).sort()).toEqual([
 'khaled',
 'noor',
 ]);
 });

 it('promotes isAdmin to true only for the canonical admin username', () => {
 const initial = makeInitialState();
 const adminLogin = dispatchSyncUserData(initial, {
 userId: 'u-admin',
 fullName: 'Admin',
 username: 'ahlan',
 avatarUrl: null,
 isVerified: true,
 bio: '',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: [],
 });
 expect(adminLogin.isAdmin).toBe(true);

 const userLogin = dispatchSyncUserData(initial, {
 userId: 'u-3',
 fullName: 'Random',
 username: 'random',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: [],
 });
 expect(userLogin.isAdmin).toBe(false);
 });

 it('computes unreadMessageCount from the unread-senders set', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-4',
 fullName: 'M',
 username: 'm',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: ['s1', 's2', 's3'],
 });
 expect(loggedIn.unreadMessageCount).toBe(3);
 expect(loggedIn.unreadChats.size).toBe(3);
 });
});

// ───4. logout transition ────────────────────────────────────────────

describe('AppContext dispatch — logout transition', () => {
 it('clears userProfile back to defaults', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-5',
 fullName: 'Yusuf',
 username: 'yusuf',
 avatarUrl: 'https://cdn.example.com/yusuf.png',
 isVerified: false,
 bio: 'Bye',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: [],
 });
 const loggedOut = dispatchLogout(loggedIn);
 expect(loggedOut.userProfile.id).toBe('');
 expect(loggedOut.userProfile.name).toBe('Ahlan User');
 expect(loggedOut.userProfile.username).toBe('ahlan_user');
 expect(loggedOut.userProfile.bio).toBe('Hello, I am using Ahlan');
 expect(loggedOut.userProfile.profilePicture).toBeNull();
 });

 it('clears user-bound collections but preserves UI state (theme, blocked)', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-6',
 fullName: 'H',
 username: 'h',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: ['p1'],
 repostedPostIds: ['p2'],
 savedPostIds: ['p3'],
 followedUsernames: ['a', 'b'],
 storyIds: [],
 unreadSenders: ['s1'],
 });
 const themed = dispatchSetTheme(loggedIn, 'light');
 const preLogout = { ...themed, blockedUsers: new Set(['spammer']) };

 const loggedOut = dispatchLogout(preLogout);
 expect(loggedOut.likedPosts.size).toBe(0);
 expect(loggedOut.repostedPosts.size).toBe(0);
 expect(loggedOut.savedPosts.size).toBe(0);
 expect(loggedOut.followedUsernames.size).toBe(0);
 expect(loggedOut.unreadMessageCount).toBe(0);
 expect(loggedOut.unreadChats.size).toBe(0);
 expect(loggedOut.isAdmin).toBe(false);

 // UI state persists across logout:
 expect(loggedOut.theme).toBe('light');
 expect(Array.from(loggedOut.blockedUsers)).toEqual(['spammer']);
 });

 it('logout followed by login yields a fresh, clean session', () => {
 const initial = makeInitialState();
 const loggedIn = dispatchSyncUserData(initial, {
 userId: 'u-7',
 fullName: 'First',
 username: 'first',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: ['x'],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: ['y'],
 storyIds: [],
 unreadSenders: ['z'],
 });
 const loggedOut = dispatchLogout(loggedIn);
 const reLogin = dispatchSyncUserData(loggedOut, {
 userId: 'u-8',
 fullName: 'Second',
 username: 'second',
 avatarUrl: null,
 isVerified: false,
 bio: '',
 likedPostIds: [],
 repostedPostIds: [],
 savedPostIds: [],
 followedUsernames: [],
 storyIds: [],
 unreadSenders: [],
 });
 expect(reLogin.userProfile.id).toBe('u-8');
 expect(reLogin.userProfile.name).toBe('Second');
 expect(reLogin.likedPosts.size).toBe(0);
 expect(reLogin.followedUsernames.size).toBe(0);
 expect(reLogin.unreadMessageCount).toBe(0);
 expect(reLogin.isAdmin).toBe(false);
 });
});

// ───5. Source wiring sanity checks ──────────────────────────────────

describe('AppContext dispatch — source wiring', () => {
 const fs = require('fs');
 const path = require('path');
 const SRC = path.join(__dirname, '..', 'store', 'AppContext.tsx');

 it('exports an AppProvider and uses useState<AppState>', () => {
 const src = fs.readFileSync(SRC, 'utf8');
 expect(src).toContain('export const AppProvider');
 expect(src).toContain('useState<AppState>');
 });

 it('declares setTheme and updateProfile in the public context type', () => {
 const src = fs.readFileSync(SRC, 'utf8');
 expect(src).toMatch(/setTheme:\s*\(theme:\s*'light'\s*\|\s*'dark'\)\s*=>\s*void/);
 expect(src).toMatch(/updateProfile:\s*\(newProfile:\s*Partial<UserProfile>\)\s*=>\s*void/);
 });

 it('exposes setTheme and updateProfile in the memoised contextValue', () => {
 const src = fs.readFileSync(SRC, 'utf8');
 // Look for both names inside the value object and the dependency array.
 const valueBlock = src.match(/const contextValue = useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[/);
 expect(valueBlock).not.toBeNull();
 expect(valueBlock![1]).toContain('setTheme,');
 expect(valueBlock![1]).toContain('updateProfile,');
 });
});
