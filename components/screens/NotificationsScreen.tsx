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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRightIcon } from '../Icons';
import { useApp } from '../../store/AppContext';
import RenderUserContent from '../RenderUserContent';
import UserAvatar from '../UserAvatar';
import NotificationSkeleton from '../NotificationSkeleton';

interface NotificationsScreenProps {
    close: () => void;
    onNotificationClick: (notification: Notification) => void;
}

function renderNotificationText(n: Notification) {
    if (!n.sender) return 'New notification';
    switch (n.type) {
        case 'like':
            return <>{n.sender.username} liked your post ❤️</>;
        case 'comment':
            return <>{n.sender.username} commented on your post 💬</>;
        case 'follow':
            return <>{n.sender.username} started following you 👤</>;
        case 'comment_like':
            return <>{n.sender.username} liked your comment 💌</>;
        case 'repost':
            return <>{n.sender.username} reposted your post 🔁</>;
        case 'mention':
            return <>{n.sender.username} mentioned you in a post 📣</>;
        case 'story_like':
            return <>{n.sender.username} liked your story ✨</>;
        default:
            return 'New notification';
    }
}


const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ close, onNotificationClick }) => {
    const { notifications, markAllNotificationsAsRead, isUserBlocked, userProfile } = useApp();
    const [isLoading, setIsLoading] = useState(true);
    const hasRunReadMarker = useRef(false);

    useEffect(() => {
        // When notifications are loaded for the first time on this screen, mark them as read.
        // The ref ensures this only happens once per mount of this screen.
        if (notifications && !hasRunReadMarker.current && userProfile.id) {
            markAllNotificationsAsRead(userProfile.id);
            hasRunReadMarker.current = true;
        }

        // Manage local loading state to prevent "no notifications" from flashing.
        if (notifications !== null) {
            // Data has arrived from context. We can stop loading.
            setIsLoading(false);
        } else {
            // Context is still loading, so we should be too.
            setIsLoading(true);
        }
    }, [notifications, markAllNotificationsAsRead, userProfile.id]);

    const filteredNotifications = useMemo(() => 
        (notifications || []).filter(notification => notification.sender && !isUserBlocked(notification.sender.username)),
        [notifications, isUserBlocked]
    );

    return (
        <div className="flex flex-col h-full">
            <header className="bg-black border-b border-gray-800 p-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 safe-pt">
                <h1 className="text-xl font-bold">Notifications</h1>
                <button onClick={close} className="text-blue-400 p-2">
                    <ArrowRightIcon className="w-8 h-8" />
                </button>
            </header>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <NotificationSkeleton />
                ) : filteredNotifications.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">You have no new notifications.</p>
                ) : (
                    <div>
                        {filteredNotifications.map(notification => {
                            const canClick = !!notification.post || notification.type === 'follow' || !!notification.story;
                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => canClick && onNotificationClick(notification)}
                                    className={`w-full flex items-start space-x-3 p-4 border-b border-gray-800 text-left transition-colors duration-200 ${canClick ? 'hover:bg-gray-900' : 'cursor-default'}`}
                                >
                                    {notification.sender && (
                                        <UserAvatar username={notification.sender.username} avatarUrl={notification.sender.avatar_url} className="w-10 h-10 rounded-full" />
                                    )}
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between">
                                            <p className="font-bold text-white">
                                                {renderNotificationText(notification)}
                                            </p>
                                            <p className="text-sm text-gray-500 flex-shrink-0 ml-2">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
                                        </div>
                                        {(notification.type === 'comment' || notification.type === 'comment_like' || (notification.type === 'mention' && !!notification.comment_id)) && notification.comment?.text && (
                                            <p className="text-gray-400 mt-1 line-clamp-2 italic">"<RenderUserContent text={notification.comment.text} />"</p>
                                        )}
                                    </div>
                                    
                                    {notification.post && (
                                        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden">
                                            {notification.post.media ? (
                                                <img src={notification.post.media} alt="Post preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full p-1 flex flex-col justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                                                    <div className="text-white text-xs text-left font-medium whitespace-pre-wrap overflow-hidden" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
                                                        <RenderUserContent text={notification.post.content} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {notification.story && (
                                        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden">
                                            <img src={notification.story?.media_url} alt="Story preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsScreen;
