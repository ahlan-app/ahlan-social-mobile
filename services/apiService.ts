// FIX: Import all necessary types from the newly created types.ts file.
import type { Message, Post, Notification, Comment, Story, UserProfile, SimpleUser, Hashtag } from '../types';
// Re-export the supabase client from the native adapter (uses SecureStore for session persistence)
export { supabase } from './supabase.native';


export async function sendNotification({
  sender_id,
  receiver_id,
  type,
  post_id = null,
  comment_id = null,
  story_id = null,
  content = null,
}: {
  sender_id: string;
  receiver_id: string;
  type: string;
  post_id?: string | null;
  comment_id?: string | null;
  story_id?: string | null;
  content?: string | null;
}) {
  try {
    if (!receiver_id || receiver_id === sender_id) return; // Do not send notifications to oneself

    const { error } = await supabase.from("notifications").insert([
      {
        sender_id,
        receiver_id,
        type,
        post_id,
        comment_id,
        story_id,
        content,
      },
    ]);

    if (error) {
      console.error("Notification error:", error.message || error);
    } else {
      console.log(`✅ ${type} notification sent to ${receiver_id}`);
    }
  } catch (err: any) {
    console.error("Notification insert failed:", err.message);
  }
}


async function handleMentions(content: string, sender_id: string, post_id: string, comment_id: string | null = null) {
  // Find @username mentions
  const mentions = content.match(/@(\w+)/g);
  if (!mentions) return;

  // Use a Set to avoid notifying the same user multiple times from one piece of content
  const mentionedUsernames = new Set(mentions.map(m => m.replace("@", "")));

  for (const username of mentionedUsernames) {
    try {
      // Find the mentioned user by username
      const { data: user, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 means no user found, which is not an error here
          console.error(`Error fetching user @${username}:`, userError.message || userError);
          continue;
      }
      
      // If user exists and is not the sender, create a notification
      if (user && user.id !== sender_id) {
        await sendNotification({
            sender_id,
            receiver_id: user.id,
            type: 'mention',
            post_id,
            comment_id,
            content: `You were mentioned in a ${comment_id ? 'comment' : 'post'}`,
        });
      }
    } catch (error) {
       console.error(`Error processing mention for @${username}:`, (error as Error).message || error);
    }
  }
}

// Helper to convert blob/data URLs to a Blob object for uploading
async function localUrlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch local URL: ${response.statusText}`);
    }
    return response.blob();
}

export const publishPost = async (post: Post): Promise<Post | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("❌ Error publishing post: User not authenticated.");
        throw new Error("User not authenticated");
    }

    try {
        const content = post.content || "";
        let uploadUrl = post.media || null;
        const mediaType = post.media_type || 'text';
        const aspectRatio = post.media_aspect_ratio || null;

        // --- NEW UPLOAD LOGIC ---
        // If the media is a local URL (from camera or gallery), upload it to storage first.
        if (uploadUrl && (uploadUrl.startsWith('blob:') || uploadUrl.startsWith('data:') || uploadUrl.startsWith('file://'))) {
            const blob = await localUrlToBlob(uploadUrl);
            // Determine file extension, default to 'bin' if type is not available
            const fileExtension = blob.type.split('/')[1] || 'bin'; 
            const filePath = `public/${user.id}/${Date.now()}.${fileExtension}`;

            // Upload to storage. The bucket for posts media is named 'post-media'.
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('post-media')
                .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                console.error('Error uploading post media:', uploadError.message || uploadError);
                throw uploadError;
            }

            // Get the permanent public URL for the uploaded file.
            const { data: publicUrlData } = supabase.storage
                .from('post-media')
                .getPublicUrl(filePath);
            
            if (!publicUrlData) {
                throw new Error("Could not get public URL for the uploaded file.");
            }
            
            uploadUrl = publicUrlData.publicUrl; // Replace local URL with permanent public URL.
        }
        // --- END NEW UPLOAD LOGIC ---

        const { data: insertData, error } = await supabase
            .from("posts")
            .insert([
                {
                    user_id: user.id,
                    content: content,
                    image_url: uploadUrl, // This is now the permanent URL if an image was uploaded
                    media_type: mediaType,
                    media_aspect_ratio: aspectRatio,
                    created_at: post.timestamp || new Date().toISOString(),
                },
            ])
            .select('id')
            .single();

        if (error) throw error;
        if (!insertData) throw new Error("Post insertion did not return data.");

        const { data, error: fetchError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!user_id (
                    username,
                    avatar_url,
                    full_name,
                    is_verified
                )
            `)
            .eq('id', insertData.id)
            .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("Could not retrieve post after creation.");
        
        const postWithCounts = {
            ...data,
            likes_count: 0,
            comments_count: 0,
            reposts_count: 0
        };

        console.log('✅ Post başarıyla paylaşıldı:', postWithCounts);

        // Handle mentions after post is successfully created
        if (content.trim().length > 0) {
            await handleMentions(content, user.id, data.id, null);
        }
        
        return mapPostData(postWithCounts);

    } catch (err) {
        console.error("❌ Error publishing post:", (err as Error).message || err);
        throw err;
    }
};

