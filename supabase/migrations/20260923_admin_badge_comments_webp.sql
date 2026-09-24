-- Ahlan Social — v1.0.9 backend changes (admin blue badge, comment moderation,
-- WebP uploads). Idempotent: safe to run more than once.
-- Run in the Supabase SQL editor before (or together with) installing v1.0.9.

BEGIN;

-- =========================================================================
-- 1. Admin role + blue verified badge
-- =========================================================================
-- The app used to UPDATE another user's profiles row directly. Row-level
-- security only allows users to update their own row, so the update changed
-- nothing and the app put the badge back. Badge changes now go through the
-- admin_set_verified RPC, which checks profiles.is_admin server-side.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
UPDATE public.profiles SET is_verified = false WHERE is_verified IS NULL;
ALTER TABLE public.profiles ALTER COLUMN is_verified SET DEFAULT false;
ALTER TABLE public.profiles ALTER COLUMN is_verified SET NOT NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- SECURITY DEFINER so it can be used inside RLS policies without recursion.
CREATE OR REPLACE FUNCTION public.ahlan_is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = p_user_id),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.ahlan_is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ahlan_is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ahlan_is_admin(uuid) TO authenticated, service_role;

-- Users cannot verify themselves or make themselves admin through the API.
-- Trusted contexts (SQL editor, service role, SECURITY DEFINER functions)
-- run as a different role and pass through untouched.
CREATE OR REPLACE FUNCTION public.profiles_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false;
    NEW.is_admin := false;
    RETURN NEW;
  END IF;

  NEW.is_admin := OLD.is_admin;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND NOT public.ahlan_is_admin(auth.uid()) THEN
    NEW.is_verified := OLD.is_verified;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged_columns ON public.profiles;
CREATE TRIGGER profiles_guard_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged_columns();

-- Admin grants / revokes the blue badge. Returns the stored value.
CREATE OR REPLACE FUNCTION public.admin_set_verified(target_user_id uuid, verified boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_result boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.ahlan_is_admin(v_caller) THEN
    RAISE EXCEPTION 'Only admins can change verification status' USING ERRCODE = '42501';
  END IF;

  IF target_user_id IS NULL OR verified IS NULL THEN
    RAISE EXCEPTION 'target_user_id and verified are required' USING ERRCODE = '22004';
  END IF;

  UPDATE public.profiles AS p
     SET is_verified = admin_set_verified.verified
   WHERE p.id = admin_set_verified.target_user_id
  RETURNING p.is_verified INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile % not found', target_user_id USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_verified(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_verified(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated;

-- The Ahlan admin account: admin + blue badge.
UPDATE public.profiles
   SET is_admin = true, is_verified = true
 WHERE lower(username) = 'ahlan';

-- If the admin's username is not 'ahlan', target the login email instead:
-- UPDATE public.profiles p
--    SET is_admin = true, is_verified = true
--   FROM auth.users u
--  WHERE u.id = p.id AND lower(u.email) = lower('ahlanappinfo@gmail.com');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin) THEN
    RAISE WARNING 'No admin profile found (username ''ahlan''). Set profiles.is_admin = true manually.';
  END IF;
END $$;

-- Admin moderation: delete any post (adminDeletePost was silently blocked by RLS).
DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  TO authenticated
  USING (public.ahlan_is_admin(auth.uid()));

-- =========================================================================
-- 2. Comment deletion: author OR owner of the post (OR admin)
-- =========================================================================

-- 2a. Enabling RLS denies whatever no PERMISSIVE policy allows, so create
--     baseline policies only where none exist; reading and posting keep working.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'comments'
                    AND permissive = 'PERMISSIVE' AND cmd IN ('SELECT', 'ALL')) THEN
    CREATE POLICY "Comments are viewable by everyone"
      ON public.comments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'comments'
                    AND permissive = 'PERMISSIVE' AND cmd IN ('INSERT', 'ALL')) THEN
    CREATE POLICY "Users can add their own comments"
      ON public.comments FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies
                  WHERE schemaname = 'public' AND tablename = 'comments'
                    AND permissive = 'PERMISSIVE' AND cmd IN ('UPDATE', 'ALL')) THEN
    CREATE POLICY "Users can edit their own comments"
      ON public.comments FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comments TO authenticated;

-- 2b. Permissive policies are OR-ed, so an existing "delete own comments"
--     policy keeps working next to this one.
DROP POLICY IF EXISTS "Comment authors and post owners can delete comments" ON public.comments;
CREATE POLICY "Comment authors and post owners can delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.posts p
       WHERE p.id = comments.post_id
         AND p.user_id = (SELECT auth.uid())
    )
    OR public.ahlan_is_admin((SELECT auth.uid()))
  );

-- 2c. A RESTRICTIVE delete policy would still block post owners: warn.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'comments'
              AND permissive = 'RESTRICTIVE' AND cmd IN ('DELETE', 'ALL')
  LOOP
    RAISE WARNING 'Restrictive policy "%" on public.comments may block post owners from deleting comments', r.policyname;
  END LOOP;
END $$;

-- 2d. Rows that reference a comment (likes, replies, notifications) must not
--     block its deletion: make every foreign key to comments ON DELETE CASCADE.
--     The regex also strips the PG15+ "ON DELETE SET NULL (cols)" form.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname,
           c.conrelid::regclass AS tbl,
           regexp_replace(pg_get_constraintdef(c.oid),
                          '\s+ON DELETE\s+(NO ACTION|RESTRICT|SET NULL|SET DEFAULT)(\s*\([^)]*\))?',
                          '', 'i') AS def
      FROM pg_constraint c
     WHERE c.contype = 'f'
       AND c.confrelid = 'public.comments'::regclass
       AND c.confdeltype <> 'c'
       AND NOT c.condeferrable
       AND c.convalidated
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON DELETE CASCADE', r.tbl, r.conname, r.def);
  END LOOP;
END $$;

-- 2e. If notifications.comment_id has no foreign key, remove the comment's
--     notifications together with it (only when the column types match).
CREATE OR REPLACE FUNCTION public.comments_cleanup_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.notifications WHERE comment_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.comments_cleanup_notifications() FROM PUBLIC, anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1
               FROM information_schema.columns n
               JOIN information_schema.columns c
                 ON c.table_schema = 'public' AND c.table_name = 'comments' AND c.column_name = 'id'
              WHERE n.table_schema = 'public' AND n.table_name = 'notifications'
                AND n.column_name = 'comment_id' AND n.data_type = c.data_type) THEN
    DROP TRIGGER IF EXISTS comments_cleanup_notifications ON public.comments;
    CREATE TRIGGER comments_cleanup_notifications
      AFTER DELETE ON public.comments
      FOR EACH ROW EXECUTE FUNCTION public.comments_cleanup_notifications();
  END IF;
END $$;

-- =========================================================================
-- 3. WebP uploads (client compresses images to max 1080px, 70% WebP)
-- =========================================================================
-- Buckets with an allowlist must accept WebP (and JPEG, the fallback format).
-- NULL allowed_mime_types means every type is allowed and is left alone.
UPDATE storage.buckets b
   SET allowed_mime_types = ARRAY(
         SELECT DISTINCT m FROM unnest(b.allowed_mime_types || ARRAY['image/webp', 'image/jpeg']) AS m)
 WHERE b.id IN ('post-media', 'media', 'uploads', 'avatars', 'stories', 'story-media')
   AND b.allowed_mime_types IS NOT NULL
   AND NOT (b.allowed_mime_types @> ARRAY['image/webp', 'image/jpeg']);

-- Profile photos: public bucket, users write only under avatars/<their uid>/.
-- Additive: existing buckets and policies are kept.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ahlan_avatars_read" ON storage.objects;
CREATE POLICY "ahlan_avatars_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "ahlan_avatars_insert" ON storage.objects;
CREATE POLICY "ahlan_avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

DROP POLICY IF EXISTS "ahlan_avatars_update" ON storage.objects;
CREATE POLICY "ahlan_avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

COMMIT;

-- Make the new RPCs callable immediately.
NOTIFY pgrst, 'reload schema';
