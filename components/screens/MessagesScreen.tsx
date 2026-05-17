// Ahlan Social — https://github.com/sametyilmaztemel/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
// Coded by Samet Yilmaz Temel
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

import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, ArrowLeftIcon, ArrowRightIcon, FlagIcon, VerifiedIcon, TrashIcon, CheckIcon, DoubleCheckIcon, ReplyIcon } from '../Icons';
// FIX: Import the missing 'sendMessage' function from the apiService.
import { cleanHtml, getChatListUsers, getUserProfile, getPostById, supabase, mapPostData, deleteChatHistory, getStoryById, searchUsers, markMessagesAsRead, sendMessage, deleteConversationForBothSides } from '../../services/apiService';
import type { Message, Post, SimpleUser, Story } from '../../types';
import FlagPicker from '../FlagPicker';
import RenderUserContent from '../RenderUserContent';
import { useApp } from '../../store/AppContext';
import ChatListSkeleton from '../ChatListSkeleton';
import UserAvatar from '../UserAvatar';

interface MessagesScreenProps {
    close: () => void;
    onViewProfile: (username: string, avatar?: string) => void;
    initialUserToChatWith?: { username: string; avatar: string } | null;
    postToShare?: Post | null;
    userToShare?: SimpleUser | null;
    onViewPost: (posts: Post[], postToView: Post) => void;
    onViewStories: (stories: Story[], startIndex: number) => void;
}

const SharedPostPreview: React.FC<{ post: Post; onClick: () => void; onViewProfile: (username: string, avatar?: string) => void; }> = ({ post, onClick, onViewProfile }) => {
    let previewSrc = post.media_preview_url || post.media;
    if (post.media_type === 'image' && post.media && post.media.includes('supabase.co')) {
        try {
            const url = new URL(post.media);
            if (url.pathname.includes('/object/')) {
                url.pathname = url.pathname.replace('/object/', '/render/image/');
                url.searchParams.set('width', '400');
                url.searchParams.set('height', '400');
                url.searchParams.set('resize', 'cover');
                previewSrc = url.toString();
            }
        } catch (e) {
            previewSrc = post.media;
        }
    }

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-black/20 p-2 rounded-lg border border-white/30 hover:bg-black/40 transition-colors mb-2"
        >
            <div className="flex items-center space-x-2 mb-2">
                <UserAvatar username={post.username} avatarUrl={post.avatar} className="w-6 h-6 rounded-full" />
                <span className="font-semibold text-sm text-white">@{post.username}</span>
            </div>
            {post.media ? (
                <div className="aspect-square rounded-md overflow-hidden bg-gray-800">
                     <img src={previewSrc} alt="Post media" className="w-full h-full object-cover" />
                </div>
            ) : (
                <p className="text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap">
                    <RenderUserContent text={post.content} onViewProfile={onViewProfile} />
                </p>
            )}
            <p className="text-xs text-blue-300 mt-2 font-semibold">View Post</p>
        </button>
    );
};