export const deletePost = async (postId: string): Promise<boolean> => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) {
        console.error('Error deleting post:', error.message || error);
        return false;
    }
    return true;
};

// --- ADMIN FUNCTIONS ---
export const setUserVerified = async (userId: string, username: string, status: boolean): Promise<void> => {
    // We update by ID to be absolutely sure we target the correct row,
    // preventing issues with case sensitivity or duplicate usernames (if any).
    // We also select the data back to confirm the update happened.
    const { data, error } = await supabase
        .from("profiles")
        .update({ is_verified: status })
        .eq("id", userId)
        .select();

    if (error) throw error;
    
    // If data is empty, it means no row was updated (likely RLS blocked it or ID not found).
    if (!data || data.length === 0) {
        throw new Error("Update failed: No rows modified. Check permissions.");
    }

    // Update local cache to prevent UI reversion
    if (profileCache.has(username)) {
        const cached = profileCache.get(username)!;
        profileCache.set(username, { ...cached, isVerified: status });
    }
};

export const adminDeletePost = async (postId: string): Promise<void> => {
    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
    if (error) throw error;
};
// -----------------------


export const updatePost = async (post: Post): Promise<Post | null> => {
    const { id, content } = post;
    const { data, error } = await supabase
        .from('posts')
        .update({ content })
        .eq('id', id)
        .select()
        .single();
    if (error) {
        console.error('Error updating post:', error.message || error);
        return null;
    }
    return { ...data, timestamp: data.created_at } as Post;
};


export const cleanHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export const mapPostData = (p: any): Post => {
    let media_preview_url: string | undefined = undefined;

    // Create a low-quality preview URL for images and videos hosted on Supabase.
    // This is used for the "blur-up" loading effect.
    if (p.image_url && p.image_url.includes('supabase.co')) {
        try {
            const url = new URL(p.image_url);
            // Transform Supabase storage URL to use the image transformation API.
            // from: /storage/v1/object/public/posts/...
            // to:   /storage/v1/render/image/public/posts/...
            const pathParts = url.pathname.split('/');
            const objectIndex = pathParts.indexOf('object');
            
            if (objectIndex !== -1) {
                pathParts.splice(objectIndex, 1, 'render', 'image');
                url.pathname = pathParts.join('/');
                // Request a small, low-quality version for the preview.
                url.searchParams.set('width', '50');
                url.searchParams.set('quality', '40');
                url.searchParams.set('resize', 'cover');
                media_preview_url = url.toString();
            }
        } catch (e) {
            // Silently fail if URL parsing doesn't work.
            console.error("Failed to create preview URL for post media", e);
        }
    }

    const profile = p.profiles || {};

    return {
        id: p.id,
        content: p.content,
        media: p.image_url,
        media_preview_url, // Add the generated preview URL to the post object.
        media_type: p.media_type || (p.image_url ? 'image' : 'text'),
        media_aspect_ratio: p.media_aspect_ratio,
        timestamp: p.created_at,
        username: profile.username || 'unknown_user',
        avatar: profile.avatar_url || null,
        name: profile.full_name,
        isVerified: profile.is_verified || false,
        likes: Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : (p.likes_count ?? 0),
        reposts: Array.isArray(p.reposts) ? (p.reposts[0]?.count ?? 0) : (p.reposts_count ?? 0),
        replies: Array.isArray(p.comments) ? (p.comments[0]?.count ?? 0) : (p.comments_count ?? 0),
    };
};


