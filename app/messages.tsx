import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext.native';
import {
  getChatListUsers,
  getUserProfile,
  sendMessage,
  searchUsers,
  deleteConversationForBothSides,
  mapPostData,
  getPostById,
  getStoryById,
  cleanHtml,
} from '../services/apiService';
import { supabase } from '../services/supabase.native';
import UserAvatar from '../components/native/UserAvatar';
import RenderUserContent from '../components/native/RenderUserContent';
import { SearchIcon, VerifiedIcon, CheckIcon, DoubleCheckIcon } from '../components/native/Icons';
import type { Message, Post, SimpleUser, Story } from '../types';

// ─── Message Status ───────────────────────────

const MessageStatus: React.FC<{ message: Message; isMyMessage: boolean }> = ({ message, isMyMessage }) => {
  const isTempMessage = message.id.startsWith('temp-');
  const creationTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (!isMyMessage) {
    return (
      <View className="flex-row justify-end items-center mt-1">
        <Text className="text-xs text-gray-400">{creationTime}</Text>
      </View>
    );
  }

  return (
    <View className="flex-row justify-end items-center mt-1" style={{ gap: 4 }}>
      <Text className="text-xs text-blue-200/80">{creationTime}</Text>
      {isTempMessage ? (
        <CheckIcon color="rgba(191,219,254,0.8)" size={14} />
      ) : (
        <DoubleCheckIcon color="rgba(191,219,254,0.8)" size={14} />
      )}
    </View>
  );
};

// ─── Shared Post Preview ──────────────────────

