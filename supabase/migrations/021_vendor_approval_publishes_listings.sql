-- Vendor accounts require administrative approval. Individual vendor listings
-- and add-on edits do not require a second approval once the vendor is approved.
-- Existing drafts and rejected/archived listings keep their current state.

CREATE OR REPLACE FUNCTION public.guard_vendor_listing_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  vendor_approved boolean := false;
  vendor_published boolean := false;
  expected_action text;
  authorized_transition boolean := false;
  owner_edit boolean := false;
BEGIN
  IF NEW.vendor_service_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendor_services AS service
    WHERE service.id = NEW.vendor_service_id
      AND service.vendor_profile_id = NEW.vendor_profile_id
  ) THEN
    RAISE EXCEPTION 'The linked booking service belongs to another business'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT profile.approval_status = 'approved', profile.is_published
      INTO vendor_approved, vendor_published
    FROM public.vendor_profiles AS profile
    WHERE profile.id = NEW.vendor_profile_id
      AND profile.user_id = auth.uid();
    IF NOT FOUND OR NOT public.has_evntora_role('vendor') THEN
      RAISE EXCEPTION 'Only the vendor owner may create this listing'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('draft', 'pending_approval') THEN
      RAISE EXCEPTION 'Vendors cannot reject or archive listings'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'pending_approval' THEN
      NEW.submitted_at := coalesce(NEW.submitted_at, now());
    END IF;
    NEW.moderation_note := NULL;
    NEW.reviewed_at := NULL;
    RETURN NEW;
  END IF;

  -- Existing vendor edit forms submit "draft" as the save action. Normalize
  -- that value back to the current state for an owned edit; it does not restore
  -- a terminal listing or authorize any status transition.
  IF NEW.status = 'draft' AND OLD.status IN ('published', 'rejected', 'archived') THEN
    SELECT public.has_evntora_role('vendor') AND EXISTS (
      SELECT 1 FROM public.vendor_profiles AS profile
      WHERE profile.id = OLD.vendor_profile_id AND profile.user_id = auth.uid()
    ) INTO owner_edit;
    IF owner_edit THEN NEW.status := OLD.status; END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    expected_action := CASE
      WHEN OLD.status = 'pending_approval' AND NEW.status = 'published' THEN 'vendor_listing_approve'
      WHEN OLD.status = 'pending_approval' AND NEW.status = 'rejected' THEN 'vendor_listing_reject'
      WHEN OLD.status IN ('rejected', 'archived') AND NEW.status = 'pending_approval' THEN 'vendor_listing_restore'
      ELSE NULL
    END;

    IF expected_action IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.admin_audit_log AS audit
        WHERE audit.target_type = 'vendor_listing'
          AND audit.target_id = OLD.id::text
          AND audit.actor_id IS NOT DISTINCT FROM auth.uid()
          AND audit.request_id = 'vendor-listing-status:' || txid_current()::text
          AND audit.before_data->>'status' = OLD.status
          AND audit.after_data->>'status' = NEW.status
          AND (audit.action = expected_action
            OR (expected_action = 'vendor_listing_approve'
                AND audit.action = 'vendor_listing_auto_published'))
      ) INTO authorized_transition;
    END IF;

    IF NOT authorized_transition THEN
      RAISE EXCEPTION 'Listing status decisions must use the authorized moderation workflow'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- The edit form submits "draft" for saves. Keep an already-published offer
  -- published for a qualifying owner edit rather than treating that form value
  -- as a moderation decision.
  SELECT profile.approval_status = 'approved', profile.is_published
    INTO vendor_approved, vendor_published
  FROM public.vendor_profiles AS profile
  WHERE profile.id = NEW.vendor_profile_id
    AND profile.user_id = auth.uid();
  IF NOT FOUND OR NOT public.has_evntora_role('vendor') THEN
    RAISE EXCEPTION 'Only the vendor owner may edit this listing'
      USING ERRCODE = '42501';
  END IF;
  IF OLD.status = 'published' AND vendor_approved AND vendor_published
     AND NEW.status = 'draft' THEN
    NEW.status := 'published';
  END IF;
  NEW.moderation_note := OLD.moderation_note;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Keep moderation behind a permission-checked RPC. Restoring a terminal listing