export const getTimeline = async (): Promise<Post[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn("Timeline: No user logged in. Returning empty array.");
            return [];
        }

        const { data: followingData, error: followingError } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);

        if (followingError) throw followingError;

        const followingIds = followingData.map(f => f.followed_id);
        const userIdsToFetch = [...followingIds, user.id];

        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!user_id(
                    username,
                    avatar_url,
                    full_name,
                    is_verified
                )
            `)
            .in('user_id', userIdsToFetch)
            .order('created_at', { ascending: false })
            .limit(20);

        if (postsError) throw postsError;
        if (!postsData) return [];

        const postIds = postsData.map(post => post.id);
        if (postIds.length === 0) return [];

        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('post_id').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds),
            supabase.from('reposts').select('post_id').in('post_id', postIds)
        ]);

        const { data: likesData, error: likesError } = likesResult;
        if (likesError) throw likesError;
        const { data: commentsData, error: commentsError } = commentsResult;
        if (commentsError) throw commentsError;
        const { data: repostsData, error: repostsError } = repostsResult;
        if (repostsError) throw repostsError;

        const likesCountMap: Record<string, number> = {};
        const commentsCountMap: Record<string, number> = {};
        const repostsCountMap: Record<string, number> = {};

        likesData?.forEach(like => {
            likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
        });

        commentsData?.forEach(comment => {
            commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1;
        });

        repostsData?.forEach(repost => {
            repostsCountMap[repost.post_id] = (repostsCountMap[repost.post_id] || 0) + 1;
        });

        const postsWithCounts = postsData.map(post => ({
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            reposts_count: repostsCountMap[post.id] || 0
        }));

        return postsWithCounts.map(mapPostData);

    } catch (error) {
        console.error("Zaman çizelgesi alınırken hata oluştu:", (error as Error).message || error);
        return [];
    }
};


let currentPage = 1;
export const getMorePosts = async (): Promise<Post[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn("getMorePosts: No user logged in.");
            return [];
        }

        const { data: followingData, error: followingError } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);
        
        if (followingError) throw followingError;

        const followingIds = followingData.map(f => f.followed_id);
        const userIdsToFetch = [...followingIds, user.id];

        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!user_id(
                    username,
                    avatar_url,
                    full_name,
                    is_verified
                )
            `)
            .in('user_id', userIdsToFetch)
            .order('created_at', { ascending: false })
            .range(currentPage * 20, (currentPage + 1) * 20 - 1);

        if (postsError) throw postsError;
        if (!postsData || postsData.length === 0) return [];

        currentPage++;

        const postIds = postsData.map(post => post.id);
        
        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('post_id').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds),
            supabase.from('reposts').select('post_id').in('post_id', postIds)
        ]);

        const { data: likesData, error: likesError } = likesResult;
        if (likesError) throw likesError;
        const { data: commentsData, error: commentsError } = commentsResult;
        if (commentsError) throw commentsError;
        const { data: repostsData, error: repostsError } = repostsResult;
        if (repostsError) throw repostsError;

        const likesCountMap: Record<string, number> = {};
        const commentsCountMap: Record<string, number> = {};
        const repostsCountMap: Record<string, number> = {};

        likesData?.forEach(like => {
            likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
        });

        commentsData?.forEach(comment => {
            commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1;
        });

        repostsData?.forEach(repost => {
            repostsCountMap[repost.post_id] = (repostsCountMap[repost.post_id] || 0) + 1;
        });

        const postsWithCounts = postsData.map(post => ({
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            reposts_count: repostsCountMap[post.id] || 0
        }));

        return postsWithCounts.map(mapPostData);

    } catch (error) {
        console.error("Error fetching more posts:", (error as Error).message || error);
        return [];
    }
};

export const resetPageCounter = () => {
    currentPage = 1;
};

