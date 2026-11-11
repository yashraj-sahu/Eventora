-- Keep the vendor moderation RPC compatible with the approval_status enum.
-- PL/pgSQL text/enum comparisons and assignments otherwise fail at runtime
-- when an administrator approves or rejects an application.

CREATE OR REPLACE FUNCTION public.guard_vendor_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  authorized_change boolean := false;
  protected_change boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid()
       OR NEW.approval_status <> 'pending' OR NEW.is_published
       OR NEW.is_featured OR NEW.is_verified OR NEW.claimed_by IS NOT NULL
       OR NEW.claim_requested_at IS NOT NULL OR NEW.claim_verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Vendor applications must be created by their owner in pending status'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  protected_change := (NEW.user_id, NEW.claimed_by, NEW.approval_status, NEW.is_published,
      NEW.is_featured, NEW.is_verified, NEW.claim_requested_at, NEW.claim_verified_at)
    IS DISTINCT FROM
    (OLD.user_id, OLD.claimed_by, OLD.approval_status, OLD.is_published,
      OLD.is_featured, OLD.is_verified, OLD.claim_requested_at, OLD.claim_verified_at);

  SELECT EXISTS (
    SELECT 1
    FROM public.admin_audit_log AS audit
    WHERE audit.target_type = 'vendor_profile'
      AND audit.target_id = OLD.id::text
      AND audit.actor_id IS NOT DISTINCT FROM auth.uid()
      AND audit.request_id = 'vendor-profile-change:' || txid_current()::text
      AND audit.before_data->>'approval_status' IS NOT DISTINCT FROM OLD.approval_status::text
      AND audit.before_data->>'is_published' IS NOT DISTINCT FROM OLD.is_published::text
      AND audit.after_data->>'approval_status' IS NOT DISTINCT FROM NEW.approval_status::text
      AND audit.after_data->>'is_published' IS NOT DISTINCT FROM NEW.is_published::text
      AND (
        (audit.action IN ('vendor_profile_approve','vendor_profile_reject','vendor_profile_suspend','vendor_profile_publish','vendor_profile_unpublish')
          AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
          AND NEW.claimed_by IS NOT DISTINCT FROM OLD.claimed_by
          AND NEW.claim_requested_at IS NOT DISTINCT FROM OLD.claim_requested_at
          AND NEW.claim_verified_at IS NOT DISTINCT FROM OLD.claim_verified_at
          AND NEW.is_featured IS NOT DISTINCT FROM OLD.is_featured
          AND NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified)
        OR
        (audit.action = 'vendor_profile_claimed'
          AND OLD.user_id IS NULL AND OLD.claimed_by IS NULL
          AND NEW.user_id = auth.uid() AND NEW.claimed_by = auth.uid()
          AND audit.before_data->>'user_id' IS NULL
          AND audit.after_data->>'user_id' = NEW.user_id::text
          AND audit.after_data->>'claimed_by' = NEW.claimed_by::text
          AND NEW.approval_status = 'approved' AND NEW.is_published
          AND NEW.is_featured IS NOT DISTINCT FROM OLD.is_featured
          AND NEW.is_verified IS NOT DISTINCT FROM OLD.is_verified
          AND NEW.contact_email IS NOT NULL
          AND lower(NEW.contact_email) = (SELECT lower(u.email) FROM auth.users AS u WHERE u.id = auth.uid()))
      )
  ) INTO authorized_change;

  IF authorized_change THEN RETURN NEW; END IF;

  IF protected_change OR auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid()
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Vendor ownership and approval fields require an authorized workflow'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_vendor_profile_changes() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.moderate_vendor_profile(
  p_vendor_profile_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  prior public.vendor_profiles%ROWTYPE;
  updated public.vendor_profiles%ROWTYPE;
  next_approval_status public.approval_status;
  next_is_published boolean;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_verification')) THEN
    RAISE EXCEPTION 'Vendor verification permission required' USING ERRCODE = '42501';
  END IF;
  IF p_vendor_profile_id IS NULL OR p_action IS NULL
     OR p_action NOT IN ('approve','reject','suspend','publish','unpublish')
     OR length(COALESCE(p_reason, '')) > 1000 THEN
    RAISE EXCEPTION 'Invalid vendor moderation action' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'reject' AND length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO prior FROM public.vendor_profiles WHERE id = p_vendor_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor profile not found' USING ERRCODE = 'P0002'; END IF;

  next_approval_status := prior.approval_status;
  next_is_published := prior.is_published;
  IF p_action = 'approve' THEN
    next_approval_status := 'approved';
    next_is_published := true;
  ELSIF p_action = 'reject' THEN
    next_approval_status := 'rejected';
    next_is_published := false;
  ELSIF p_action IN ('suspend','unpublish') THEN
    next_is_published := false;
  ELSE
    IF prior.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Only approved vendors may be published' USING ERRCODE = '23514';
    END IF;
    next_is_published := true;
  END IF;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data, request_id)
  VALUES (auth.uid(), 'vendor_profile_' || p_action, 'vendor_profile', p_vendor_profile_id::text,
    nullif(trim(COALESCE(p_reason, '')), ''),
    jsonb_build_object('approval_status', prior.approval_status::text, 'is_published', prior.is_published),
    jsonb_build_object('approval_status', next_approval_status::text, 'is_published', next_is_published),
    'vendor-profile-change:' || txid_current()::text);

  UPDATE public.vendor_profiles
  SET approval_status = next_approval_status,
      is_published = next_is_published,
      updated_at = now()
  WHERE id = p_vendor_profile_id
  RETURNING * INTO updated;

  RETURN jsonb_build_object('id', updated.id, 'approval_status', updated.approval_status::text,
    'is_published', updated.is_published);
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_vendor_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_profile(uuid, text, text) TO authenticated;