-- returns it to the review queue; it never publishes it directly.
CREATE OR REPLACE FUNCTION public.moderate_vendor_listing(
  p_listing_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS public.vendor_listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  listing_row public.vendor_listings%ROWTYPE;
  prior_status text;
  next_status text;
  audit_action text;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('listing_moderation')) THEN
    RAISE EXCEPTION 'Listing moderation permission required' USING ERRCODE = '42501';
  END IF;
  IF p_listing_id IS NULL OR p_action IS NULL
     OR p_action NOT IN ('approve', 'reject', 'restore')
     OR length(COALESCE(p_reason, '')) > 1000
     OR (p_action IN ('reject', 'restore') AND length(trim(COALESCE(p_reason, ''))) < 3) THEN
    RAISE EXCEPTION 'Invalid listing moderation decision' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO listing_row
  FROM public.vendor_listings
  WHERE id = p_listing_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0002';
  END IF;
  prior_status := listing_row.status;

  IF p_action = 'restore' THEN
    IF prior_status NOT IN ('rejected', 'archived') THEN
      RAISE EXCEPTION 'Only rejected or archived listings can be restored' USING ERRCODE = '22023';
    END IF;
    next_status := 'pending_approval';
    audit_action := 'vendor_listing_restore';
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data, request_id)
    VALUES (auth.uid(), audit_action, 'vendor_listing', p_listing_id::text, trim(p_reason),
            jsonb_build_object('status', prior_status), jsonb_build_object('status', next_status),
            'vendor-listing-status:' || txid_current()::text);
    UPDATE public.vendor_listings
    SET status = next_status, moderation_note = trim(p_reason),
        submitted_at = now(), reviewed_at = NULL, updated_at = now()
    WHERE id = p_listing_id
    RETURNING * INTO listing_row;
  ELSE
    IF prior_status <> 'pending_approval' THEN
      RAISE EXCEPTION 'Only pending listings can be approved or rejected' USING ERRCODE = '22023';
    END IF;
    next_status := CASE WHEN p_action = 'approve' THEN 'published' ELSE 'rejected' END;
    audit_action := 'vendor_listing_' || p_action;
    INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data, request_id)
    VALUES (auth.uid(), audit_action, 'vendor_listing', p_listing_id::text,
            nullif(trim(COALESCE(p_reason, '')), ''),
            jsonb_build_object('status', prior_status), jsonb_build_object('status', next_status),
            'vendor-listing-status:' || txid_current()::text);
    UPDATE public.vendor_listings
    SET status = next_status,
        moderation_note = CASE WHEN p_action = 'reject' THEN trim(p_reason) ELSE NULL END,
        reviewed_at = now(), updated_at = now()
    WHERE id = p_listing_id
    RETURNING * INTO listing_row;
  END IF;

  RETURN listing_row;
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_vendor_listing(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_listing(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_vendor_listing_moderation() FROM PUBLIC, anon, authenticated;

-- Let the owner policy accept published status only after the owning vendor
-- account itself has been approved and published. The trigger above still
-- controls how a listing reaches that state.
DROP POLICY IF EXISTS vendor_listings_owner_manage ON public.vendor_listings;
CREATE POLICY vendor_listings_owner_manage
ON public.vendor_listings
FOR ALL TO authenticated
USING (
  public.has_evntora_role('vendor')
  AND EXISTS (
    SELECT 1 FROM public.vendor_profiles AS profile
    WHERE profile.id = vendor_profile_id AND profile.user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_evntora_role('vendor')
  AND EXISTS (
    SELECT 1 FROM public.vendor_profiles AS profile
    WHERE profile.id = vendor_profile_id
      AND profile.user_id = auth.uid()
      AND (
        status IN ('draft', 'pending_approval', 'rejected')
        OR (status = 'published' AND profile.approval_status = 'approved' AND profile.is_published)
      )
  )
);

CREATE OR REPLACE FUNCTION public.publish_vendor_listings_after_vendor_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  listing_row public.vendor_listings%ROWTYPE;
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.is_published
     AND (OLD.approval_status IS DISTINCT FROM NEW.approval_status OR NOT OLD.is_published) THEN
    IF NOT (public.is_evntora_admin() OR public.has_admin_permission('vendor_verification')) THEN
      RAISE EXCEPTION 'Vendor verification permission required to publish pending listings'
        USING ERRCODE = '42501';
    END IF;
    FOR listing_row IN
      SELECT * FROM public.vendor_listings
      WHERE vendor_profile_id = NEW.id AND status = 'pending_approval'
      FOR UPDATE
    LOOP
      INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data, request_id)
      VALUES (auth.uid(), 'vendor_listing_auto_published', 'vendor_listing', listing_row.id::text,
              'Published after vendor approval.',
              jsonb_build_object('status', 'pending_approval'), jsonb_build_object('status', 'published'),
              'vendor-listing-status:' || txid_current()::text);
      UPDATE public.vendor_listings
      SET status = 'published', updated_at = now()
      WHERE id = listing_row.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendor_listing_publish_after_vendor_approval ON public.vendor_profiles;
CREATE TRIGGER vendor_listing_publish_after_vendor_approval
AFTER UPDATE OF approval_status, is_published ON public.vendor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.publish_vendor_listings_after_vendor_approval();

REVOKE ALL ON FUNCTION public.publish_vendor_listings_after_vendor_approval() FROM PUBLIC, anon, authenticated;

-- Editing listing add-ons does not reopen vendor approval or a listing review.
CREATE OR REPLACE FUNCTION public.require_vendor_listing_addon_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
