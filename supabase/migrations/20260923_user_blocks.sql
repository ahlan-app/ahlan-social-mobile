-- Ahlan Social — two-way user blocking (v1.0.9). Idempotent and additive.
-- Run in the Supabase SQL editor before (or together with) installing v1.0.9.
--
-- Before 1.0.9 blocks were stored only on the blocker's phone, so the blocked
-- user (and the database) never knew about them and could still see the
-- blocker. Blocks now live in public.user_blocks and hide content in BOTH
-- directions: RESTRICTIVE policies are AND-ed with the existing permissive
-- policies, so no current policy is replaced.

BEGIN;

-- 1) Table ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id, blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_blocks FROM anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;

DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own" ON public.user_blocks
    FOR SELECT TO authenticated USING (blocker_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own" ON public.user_blocks
    FOR INSERT TO authenticated
    WITH CHECK (blocker_id = (SELECT auth.uid()) AND blocked_id <> (SELECT auth.uid()));
DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own" ON public.user_blocks
    FOR DELETE TO authenticated USING (blocker_id = (SELECT auth.uid()));

-- 2) Helpers (SECURITY DEFINER: the blocked user's queries must see the
--    blocker's row, which user_blocks RLS would otherwise hide) ------------
CREATE OR REPLACE FUNCTION public.has_block_with(p_other UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT CASE
        WHEN auth.uid() IS NULL OR p_other IS NULL OR p_other = auth.uid() THEN false
        ELSE EXISTS (
            SELECT 1 FROM public.user_blocks ub
             WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = p_other)
                OR (ub.blocker_id = p_other AND ub.blocked_id = auth.uid()))
    END;
$$;

CREATE OR REPLACE FUNCTION public.has_block_with_post_owner(p_post_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT COALESCE((SELECT public.has_block_with(p.user_id)
                       FROM public.posts p WHERE p.id = p_post_id), false);
$$;

CREATE OR REPLACE FUNCTION public.has_block_with_story_owner(p_story_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT COALESCE((SELECT public.has_block_with(s.user_id)
                       FROM public.stories s WHERE s.id = p_story_id), false);
$$;

-- 3) RPCs used by the app ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_block_relations()
RETURNS TABLE (user_id UUID, username TEXT, blocked_by_me BOOLEAN, blocked_me BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    WITH rel AS (
        SELECT ub.blocked_id AS other_id, true AS by_me, false AS by_them
          FROM public.user_blocks ub WHERE ub.blocker_id = auth.uid()
        UNION ALL
        SELECT ub.blocker_id, false, true
          FROM public.user_blocks ub WHERE ub.blocked_id = auth.uid()
    )
    SELECT r.other_id, p.username::text, bool_or(r.by_me), bool_or(r.by_them)
      FROM rel r LEFT JOIN public.profiles p ON p.id = r.other_id
     GROUP BY r.other_id, p.username;
$$;

CREATE OR REPLACE FUNCTION public.block_user(p_target UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_me UUID := auth.uid();
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    IF p_target IS NULL OR p_target = v_me THEN
        RAISE EXCEPTION 'Invalid block target' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.user_blocks (blocker_id, blocked_id) VALUES (v_me, p_target)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    -- Remove follows in both directions.
    DELETE FROM public.follows
     WHERE (follower_id = v_me AND followed_id = p_target)
        OR (follower_id = p_target AND followed_id = v_me);

    -- Remove existing notifications between the two accounts.
    DELETE FROM public.notifications
     WHERE (sender_id = v_me AND receiver_id = p_target)
        OR (sender_id = p_target AND receiver_id = v_me);
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_target UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.user_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_target;
END;
$$;

REVOKE ALL ON FUNCTION public.has_block_with(UUID)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_block_with_post_owner(UUID)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_block_with_story_owner(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_block_relations()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.block_user(UUID)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unblock_user(UUID)               FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_block_with(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_block_with_post_owner(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_block_with_story_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_block_relations()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID)               TO authenticated;

-- 4) Restrictive guards ------------------------------------------------------
-- Hide content in both directions.
DROP POLICY IF EXISTS "block_guard_posts_select" ON public.posts;
CREATE POLICY "block_guard_posts_select" ON public.posts AS RESTRICTIVE
    FOR SELECT TO authenticated USING (NOT public.has_block_with(user_id));
DROP POLICY IF EXISTS "block_guard_stories_select" ON public.stories;
CREATE POLICY "block_guard_stories_select" ON public.stories AS RESTRICTIVE
    FOR SELECT TO authenticated USING (NOT public.has_block_with(user_id));
DROP POLICY IF EXISTS "block_guard_comments_select" ON public.comments;
CREATE POLICY "block_guard_comments_select" ON public.comments AS RESTRICTIVE
    FOR SELECT TO authenticated USING (NOT public.has_block_with(user_id));
DROP POLICY IF EXISTS "block_guard_notifications_select" ON public.notifications;
CREATE POLICY "block_guard_notifications_select" ON public.notifications AS RESTRICTIVE
    FOR SELECT TO authenticated USING (NOT public.has_block_with(sender_id));

-- No interactions across a block.
DROP POLICY IF EXISTS "block_guard_follows_insert" ON public.follows;
CREATE POLICY "block_guard_follows_insert" ON public.follows AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with(followed_id));
DROP POLICY IF EXISTS "block_guard_messages_insert" ON public.messages;
CREATE POLICY "block_guard_messages_insert" ON public.messages AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with(receiver_id));
DROP POLICY IF EXISTS "block_guard_notifications_insert" ON public.notifications;
CREATE POLICY "block_guard_notifications_insert" ON public.notifications AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with(receiver_id));
DROP POLICY IF EXISTS "block_guard_comments_insert" ON public.comments;
CREATE POLICY "block_guard_comments_insert" ON public.comments AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with_post_owner(post_id));
DROP POLICY IF EXISTS "block_guard_likes_insert" ON public.likes;
CREATE POLICY "block_guard_likes_insert" ON public.likes AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with_post_owner(post_id));
DROP POLICY IF EXISTS "block_guard_reposts_insert" ON public.reposts;
CREATE POLICY "block_guard_reposts_insert" ON public.reposts AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with_post_owner(post_id));
DROP POLICY IF EXISTS "block_guard_story_likes_insert" ON public.story_likes;
CREATE POLICY "block_guard_story_likes_insert" ON public.story_likes AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with_story_owner(story_id));
DROP POLICY IF EXISTS "block_guard_story_views_insert" ON public.story_views;
CREATE POLICY "block_guard_story_views_insert" ON public.story_views AS RESTRICTIVE
    FOR INSERT TO authenticated WITH CHECK (NOT public.has_block_with_story_owner(story_id));

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Rollback (drop policies before functions):
-- BEGIN;
-- DROP POLICY IF EXISTS "block_guard_posts_select" ON public.posts;
-- DROP POLICY IF EXISTS "block_guard_stories_select" ON public.stories;
-- DROP POLICY IF EXISTS "block_guard_comments_select" ON public.comments;
-- DROP POLICY IF EXISTS "block_guard_notifications_select" ON public.notifications;
-- DROP POLICY IF EXISTS "block_guard_follows_insert" ON public.follows;
-- DROP POLICY IF EXISTS "block_guard_messages_insert" ON public.messages;
-- DROP POLICY IF EXISTS "block_guard_notifications_insert" ON public.notifications;
-- DROP POLICY IF EXISTS "block_guard_comments_insert" ON public.comments;
-- DROP POLICY IF EXISTS "block_guard_likes_insert" ON public.likes;
-- DROP POLICY IF EXISTS "block_guard_reposts_insert" ON public.reposts;
-- DROP POLICY IF EXISTS "block_guard_story_likes_insert" ON public.story_likes;
-- DROP POLICY IF EXISTS "block_guard_story_views_insert" ON public.story_views;
-- DROP FUNCTION IF EXISTS public.block_user(UUID), public.unblock_user(UUID),
--   public.get_block_relations(), public.has_block_with_post_owner(UUID),
--   public.has_block_with_story_owner(UUID), public.has_block_with(UUID);
-- COMMIT;
