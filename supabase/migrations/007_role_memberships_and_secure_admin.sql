-- Authoritative account memberships. profiles.role remains for legacy display only.
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer','vendor','admin','platform_owner')),
  is_active boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Never repair duplicate owners automatically; stop so an operator can resolve them explicitly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE role = 'platform_owner'
    GROUP BY role HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple Platform Owner memberships exist; resolve them manually before applying migration 007';
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_single_platform_owner_idx
  ON public.user_roles(role) WHERE role = 'platform_owner';

-- Backfill ordinary memberships and repair vendor profiles whose profile role was incorrectly customer.
-- Legacy administrator rows require operator verification and are deliberately not promoted here.
INSERT INTO public.user_roles(user_id, role)
SELECT id, role::text FROM public.profiles WHERE role::text IN ('customer','vendor')
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.user_roles(user_id, role)
SELECT DISTINCT user_id, 'vendor' FROM public.vendor_profiles WHERE user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_evntora_role(p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.is_active AND (r.role = p_role OR (p_role = 'admin' AND r.role = 'platform_owner'))) $$;
CREATE OR REPLACE FUNCTION public.is_evntora_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_evntora_role('admin') $$;
CREATE OR REPLACE FUNCTION public.is_evntora_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'platform_owner' AND r.is_active) $$;
REVOKE ALL ON FUNCTION public.has_evntora_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_evntora_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_evntora_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_evntora_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_evntora_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_evntora_owner() TO authenticated;

-- Signup always receives customer membership. Public metadata never grants vendor/admin/owner.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, 'customer')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Creating a pending vendor-owned listing grants vendor membership atomically; approval stays admin-only.
CREATE OR REPLACE FUNCTION public.grant_vendor_role_for_owned_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() AND NEW.approval_status = 'pending' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.user_id, 'vendor') ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS vendor_profile_membership_grant ON public.vendor_profiles;
CREATE TRIGGER vendor_profile_membership_grant AFTER INSERT ON public.vendor_profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_vendor_role_for_owned_profile();

-- Verified listing claims add vendor membership and never replace customer access.
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(p_vendor_id uuid, p_confirm_role_change boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE claimed_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'A verified email account is required';
  END IF;
  IF p_confirm_role_change IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit listing claim confirmation is required'; END IF;
  IF public.has_evntora_role('admin') THEN RAISE EXCEPTION 'Administrator accounts cannot claim vendor listings'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('customer','vendor') AND is_active) THEN
    RAISE EXCEPTION 'Customer or vendor membership is required';
  END IF;
  PERFORM set_config('app.vendor_claim', 'on', true);
  UPDATE public.vendor_profiles SET user_id = auth.uid(), claimed_by = auth.uid(), claim_verified_at = now(), claim_requested_at = now()
  WHERE id = p_vendor_id AND user_id IS NULL AND claimed_by IS NULL AND approval_status = 'approved'
    AND contact_email IS NOT NULL AND lower(contact_email) = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())
  RETURNING id INTO claimed_id;
  IF claimed_id IS NULL THEN RAISE EXCEPTION 'This listing cannot be claimed by this account'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'vendor') ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  RETURN claimed_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(p_vendor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN public.claim_vendor_listing(p_vendor_id, false); END $$;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON public.admin_invitations(lower(email));
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner manages admin invitations" ON public.admin_invitations;
CREATE POLICY "owner manages admin invitations" ON public.admin_invitations FOR ALL TO authenticated
USING (public.is_evntora_owner()) WITH CHECK (public.is_evntora_owner());
REVOKE ALL ON public.admin_invitations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_invitation_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_email text;
BEGIN
  SELECT lower(email) INTO current_email FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF current_email IS NULL THEN RETURN false; END IF;
  UPDATE public.admin_invitations i SET accepted_at = now(), target_user_id = auth.uid()
  WHERE i.id = p_invitation_id AND lower(i.email) = current_email AND (i.target_user_id IS NULL OR i.target_user_id = auth.uid())
    AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
    AND EXISTS (SELECT 1 FROM public.user_roles owner_role WHERE owner_role.user_id = i.invited_by
      AND owner_role.role = 'platform_owner' AND owner_role.is_active);
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role, granted_by) SELECT auth.uid(), 'admin', i.invited_by
  FROM public.admin_invitations i WHERE i.id = p_invitation_id
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_admin_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enable_customer_access()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'customer') ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.enable_customer_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_customer_access() TO authenticated;

