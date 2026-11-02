-- Persistent AI event plans and customer-owned conversations/memories.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS blueprint jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS planning_requirements text;

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Event planning conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_conversations_user_updated_idx ON public.ai_conversations(user_id, updated_at DESC);
DROP TRIGGER IF EXISTS ai_conversations_set_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conversations_set_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_conversation_created_idx ON public.ai_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  memory_type text NOT NULL CHECK (memory_type IN ('personal','event')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_memories_scope_check CHECK ((memory_type = 'personal' AND event_id IS NULL) OR (memory_type = 'event' AND event_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ai_memories_user_scope_idx ON public.ai_memories(user_id, event_id);
DROP TRIGGER IF EXISTS ai_memories_set_updated_at ON public.ai_memories;
CREATE TRIGGER ai_memories_set_updated_at
  BEFORE UPDATE ON public.ai_memories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx ON public.ai_usage_events(user_id, created_at DESC);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM PUBLIC, anon, authenticated;

-- The caller identity comes only from the authenticated JWT. An advisory
-- transaction lock makes the 8-per-minute check and insert atomic per user.
CREATE OR REPLACE FUNCTION public.consume_ai_request()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  caller_id uuid := auth.uid();
  requests_in_window bigint;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated session required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));
  DELETE FROM public.ai_usage_events
    WHERE user_id = caller_id AND created_at < now() - interval '5 minutes';
  SELECT count(*) INTO requests_in_window
    FROM public.ai_usage_events
    WHERE user_id = caller_id AND created_at >= now() - interval '1 minute' AND created_at <= now();

  IF requests_in_window >= 8 THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage_events (user_id) VALUES (caller_id);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_request() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_request() TO authenticated;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai conversations own access" ON public.ai_conversations;
CREATE POLICY "ai conversations own access" ON public.ai_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid() AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())))
  WITH CHECK (user_id = auth.uid() AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())));

DROP POLICY IF EXISTS "ai messages own access" ON public.ai_messages;
CREATE POLICY "ai messages own access" ON public.ai_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "ai memories own access" ON public.ai_memories;
CREATE POLICY "ai memories own access" ON public.ai_memories FOR ALL TO authenticated
  USING (user_id = auth.uid() AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())))
  WITH CHECK (user_id = auth.uid() AND (event_id IS NULL OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())));

DROP POLICY IF EXISTS "ai usage own access" ON public.ai_usage_events;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations, public.ai_messages, public.ai_memories TO authenticated;
REVOKE ALL ON public.ai_conversations, public.ai_messages, public.ai_memories FROM anon;
