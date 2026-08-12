-- Ahlan Social — RPC functions required by the mobile app
-- Applied manually to production (ap-south-1) on 2026-08-12 after project restore.
-- These were missing from the backend, breaking username login and chat deletion.

-- 1. get_email_by_username: resolve username -> email for login flow
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users
    WHERE LOWER(raw_user_meta_data->>'username') = LOWER(p_username)
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;

-- 2. delete_chat_history: remove message thread between two users
CREATE OR REPLACE FUNCTION public.delete_chat_history(user_id_1 UUID, user_id_2 UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE (sender_id = user_id_1 AND receiver_id = user_id_2)
     OR (sender_id = user_id_2 AND receiver_id = user_id_1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_chat_history(UUID, UUID) TO authenticated;

-- 3. delete_conversation: same operation, different parameter names (used by mobile)
CREATE OR REPLACE FUNCTION public.delete_conversation(user1 UUID, user2 UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.messages
  WHERE (sender_id = user1 AND receiver_id = user2)
     OR (sender_id = user2 AND receiver_id = user1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation(UUID, UUID) TO authenticated;
