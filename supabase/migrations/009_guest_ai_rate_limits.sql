-- Anonymous AI rate limits use a server-derived keyed fingerprint. Raw IPs are never stored.
CREATE TABLE IF NOT EXISTS public.ai_guest_usage_limits (
  fingerprint text PRIMARY KEY CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  minute_window_started_at timestamptz NOT NULL DEFAULT now(),
  minute_count integer NOT NULL DEFAULT 0 CHECK (minute_count >= 0),
  day_window_started_at timestamptz NOT NULL DEFAULT now(),
  day_count integer NOT NULL DEFAULT 0 CHECK (day_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_guest_usage_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_guest_usage_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_guest_usage_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_ai_guest_request(p_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  minute_total integer;
  day_total integer;
BEGIN
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid guest rate-limit key' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ai_guest_usage_limits (
    fingerprint, minute_window_started_at, minute_count, day_window_started_at, day_count, updated_at
  ) VALUES (p_fingerprint, now(), 1, now(), 1, now())
  ON CONFLICT (fingerprint) DO UPDATE SET
    minute_count = CASE
      WHEN public.ai_guest_usage_limits.minute_window_started_at <= now() - interval '1 minute' THEN 1
      ELSE LEAST(public.ai_guest_usage_limits.minute_count + 1, 6)
    END,
    minute_window_started_at = CASE
      WHEN public.ai_guest_usage_limits.minute_window_started_at <= now() - interval '1 minute' THEN now()
      ELSE public.ai_guest_usage_limits.minute_window_started_at
    END,
    day_count = CASE
      WHEN public.ai_guest_usage_limits.day_window_started_at <= now() - interval '1 day' THEN 1
      ELSE LEAST(public.ai_guest_usage_limits.day_count + 1, 31)
    END,
    day_window_started_at = CASE
      WHEN public.ai_guest_usage_limits.day_window_started_at <= now() - interval '1 day' THEN now()
      ELSE public.ai_guest_usage_limits.day_window_started_at
    END,
    updated_at = now()
  RETURNING minute_count, day_count INTO minute_total, day_total;

  RETURN minute_total <= 5 AND day_total <= 30;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_guest_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_guest_request(text) TO service_role;