const SharedUserPreview: React.FC<{ user: SimpleUser; onClick: () => void; onViewProfile: (username: string, avatar?: string) => void; }> = ({ user, onClick, onViewProfile }) => (
    <div className="w-full bg-black/20 p-3 rounded-lg border border-white/30 mb-2">
        <div className="flex items-center gap-3">
            <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center space-x-1">
                    <p className="font-semibold text-white truncate">@{user.username}</p>
                    {user.isVerified && <VerifiedIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                </div>
                {user.bio && (
                    <div className="text-sm text-gray-400 line-clamp-2">
                        <RenderUserContent text={user.bio} onViewProfile={onViewProfile} />
                    </div>
                )}
            </div>
            <button
                onClick={onClick}
                className="ml-auto px-3 py-1 text-sm bg-blue-500 text-white rounded-lg flex-shrink-0 hover:bg-blue-600 transition-colors"
            >
                View
            </button>
        </div>
    </div>
);


const StoryReplyPreview: React.FC<{ story: Story; onClick: () => void }> = ({ story, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left bg-black/20 p-2 rounded-lg border border-white/30 hover:bg-black/40 transition-colors mb-2"
    >
        <p className="text-xs text-gray-400 mb-1">Replied to @{story.username}'s story:</p>
        <div className="aspect-[9/16] w-24 rounded-md overflow-hidden bg-gray-800">
            {story.imageUrl && <img src={story.imageUrl} alt="Story preview" className="w-full h-full object-cover" />}
        </div>
    </button>
);

const MessageStatus: React.FC<{ message: Message; isMyMessage: boolean }> = ({ message, isMyMessage }) => {
    const isTempMessage = message.id.startsWith('temp-');
    const creationTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    if (!isMyMessage) {
        return (
            <div className="flex justify-end items-center mt-1">
                <span className="text-xs text-gray-400">{creationTime}</span>
            </div>
        );
    }

    // For my messages, show time and status
    return (
        <div className="flex justify-end items-center mt-1 space-x-1">
            <span className="text-xs text-blue-200/80">{creationTime}</span>
            {isTempMessage ?
                <CheckIcon className="w-4 h-4 text-blue-200/80" /> : // Sending... (single check)
                <DoubleCheckIcon className="w-4 h-4 text-blue-200/80" /> // Delivered (double gray/light-blue check)
            }
        </div>
    );
};


const MessagesScreen: React.FC<MessagesScreenProps> = ({ close, onViewProfile, initialUserToChatWith, postToShare, userToShare, onViewPost, onViewStories }) => {
    const [chatUsers, setChatUsers] = useState<SimpleUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [chatWith, setChatWith] = useState<SimpleUser | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isFlagPickerOpen, setFlagPickerOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messageRefs = useRef<Map<string, any>>(new Map());
    const [internalItemToShare, setInternalItemToShare] = useState({ post: postToShare, user: userToShare });
    const { userProfile, addToast, markAllMessagesAsRead, markChatAsRead, unreadChats } = useApp();
    
    // New states for global user search
    const [userSearchResults, setUserSearchResults] = useState<SimpleUser[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    // State for delete conversation
    const [userToDelete, setUserToDelete] = useState<SimpleUser | null>(null);
    const longPressTimer = useRef<number | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        // Mark all messages as read when opening the main message list view.
        if (userProfile.id && !initialUserToChatWith) {
            markAllMessagesAsRead();
        }
    }, [userProfile.id, initialUserToChatWith, markAllMessagesAsRead]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (userProfile.id) {
                setIsLoadingUsers(true);
                try {
                    const users = await getChatListUsers(userProfile.id);
                    setChatUsers(users);
                } catch (err) {
                    console.error("Could not fetch chat users", err);
                    setChatUsers([]);
                } finally {
                    setIsLoadingUsers(false);
                }
            } else {
                setIsLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [userProfile.id]);
    
    const openChat = async (user: SimpleUser) => {
        if (isLongPress.current) return; // Prevent opening chat if a long press was detected
        setSearchTerm('');
        setUserSearchResults([]);
        setChatWith(user);
        setMessages([]);
        if (userProfile.id && user.id) {
            await markChatAsRead(user.id);
        }
    };

    // Long Press Handlers
    const startPress = (user: SimpleUser) => {
        isLongPress.current = false;
        longPressTimer.current = window.setTimeout(() => {
            isLongPress.current = true;
            setUserToDelete(user);
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
        }, 600); // 600ms trigger for long press
    };

    const endPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };
    
    useEffect(() => {
        if (initialUserToChatWith) {
             const findAndOpen = async () => {
                const profile = await getUserProfile(initialUserToChatWith.username);
                if (profile) {
                    const userToChat: SimpleUser = {
                        id: profile.id,
                        username: profile.username,
                        name: profile.name,
                        avatar: profile.profilePicture,
                        isVerified: profile.isVerified,
                        bio: profile.bio,
                    };
                    await openChat(userToChat);
                } else {
                    addToast(`User @${initialUserToChatWith.username} not found.`, 'error');
                }
            };
            findAndOpen();
        }
    }, [initialUserToChatWith, addToast]);

    // New useEffect for global user search
    useEffect(() => {
        if (!searchTerm.trim()) {
            setUserSearchResults([]);
            setIsSearchingUsers(false);
            return;
        }

        const handleSearch = async () => {
            setIsSearchingUsers(true);
            try {
                const usersFromApi = await searchUsers(searchTerm);
                const mappedUsers: SimpleUser[] = usersFromApi.map(u => ({
                    id: u.id,
                    name: u.full_name,
                    username: u.username,
                    avatar: u.avatar_url,
                    isVerified: u.is_verified,
                    bio: u.bio || undefined,
                }));
                // Filter out the current user from search results
                setUserSearchResults(mappedUsers.filter(u => u.id !== userProfile.id));
            } catch (error) {
                console.error("Error searching users:", error);
                addToast("Could not perform user search.", "error");
            } finally {
                setIsSearchingUsers(false);
            }
        };
        
        const timerId = setTimeout(handleSearch, 300);

        return () => clearTimeout(timerId);
    }, [searchTerm, userProfile.id, addToast]);

    // Load messages
    useEffect(() => {
        if (!chatWith?.id || !userProfile.id) return;

        const loadMessages = async () => {
            const { data, error } = await supabase
                .from("messages")
                .select(`
                    *,
                    sharedPost:shared_post_id (
                        *,
                        profiles (
                            username,
                            avatar_url,
                            full_name,
                            is_verified
                        ),
                        likes(count),
                        comments(count),
                        reposts(count)
                    ),
                    sharedUser:shared_profile_id(id, username, full_name, avatar_url, is_verified, bio),
                    repliedStory:replied_story_id (
                        *,
                        profiles(username, avatar_url)
                    )
                `)
                .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${chatWith.id}),and(sender_id.eq.${chatWith.id},receiver_id.eq.${userProfile.id})`)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error loading messages:", error);
            } else {
                const hydratedMessages = (data || []).map((msg: any) => {
                    const fullMessage: Message = { ...msg, sharedPost: null, sharedUser: null, repliedStory: null, repliedMessage: null };
                    if (msg.sharedPost) {
                        fullMessage.sharedPost = mapPostData(msg.sharedPost);
                    }
                    if (msg.sharedUser) {
                        fullMessage.sharedUser = {
                            id: msg.sharedUser.id,
                            name: msg.sharedUser.full_name,
                            username: msg.sharedUser.username,
                            avatar: msg.sharedUser.avatar_url,
                            isVerified: msg.sharedUser.is_verified,
                            bio: msg.sharedUser.bio,
                        };
                    }
                    if (msg.repliedStory) {
                        const s = msg.repliedStory as any;
                        if (s.profiles) {
                             fullMessage.repliedStory = {
                                id: s.id,
                                userId: s.user_id,
                                username: s.profiles.username,
                                avatar: s.profiles.avatar_url,
                                timestamp: s.created_at,
                                imageUrl: s.media_url,
                                content: s.caption,
                            };
                        }
                    }
                    return fullMessage;
                });
                
                // Second pass to link replies
                const messagesWithReplies = hydratedMessages.map(msg => {
                    if (msg.reply_to) {
                        const repliedMsg = hydratedMessages.find(m => m.id === msg.reply_to);
                        return { ...msg, repliedMessage: repliedMsg || null };
                    }
                    return msg;
                });

                setMessages(messagesWithReplies);
            }
        };
        loadMessages();
    }, [chatWith?.id, userProfile.id]);

    // Real-time listener
    useEffect(() => {
        if (!chatWith?.id || !userProfile.id) return;

        const channel = supabase
            .channel(`chat-with-${chatWith.id}-${Date.now()}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
                (payload) => {
                    const newMessage = payload.new as Message;
                    if ((newMessage.sender_id === userProfile.id && newMessage.receiver_id === chatWith.id) || (newMessage.sender_id === chatWith.id && newMessage.receiver_id === userProfile.id)) {
                        
                        const hydrateAndSet = async () => {
                            let sharedPost: Post | null = null;
                            let sharedUser: SimpleUser | null = null;
                            let repliedStory: Story | null = null;
                            if (newMessage.shared_post_id) {
                                sharedPost = (await getPostById(newMessage.shared_post_id)) || null;
                            }
                            if (newMessage.shared_profile_id) {
                                const { data: profile } = await supabase.from('profiles').select('id, full_name, username, bio, avatar_url, is_verified').eq('id', newMessage.shared_profile_id).single();
                                if (profile) {
                                    sharedUser = { id: profile.id, name: profile.full_name, username: profile.username, avatar: profile.avatar_url, isVerified: profile.is_verified, bio: profile.bio };
                                }
                            }
                            if (newMessage.replied_story_id) {
                                repliedStory = await getStoryById(newMessage.replied_story_id);
                            }
                            const hydratedMessage: Message = { ...newMessage, sharedPost, sharedUser, repliedStory };
                            
                            setMessages(prev => {
                                // Link reply if it exists in the current message list
                                if (hydratedMessage.reply_to) {
                                    const repliedMsg = prev.find(m => m.id === hydratedMessage.reply_to);
                                    hydratedMessage.repliedMessage = repliedMsg || null;
                                }
                                if (prev.some(m => m.id === hydratedMessage.id)) {
                                    return prev;
                                }
                                return [...prev, hydratedMessage];
                            });
                        };
                        hydrateAndSet();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [chatWith?.id, userProfile.id]);

    const closeChat = () => {
        setChatWith(null);
        setReplyingTo(null);
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !internalItemToShare.post && !internalItemToShare.user) || !chatWith) return;

        const tempId = `temp-message-${Date.now()}`;
        const textToSend = newMessage.trim() ? cleanHtml(newMessage.trim()) : '';
        const postToShareNow = internalItemToShare.post;
        const userToShareNow = internalItemToShare.user;
        const reply_to = replyingTo ? replyingTo.id : null;

        let type: Message['type'] = 'text';
        if (postToShareNow) type = 'post_share';
        else if (userToShareNow) type = 'profile_share';

        const optimisticMessage: Message = {
            id: tempId,
            sender_id: userProfile.id,
            receiver_id: chatWith.id,
            text: textToSend,
            created_at: new Date().toISOString(),
            type,
            shared_post_id: postToShareNow?.id || null,
            shared_profile_id: userToShareNow?.id || null,
            sharedPost: postToShareNow,
            sharedUser: userToShareNow,
            reply_to: reply_to,
            repliedMessage: replyingTo,
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setInternalItemToShare({ post: null, user: null });
        setReplyingTo(null);

        try {
            const data = await sendMessage({
                sender_id: userProfile.id,
                receiver_id: chatWith.id,
                text: textToSend || null,
                post: postToShareNow,
                user: userToShareNow,
                reply_to: reply_to,
            });
    
            setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, ...data, sharedPost: optimisticMessage.sharedPost, sharedUser: optimisticMessage.sharedUser, repliedStory: optimisticMessage.repliedStory, repliedMessage: optimisticMessage.repliedMessage } : msg));
    
        } catch(error) {
            console.error("Error sending message:", error);
            addToast("Failed to send message.", "error");
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
        }
    };


    const handleFlagSelect = (flagTextCode: string) => {
        const input = inputRef.current;
        if (!input) {
            setNewMessage(prev => prev + flagTextCode);
            return;
        }

        const start = input.selectionStart ?? newMessage.length;
        const end = input.selectionEnd ?? newMessage.length;
        const text = newMessage;
        const newText = text.substring(0, start) + flagTextCode + text.substring(end);
        
        setNewMessage(newText);
        setFlagPickerOpen(false);

        setTimeout(() => {
            input.focus();
            const newCursorPos = start + flagTextCode.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const scrollToRepliedMessage = (messageId: string) => {
        const element = messageRefs.current.get(messageId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-blue-500/20', 'rounded-lg', 'transition-all', 'duration-300');
            setTimeout(() => {
                element.classList.remove('bg-blue-500/20');
            }, 1500);
        }
    };
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleDeleteChatForBoth = async () => {
        if (!userToDelete || !userProfile.id) return;
        
        const userIdToDelete = userToDelete.id;
        setUserToDelete(null); // Close modal

        // Optimistic update: remove user from list immediately
        setChatUsers(prev => prev.filter(u => u.id !== userIdToDelete));
        addToast("Conversation deleted.", "info");

        try {
            const success = await deleteConversationForBothSides(userProfile.id, userIdToDelete);
            if (!success) {
                 // Revert on failure
                 addToast("Failed to delete conversation for both sides.", "error");
                 // We would ideally re-fetch the list here to be safe
                 const users = await getChatListUsers(userProfile.id);
                 setChatUsers(users);
            }
        } catch (error) {
             console.error("Failed to delete chat:", error);
             addToast("Could not delete chat.", "error");
        }
    };


    if (chatWith) {
        return (
            <div className="fixed inset-0 bg-black z-40 flex flex-col h-screen">
                <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 safe-pt">
                    <button onClick={() => onViewProfile(chatWith.username, chatWith.avatar ?? undefined)} className="flex items-center space-x-3 pl-2 rounded-full hover:bg-gray-800 p-1">
                        <UserAvatar username={chatWith.username} avatarUrl={chatWith.avatar} className="w-10 h-10 rounded-full" />
                        <h1 className="text-xl font-bold">@{chatWith.username}</h1>
                    </button>
                    <button onClick={closeChat} className="text-blue-400 p-2">
                        <ArrowRightIcon />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col space-y-2">
                        {messages.map(msg => {
                            const isMyMessage = msg.sender_id === userProfile.id;
                            const repliedMsgSenderUsername = msg.repliedMessage?.sender_id === userProfile.id ? userProfile.username : chatWith.username;
                            
                            return (
                                <div key={msg.id} ref={el => { messageRefs.current.set(msg.id, el); }} className={`flex items-end gap-2 group ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-xs lg:max-w-md py-2 px-3 rounded-2xl ${isMyMessage ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            if (!msg.id.startsWith('temp-')) setReplyingTo(msg);
                                        }}
                                    >
                                        {msg.repliedMessage && (
                                            <button 
                                                onClick={() => scrollToRepliedMessage(msg.repliedMessage!.id)}
                                                className="w-full text-left bg-black/20 p-2 rounded-lg border-l-2 border-blue-400 mb-2"
                                            >
                                                <p className="font-bold text-xs text-blue-300">@{repliedMsgSenderUsername}</p>
                                                <p className="text-sm text-gray-300 line-clamp-2">{msg.repliedMessage.text}</p>
                                            </button>
                                        )}
                                        {msg.type === 'post_share' && msg.sharedPost && (
                                            <div className="p-1">
                                                <SharedPostPreview post={msg.sharedPost} onClick={() => onViewPost([msg.sharedPost!], msg.sharedPost!)} onViewProfile={onViewProfile} />
                                            </div>
                                        )}
                                        {msg.type === 'profile_share' && msg.sharedUser && (
                                            <div className="p-1">
                                                <SharedUserPreview user={msg.sharedUser} onClick={() => onViewProfile(msg.sharedUser!.username, msg.sharedUser!.avatar ?? undefined)} onViewProfile={onViewProfile} />
                                            </div>
                                        )}
                                        {msg.type === 'story_reply' && msg.repliedStory && (
                                            <div className="p-1">
                                                <StoryReplyPreview
                                                    story={msg.repliedStory}
                                                    onClick={() => {
                                                        if (msg.repliedStory) {
                                                            onViewStories([msg.repliedStory], 0);
                                                        } else {
                                                            addToast("This story is no longer available.", "error");
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {msg.text && (
                                            <div className="px-1 py-1 whitespace-pre-wrap break-words">
                                                <RenderUserContent text={msg.text} onViewProfile={onViewProfile} />
                                            </div>
                                        )}
                                        <MessageStatus message={msg} isMyMessage={isMyMessage} />
                                    </div>
                                </div>
                            );
                        })}
                         <div ref={chatEndRef} />
                    </div>
                </div>
                
                <div className="p-3 border-t border-gray-800 bg-black flex flex-col flex-shrink-0 safe-pb">
                     {replyingTo && (
                        <div className="p-2 mb-2 bg-gray-800 rounded-lg flex justify-between items-center animate-fade-in-fast">
                            <div className="border-l-2 border-blue-400 pl-2 overflow-hidden">
                                <p className="text-sm font-bold text-blue-400">Replying to @{replyingTo.sender_id === userProfile.id ? userProfile.username : chatWith.username}</p>
                                <p className="text-xs text-gray-300 truncate">{replyingTo.text}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-white">&times;</button>
                        </div>
                    )}
                     {internalItemToShare.post && (
                        <div className="p-2 mb-2 bg-gray-800 rounded-lg flex items-center space-x-3 relative">
                             <button onClick={() => setInternalItemToShare(prev => ({ ...prev, post: null }))} className="absolute top-1 right-1 text-gray-500 hover:text-white">&times;</button>
                             {internalItemToShare.post.media ? (
                                <img src={internalItemToShare.post.media_preview_url || internalItemToShare.post.media} alt="Post preview" className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                                 <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-white text-xs p-1 text-center overflow-hidden">
                                    {internalItemToShare.post.content.substring(0, 20)}...
                                 </div>
                            )}
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold text-sm text-gray-300">Sending post by @{internalItemToShare.post.username}</p>
                                <p className="text-xs text-gray-400 truncate">{internalItemToShare.post.content}</p>
                            </div>
                        </div>
                    )}
                     {internalItemToShare.user && (
                        <div className="p-2 mb-2 bg-gray-800 rounded-lg flex items-center space-x-3 relative">
                            <button onClick={() => setInternalItemToShare(prev => ({...prev, user: null}))} className="absolute top-1 right-1 text-gray-500 hover:text-white">&times;</button>
                            <UserAvatar username={internalItemToShare.user.username} avatarUrl={internalItemToShare.user.avatar} className="w-12 h-12 rounded-full object-cover" />
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold text-sm text-gray-300">Sending profile: @{internalItemToShare.user.username}</p>
                                <p className="text-xs text-gray-400 truncate">{internalItemToShare.user.name}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center space-x-3">
                         <button onClick={() => setFlagPickerOpen(true)} className="p-2 text-gray-400 hover:text-blue-400">
                            <FlagIcon className="w-6 h-6" />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value.replace(/@([A-Za-z0-9_.]+)/g, (_, username) => `@${username.toLowerCase()}`))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSendMessage();
                                    e.preventDefault();
                                }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-800 rounded-full py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSendMessage}
                            className="text-blue-500 font-semibold disabled:text-gray-500 transition-colors"
                            disabled={!newMessage.trim() && !internalItemToShare.post && !internalItemToShare.user}>
                            Send
                        </button>
                    </div>
                </div>
                {isFlagPickerOpen && (
                    <FlagPicker
                        onFlagSelected={handleFlagSelect}
                        onClose={() => setFlagPickerOpen(false)}
                    />
                )}
            </div>
        );
    }

    const UserSearchResultRow: React.FC<{ user: SimpleUser; onSelect: (user: SimpleUser) => void }> = ({ user, onSelect }) => {
        return (
            <button onClick={() => onSelect(user)} className="w-full flex items-center space-x-4 p-3 hover:bg-gray-900 transition-colors border-b border-gray-800 text-left">
                <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="overflow-hidden">
                    <div className="flex items-center space-x-1.5">
                        <p className="font-bold text-white truncate">@{user.username}</p>
                        {user.isVerified && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{user.name}</p>
                </div>
            </button>
        );
    };

    // Main Messages List View
    return (
        <div className="flex flex-col h-full relative">
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between sticky top-0 z-10 safe-pt">
                <h1 className="text-xl font-bold">Messages</h1>
                <button onClick={close} className="text-blue-400 p-2">
                    <ArrowRightIcon />
                </button>
            </header>

            <div className="p-4 border-b border-gray-800">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search for users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <SearchIcon />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {searchTerm.trim() ? (
                    // GLOBAL SEARCH VIEW
                    isSearchingUsers ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    ) : userSearchResults.length > 0 ? (
                        userSearchResults.map(user => (
                            <UserSearchResultRow key={user.id} user={user} onSelect={openChat} />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 p-8">No users found for "{searchTerm}".</p>
                    )
                ) : (
                    // EXISTING CHAT LIST VIEW
                    isLoadingUsers ? (
                        <ChatListSkeleton />
                    ) : chatUsers.length > 0 ? (
                        chatUsers.map(user => {
                            const hasUnread = unreadChats.has(user.id);
                            return (
                                <div 
                                    key={user.id} 
                                    className="flex items-center p-4 hover:bg-gray-900 border-b border-gray-800 transition-colors select-none"
                                    onContextMenu={(e) => e.preventDefault()} // Disable native context menu for better long-press exp
                                >
                                    <div 
                                        className="flex items-center space-x-4 cursor-pointer flex-1 overflow-hidden"
                                        onClick={() => openChat(user)}
                                        onMouseDown={() => startPress(user)}
                                        onMouseUp={endPress}
                                        onMouseLeave={endPress}
                                        onTouchStart={() => startPress(user)}
                                        onTouchEnd={endPress}
                                        onTouchCancel={endPress}
                                        onTouchMove={endPress}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <UserAvatar username={user.username} avatarUrl={user.avatar} className="w-12 h-12 rounded-full" />
                                            {hasUnread && <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-blue-500 ring-2 ring-black"></span>}
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <p className="font-bold text-white text-lg truncate">@{user.username}</p>
                                            <p className="text-sm text-gray-400">Tap to start chatting</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-500 p-8">No messages yet. Start a new chat by searching for a user.</p>
                    )
                )}
            </div>

             {/* Delete Conversation Modal */}
             {userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60" onClick={() => setUserToDelete(null)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="p-4 text-center border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white mb-1">Delete Conversation</h3>
                             <p className="text-sm text-gray-400">with @{userToDelete.username}</p>
                        </div>
                        <button 
                            onClick={handleDeleteChatForBoth}
                            className="w-full p-4 text-red-500 font-bold text-center hover:bg-gray-800 transition-colors border-b border-gray-800"
                        >
                            Delete conversation for both sides
                        </button>
                        <button 
                            onClick={() => setUserToDelete(null)}
                            className="w-full p-4 text-white font-semibold text-center hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesScreen;