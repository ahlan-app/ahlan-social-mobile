-- Ahlan Social — v1.0.9 security fix for the chat deletion RPCs.
-- Idempotent. Run in the Supabase SQL editor.
--
-- delete_chat_history / delete_conversation (20260812) are SECURITY DEFINER
-- and never checked the caller, so any signed-in user could delete the
-- messages between ANY two users. The caller must now be one of the two.
-- Signatures and parameter names are unchanged (the app calls them as-is).

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_chat_history(user_id_1 UUID, user_id_2 UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() NOT IN (user_id_1, user_id_2) THEN
    RAISE EXCEPTION 'You can only delete your own conversations' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.messages
  WHERE (sender_id = user_id_1 AND receiver_id = user_id_2)
     OR (sender_id = user_id_2 AND receiver_id = user_id_1);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_conversation(user1 UUID, user2 UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() NOT IN (user1, user2) THEN
    RAISE EXCEPTION 'You can only delete your own conversations' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.messages
  WHERE (sender_id = user1 AND receiver_id = user2)
     OR (sender_id = user2 AND receiver_id = user1);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_chat_history(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_conversation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_chat_history(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_conversation(UUID, UUID) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
