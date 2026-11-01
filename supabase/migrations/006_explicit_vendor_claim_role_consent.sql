-- Claiming a listing may promote a customer profile to vendor. Require explicit
-- consent at the trusted RPC boundary; never downgrade an administrator.
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(
  p_vendor_id uuid,
  p_confirm_role_change boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  claimed_id uuid;
  claimant_role public.user_role;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'A verified email account is required'; END IF;

  SELECT role INTO claimant_role FROM public.profiles WHERE id = auth.uid();
  IF claimant_role IS NULL OR claimant_role = 'admin' THEN
    RAISE EXCEPTION 'This account cannot claim a vendor listing';
  END IF;
  IF claimant_role = 'customer' AND p_confirm_role_change IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Explicit consent to switch this account to vendor is required';
  END IF;

  PERFORM set_config('app.vendor_claim', 'on', true);
  UPDATE public.vendor_profiles
    SET user_id = auth.uid(), claimed_by = auth.uid(), claim_verified_at = now(), claim_requested_at = now()
    WHERE id = p_vendor_id
  AND user_id IS NULL
  AND claimed_by IS NULL
  AND approval_status = 'approved'
  AND contact_email IS NOT NULL
  AND lower(contact_email) = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())
    RETURNING id INTO claimed_id;
  IF claimed_id IS NULL THEN RAISE EXCEPTION 'This listing cannot be claimed by this account'; END IF;

  IF claimant_role = 'customer' THEN
    UPDATE public.profiles SET role = 'vendor' WHERE id = auth.uid();
  END IF;
  RETURN claimed_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid, boolean) TO authenticated;

-- Keep the old RPC entry point compatible for already-vendor accounts. It cannot
-- change a customer role because consent defaults to false.
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(p_vendor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.claim_vendor_listing(p_vendor_id, false);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid) TO authenticated;