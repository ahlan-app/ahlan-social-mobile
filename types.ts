// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// FIX: Define and export all shared types to resolve circular dependencies and import errors.
export interface SimpleUser {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    isVerified?: boolean;
    bio?: string;
}

export interface UserProfile {
    id: string;
    name: string;
    username: string;
    bio: string;
    profilePicture: string | null;
    isVerified?: boolean;
    // FIX: Add 'isPrivate' to allow AI to update account privacy settings.
    isPrivate?: boolean;
}

export interface PollOption {
    text: string;
    votes: number;
}

export interface Poll {
    question: string;
    options: PollOption[];
}

export interface Post {
    id:string;
    name?: string;
    username: string;
    avatar: string | null;
    content: string;
    media?: string;
    media_preview_url?: string;
    media_type: 'text' | 'image';
    media_aspect_ratio?: number;
    likes: number;
    reposts: number;
    replies: number;
    isVerified?: boolean;
    poll?: Poll;
    timestamp?: string;
}

export interface NotificationSender {
    id: string;
    username: string;
    avatar_url: string | null;
}

export interface NotificationPost {
    id: string;
    content: string;
    media: string | null;
    media_type: 'text' | 'image';
}

export interface NotificationComment {
    id: string;
    text: string;
}

export interface NotificationStory {
    id: string;
    media_url: string;
}

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'comment_like' | 'repost' | 'mention' | 'story_like';
    is_read: boolean;
    created_at: string;
    content?: string | null;
    sender: NotificationSender;
    user?: {
        id: string;
        username: string;
    } | null;
    post: NotificationPost | null;
    comment_id?: string | null;
    comment?: NotificationComment | null;
    story?: NotificationStory | null;
}

// Supabase returns foreign-key joins as arrays; use this helper to normalize.
export function normalizeNotification(n: any): Notification {
    const sender = Array.isArray(n.sender) ? n.sender[0] : n.sender;
    const post = Array.isArray(n.post) ? n.post[0] : n.post;
    const comment = Array.isArray(n.comment) ? n.comment[0] : n.comment;
    const story = Array.isArray(n.story) ? n.story[0] : n.story;
    return {
        ...n,
        sender: sender ?? { id: '', username: '', avatar_url: null },
        post: post ?? null,
        comment: comment ?? null,
        story: story ?? null,
    } as Notification;
}

export function normalizeNotifications(data: any[]): Notification[] {
    return (data || []).map(normalizeNotification);
}

export interface Comment {
    id: string;
    userId?: string;
    username: string;
    avatar: string | null;
    text: string;
    timestamp: Date;
    likes: number;
    isLiked: boolean;
    replies: Comment[];
}

export interface Story {
    id: string;
    userId: string;
    username: string;
    avatar: string | null;
    timestamp: string;
    imageUrl?: string;
    content?: string;
}

export interface Hashtag {
    tag: string;
    postCount: number;
}

export interface Toast {
    id: string;
    message: string;
    type?: 'info' | 'success' | 'error';
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    text: string;
    created_at: string;
    type?: 'text' | 'profile_share' | 'post_share' | 'story_reply';
    shared_post_id?: string | null;
    shared_profile_id?: string | null;
    replied_story_id?: string | null;
    seen?: boolean;
    reply_to?: string | null;

    // For rendering, after client-side hydration
    sharedPost?: Post | null;
    sharedUser?: SimpleUser | null;
    repliedStory?: Story | null;
    repliedMessage?: Message | null;
}