export const getTrendingPosts = async (): Promise<Post[]> => {
    try {
        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!user_id(
                    username,
                    avatar_url,
                    full_name,
                    is_verified
                )
            `)
            .order('created_at', { ascending: false })
            .limit(21);

        if (postsError) throw postsError;
        if (!postsData) return [];

        const postIds = postsData.map(post => post.id);
        if (postIds.length === 0) return [];

        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('post_id').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds),
            supabase.from('reposts').select('post_id').in('post_id', postIds)
        ]);

        const { data: likesData, error: likesError } = likesResult;
        if (likesError) throw likesError;
        const { data: commentsData, error: commentsError } = commentsResult;
        if (commentsError) throw commentsError;
        const { data: repostsData, error: repostsError } = repostsResult;
        if (repostsError) throw repostsError;

        const likesCountMap: Record<string, number> = {};
        const commentsCountMap: Record<string, number> = {};
        const repostsCountMap: Record<string, number> = {};

        likesData?.forEach(like => {
            likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
        });

        commentsData?.forEach(comment => {
            commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1;
        });

        repostsData?.forEach(repost => {
            repostsCountMap[repost.post_id] = (repostsCountMap[repost.post_id] || 0) + 1;
        });

        const postsWithCounts = postsData.map(post => ({
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            reposts_count: repostsCountMap[post.id] || 0
        }));

        return postsWithCounts.map(mapPostData);
    } catch (error) {
        console.error("Error fetching trending posts:", (error as Error).message || error);
        return [];
    }
};

export const markNotificationsAsRead = async (userId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);
    
    if (error) {
        console.error("Error marking notifications as read:", error.message || error);
        return false;
    }
    return true;
};

export const getPostById = async (postId: string): Promise<Post | undefined> => {
    try {
        const { data: postData, error: postError } = await supabase
            .from('posts')
            .select(`
                *,
                profiles!user_id(
                    username,
                    avatar_url,
                    full_name,
                    is_verified
                )
            `)
            .eq('id', postId)
            .single();

        if (postError || !postData) throw postError || new Error("Post not found");

        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId),
            supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('post_id', postId)
        ]);

        const { count: likes_count, error: likesError } = likesResult;
        if (likesError) throw likesError;
        const { count: comments_count, error: commentsError } = commentsResult;
        if (commentsError) throw commentsError;
        const { count: reposts_count, error: repostsError } = repostsResult;
        if (repostsError) throw repostsError;
        
        const postWithCounts = {
            ...postData,
            likes_count: likes_count || 0,
            comments_count: comments_count || 0,
            reposts_count: reposts_count || 0
        };
        
        return mapPostData(postWithCounts);
        
    } catch (error) {
        console.error("Error fetching post by ID:", (error as Error).message || error);
        return undefined;
    }
};

export const fetchLikeCount = async (postId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    console.error("Beğeni sayısı hatası:", error.message || error);
    return 0;
  }

  return count || 0;
}

export const fetchRepostCount = async (postId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('reposts')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    console.error("Repost sayısı hatası:", error.message || error);
    return 0;
  }

  return count || 0;
}

export const fetchCommentCount = async (postId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) {
    console.error("Yorum sayısı hatası:", error.message || error);
    return 0;
  }

  return count || 0;
}

export async function toggleLike(postId: string, userId: string) {
  const { data: existingLike, error: likeError } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (likeError) {
    console.error("Like kontrol hatası:", likeError.message || likeError);
    throw likeError;
  }

  if (existingLike) {
    // Varsa sil
    const { error: deleteError } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) {
        console.error("Like silme hatası:", deleteError.message || deleteError);
        throw deleteError;
    }
  } else {
    // Yoksa ekle
    const { error: insertError } = await supabase
      .from('likes')
      .insert([{ post_id: postId, user_id: userId }]);

    if (insertError) {
        console.error("Like ekleme hatası:", insertError.message || insertError);
        throw insertError;
    }

    const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
    if (postData) {
        await sendNotification({
            sender_id: userId,
            receiver_id: postData.user_id,
            type: 'like',
            post_id: postId,
        });
    }
  }
}

export async function toggleRepost(postId: string, userId: string) {
  const { data: existingRepost, error: repostError } = await supabase
    .from('reposts')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (repostError) {
    console.error("Repost kontrol hatası:", repostError.message || repostError);
    throw repostError;
  }

  if (existingRepost) {
    // Varsa sil
    const { error: deleteError } = await supabase
      .from('reposts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) {
        console.error("Repost silme hatası:", deleteError.message || deleteError);
        throw deleteError;
    }
  } else {
    // Yoksa ekle
    const { error: insertError } = await supabase
      .from('reposts')
      .insert([{ post_id: postId, user_id: userId }]);

    if (insertError) {
        console.error("Repost ekleme hatası:", insertError.message || insertError);
        throw insertError;
    }

    const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
    if (postData) {
        await sendNotification({
            sender_id: userId,
            receiver_id: postData.user_id,
            type: 'repost',
            post_id: postId,
        });
    }
  }
}

export async function toggleSavePost(postId: string, userId: string) {
    const { data: existingSave, error: saveError } = await supabase
        .from('saved_posts')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

    if (saveError) {
        console.error("Save check error:", saveError.message || saveError);
        throw saveError;
    }

    if (existingSave) {
        const { error: deleteError } = await supabase
            .from('saved_posts')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (deleteError) {
            console.error("Unsave error:", deleteError.message || deleteError);
            throw deleteError;
        }
    } else {
        const { error: insertError } = await supabase
            .from('saved_posts')
            .insert([{ post_id: postId, user_id: userId }]);

        if (insertError) {
            console.error("Save error:", insertError.message || insertError);
            throw insertError;
        }
    }
}

export const checkUsernameExists = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

    if (error) {
        console.error('Error checking username:', error);
        throw new Error('Could not verify username availability.');
    }
    return !!data;
};
// FIX: Add all missing functions below and export them.
// =========================================================
// Stories
// =========================================================
export const getStories = async (): Promise<Story[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return []; // Not logged in, no stories to show.
    }

    try {
        // Get IDs of users the current user follows
        const { data: followingData, error: followingError } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);

        if (followingError) throw followingError;

        const followingIds = followingData.map(f => f.followed_id);
        
        // Fetch stories from followed users AND the current user
        const userIdsToFetch = [...followingIds, user.id];

        // Filter stories created in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('stories')
            .select(`*, profiles!user_id(username, avatar_url)`)
            .in('user_id', userIdsToFetch)
            .gte('created_at', twentyFourHoursAgo) // Add time filter
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching stories", (error as Error).message || error);
            return [];
        }

        return (data || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            username: s.profiles.username,
            avatar: s.profiles.avatar_url,
            timestamp: s.created_at,
            imageUrl: s.media_url,
            content: s.caption,
        }));
    } catch (error) {
        console.error("Error in getStories logic:", (error as Error).message || error);
        return [];
    }
};

export const getMyStories = async (userId: string): Promise<Story[]> => {
    const { data, error } = await supabase
        .from('stories')
        .select(`*, profiles!user_id(username, avatar_url)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching my stories", (error as Error).message || error);
        return [];
    }

    return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        username: s.profiles.username,
        avatar: s.profiles.avatar_url,
        timestamp: s.created_at,
        imageUrl: s.media_url,
        content: s.caption,
    }));
};

