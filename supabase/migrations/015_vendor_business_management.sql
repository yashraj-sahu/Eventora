-- Phase 5 vendor business records. Additive only; migrations 001-014 are unchanged.

CREATE TABLE IF NOT EXISTS public.vendor_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  vendor_service_id uuid REFERENCES public.vendor_services(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  category text NOT NULL CHECK (length(trim(category)) BETWEEN 2 AND 120),
  subcategory text,
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  pricing_model text NOT NULL DEFAULT 'fixed' CHECK (pricing_model IN ('fixed','starting_at','custom_quote')),
  starting_price bigint CHECK (starting_price IS NULL OR starting_price >= 0),
  capacity integer CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 100000),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 10080),
  booking_requirements text CHECK (booking_requirements IS NULL OR length(booking_requirements) <= 3000),
  terms text CHECK (terms IS NULL OR length(terms) <= 5000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','published','rejected','archived')),
  moderation_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_listings_vendor_status_idx ON public.vendor_listings(vendor_profile_id,status);

CREATE TABLE IF NOT EXISTS public.vendor_listing_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.vendor_listings(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 160),
  description text CHECK (description IS NULL OR length(description) <= 1000),
  price bigint NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_listing_addons_listing_idx ON public.vendor_listing_addons(listing_id,is_active);

CREATE TABLE IF NOT EXISTS public.vendor_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 2 AND 120),
  region text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_profile_id,city,region)
);

