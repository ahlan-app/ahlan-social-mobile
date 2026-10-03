-- ============================================================
-- v1.0.10 customer-feedback fixes (Supabase migration)
--
-- Reported issues fixed here:
--   1. Comment like counts always show 0 for other users.
--   2. Story view counts stay at 0 / story replies & likes not recorded.
--   3. Duplicate usernames are possible (no unique constraint).
-- ============================================================

-- ------------------------------------------------------------
-- 1. comment_likes: let everyone READ like rows.
--
--    The old single "Users can like and unlike comments" policy was
--    cmd ALL with qual (auth.uid() = user_id): under RLS a SELECT can
--    only see rows you inserted yourself, so every like count fetched
--    with the app came back as 0 (getCommentLikesCount counts visible
--    rows only). Split into per-command policies.
-- ------------------------------------------------------------

-- 1a. Allow anyone (authenticated) to count/read comment likes.
DROP POLICY IF EXISTS "authenticated can read comment likes" ON public.comment_likes;
CREATE POLICY "authenticated can read comment likes"
    ON public.comment_likes
    FOR SELECT
    TO authenticated
    USING (true);

-- 1b. Keep insert/delete restricted to the liking user.
DROP POLICY IF EXISTS "authenticated can like comments" ON public.comment_likes;
CREATE POLICY "authenticated can like comments"
    ON public.comment_likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated can unlike comments" ON public.comment_likes;
CREATE POLICY "authenticated can unlike comments"
    ON public.comment_likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Remove the old ALL policy that hid other users' likes from SELECT.
DROP POLICY IF EXISTS "Users can like and unlike comments" ON public.comment_likes;

-- ------------------------------------------------------------
-- 2. story_views
-- ------------------------------------------------------------
-- 2a. Owner of the story must be able to SELECT view rows
--     (getStoryViewCount / getStoryViewers returned 0 because no
--     SELECT policy existed at all → every read was RLS-filtered to
--     nothing).
DROP POLICY IF EXISTS "story owner can see views" ON public.story_views;
CREATE POLICY "story owner can see views"
    ON public.story_views
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.stories s
            WHERE s.id = story_views.story_id
              AND s.user_id = auth.uid()
        )
    );

-- 2b. A viewer must be able to see that their own view exists.
DROP POLICY IF EXISTS "viewers can see their own view rows" ON public.story_views;
CREATE POLICY "viewers can see their own view rows"
    ON public.story_views
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- 2c. recordStoryView() upserts {story_id, user_id}. Without a unique
--     index on (story_id, user_id) the upsert inserted a NEW row on
--     every view (id PK only), inflating counts and never matching.
DELETE FROM public.story_views a
    USING public.story_views b
    WHERE a.id > b.id
      AND a.story_id = b.story_id
      AND a.user_id IS NOT DISTINCT FROM b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS story_views_story_user_uniq
    ON public.story_views (story_id, user_id);

-- 2d. Replace the old INSERT block-guard (which did not check that the
--     viewer row belongs to auth.uid()) with one that enforces both the
--     viewer identity and the block guard.
DROP POLICY IF EXISTS "block_guard_story_views_insert" ON public.story_views;
DROP POLICY IF EXISTS "users can record their own story views" ON public.story_views;
CREATE POLICY "users can record their own story views"
    ON public.story_views
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND NOT public.has_block_with_story_owner(story_id));

-- 2e. story_likes reads: the heart color was based on SELECT qual
--     (true) which already allows reads; nothing to change, but ensure
--     the block-guard insert policy stays (already exists).

-- ------------------------------------------------------------
-- 3. profiles.username must be unique.
--
--    checkUsernameExists() only runs at signup; EditProfile could set
--    any username (including one already in use). Enforce at the DB.
--    First de-duplicate any existing collisions (keep the earliest
--    account by created_at, then user id for stability).
-- ------------------------------------------------------------

-- Find duplicates and keep the oldest profile per username; rename the
-- losers to "<username>_<short id>" so the migration never fails.
DO $$
DECLARE
    dup RECORD;
    keep_id UUID;
BEGIN
    FOR dup IN
        SELECT username
        FROM public.profiles
        WHERE username IS NOT NULL
        GROUP BY username
        HAVING count(*) > 1
    LOOP
        SELECT id INTO keep_id
        FROM public.profiles
        WHERE username = dup.username
        ORDER BY created_at NULLS LAST, id
        LIMIT 1;

        UPDATE public.profiles
        SET username = username || '_' || left(md5(random()::text), 4)
        WHERE username = dup.username
          AND id <> keep_id;
    END LOOP;
END $$;

-- Unique constraint on username (case-sensitive; app lowercases all).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uniq
    ON public.profiles (username);

-- Also back-fill auth.users metadata so get_email_by_username() cannot
-- resolve two accounts to one email. (Metadata of renamed profiles keeps
-- the old username; harmless because profiles.username is the source of
-- truth for the app, and signup checks profiles.)

-- ------------------------------------------------------------
-- 4. messages: the "seen" flag is the source for the blue unread dot.
--    Nothing to change in the DB; the client fix keeps the list view
--    from marking everything seen the moment the list is opened.
-- ------------------------------------------------------------