export const getStoryById = async (storyId: string): Promise<Story | null> => {
    const { data: storyData, error } = await supabase
        .from('stories')
        .select('*, profiles!user_id(username, avatar_url)')
        .eq('id', storyId)
        .single();

    if (error || !storyData) {
        console.error("Error fetching story by id or story not found", error);
        return null;
    }

    // Now, check for permissions
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
        return null; // Not logged in, can't view stories.
    }

    const storyOwnerId = storyData.user_id;

    // A user can always see their own story
    if (currentUser.id === storyOwnerId) {
        return {
            id: storyData.id,
            userId: storyData.user_id,
            username: storyData.profiles.username,
            avatar: storyData.profiles.avatar_url,
            timestamp: storyData.created_at,
            imageUrl: storyData.media_url,
            content: storyData.caption
        };
    }

    // Check if the current user follows the story owner
    const { count, error: followError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', currentUser.id)
        .eq('followed_id', storyOwnerId);

    if (followError) {
        console.error("Error checking follow status:", followError);
        return null; // Fail safe
    }

    if (count && count > 0) {
        // Is a follower, grant access
        return {
            id: storyData.id,
            userId: storyData.user_id,
            username: storyData.profiles.username,
            avatar: storyData.profiles.avatar_url,
            timestamp: storyData.created_at,
            imageUrl: storyData.media_url,
            content: storyData.caption
        };
    }

    // Not a follower, deny access
    console.log(`Access denied: User ${currentUser.id} is not following ${storyOwnerId}.`);
    return null;
};