CREATE TABLE IF NOT EXISTS public.vendor_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (length(trim(document_type)) BETWEEN 2 AND 80),
  storage_path text NOT NULL UNIQUE CHECK (storage_path ~ ('^' || vendor_profile_id::text || '/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 1000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS vendor_verification_documents_vendor_idx ON public.vendor_verification_documents(vendor_profile_id,status);

CREATE TABLE IF NOT EXISTS public.vendor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL CHECK (length(trim(review_text)) BETWEEN 2 AND 2000),
  vendor_response text CHECK (vendor_response IS NULL OR length(vendor_response) <= 2000),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendor_reviews_booking_participant_fk CHECK (customer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS vendor_reviews_vendor_created_idx ON public.vendor_reviews(vendor_profile_id,created_at DESC);

-- A cancellation request continues to reserve the date until its cancellation is finalized.
CREATE OR REPLACE FUNCTION public.set_vendor_availability(p_vendor_id uuid,p_date date,p_status text,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE vendor_row public.vendor_profiles%ROWTYPE; availability_row public.vendor_availability%ROWTYPE;
BEGIN
  IF NOT (auth.uid() IS NOT DISTINCT FROM p_vendor_id) THEN RAISE EXCEPTION 'Availability may only be changed by the authenticated vendor owner' USING ERRCODE='42501'; END IF;
  IF p_vendor_id IS NULL THEN RAISE EXCEPTION 'Vendor owner is required' USING ERRCODE='42501'; END IF;
  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE user_id=p_vendor_id AND approval_status='approved' AND is_published FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approved vendor profile not found' USING ERRCODE='42501'; END IF;
  IF vendor_row.user_id IS DISTINCT FROM p_vendor_id THEN RAISE EXCEPTION 'Availability may only be changed by the vendor profile owner' USING ERRCODE='42501'; END IF;
  IF p_date < current_date OR p_date > current_date + 730 OR p_status NOT IN ('available','unavailable','blocked') OR length(COALESCE(p_note,'')) > 500 THEN
    RAISE EXCEPTION 'Availability update is invalid' USING ERRCODE='22023';
  END IF;
  IF p_status IN ('unavailable','blocked') AND EXISTS (
    SELECT 1 FROM public.bookings WHERE vendor_profile_id=vendor_row.id AND event_date=p_date
      AND status IN ('awaiting_payment','confirmed','in_progress','cancellation_requested')
  ) THEN RAISE EXCEPTION 'An active booking reserves this date' USING ERRCODE='23P01'; END IF;
  INSERT INTO public.vendor_availability(vendor_profile_id,available_date,status,note)
    VALUES (vendor_row.id,p_date,p_status,nullif(trim(COALESCE(p_note,'')),''))
    ON CONFLICT (vendor_profile_id,available_date) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=now()
    RETURNING * INTO availability_row;
  RETURN jsonb_build_object('id',availability_row.id,'date',availability_row.available_date,'status',availability_row.status,'note',availability_row.note);
END; $$;
REVOKE ALL ON FUNCTION
  public.set_vendor_availability(uuid, date, text, text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.set_vendor_availability(uuid, date, text, text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_vendor_listing_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF public.has_evntora_role('admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft','pending_approval') THEN RAISE EXCEPTION 'Listings must be submitted for review before publication' USING ERRCODE='42501'; END IF;
    IF NEW.status = 'pending_approval' THEN NEW.submitted_at := now(); END IF;
    NEW.moderation_note := NULL;
    NEW.reviewed_at := NULL;
    IF NEW.vendor_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendor_services vs WHERE vs.id=NEW.vendor_service_id AND vs.vendor_profile_id=NEW.vendor_profile_id) THEN RAISE EXCEPTION 'The linked booking service belongs to another business' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'archived' THEN RAISE EXCEPTION 'Only an administrator can archive listings' USING ERRCODE='42501'; END IF;
  IF NEW.status = 'published' AND OLD.status <> 'published' THEN RAISE EXCEPTION 'Only an administrator can publish listings' USING ERRCODE='42501'; END IF;
  IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN RAISE EXCEPTION 'Only an administrator can reject a listing' USING ERRCODE='42501'; END IF;
  IF NEW.vendor_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.vendor_services vs WHERE vs.id=NEW.vendor_service_id AND vs.vendor_profile_id=NEW.vendor_profile_id) THEN RAISE EXCEPTION 'The linked booking service belongs to another business' USING ERRCODE='42501'; END IF;
  IF OLD.status = 'published' AND (NEW.name,NEW.category,NEW.subcategory,NEW.description,NEW.pricing_model,NEW.starting_price,NEW.capacity,NEW.duration_minutes,NEW.booking_requirements,NEW.terms)
      IS DISTINCT FROM (OLD.name,OLD.category,OLD.subcategory,OLD.description,OLD.pricing_model,OLD.starting_price,OLD.capacity,OLD.duration_minutes,OLD.booking_requirements,OLD.terms) THEN
    NEW.status := 'pending_approval';
    NEW.submitted_at := now();
  ELSIF NEW.status = 'pending_approval' AND OLD.status <> 'pending_approval' THEN
    NEW.submitted_at := now();
  END IF;
  NEW.moderation_note := OLD.moderation_note;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS vendor_listing_moderation_guard ON public.vendor_listings;
CREATE TRIGGER vendor_listing_moderation_guard BEFORE INSERT OR UPDATE ON public.vendor_listings FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_listing_moderation();

-- Keep the bookable vendor_service synchronized atomically with listing publication.
CREATE OR REPLACE FUNCTION public.sync_vendor_listing_service()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.vendor_service_id IS NOT NULL THEN
    UPDATE public.vendor_services
       SET is_active=(NEW.status='published'),name=NEW.name,description=nullif(NEW.description,''),updated_at=now()
     WHERE id=NEW.vendor_service_id AND vendor_profile_id=NEW.vendor_profile_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked vendor service is unavailable' USING ERRCODE='23503'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS vendor_listing_service_sync ON public.vendor_listings;
CREATE TRIGGER vendor_listing_service_sync AFTER INSERT OR UPDATE OF vendor_service_id,status,name,description ON public.vendor_listings FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_listing_service();

-- Add-on changes affect a published offer, so force it back through review.
CREATE OR REPLACE FUNCTION public.require_vendor_listing_addon_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE target_listing uuid;
BEGIN
  IF public.has_evntora_role('admin') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP='DELETE' THEN target_listing := OLD.listing_id; ELSE target_listing := NEW.listing_id; END IF;
  UPDATE public.vendor_listings SET status='pending_approval',submitted_at=now()
   WHERE id=target_listing AND status='published';
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
DROP TRIGGER IF EXISTS vendor_listing_addon_review_guard ON public.vendor_listing_addons;
CREATE TRIGGER vendor_listing_addon_review_guard AFTER INSERT OR UPDATE OR DELETE ON public.vendor_listing_addons FOR EACH ROW EXECUTE FUNCTION public.require_vendor_listing_addon_review();

CREATE OR REPLACE FUNCTION public.moderate_vendor_listing(p_listing_id uuid,p_action text,p_reason text DEFAULT NULL)
RETURNS public.vendor_listings LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public AS $$
DECLARE listing_row public.vendor_listings%ROWTYPE;
BEGIN
  IF NOT public.is_evntora_admin() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('approve','reject') OR length(COALESCE(p_reason,'')) > 1000 OR (p_action='reject' AND length(trim(COALESCE(p_reason,'')))=0) THEN
    RAISE EXCEPTION 'Invalid listing review decision' USING ERRCODE='22023';
  END IF;
  SELECT * INTO listing_row FROM public.vendor_listings WHERE id=p_listing_id FOR UPDATE;
  IF NOT FOUND OR listing_row.status <> 'pending_approval' THEN RAISE EXCEPTION 'Pending listing not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.vendor_listings SET status=CASE WHEN p_action='approve' THEN 'published' ELSE 'rejected' END,
    moderation_note=CASE WHEN p_action='reject' THEN trim(p_reason) ELSE NULL END,reviewed_at=now(),updated_at=now()
    WHERE id=p_listing_id RETURNING * INTO listing_row;
  RETURN listing_row;
END; $$;
REVOKE ALL ON FUNCTION public.moderate_vendor_listing(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_listing(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_vendor_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE booking_row public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id=NEW.booking_id;
  IF NOT FOUND OR booking_row.customer_id <> NEW.customer_id OR booking_row.vendor_profile_id <> NEW.vendor_profile_id OR booking_row.status <> 'completed' THEN
    RAISE EXCEPTION 'A review requires a completed booking owned by the customer' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS vendor_review_eligibility_guard ON public.vendor_reviews;
CREATE TRIGGER vendor_review_eligibility_guard BEFORE INSERT ON public.vendor_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_review();

CREATE OR REPLACE FUNCTION public.guard_vendor_review_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.id,NEW.vendor_profile_id,NEW.booking_id,NEW.customer_id,NEW.rating,NEW.review_text,NEW.created_at)
      IS DISTINCT FROM (OLD.id,OLD.vendor_profile_id,OLD.booking_id,OLD.customer_id,OLD.rating,OLD.review_text,OLD.created_at) THEN
    RAISE EXCEPTION 'Review content is immutable after submission' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.vendor_profiles WHERE id=OLD.vendor_profile_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Only the assigned vendor can respond to a review' USING ERRCODE='42501';
  END IF;
  NEW.responded_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS vendor_review_response_guard ON public.vendor_reviews;
CREATE TRIGGER vendor_review_response_guard BEFORE UPDATE ON public.vendor_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_vendor_review_response();

ALTER TABLE public.vendor_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_listing_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_listings_public_read ON public.vendor_listings;
CREATE POLICY vendor_listings_public_read ON public.vendor_listings FOR SELECT TO anon,authenticated USING (status='published' AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.approval_status='approved' AND vp.is_published));
DROP POLICY IF EXISTS vendor_listings_owner_manage ON public.vendor_listings;
CREATE POLICY vendor_listings_owner_manage ON public.vendor_listings FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()) AND status IN ('draft','pending_approval','rejected'));
DROP POLICY IF EXISTS vendor_listings_admin_manage ON public.vendor_listings;
CREATE POLICY vendor_listings_admin_manage ON public.vendor_listings FOR ALL TO authenticated USING (public.has_evntora_role('admin')) WITH CHECK (public.has_evntora_role('admin'));

DROP POLICY IF EXISTS vendor_listing_addons_public_read ON public.vendor_listing_addons;
CREATE POLICY vendor_listing_addons_public_read ON public.vendor_listing_addons FOR SELECT TO anon,authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.vendor_listings vl JOIN public.vendor_profiles vp ON vp.id=vl.vendor_profile_id WHERE vl.id=listing_id AND vl.status='published' AND vp.approval_status='approved' AND vp.is_published));
DROP POLICY IF EXISTS vendor_listing_addons_owner_manage ON public.vendor_listing_addons;
CREATE POLICY vendor_listing_addons_owner_manage ON public.vendor_listing_addons FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_listings vl JOIN public.vendor_profiles vp ON vp.id=vl.vendor_profile_id WHERE vl.id=listing_id AND vp.user_id=auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_listings vl JOIN public.vendor_profiles vp ON vp.id=vl.vendor_profile_id WHERE vl.id=listing_id AND vp.user_id=auth.uid()));
DROP POLICY IF EXISTS vendor_listing_addons_admin_manage ON public.vendor_listing_addons;
CREATE POLICY vendor_listing_addons_admin_manage ON public.vendor_listing_addons FOR ALL TO authenticated USING (public.has_evntora_role('admin')) WITH CHECK (public.has_evntora_role('admin'));

