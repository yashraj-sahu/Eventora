-- Unified email verification and privileged account activation.
-- Existing memberships are preserved; only new unverified identities and
-- non-approved vendor applications are kept inactive.

-- Preserve the distinction between an ineligible Vendor role and an explicit
-- administrator suspension. Historical suspensions are recoverable from the
-- existing append-only workspace-access audit records.
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS vendor_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS vendor_suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_suspension_reason text;

WITH latest_vendor_access_action AS (
  SELECT DISTINCT ON (target_id)
    target_id, action, actor_id, reason, created_at
  FROM public.admin_audit_log
  WHERE target_type = 'user_role'
    AND action IN ('user_workspace_suspended', 'user_workspace_reactivated')
    AND before_data->>'role' = 'vendor'
  ORDER BY target_id, created_at DESC, id DESC
)
UPDATE public.user_roles AS membership
SET vendor_suspended_at = latest.created_at,
    vendor_suspended_by = latest.actor_id,
    vendor_suspension_reason = left(coalesce(latest.reason, 'Previous administrator suspension'), 1000)
FROM latest_vendor_access_action AS latest
WHERE membership.role = 'vendor'
  AND NOT membership.is_active
  AND membership.vendor_suspended_at IS NULL
  AND membership.user_id::text = latest.target_id
  AND latest.action = 'user_workspace_suspended';

ALTER TABLE public.admin_invitations
  ADD COLUMN IF NOT EXISTS requires_password_setup boolean NOT NULL DEFAULT false;

UPDATE public.admin_invitations
SET requires_password_setup = true
FROM auth.users AS invited_user
WHERE public.admin_invitations.target_user_id = invited_user.id
  AND invited_user.email_confirmed_at IS NULL
  AND invited_user.invited_at IS NOT NULL
  AND COALESCE(invited_user.encrypted_password, '') = ''
  AND public.admin_invitations.accepted_at IS NULL
  AND public.admin_invitations.revoked_at IS NULL
  AND public.admin_invitations.expired_at IS NULL
  AND NOT public.admin_invitations.requires_password_setup;

-- Replace the legacy app.vendor_claim GUC bypass. Client-settable PostgreSQL
-- settings are not authorization. Sensitive vendor-profile transitions now
-- require a transaction-bound audit intent created by the protected claim or
-- moderation RPC; ordinary owners can still edit business/profile fields.
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
    SELECT 1 FROM public.admin_audit_log AS audit
    WHERE audit.target_type = 'vendor_profile'
      AND audit.target_id = OLD.id::text
      AND audit.actor_id IS NOT DISTINCT FROM auth.uid()
      AND audit.request_id = 'vendor-profile-change:' || txid_current()::text
      AND audit.before_data->>'approval_status' IS NOT DISTINCT FROM OLD.approval_status
      AND audit.before_data->>'is_published' IS NOT DISTINCT FROM OLD.is_published::text
      AND audit.after_data->>'approval_status' IS NOT DISTINCT FROM NEW.approval_status
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

-- Keep vendor moderation permission-checked and write its status intent before
-- the row update so the BEFORE trigger can authorize only this exact transition.
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
  next_approval_status text;
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
    next_approval_status := 'approved'; next_is_published := true;
  ELSIF p_action = 'reject' THEN
    next_approval_status := 'rejected'; next_is_published := false;
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
          jsonb_build_object('approval_status', prior.approval_status, 'is_published', prior.is_published),
          jsonb_build_object('approval_status', next_approval_status, 'is_published', next_is_published),
          'vendor-profile-change:' || txid_current()::text);

  UPDATE public.vendor_profiles
  SET approval_status = next_approval_status, is_published = next_is_published, updated_at = now()
  WHERE id = p_vendor_profile_id
  RETURNING * INTO updated;
  RETURN jsonb_build_object('id', updated.id, 'approval_status', updated.approval_status,
    'is_published', updated.is_published);
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_vendor_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_profile(uuid, text, text) TO authenticated;