export const uploadStory = async (file: File | Blob, caption: string | null, userId: string): Promise<Story | null> => {
    const filePath = `stories/${userId}/${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('post-media').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('post-media').getPublicUrl(filePath);
    if (!urlData) throw new Error("Could not get public URL for story.");

    const { data: storyData, error: insertError } = await supabase
        .from('stories')
        .insert({ user_id: userId, media_url: urlData.publicUrl, caption })
        .select('*, profiles!user_id(username, avatar_url)')
        .single();
    
    if (insertError) throw insertError;
    
    return {
        id: storyData.id,
        userId: storyData.user_id,
        username: storyData.profiles.username,
        avatar: storyData.profiles.avatar_url,
        timestamp: storyData.created_at,
        imageUrl: storyData.media_url,
        content: storyData.caption,
    };
};

export const deleteStoryFromDatabase = async (storyId: string): Promise<boolean> => {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    return !error;
};

export const toggleStoryLikeInDatabase = async (storyId: string, userId: string): Promise<void> => {
     const { data: existingLike, error: likeError } = await supabase
        .from('story_likes')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', userId)
        .maybeSingle();

    if(likeError) throw likeError;

    if (existingLike) {
        const { error } = await supabase.from('story_likes').delete().match({ story_id: storyId, user_id: userId });
        if(error) throw error;
    } else {
        const { error } = await supabase.from('story_likes').insert({ story_id: storyId, user_id: userId });
        if(error) throw error;
    }
};

export const recordStoryView = async (storyId: string, userId: string) => {
    // Upsert to not create duplicate view records
    await supabase.from('story_views').upsert({ story_id: storyId, user_id: userId });
};

export const getStoryViewCount = async (storyId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);
    return error ? 0 : count || 0;
};

export const replyToStory = async (storyId: string, storyOwnerId: string, text: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    return sendMessage({
        sender_id: user.id,
        receiver_id: storyOwnerId,
        text,
        replied_story_id: storyId
    });
};

// =========================================================
// User & Profile
// =========================================================

// FIX: Replaced undefined 'UserProfileType' with 'UserProfile'.
const profileCache = new Map<string, UserProfile>();
export const getUserProfile = async (username: string): Promise<UserProfile | null> => {
    if (profileCache.has(username)) {
        return profileCache.get(username)!;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (error || !data) {
        console.error("Error fetching profile", error);
        return null;
    }
    const profile: UserProfile = {
        id: data.id,
        name: data.full_name,
        username: data.username,
        bio: data.bio,
        profilePicture: data.avatar_url,
        isVerified: data.is_verified,
        isPrivate: data.is_private,
    };
    profileCache.set(username, profile);
    return profile;
};

export const prefetchUserProfile = (username: string) => {
    if (!profileCache.has(username)) {
        getUserProfile(username);
    }
};

export const getUserPosts = async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!user_id(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return (data || []).map(mapPostData);
};

export const getUserReposts = async (userId: string): Promise<Post[]> => {
    try {
        const { data: repostIdsData, error: repostsError } = await supabase
            .from('reposts')
            .select('post_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (repostsError) throw repostsError;
        if (!repostIdsData || repostIdsData.length === 0) return [];
        
        const postIds = repostIdsData.map(r => r.post_id);
        const repostOrderMap = new Map<string, number>(repostIdsData.map((r: any) => [r.post_id, new Date(r.created_at).getTime()]));

        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`*, profiles!user_id(username, avatar_url, full_name, is_verified)`)
            .in('id', postIds);

        if (postsError) throw postsError;
        if (!postsData) return [];
        
        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('post_id').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds),
            supabase.from('reposts').select('post_id').in('post_id', postIds)
        ]);

        const likesCountMap: Record<string, number> = {};
        (likesResult.data || []).forEach(like => { likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1; });

        const commentsCountMap: Record<string, number> = {};
        (commentsResult.data || []).forEach(comment => { commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1; });

        const repostsCountMap: Record<string, number> = {};
        (repostsResult.data || []).forEach(repost => { repostsCountMap[repost.post_id] = (repostsCountMap[repost.post_id] || 0) + 1; });

        const postsWithCounts = postsData.map(post => ({
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            reposts_count: repostsCountMap[post.id] || 0
        }));

        const sortedPosts = postsWithCounts.sort((a, b) => {
            // FIX: `repostOrderMap.get()` can return `undefined`. Using `?? 0` as a fallback ensures that `timeA` and `timeB` are always numbers, preventing a type error during the subtraction operation.
            const timeA = repostOrderMap.get(a.id) ?? 0;
            const timeB = repostOrderMap.get(b.id) ?? 0;
            return timeB - timeA;
        });

        return sortedPosts.map(mapPostData);

    } catch (error) {
        console.error("Error fetching user reposts:", (error as Error).message || error);
        return [];
    }
};

export const getSavedPosts = async (userId: string): Promise<Post[]> => {
    try {
        const { data: savedIdsData, error: savedError } = await supabase
            .from('saved_posts')
            .select('post_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (savedError) throw savedError;
        if (!savedIdsData || savedIdsData.length === 0) return [];
        
        const postIds = savedIdsData.map(r => r.post_id);

        const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select(`*, profiles!user_id(username, avatar_url, full_name, is_verified)`)
            .in('id', postIds);

        if (postsError) throw postsError;
        if (!postsData) return [];
        
        const [likesResult, commentsResult, repostsResult] = await Promise.all([
            supabase.from('likes').select('post_id').in('post_id', postIds),
            supabase.from('comments').select('post_id').in('post_id', postIds),
            supabase.from('reposts').select('post_id').in('post_id', postIds)
        ]);

        const likesCountMap: Record<string, number> = {};
        (likesResult.data || []).forEach(like => { likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1; });

        const commentsCountMap: Record<string, number> = {};
        (commentsResult.data || []).forEach(comment => { commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1; });

        const repostsCountMap: Record<string, number> = {};
        (repostsResult.data || []).forEach(repost => { repostsCountMap[repost.post_id] = (repostsCountMap[repost.post_id] || 0) + 1; });

        const postsWithCounts = postsData.map(post => ({
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            reposts_count: repostsCountMap[post.id] || 0
        }));

        // Sort by when they were saved, not when they were created
        const savedOrderMap = new Map<string, number>(savedIdsData.map((r: any) => [r.post_id, new Date(r.created_at).getTime()]));
        const sortedPosts = postsWithCounts.sort((a, b) => {
            // FIX: `savedOrderMap.get()` can return `undefined`. Using `?? 0` as a fallback ensures that `timeA` and `timeB` are always numbers, preventing a type error during the subtraction operation.
            const timeA = savedOrderMap.get(a.id) ?? 0;
            const timeB = savedOrderMap.get(b.id) ?? 0;
            return timeB - timeA;
        });


        return sortedPosts.map(mapPostData);

    } catch (error) {
        console.error("Error fetching saved posts:", (error as Error).message || error);
        return [];
    }
};

export const updateUserProfileData = async (updates: Partial<Pick<UserProfile, 'name' | 'username' | 'bio'>>): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    return !error;
};

export const uploadAvatar = async (file: File | Blob): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const filePath = `avatars/${user.id}/${Date.now()}`;
    const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (error) {
        console.error('Avatar upload error:', error);
        return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
};

// =========================================================
// Follows
// =========================================================

export const getFollowerCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId);
    return error ? 0 : count || 0;
};

export const getFollowingCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
    return error ? 0 : count || 0;
};

export const getFollowingList = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase.from('follows').select('profiles!followed_id(username)').eq('follower_id', userId);
    if (error) return [];
    return (data || []).map((item: any) => item.profiles.username);
};

export const getFollowerUsers = async (userId: string): Promise<SimpleUser[]> => {
    const { data, error } = await supabase
        .from('follows')
        .select('profiles!follower_id(id, username, full_name, avatar_url, is_verified)')
        .eq('followed_id', userId);
    if (error || !data) return [];
    return data.map((item: any) => ({
        id: item.profiles.id,
        username: item.profiles.username,
        name: item.profiles.full_name || item.profiles.username,
        avatar: item.profiles.avatar_url,
        isVerified: item.profiles.is_verified || false,
    }));
};

export const getFollowingUsers = async (userId: string): Promise<SimpleUser[]> => {
    const { data, error } = await supabase
        .from('follows')
        .select('profiles!followed_id(id, username, full_name, avatar_url, is_verified)')
        .eq('follower_id', userId);
    if (error || !data) return [];
    return data.map((item: any) => ({
        id: item.profiles.id,
        username: item.profiles.username,
        name: item.profiles.full_name || item.profiles.username,
        avatar: item.profiles.avatar_url,
        isVerified: item.profiles.is_verified || false,
    }));
};

export const followUser = async (follower_id: string, followed_id: string): Promise<void> => {
    const { error } = await supabase.from('follows').insert({ follower_id, followed_id });
    if (error) throw error;
    await sendNotification({ sender_id: follower_id, receiver_id: followed_id, type: 'follow' });
};

export const unfollowUser = async (follower_id: string, followed_id: string): Promise<void> => {
    const { error } = await supabase.from('follows').delete().match({ follower_id, followed_id });
    if (error) throw error;
};

// =========================================================
// Comments
// =========================================================

export async function addComment(postId: string, userId: string, content: string) {
  const { data, error } = await supabase
    .from('comments')
    .insert([{ post_id: postId, user_id: userId, content }])
    .select('*, profiles!user_id(username, avatar_url)')
    .single();

  if (error) {
    console.error("Yorum ekleme hatası:", error.message || error);
    throw error;
  }
  
  if (data) {
    const { data: postData } = await supabase.from('posts').select('user_id').eq('id', postId).single();
    if (postData && postData.user_id !== userId) {
        await sendNotification({
            sender_id: userId,
            receiver_id: postData.user_id,
            type: 'comment',
            post_id: postId,
            comment_id: data.id,
            content: content.substring(0, 50),
        });
    }
    await handleMentions(content, userId, postId, data.id);
  }

  return data;
}

export const getCommentsForPost = async (postId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
        .from('comments')
        .select('*, profiles!user_id(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((c: any) => ({
        id: c.id,
        username: c.profiles.username,
        avatar: c.profiles.avatar_url,
        text: c.content,
        timestamp: new Date(c.created_at),
        likes: 0, // Simplified for now
        isLiked: false, // Simplified for now
        replies: [], // Simplified for now
    }));
};

export const isCommentLikedByUser = async (commentId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.from('comment_likes').select('*').match({ comment_id: commentId, user_id: user.id }).maybeSingle();
    return !!data && !error;
};

export const getCommentLikesCount = async (commentId: string): Promise<number> => {
    const { count, error } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);
    return error ? 0 : count || 0;
};

export const toggleCommentLike = async (commentId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const isLiked = await isCommentLikedByUser(commentId);

    if (isLiked) {
        await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: user.id });
        return false;
    } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
        return true;
    }
};

// =========================================================
// Misc
// =========================================================

export const getAllHashtags = async (): Promise<Hashtag[]> => {
    // Mock data as there's no hashtags table
    return [
        { tag: 'ReactJS', postCount: 152 },
        { tag: 'WebDev', postCount: 98 },
        { tag: 'AhlanApp', postCount: 50 },
    ];
};

export const searchUsers = async (query: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_verified, bio')
        .ilike('username', `%${query}%`)
        .limit(10);
    if (error) return [];
    return data || [];
};

export const getSmartUserSuggestions = async(userId: string): Promise<any[]> => {
    // The original RPC function 'get_user_suggestions' causes a "column reference is ambiguous" SQL error.
    // As we cannot modify the backend function, this implementation replaces it with a client-side query
    // that suggests recent users the current user is not already following.

    // 1. Get IDs of users the current user is following.
    const { data: followingData, error: followingError } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', userId);

    if (followingError) {
        console.error('Error fetching following list for suggestions:', followingError.message);
        return [];
    }

    // Create a list of user IDs to exclude from suggestions (followed users + the user themselves).
    const followingIds = followingData.map(f => f.followed_id);
    const excludeIds = [...followingIds, userId];

    // 2. Fetch a few recent profiles, excluding the ones in the `excludeIds` list.
    const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_verified')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(5);

    if (suggestionsError) {
        console.error('Error fetching user suggestions:', suggestionsError.message);
        return [];
    }

    // 3. Map the fetched profile data to the structure expected by the UserSuggestions component.
    // The 'mutual_followers' field is set to 0 as this simplified query does not calculate them.
    return (suggestionsData || []).map(profile => ({
        suggested_user_id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        is_verified: profile.is_verified,
        mutual_followers: 0,
    }));
}

// =========================================================
// Chat / Messages
// =========================================================
export const getChatListUsers = async (userId: string): Promise<SimpleUser[]> => {
    try {
        // Get all messages involving the user, ordered by most recent.
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('sender_id, receiver_id, created_at')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Get unique partner IDs and store the timestamp of their latest message
        const latestMessageTimestamps = new Map<string, string>();
        const partnerIds = new Set<string>();

        for (const message of messages) {
            const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
            if (!latestMessageTimestamps.has(partnerId)) {
                latestMessageTimestamps.set(partnerId, message.created_at);
            }
            partnerIds.add(partnerId);
        }

        if (partnerIds.size === 0) {
            return [];
        }

        // Fetch profiles for the unique partner IDs
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_verified')
            .in('id', Array.from(partnerIds));
        
        if (profilesError) {
            throw profilesError;
        }

        // Map profiles to SimpleUser objects
        const users: SimpleUser[] = (profiles || []).map((u: any) => ({
            id: u.id,
            name: u.full_name,
            username: u.username,
            avatar: u.avatar_url,
            isVerified: u.is_verified,
        }));

        // Sort users based on the timestamp of their last message
        users.sort((a, b) => {
            // FIX: Using a fallback of 0 for `new Date()` ensures a valid timestamp (the Unix epoch) if a message time is not found, preventing `NaN` results from invalid date subtractions which was causing the arithmetic operation error.
            const timeA = new Date(latestMessageTimestamps.get(a.id) || 0).getTime();
            const timeB = new Date(latestMessageTimestamps.get(b.id) || 0).getTime();
            return timeB - timeA;
        });

        return users;

    } catch (error) {
        // Log the full error object for better debugging.
        console.error("Error fetching chat list users:", error);
        return [];
    }
};

export const sendMessage = async (
    { sender_id, receiver_id, text, post, user, replied_story_id, reply_to }: 
    { sender_id: string, receiver_id: string, text?: string | null, post?: Post | null, user?: SimpleUser | null, replied_story_id?: string | null, reply_to?: string | null }
): Promise<Message> => {
    let type: Message['type'] = 'text';
    if(post) type = 'post_share';
    if(user) type = 'profile_share';
    if(replied_story_id) type = 'story_reply';
    
    const { data, error } = await supabase
        .from('messages')
        .insert({
            sender_id,
            receiver_id,
            text,
            type,
            shared_post_id: post?.id,
            shared_profile_id: user?.id,
            replied_story_id,
            reply_to
        })
        .select()
        .single();

    if (error) throw error;
    return data as Message;
};

export const markMessagesAsRead = async (receiverId: string, senderId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('messages')
        .update({ seen: true })
        .match({ receiver_id: receiverId, sender_id: senderId, seen: false });
    return !error;
};

export const deleteChatHistory = async (userId1: string, userId2: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_chat_history', { user_id_1: userId1, user_id_2: userId2 });
    if (error) throw error;
};

export const deleteConversationForBothSides = async (myId: string, otherId: string): Promise<boolean> => {
    const { error } = await supabase.rpc("delete_conversation", {
        user1: myId,
        user2: otherId,
    });
    if (error) {
        console.error("Error deleting conversation:", error);
        return false;
    }
    return true;
};