DROP POLICY IF EXISTS vendor_service_areas_public_read ON public.vendor_service_areas;
CREATE POLICY vendor_service_areas_public_read ON public.vendor_service_areas FOR SELECT TO anon,authenticated USING (EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.approval_status='approved' AND vp.is_published));
DROP POLICY IF EXISTS vendor_service_areas_owner_manage ON public.vendor_service_areas;
CREATE POLICY vendor_service_areas_owner_manage ON public.vendor_service_areas FOR ALL TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()));

DROP POLICY IF EXISTS vendor_documents_owner_read ON public.vendor_verification_documents;
CREATE POLICY vendor_documents_owner_read ON public.vendor_verification_documents FOR SELECT TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()));
DROP POLICY IF EXISTS vendor_documents_owner_insert ON public.vendor_verification_documents;
CREATE POLICY vendor_documents_owner_insert ON public.vendor_verification_documents FOR INSERT TO authenticated WITH CHECK (public.has_evntora_role('vendor') AND status='pending' AND storage_path ~ ('^' || vendor_profile_id::text || '/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()));
DROP POLICY IF EXISTS vendor_documents_admin_manage ON public.vendor_verification_documents;
CREATE POLICY vendor_documents_admin_manage ON public.vendor_verification_documents FOR ALL TO authenticated USING (public.has_evntora_role('admin')) WITH CHECK (public.has_evntora_role('admin'));

DROP POLICY IF EXISTS vendor_reviews_public_read ON public.vendor_reviews;
CREATE POLICY vendor_reviews_public_read ON public.vendor_reviews FOR SELECT TO anon,authenticated USING (EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.approval_status='approved' AND vp.is_published));
DROP POLICY IF EXISTS vendor_reviews_owner_read ON public.vendor_reviews;
CREATE POLICY vendor_reviews_owner_read ON public.vendor_reviews FOR SELECT TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()));
DROP POLICY IF EXISTS vendor_reviews_customer_read ON public.vendor_reviews;
CREATE POLICY vendor_reviews_customer_read ON public.vendor_reviews FOR SELECT TO authenticated USING (public.has_evntora_role('customer') AND customer_id=auth.uid());
DROP POLICY IF EXISTS vendor_reviews_customer_insert ON public.vendor_reviews;
CREATE POLICY vendor_reviews_customer_insert ON public.vendor_reviews FOR INSERT TO authenticated WITH CHECK (public.has_evntora_role('customer') AND customer_id=auth.uid());
DROP POLICY IF EXISTS vendor_reviews_vendor_response ON public.vendor_reviews;
CREATE POLICY vendor_reviews_vendor_response ON public.vendor_reviews FOR UPDATE TO authenticated USING (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid())) WITH CHECK (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.user_id=auth.uid()));

