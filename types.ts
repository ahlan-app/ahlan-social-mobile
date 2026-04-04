
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

export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'comment_like' | 'repost' | 'mention' | 'story_like';
    is_read: boolean;
    created_at: string;
    content?: string | null;
    sender: {
        id: string;
        username: string;
        avatar_url: string | null;
    };
    user?: {
        id: string;
        username: string;
    } | null;
    post: {
        id: string;
        content: string;
        media: string | null;
        media_type: 'text' | 'image';
    } | null;
    comment_id?: string | null;
    comment?: {
        id: string;
        text: string;
    } | null;
    story?: {
        id: string;
        media_url: string;
    } | null;
}

export interface Comment {
    id: string;
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