-- Existing verified identities receive the base Customer membership if it is
-- missing. Existing inactive memberships are intentionally left unchanged.
INSERT INTO public.user_roles(user_id, role, is_active)
SELECT u.id, 'customer', true
FROM auth.users AS u
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.user_roles AS membership
SET is_active = false
FROM auth.users AS u
WHERE membership.user_id = u.id AND membership.role = 'customer'
  AND u.email_confirmed_at IS NULL AND membership.is_active;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, email, phone, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''), 'customer')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.user_roles(user_id, role, is_active)
  VALUES (NEW.id, 'customer', NEW.email_confirmed_at IS NOT NULL)
  ON CONFLICT (user_id, role) DO UPDATE
    SET is_active = public.user_roles.is_active OR EXCLUDED.is_active;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_customer_after_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role, is_active)
    VALUES (NEW.id, 'customer', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

    IF EXISTS (
      SELECT 1 FROM public.vendor_profiles AS vendor
      WHERE vendor.user_id = NEW.id
        AND vendor.approval_status = 'approved' AND vendor.is_published
    ) THEN
      INSERT INTO public.user_roles(user_id, role, is_active)
      VALUES (NEW.id, 'vendor', true)
      ON CONFLICT (user_id, role) DO UPDATE
        SET is_active = (public.user_roles.vendor_suspended_at IS NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evntora_customer_email_verified ON auth.users;
CREATE TRIGGER evntora_customer_email_verified
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.activate_customer_after_email_verification();

-- Vendor membership represents approval, not merely application submission.
-- Keep the existing trigger name/function contract used by migration 007.
CREATE OR REPLACE FUNCTION public.grant_vendor_role_for_owned_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.is_published AND EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = NEW.user_id AND u.email_confirmed_at IS NOT NULL
  ) THEN
    INSERT INTO public.user_roles(user_id, role, is_active)
    VALUES (NEW.user_id, 'vendor', true)
    ON CONFLICT (user_id, role) DO UPDATE
      SET is_active = (public.user_roles.vendor_suspended_at IS NULL);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_vendor_membership_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.is_published AND EXISTS (
    SELECT 1 FROM auth.users AS u WHERE u.id = NEW.user_id AND u.email_confirmed_at IS NOT NULL
  ) THEN
    -- Do not reactivate a manually suspended membership during an unrelated
    -- profile edit. Approval/publication transitions below are the grant point.
    IF OLD.approval_status IS DISTINCT FROM 'approved' OR NOT OLD.is_published THEN
      INSERT INTO public.user_roles(user_id, role, is_active)
      VALUES (NEW.user_id, 'vendor', true)
      ON CONFLICT (user_id, role) DO UPDATE
        SET is_active = (public.user_roles.vendor_suspended_at IS NULL);
    END IF;
  ELSE
    UPDATE public.user_roles SET is_active = false
    WHERE user_id = NEW.user_id AND role = 'vendor';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evntora_vendor_membership_sync ON public.vendor_profiles;
CREATE TRIGGER evntora_vendor_membership_sync
AFTER UPDATE OF approval_status, is_published ON public.vendor_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_membership_after_approval();

-- Keep the legacy verified-listing claim RPC from granting Vendor access unless
-- the claimed profile is approved, published and email-verified. An explicit
-- membership suspension remains in force until an administrator restores it.
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(
  p_vendor_id uuid, p_confirm_role_change boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  claimed_id uuid;
  profile_row public.vendor_profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A verified email account is required' USING ERRCODE = '42501';
  END IF;
  IF p_confirm_role_change IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Explicit listing claim confirmation is required' USING ERRCODE = '42501';
  END IF;
  IF public.has_evntora_role('admin') THEN
    RAISE EXCEPTION 'Administrator accounts cannot claim vendor listings' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles AS membership
    WHERE membership.user_id = auth.uid()
      AND membership.role IN ('customer', 'vendor') AND membership.is_active
  ) THEN
    RAISE EXCEPTION 'Customer or vendor membership is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO profile_row
  FROM public.vendor_profiles
  WHERE id = p_vendor_id AND user_id IS NULL AND claimed_by IS NULL
    AND approval_status = 'approved' AND is_published
    AND contact_email IS NOT NULL
    AND lower(contact_email) = (SELECT lower(u.email) FROM auth.users AS u WHERE u.id = auth.uid())
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This listing cannot be claimed by this account' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data, request_id)
  VALUES (auth.uid(), 'vendor_profile_claimed', 'vendor_profile', p_vendor_id::text,
          'Verified owner claimed an approved vendor profile.',
          jsonb_build_object('user_id', profile_row.user_id, 'approval_status', profile_row.approval_status,
            'is_published', profile_row.is_published),
          jsonb_build_object('user_id', auth.uid(), 'claimed_by', auth.uid(),
            'approval_status', profile_row.approval_status, 'is_published', profile_row.is_published),
          'vendor-profile-change:' || txid_current()::text);

  UPDATE public.vendor_profiles
  SET user_id = auth.uid(), claimed_by = auth.uid(),
      claim_verified_at = now(), claim_requested_at = now()
  WHERE id = profile_row.id AND user_id IS NULL AND claimed_by IS NULL
  RETURNING id INTO claimed_id;
  IF claimed_id IS NULL THEN
    RAISE EXCEPTION 'This listing cannot be claimed by this account' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles(user_id, role, is_active)
  VALUES (auth.uid(), 'vendor', true)
  ON CONFLICT (user_id, role) DO UPDATE
    SET is_active = (public.user_roles.vendor_suspended_at IS NULL);
  RETURN claimed_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid, boolean) TO authenticated;

-- Reconcile existing memberships to their authoritative vendor approval state.
UPDATE public.user_roles AS membership
SET is_active = false
WHERE membership.role = 'vendor' AND membership.is_active
  AND NOT EXISTS (
    SELECT 1 FROM public.vendor_profiles AS vendor
    JOIN auth.users AS u ON u.id = vendor.user_id
    WHERE vendor.user_id = membership.user_id
      AND vendor.approval_status = 'approved' AND vendor.is_published
      AND u.email_confirmed_at IS NOT NULL
  );

INSERT INTO public.user_roles(user_id, role, is_active)
SELECT vendor.user_id, 'vendor', true
FROM public.vendor_profiles AS vendor
JOIN auth.users AS u ON u.id = vendor.user_id AND u.email_confirmed_at IS NOT NULL
WHERE vendor.approval_status = 'approved' AND vendor.is_published AND vendor.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Scoped administrators may restore an existing vendor membership only while
-- its vendor profile remains approved, published and email-verified. The
-- profile row is locked before the membership change so approval cannot race it.
CREATE OR REPLACE FUNCTION public.admin_set_user_role_active(
  p_user_id uuid, p_role text, p_active boolean, p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  prior_active boolean;
  prior_vendor_suspended_at timestamptz;
  clean_reason text := left(trim(coalesce(p_reason, '')), 1000);
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('user_manage')) THEN
    RAISE EXCEPTION 'User management permission required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('customer', 'vendor') OR p_user_id IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Only another customer or vendor membership may be changed' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'platform_owner') AND is_active
  ) THEN
    RAISE EXCEPTION 'Administrator access must be managed through Admin Management' USING ERRCODE = '42501';
  END IF;
  IF p_active IS NULL OR (NOT p_active AND length(clean_reason) < 3) THEN
    RAISE EXCEPTION 'A reason is required to suspend workspace access' USING ERRCODE = '22023';
  END IF;

  IF p_role = 'vendor' AND p_active THEN
    PERFORM 1 FROM public.vendor_profiles
    WHERE user_id = p_user_id AND approval_status = 'approved' AND is_published
    FOR UPDATE;
    IF NOT FOUND OR NOT EXISTS (
      SELECT 1 FROM auth.users AS u WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Vendor access requires an email-verified, approved and published vendor profile' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT is_active, vendor_suspended_at
  INTO prior_active, prior_vendor_suspended_at
  FROM public.user_roles WHERE user_id = p_user_id AND role = p_role FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User workspace membership not found' USING ERRCODE = 'P0002'; END IF;
  IF prior_active = p_active AND (
    p_role <> 'vendor'
    OR (p_active AND prior_vendor_suspended_at IS NULL)
    OR (NOT p_active AND prior_vendor_suspended_at IS NOT NULL)
  ) THEN RETURN true; END IF;
  UPDATE public.user_roles
  SET is_active = p_active,
      granted_by = CASE WHEN p_active THEN auth.uid() ELSE granted_by END,
      vendor_suspended_at = CASE
        WHEN p_role <> 'vendor' THEN vendor_suspended_at
        WHEN p_active THEN NULL
        ELSE coalesce(vendor_suspended_at, now())
      END,
      vendor_suspended_by = CASE
        WHEN p_role <> 'vendor' THEN vendor_suspended_by
        WHEN p_active THEN NULL
        ELSE coalesce(vendor_suspended_by, auth.uid())
      END,
      vendor_suspension_reason = CASE
        WHEN p_role <> 'vendor' THEN vendor_suspension_reason
        WHEN p_active THEN NULL
        ELSE coalesce(vendor_suspension_reason, clean_reason)
      END
  WHERE user_id = p_user_id AND role = p_role;

  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, reason, before_data, after_data)
  VALUES (auth.uid(), CASE WHEN p_active THEN 'user_workspace_reactivated' ELSE 'user_workspace_suspended' END,
          'user_role', p_user_id::text, CASE WHEN p_active THEN NULL ELSE clean_reason END,
          jsonb_build_object('role', p_role, 'is_active', prior_active,
            'vendor_suspended_at', prior_vendor_suspended_at),
          jsonb_build_object('role', p_role, 'is_active', p_active,
            'vendor_suspended_at', CASE WHEN p_role = 'vendor' AND NOT p_active THEN coalesce(prior_vendor_suspended_at, now()) ELSE NULL END));
  INSERT INTO public.user_notifications(user_id, event_type, title, body, entity_type, entity_id, dedupe_key)
  VALUES (p_user_id,
          CASE WHEN p_active THEN 'workspace_access_restored' ELSE 'workspace_access_suspended' END,
          CASE WHEN p_active THEN 'Workspace access restored' ELSE 'Workspace access suspended' END,
          CASE WHEN p_active THEN 'Your ' || p_role || ' workspace access has been restored.'
               ELSE 'Your ' || p_role || ' workspace access was suspended. Contact Evntora support if you need assistance.' END,
          'user_role', p_role || ':' || p_user_id::text,
          'workspace-access:' || p_role || ':' || p_user_id::text || ':' || p_active::text || ':' || clock_timestamp()::text)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_role_active(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role_active(uuid, text, boolean, text) TO authenticated;

-- An invitation for a new identity cannot activate Admin until the verified
-- recipient has established a password through the server-side activation API.
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_email text;
  invited_role text;
  issuer uuid;
  setup_required boolean;
BEGIN
  SELECT lower(u.email) INTO current_email
  FROM auth.users AS u
  WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF current_email IS NULL THEN RETURN false; END IF;

  SELECT i.admin_role, i.invited_by, i.requires_password_setup
  INTO invited_role, issuer, setup_required
  FROM public.admin_invitations AS i
  WHERE i.id = p_invitation_id
    AND lower(i.email) = current_email
    AND (i.target_user_id IS NULL OR i.target_user_id = auth.uid())
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expired_at IS NULL
    AND i.expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS owner_role
      WHERE owner_role.user_id = i.invited_by
        AND owner_role.role = 'platform_owner' AND owner_role.is_active
    )
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF setup_required AND NOT EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE u.id = auth.uid()
      AND u.raw_app_meta_data->>'evntora_admin_activation_invitation' = p_invitation_id::text
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.admin_invitations
  SET accepted_at = now(), target_user_id = auth.uid()
  WHERE id = p_invitation_id AND accepted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO public.user_roles(user_id, role, granted_by)
  VALUES (auth.uid(), 'admin', issuer)
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true, granted_by = EXCLUDED.granted_by;

  INSERT INTO public.admin_role_assignments(user_id, admin_role, granted_by)
  VALUES (auth.uid(), invited_role, issuer)
  ON CONFLICT (user_id, admin_role) DO UPDATE
    SET is_active = true, granted_by = EXCLUDED.granted_by, updated_at = now();

  IF setup_required THEN
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data - 'evntora_admin_activation_invitation'
    WHERE id = auth.uid();
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_admin_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_customer_after_email_verification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_vendor_role_for_owned_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_vendor_membership_after_approval() FROM PUBLIC, anon, authenticated;
