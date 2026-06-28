
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_name TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  handoff_whatsapp BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.support_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_chat_messages_chat_id ON public.support_chat_messages(chat_id, created_at);
CREATE INDEX idx_support_chats_last_msg ON public.support_chats(last_message_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_chats TO anon, authenticated;
GRANT ALL ON public.support_chats TO service_role;
GRANT SELECT, INSERT ON public.support_chat_messages TO anon, authenticated;
GRANT ALL ON public.support_chat_messages TO service_role;

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert support chat" ON public.support_chats
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read all support chats" ON public.support_chats
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update chats" ON public.support_chats
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (true);

CREATE POLICY "Anyone can insert support messages" ON public.support_chat_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read all support messages" ON public.support_chat_messages
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.support_chats_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_support_chats_updated_at
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW EXECUTE FUNCTION public.support_chats_touch_updated_at();
