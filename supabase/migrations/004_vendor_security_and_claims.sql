-- Vendor system hardening. Apply after migrations 001-003.
-- This migration extends the existing vendor tables and preserves all rows.

DO $$ BEGIN
  ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'suspended';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS claim_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_verified_at timestamptz;
ALTER TABLE public.vendor_profiles ALTER COLUMN price_range DROP DEFAULT, ALTER COLUMN price_range DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.vendor_saves (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, vendor_profile_id)
);
ALTER TABLE public.vendor_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendor saves owner access" ON public.vendor_saves;
CREATE POLICY "vendor saves owner access" ON public.vendor_saves FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_evntora_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;

-- Do not trust signup metadata for administrator assignment. Existing profiles are untouched.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email,
    CASE WHEN NEW.raw_user_meta_data ->> 'role' = 'vendor' THEN 'vendor'::public.user_role ELSE 'customer'::public.user_role END)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_vendor_profile_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_evntora_admin() THEN RETURN NEW; END IF;
  IF current_setting('app.vendor_claim', true) = 'on' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to edit this vendor listing';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.claimed_by IS DISTINCT FROM OLD.claimed_by
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.claim_requested_at IS DISTINCT FROM OLD.claim_requested_at
     OR NEW.claim_verified_at IS DISTINCT FROM OLD.claim_verified_at THEN
    RAISE EXCEPTION 'Vendor approval and ownership fields are administrator managed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_vendor_profile_changes ON public.vendor_profiles;
CREATE TRIGGER guard_vendor_profile_changes BEFORE UPDATE ON public.vendor_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_profile_changes();

-- Claim succeeds only when the signed-in account has verified the exact contact email
-- recorded by an administrator for an unclaimed listing.
CREATE OR REPLACE FUNCTION public.claim_vendor_listing(p_vendor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE claimed_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'A verified email account is required'; END IF;
  PERFORM set_config('app.vendor_claim', 'on', true);
  UPDATE public.vendor_profiles
    SET user_id = auth.uid(), claimed_by = auth.uid(), claim_verified_at = now(), claim_requested_at = now()
    WHERE id = p_vendor_id AND user_id IS NULL AND claimed_by IS NULL
      AND contact_email IS NOT NULL
      AND lower(contact_email) = (SELECT lower(email) FROM auth.users WHERE id = auth.uid())
    RETURNING id INTO claimed_id;
  IF claimed_id IS NULL THEN RAISE EXCEPTION 'This listing cannot be claimed by this account'; END IF;
  UPDATE public.profiles SET role = 'vendor' WHERE id = auth.uid();
  RETURN claimed_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_vendor_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_vendor_listing(uuid) TO authenticated;

-- Keep vendor self-registration pending and prevent non-admins from changing publication.
DROP POLICY IF EXISTS "vendor_profiles: self register" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: self register" ON public.vendor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id AND approval_status = 'pending' AND is_published = false
  AND is_featured = false AND is_verified = false AND claimed_by IS NULL);

DROP POLICY IF EXISTS "vendor_profiles: own update" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: own update" ON public.vendor_profiles FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vendor_profiles: admin read all" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin read all" ON public.vendor_profiles FOR SELECT
USING (public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor_profiles: admin update all" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin update all" ON public.vendor_profiles FOR UPDATE
USING (public.is_evntora_admin()) WITH CHECK (public.is_evntora_admin());
DROP POLICY IF EXISTS "vendor_profiles: admin insert" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin insert" ON public.vendor_profiles FOR INSERT
WITH CHECK (public.is_evntora_admin());

-- Private bucket; read access is granted by row policy only for the owner, admin,
-- or a portfolio image belonging to an approved, published listing.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vendor-portfolio', 'vendor-portfolio', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Replace any older bucket-scoped policies so permissive legacy reads cannot
-- accidentally widen access. Policies for other buckets are left intact.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual, '') ILIKE '%vendor-portfolio%' OR coalesce(with_check, '') ILIKE '%vendor-portfolio%')
  LOOP EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname); END LOOP;
END $$;

DROP POLICY IF EXISTS "vendor portfolio storage owner insert" ON storage.objects;
DROP POLICY IF EXISTS "vendor portfolio storage public read" ON storage.objects;
CREATE POLICY "vendor portfolio storage public read" ON storage.objects FOR SELECT
USING (bucket_id = 'vendor-portfolio' AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text = (storage.foldername(name))[1]
    AND ((vp.approval_status = 'approved' AND vp.is_published = true)
      OR vp.user_id = auth.uid() OR public.is_evntora_admin())));
CREATE POLICY "vendor portfolio storage owner insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vendor-portfolio' AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text = (storage.foldername(name))[1]
    AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor portfolio storage owner delete" ON storage.objects;
CREATE POLICY "vendor portfolio storage owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'vendor-portfolio' AND EXISTS (
  SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text = (storage.foldername(name))[1]
    AND vp.user_id = auth.uid()));
DROP POLICY IF EXISTS "vendor portfolio storage admin manage" ON storage.objects;
CREATE POLICY "vendor portfolio storage admin manage" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'vendor-portfolio' AND public.is_evntora_admin())
WITH CHECK (bucket_id = 'vendor-portfolio' AND public.is_evntora_admin());