-- Owner membership management RPC safeguards the owner role and the final active owner.
CREATE OR REPLACE FUNCTION public.set_admin_membership(p_user_id uuid, p_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_role text;
  membership_updated boolean := false;
BEGIN
  IF NOT public.is_evntora_owner() THEN RAISE EXCEPTION 'owner access required'; END IF;
  IF p_user_id = auth.uid() AND public.is_evntora_owner() THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator management';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'platform_owner') THEN
    RAISE EXCEPTION 'Platform Owner membership cannot be changed through administrator management';
  END IF;
  SELECT role INTO target_role FROM public.user_roles WHERE user_id = p_user_id AND role IN ('admin','platform_owner') AND is_active;
  IF target_role = 'platform_owner' THEN RAISE EXCEPTION 'owner membership cannot be changed here'; END IF;
  IF NOT p_active THEN
    UPDATE public.user_roles SET is_active = false WHERE user_id = p_user_id AND role = 'admin';
    membership_updated := FOUND;
    -- Invalidate outstanding invitations to this account's verified address as part of revocation.
    UPDATE public.admin_invitations i SET revoked_at = now()
    FROM auth.users u
    WHERE u.id = p_user_id AND (i.target_user_id = p_user_id OR lower(i.email) = lower(u.email))
      AND i.accepted_at IS NULL AND i.revoked_at IS NULL;
  ELSE
    UPDATE public.user_roles SET is_active = true WHERE user_id = p_user_id AND role = 'admin';
    membership_updated := FOUND;
  END IF;
  RETURN membership_updated;
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_membership(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_membership(uuid,boolean) TO authenticated;

-- Replace legacy direct profiles.role admin checks in existing data policies.
DROP POLICY IF EXISTS "events: own select" ON public.events;
CREATE POLICY "events: own select" ON public.events FOR SELECT TO authenticated USING ((public.has_evntora_role('customer') AND auth.uid() = user_id) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "events: own insert" ON public.events;
CREATE POLICY "events: own insert" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_evntora_role('customer') AND auth.uid() = user_id);
DROP POLICY IF EXISTS "events: own update" ON public.events;
CREATE POLICY "events: own update" ON public.events FOR UPDATE TO authenticated USING ((public.has_evntora_role('customer') AND auth.uid() = user_id) OR public.is_evntora_admin()) WITH CHECK ((public.has_evntora_role('customer') AND auth.uid() = user_id) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "events: own delete" ON public.events;
CREATE POLICY "events: own delete" ON public.events FOR DELETE TO authenticated USING ((public.has_evntora_role('customer') AND auth.uid() = user_id) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "bookings: customer select" ON public.bookings;
CREATE POLICY "bookings: customer select" ON public.bookings FOR SELECT TO authenticated USING (
  (public.has_evntora_role('customer') AND auth.uid() = customer_id) OR (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles WHERE id = vendor_profile_id AND user_id = auth.uid())) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "bookings: customer insert" ON public.bookings;
CREATE POLICY "bookings: customer insert" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.has_evntora_role('customer') AND auth.uid() = customer_id);
DROP POLICY IF EXISTS "bookings: customer or vendor update" ON public.bookings;
CREATE POLICY "bookings: customer or vendor update" ON public.bookings FOR UPDATE TO authenticated USING (
  (public.has_evntora_role('customer') AND auth.uid() = customer_id) OR (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles WHERE id = vendor_profile_id AND user_id = auth.uid())) OR public.is_evntora_admin())
WITH CHECK ((public.has_evntora_role('customer') AND auth.uid() = customer_id) OR (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles WHERE id = vendor_profile_id AND user_id = auth.uid())) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "payments: select policy" ON public.payments;
CREATE POLICY "payments: select policy" ON public.payments FOR SELECT TO authenticated USING (
  (public.has_evntora_role('customer') AND auth.uid() = customer_id) OR (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.bookings b JOIN public.vendor_profiles vp ON vp.id = b.vendor_profile_id WHERE b.id = booking_id AND vp.user_id = auth.uid())) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "payments: customer insert" ON public.payments;
CREATE POLICY "payments: customer insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.has_evntora_role('customer') AND auth.uid() = customer_id);
DROP POLICY IF EXISTS "payments: admin update" ON public.payments;
CREATE POLICY "payments: admin update" ON public.payments FOR UPDATE TO authenticated USING (public.is_evntora_admin());
DROP POLICY IF EXISTS "payment_events: admin select" ON public.payment_events;
CREATE POLICY "payment_events: admin select" ON public.payment_events FOR SELECT TO authenticated USING (public.is_evntora_admin());
DROP POLICY IF EXISTS "refunds: select policy" ON public.refunds;
CREATE POLICY "refunds: select policy" ON public.refunds FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND ((public.has_evntora_role('customer') AND p.customer_id = auth.uid()) OR (public.has_evntora_role('vendor') AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.vendor_profiles vp ON vp.id = b.vendor_profile_id WHERE b.id = p.booking_id AND vp.user_id = auth.uid())))) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor_services: admin manage" ON public.vendor_services;
CREATE POLICY "vendor_services: admin manage" ON public.vendor_services FOR ALL TO authenticated USING (public.is_evntora_admin()) WITH CHECK (public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor_packages: admin manage" ON public.vendor_packages;
CREATE POLICY "vendor_packages: admin manage" ON public.vendor_packages FOR ALL TO authenticated USING (public.is_evntora_admin()) WITH CHECK (public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor_portfolio: admin manage" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: admin manage" ON public.vendor_portfolio FOR ALL TO authenticated USING (public.is_evntora_admin()) WITH CHECK (public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor saves owner access" ON public.vendor_saves;
CREATE POLICY "vendor saves owner access" ON public.vendor_saves FOR ALL TO authenticated USING (public.has_evntora_role('customer') AND user_id = auth.uid()) WITH CHECK (public.has_evntora_role('customer') AND user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_evntora_verified_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$ SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL) $$;
REVOKE ALL ON FUNCTION public.is_evntora_verified_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_evntora_verified_user() TO authenticated;
DROP POLICY IF EXISTS "vendor_profiles: self register" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: self register" ON public.vendor_profiles FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_evntora_verified_user() AND approval_status = 'pending' AND is_published = false
  AND is_featured = false AND is_verified = false AND claimed_by IS NULL);
DROP POLICY IF EXISTS "vendor_profiles: own update" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: own update" ON public.vendor_profiles FOR UPDATE TO authenticated USING (public.has_evntora_role('vendor') AND auth.uid() = user_id)
WITH CHECK (public.has_evntora_role('vendor') AND auth.uid() = user_id);
DROP POLICY IF EXISTS "vendor_services: own manage" ON public.vendor_services;
CREATE POLICY "vendor_services: own manage" ON public.vendor_services FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor_packages: own manage" ON public.vendor_packages;
CREATE POLICY "vendor_packages: own manage" ON public.vendor_packages FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor_portfolio: own manage" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: own manage" ON public.vendor_portfolio FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor portfolio storage owner insert" ON storage.objects;
CREATE POLICY "vendor portfolio storage owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vendor-portfolio' AND public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text = (storage.foldername(name))[1] AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor portfolio storage owner delete" ON storage.objects;
CREATE POLICY "vendor portfolio storage owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vendor-portfolio' AND public.has_evntora_role('vendor') AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text = (storage.foldername(name))[1] AND vp.user_id = auth.uid()));

DROP POLICY IF EXISTS "profiles: admin read all" ON public.profiles;
CREATE POLICY "profiles: admin read all" ON public.profiles FOR SELECT TO authenticated USING (public.is_evntora_admin());
DROP POLICY IF EXISTS "profiles: admin update all" ON public.profiles;
CREATE POLICY "profiles: admin update all" ON public.profiles FOR UPDATE TO authenticated USING (public.is_evntora_admin()) WITH CHECK (public.is_evntora_admin());

-- One-time first-owner bootstrap: run manually only after verifying the existing Auth user's email.
-- See delivery instructions; there is intentionally no public bootstrap endpoint.
