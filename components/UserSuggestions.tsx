import React, { useEffect, useState } from "react";
import { getSmartUserSuggestions } from '../services/apiService';
import { useApp } from "../store/AppContext";
import { VerifiedIcon } from "./Icons";
import UserAvatar from "./UserAvatar";

interface Suggestion {
  suggested_user_id: string;
  username: string;
  avatar_url: string;
  mutual_followers: number;
  is_verified?: boolean;
}

interface UserSuggestionsProps {
    onViewProfile: (username: string, avatar?: string) => void;
}

const UserSuggestions: React.FC<UserSuggestionsProps> = ({ onViewProfile }) => {
  const { userProfile, isUserFollowed, toggleFollowUser } = useApp();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile.id) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const data = await getSmartUserSuggestions(userProfile.id);
        setSuggestions(data || []);
      } catch (err: any) {
        console.error("Unexpected error fetching suggestions:", err.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [userProfile.id]);

  if (suggestions.length === 0 && !loading) {
      return null;
  }

  return (
    <div className="m-2 p-4 bg-gray-50 dark:bg-[#15181d] rounded-xl relative">
      <h3 className="font-bold text-lg mb-2">Suggested for you</h3>
      {loading ? (
        <p className="text-gray-500">Loading suggestions...</p>
      ) : suggestions.length === 0 ? (
         <p className="text-gray-400 text-sm">No suggestions found yet.</p>
      ) : (
         <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {suggestions.map((user) => {
                const isFollowing = isUserFollowed(user.username);
                return (
                    <li key={user.suggested_user_id} className="flex items-center justify-between py-2">
                         <button className="flex items-center gap-3 text-left" onClick={() => onViewProfile(user.username, user.avatar_url)}>
                            <UserAvatar username={user.username} avatarUrl={user.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <div className="flex items-center space-x-1">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 hover:underline">{user.username}</p>
                                    {user.is_verified && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                                </div>
                                {user.mutual_followers > 0 && 
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.mutual_followers} mutual follower{user.mutual_followers > 1 ? 's' : ''}
                                    </p>
                                }
                            </div>
                        </button>
        
                        <button
                            onClick={() => toggleFollowUser(user.username)}
                            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors duration-200 w-28 text-center ${
                                isFollowing 
                                ? 'bg-transparent text-black dark:text-white border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-800'
                                : 'bg-blue-500 text-white hover:bg-blue-600 transition'
                            }`}
                        >
                           {isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                    </li>
                )
            })}
        </ul>
      )}
    </div>
  );
}

export default React.memo(UserSuggestions);