-- Public review reads are column-restricted: private customer and booking identifiers
-- are available only through an authenticated participant/admin-filtered view.
CREATE OR REPLACE VIEW public.vendor_reviews_participant WITH (security_barrier=true) AS
  SELECT vr.* FROM public.vendor_reviews vr
  WHERE (public.has_evntora_role('customer') AND vr.customer_id=auth.uid())
     OR (public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vr.vendor_profile_id AND vp.user_id=auth.uid()))
     OR public.is_evntora_admin();
REVOKE ALL ON public.vendor_reviews_participant FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vendor_reviews_participant TO authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('vendor-documents','vendor-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS vendor_documents_owner_upload ON storage.objects;
CREATE POLICY vendor_documents_owner_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='vendor-documents' AND public.has_evntora_role('vendor') AND name ~ ('^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text=split_part(name,'/',1) AND vp.user_id=auth.uid()));
DROP POLICY IF EXISTS vendor_documents_owner_read_storage ON storage.objects;
CREATE POLICY vendor_documents_owner_read_storage ON storage.objects FOR SELECT TO authenticated USING (bucket_id='vendor-documents' AND ((public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text=split_part(name,'/',1) AND vp.user_id=auth.uid())) OR public.has_evntora_role('admin')));
DROP POLICY IF EXISTS vendor_documents_owner_delete ON storage.objects;
DROP POLICY IF EXISTS vendor_documents_owner_update ON storage.objects;
CREATE POLICY vendor_documents_owner_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id='vendor-documents' AND public.has_evntora_role('vendor') AND EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id::text=split_part(name,'/',1) AND vp.user_id=auth.uid()));

GRANT SELECT,INSERT,UPDATE,DELETE ON public.vendor_listings,public.vendor_service_areas TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vendor_listing_addons TO authenticated;
GRANT SELECT ON public.vendor_listing_addons TO anon;
GRANT SELECT ON public.vendor_listings,public.vendor_service_areas TO anon;
REVOKE ALL ON public.vendor_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,vendor_profile_id,rating,review_text,vendor_response,responded_at,created_at) ON public.vendor_reviews TO anon,authenticated;
GRANT INSERT (booking_id,vendor_profile_id,customer_id,rating,review_text) ON public.vendor_reviews TO authenticated;
GRANT UPDATE (vendor_response) ON public.vendor_reviews TO authenticated;
REVOKE ALL ON public.vendor_verification_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vendor_verification_documents TO authenticated;
GRANT INSERT (vendor_profile_id,document_type,storage_path) ON public.vendor_verification_documents TO authenticated;
GRANT UPDATE (status,rejection_reason,reviewed_at) ON public.vendor_verification_documents TO authenticated;