const SharedPostPreview: React.FC<{ post: Post; onPress: () => void }> = ({ post, onPress }) => (
  <Pressable onPress={onPress} className="bg-black/20 p-2 rounded-lg border border-white/30 mb-2">
    <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
      <UserAvatar username={post.username} avatarUrl={post.avatar} size={24} />
      <Text className="text-white text-sm font-semibold">@{post.username}</Text>
    </View>
    {post.media ? (
      <View className="aspect-square rounded-md overflow-hidden bg-gray-800">
        <Image
          source={{ uri: post.media_preview_url || post.media }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      </View>
    ) : (
      <Text className="text-gray-200 text-sm" numberOfLines={3}>{post.content}</Text>
    )}
    <Text className="text-xs text-blue-300 mt-2 font-semibold">View Post</Text>
  </Pressable>
);

// ─── Shared User Preview ──────────────────────

const SharedUserPreview: React.FC<{ user: SimpleUser; onPress: () => void }> = ({ user, onPress }) => (
  <View className="bg-black/20 p-3 rounded-lg border border-white/30 mb-2">
    <View className="flex-row items-center" style={{ gap: 12 }}>
      <UserAvatar username={user.username} avatarUrl={user.avatar} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Text className="text-white font-semibold">@{user.username}</Text>
          {user.isVerified && <VerifiedIcon color="#3b82f6" size={14} />}
        </View>
      </View>
      <Pressable onPress={onPress} className="bg-blue-500 px-3 py-1 rounded-lg">
        <Text className="text-white text-sm">View</Text>
      </Pressable>
    </View>
  </View>
);

// ─── Messages Screen ──────────────────────────

export default function MessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatWith?: string }>();
  const { userProfile, addToast, markAllMessagesAsRead, markChatAsRead, unreadChats, triggerHapticFeedback } = useApp();

  const [chatUsers, setChatUsers] = useState<SimpleUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [chatWith, setChatWith] = useState<SimpleUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Search
  const [userSearchResults, setUserSearchResults] = useState<SimpleUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Delete modal
  const [userToDelete, setUserToDelete] = useState<SimpleUser | null>(null);

  const inputRef = useRef<TextInput>(null);

  // Mark messages read on mount (list view)
  useEffect(() => {
    if (userProfile?.id && !params.chatWith) {
      markAllMessagesAsRead();
    }
  }, [userProfile?.id, params.chatWith]);

  // Load chat list
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userProfile?.id) { setIsLoadingUsers(false); return; }
      setIsLoadingUsers(true);
      try {
        const users = await getChatListUsers(userProfile.id);
        setChatUsers(users);
      } catch (err) {
        console.error('Could not fetch chat users', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [userProfile?.id]);

  // Open chat from params (e.g. from profile "Message" button)
  useEffect(() => {
    if (!params.chatWith) return;
    const findAndOpen = async () => {
      const profile = await getUserProfile(params.chatWith!);
      if (profile) {
        const userToChat: SimpleUser = {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          avatar: profile.profilePicture,
          isVerified: profile.isVerified,
          bio: profile.bio,
        };
        openChat(userToChat);
      } else {
        addToast(`User @${params.chatWith} not found.`, 'error');
      }
    };
    findAndOpen();
  }, [params.chatWith]);

  const openChat = async (user: SimpleUser) => {
    setSearchTerm('');
    setUserSearchResults([]);
    setChatWith(user);
    setMessages([]);
    if (userProfile?.id && user.id) {
      await markChatAsRead(user.id);
    }
  };

  // User search with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const usersFromApi = await searchUsers(searchTerm);
        const mapped: SimpleUser[] = usersFromApi.map((u: any) => ({
          id: u.id,
          name: u.full_name,
          username: u.username,
          avatar: u.avatar_url,
          isVerified: u.is_verified,
          bio: u.bio || undefined,
        }));
        setUserSearchResults(mapped.filter(u => u.id !== userProfile?.id));
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, userProfile?.id]);

  // Load messages when chat opens
  useEffect(() => {
    if (!chatWith?.id || !userProfile?.id) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sharedPost:shared_post_id (
            *,
            profiles (username, avatar_url, full_name, is_verified),
            likes(count),
            comments(count),
            reposts(count)
          ),
          sharedUser:shared_profile_id(id, username, full_name, avatar_url, is_verified, bio)
        `)
        .or(`and(sender_id.eq.${userProfile.id},receiver_id.eq.${chatWith.id}),and(sender_id.eq.${chatWith.id},receiver_id.eq.${userProfile.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
      } else {
        const hydrated = (data || []).map((msg: any) => {
          const full: Message = { ...msg, sharedPost: null, sharedUser: null, repliedStory: null, repliedMessage: null };
          if (msg.sharedPost) full.sharedPost = mapPostData(msg.sharedPost);
          if (msg.sharedUser) {
            full.sharedUser = {
              id: msg.sharedUser.id,
              name: msg.sharedUser.full_name,
              username: msg.sharedUser.username,
              avatar: msg.sharedUser.avatar_url,
              isVerified: msg.sharedUser.is_verified,
              bio: msg.sharedUser.bio,
            };
          }
          return full;
        });

        // Link replies
        const withReplies = hydrated.map(msg => {
          if (msg.reply_to) {
            const replied = hydrated.find(m => m.id === msg.reply_to);
            return { ...msg, repliedMessage: replied || null };
          }
          return msg;
        });
        setMessages(withReplies);
      }
    };
    loadMessages();
  }, [chatWith?.id, userProfile?.id]);

  // Realtime messages
  useEffect(() => {
    if (!chatWith?.id || !userProfile?.id) return;

    const channel = supabase
      .channel(`chat-with-${chatWith.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === userProfile.id && newMsg.receiver_id === chatWith.id) ||
            (newMsg.sender_id === chatWith.id && newMsg.receiver_id === userProfile.id)
          ) {
            const hydrateAndSet = async () => {
              let sharedPost: Post | null = null;
              let sharedUser: SimpleUser | null = null;
              if (newMsg.shared_post_id) {
                sharedPost = (await getPostById(newMsg.shared_post_id)) || null;
              }
              if (newMsg.shared_profile_id) {
                const { data: profile } = await supabase.from('profiles').select('id, full_name, username, bio, avatar_url, is_verified').eq('id', newMsg.shared_profile_id).single();
                if (profile) {
                  sharedUser = { id: profile.id, name: profile.full_name, username: profile.username, avatar: profile.avatar_url, isVerified: profile.is_verified, bio: profile.bio };
                }
              }
              const hydrated: Message = { ...newMsg, sharedPost, sharedUser, repliedStory: null };

              setMessages(prev => {
                if (hydrated.reply_to) {
                  const replied = prev.find(m => m.id === hydrated.reply_to);
                  hydrated.repliedMessage = replied || null;
                }
                if (prev.some(m => m.id === hydrated.id)) return prev;
                return [...prev, hydrated];
              });
            };
            hydrateAndSet();
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatWith?.id, userProfile?.id]);

  const closeChat = () => {
    setChatWith(null);
    setReplyingTo(null);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatWith || !userProfile?.id) return;

    const tempId = `temp-message-${Date.now()}`;
    const textToSend = cleanHtml(newMessage.trim());
    const reply_to = replyingTo ? replyingTo.id : null;

    const optimistic: Message = {
      id: tempId,
      sender_id: userProfile.id,
      receiver_id: chatWith.id,
      text: textToSend,
      created_at: new Date().toISOString(),
      type: 'text',
      shared_post_id: null,
      shared_profile_id: null,
      sharedPost: null,
      sharedUser: null,
      reply_to,
      repliedMessage: replyingTo,
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    setReplyingTo(null);

    try {
      const data = await sendMessage({
        sender_id: userProfile.id,
        receiver_id: chatWith.id,
        text: textToSend,
        reply_to,
      });
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, ...data, repliedMessage: optimistic.repliedMessage } : msg));
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('Failed to send message.', 'error');
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleDeleteChat = async () => {
    if (!userToDelete || !userProfile?.id) return;
    const userId = userToDelete.id;
    setUserToDelete(null);
    setChatUsers(prev => prev.filter(u => u.id !== userId));
    addToast('Conversation deleted.', 'info');

    try {
      const success = await deleteConversationForBothSides(userProfile.id, userId);
      if (!success) {
        addToast('Failed to delete conversation.', 'error');
        const users = await getChatListUsers(userProfile.id);
        setChatUsers(users);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      addToast('Could not delete chat.', 'error');
    }
  };

  // ─── Chat View ────────────────────────────────

  if (chatWith) {
    const renderMessage = ({ item: msg }: { item: Message }) => {
      const isMyMessage = msg.sender_id === userProfile?.id;
      const repliedMsgSender = msg.repliedMessage?.sender_id === userProfile?.id
        ? userProfile?.username
        : chatWith.username;

      return (
        <Pressable
          onLongPress={() => {
            if (!msg.id.startsWith('temp-')) {
              triggerHapticFeedback();
              setReplyingTo(msg);
            }
          }}
          className={`flex-row mb-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
        >
          <View
            className={`max-w-[75%] py-2 px-3 rounded-2xl ${
              isMyMessage ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'
            }`}
          >
            {/* Replied message */}
            {msg.repliedMessage && (
              <View className="bg-black/20 p-2 rounded-lg border-l-2 border-blue-400 mb-2">
                <Text className="font-bold text-xs text-blue-300">@{repliedMsgSender}</Text>
                <Text className="text-sm text-gray-300" numberOfLines={2}>{msg.repliedMessage.text}</Text>
              </View>
            )}

            {/* Shared post */}
            {msg.type === 'post_share' && msg.sharedPost && (
              <SharedPostPreview
                post={msg.sharedPost}
                onPress={() => router.push(`/post/${msg.sharedPost!.id}`)}
              />
            )}

            {/* Shared user */}
            {msg.type === 'profile_share' && msg.sharedUser && (
              <SharedUserPreview
                user={msg.sharedUser}
                onPress={() => router.push(`/user/${msg.sharedUser!.username}`)}
              />
            )}

            {/* Text */}
            {msg.text ? (
              <View className="px-1 py-1">
                <RenderUserContent content={msg.text} className="text-white" />
              </View>
            ) : null}

            <MessageStatus message={msg} isMyMessage={isMyMessage} />
          </View>
        </Pressable>
      );
    };

    return (
      <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: `@${chatWith.username}`,
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => (
              <Pressable onPress={closeChat} className="mr-2">
                <Text className="text-blue-400 text-base">Back</Text>
              </Pressable>
            ),
            headerRight: () => (
              <Pressable onPress={() => router.push(`/user/${chatWith.username}`)}>
                <UserAvatar username={chatWith.username} avatarUrl={chatWith.avatar} size={32} />
              </Pressable>
            ),
          }}
        />

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}
          />

          {/* Reply banner */}
          {replyingTo && (
            <View className="px-3 py-2 bg-gray-800 flex-row items-center">
              <View className="flex-1 border-l-2 border-blue-400 pl-2">
                <Text className="text-sm font-bold text-blue-400">
                  Replying to @{replyingTo.sender_id === userProfile?.id ? userProfile?.username : chatWith.username}
                </Text>
                <Text className="text-xs text-gray-300" numberOfLines={1}>{replyingTo.text}</Text>
              </View>
              <Pressable onPress={() => setReplyingTo(null)} className="p-2">
                <Text className="text-gray-400 text-lg">×</Text>
              </Pressable>
            </View>
          )}

          {/* Input */}
          <View className="border-t border-gray-800 bg-black px-3 py-2">
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TextInput
                ref={inputRef}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#6b7280"
                className="flex-1 bg-gray-800 rounded-full py-2 px-4 text-white"
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <Pressable
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Text className={`font-semibold ${newMessage.trim() ? 'text-blue-500' : 'text-gray-500'}`}>
                  Send
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── Chat List View ───────────────────────────

  const renderChatUser = ({ item: user }: { item: SimpleUser }) => {
    const hasUnread = unreadChats.has(user.id);

    return (
      <Pressable
        onPress={() => openChat(user)}
        onLongPress={() => {
          triggerHapticFeedback();
          setUserToDelete(user);
        }}
        className="flex-row items-center px-4 py-3 border-b border-gray-800"
        style={{ gap: 12 }}
      >
        <View className="relative">
          <UserAvatar username={user.username} avatarUrl={user.avatar} size={48} />
          {hasUnread && (
            <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-black" />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">@{user.username}</Text>
          <Text className="text-sm text-gray-400">Tap to start chatting</Text>
        </View>
      </Pressable>
    );
  };

  const renderSearchResult = ({ item: user }: { item: SimpleUser }) => (
    <Pressable
      onPress={() => openChat(user)}
      className="flex-row items-center px-4 py-3 border-b border-gray-800"
      style={{ gap: 12 }}
    >
      <UserAvatar username={user.username} avatarUrl={user.avatar} size={48} />
      <View className="flex-1">
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <Text className="text-white font-bold">@{user.username}</Text>
          {user.isVerified && <VerifiedIcon color="#3b82f6" size={14} />}
        </View>
        <Text className="text-sm text-gray-400">{user.name}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Messages',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      {/* Search bar */}
      <View className="px-4 py-3 border-b border-gray-800">
        <View className="flex-row items-center bg-gray-800 rounded-full px-4 py-2 border border-gray-700">
          <SearchIcon color="#6b7280" size={20} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search for users..."
            placeholderTextColor="#6b7280"
            className="flex-1 text-white ml-2"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Content */}
      {searchTerm.trim() ? (
        isSearchingUsers ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#3b82f6" />
          </View>
        ) : userSearchResults.length > 0 ? (
          <FlatList
            data={userSearchResults}
            keyExtractor={item => item.id}
            renderItem={renderSearchResult}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">No users found for "{searchTerm}".</Text>
          </View>
        )
      ) : isLoadingUsers ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color="#3b82f6" size="large" />
        </View>
      ) : chatUsers.length > 0 ? (
        <FlatList
          data={chatUsers}
          keyExtractor={item => item.id}
          renderItem={renderChatUser}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-gray-500 text-center">
            No messages yet. Start a new chat by searching for a user.
          </Text>
        </View>
      )}

      {/* Delete conversation modal */}
      <Modal visible={!!userToDelete} transparent animationType="fade" onRequestClose={() => setUserToDelete(null)}>
        <Pressable className="flex-1 bg-black/60 justify-center items-center px-4" onPress={() => setUserToDelete(null)}>
          <View className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm overflow-hidden">
            <View className="p-4 items-center border-b border-gray-800">
              <Text className="text-lg font-bold text-white">Delete Conversation</Text>
              {userToDelete && (
                <Text className="text-sm text-gray-400 mt-1">with @{userToDelete.username}</Text>
              )}
            </View>
            <Pressable onPress={handleDeleteChat} className="p-4 border-b border-gray-800">
              <Text className="text-red-500 font-bold text-center">Delete conversation for both sides</Text>
            </Pressable>
            <Pressable onPress={() => setUserToDelete(null)} className="p-4">
              <Text className="text-white font-semibold text-center">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
