-- Phase 6 closure: make support-case creation participant-safe and support
-- persisted review/listing reports without introducing a parallel case system.
-- Remove broad profile UPDATE for scoped verification admins. Profile moderation
-- below exposes only the explicitly approved moderation fields.
DROP POLICY IF EXISTS "vendor_profiles: admin update all" ON public.vendor_profiles;
DROP POLICY IF EXISTS vendor_documents_admin_update ON public.vendor_verification_documents;

ALTER TABLE public.support_cases
  ADD COLUMN IF NOT EXISTS case_type text NOT NULL DEFAULT 'support'
    CHECK (case_type IN ('support','review_report','listing_report','booking_complaint')),
  ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES public.vendor_reviews(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.vendor_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS internal_notes text;

CREATE INDEX IF NOT EXISTS support_cases_type_queue_idx
  ON public.support_cases(case_type,status,created_at DESC);
CREATE INDEX IF NOT EXISTS support_cases_review_idx ON public.support_cases(review_id) WHERE review_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS support_cases_listing_idx ON public.support_cases(listing_id) WHERE listing_id IS NOT NULL;

-- Reviews remain visible through existing public listing queries unless an
-- authorized support administrator places them in a reversible hidden state.
ALTER TABLE public.vendor_reviews
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'published'
    CHECK (moderation_status IN ('published','hidden'));
GRANT SELECT (moderation_status) ON public.vendor_reviews TO authenticated;
DROP POLICY IF EXISTS vendor_reviews_public_read ON public.vendor_reviews;
CREATE POLICY vendor_reviews_public_read ON public.vendor_reviews FOR SELECT TO anon,authenticated
  USING (moderation_status='published' AND EXISTS (
    SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=vendor_profile_id AND vp.approval_status='approved' AND vp.is_published
  ));

CREATE OR REPLACE FUNCTION public.moderate_vendor_review(p_review_id uuid,p_action text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE before_row public.vendor_reviews%ROWTYPE; after_row public.vendor_reviews%ROWTYPE;
BEGIN
  IF NOT (public.is_evntora_admin() OR public.has_admin_permission('support_read')) THEN
    RAISE EXCEPTION 'Review moderation permission required' USING ERRCODE='42501';
  END IF;
  IF p_review_id IS NULL OR p_action IS NULL OR p_action NOT IN ('hide','restore') OR length(trim(COALESCE(p_reason,''))) < 3 OR length(p_reason)>1000 THEN
    RAISE EXCEPTION 'A valid moderation action and reason are required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO before_row FROM public.vendor_reviews WHERE id=p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found' USING ERRCODE='P0002'; END IF;
  UPDATE public.vendor_reviews SET moderation_status=CASE WHEN p_action='hide' THEN 'hidden' ELSE 'published' END
   WHERE id=p_review_id RETURNING * INTO after_row;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,target_id,reason,
    before_data,after_data)
  VALUES(auth.uid(),'vendor_review_'||p_action,'vendor_review',p_review_id::text,p_reason,
    jsonb_build_object('moderation_status',before_row.moderation_status),
    jsonb_build_object('moderation_status',after_row.moderation_status));
  RETURN jsonb_build_object('id',after_row.id,'moderation_status',after_row.moderation_status);
END $$;
REVOKE ALL ON FUNCTION public.moderate_vendor_review(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_vendor_review(uuid,text,text) TO authenticated;

-- Remove table-wide INSERT so clients cannot set workflow fields such as status,
-- assignment, resolution, or internal notes directly.
REVOKE INSERT ON public.support_cases FROM authenticated;
GRANT INSERT (reporter_id,reporter_role,booking_id,vendor_profile_id,subject,description,case_type,review_id,listing_id)
  ON public.support_cases TO authenticated;
DROP POLICY IF EXISTS support_cases_reporter_insert ON public.support_cases;
CREATE POLICY support_cases_reporter_insert ON public.support_cases FOR INSERT TO authenticated
WITH CHECK (
  reporter_id=auth.uid()
  AND status='open' AND assigned_admin_id IS NULL AND resolution IS NULL AND resolved_at IS NULL
  AND internal_notes IS NULL
  AND (
    (reporter_role='customer' AND public.has_evntora_role('customer')
      AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND b.customer_id=auth.uid()))
      AND (vendor_profile_id IS NULL
        OR (booking_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND b.customer_id=auth.uid() AND b.vendor_profile_id=vendor_profile_id))
        OR (review_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.vendor_reviews r WHERE r.id=review_id AND r.vendor_profile_id=vendor_profile_id))
        OR (listing_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.vendor_listings l WHERE l.id=listing_id AND l.vendor_profile_id=vendor_profile_id AND l.status='published')))
      AND ((case_type='support' AND review_id IS NULL AND listing_id IS NULL)
        OR (case_type='booking_complaint' AND booking_id IS NOT NULL AND review_id IS NULL AND listing_id IS NULL)
        OR (case_type='review_report' AND review_id IS NOT NULL AND listing_id IS NULL)
        OR (case_type='listing_report' AND listing_id IS NOT NULL AND review_id IS NULL))
      AND (review_id IS NULL OR EXISTS (SELECT 1 FROM public.vendor_reviews r WHERE r.id=review_id AND r.vendor_profile_id=vendor_profile_id))
      AND (listing_id IS NULL OR EXISTS (SELECT 1 FROM public.vendor_listings l WHERE l.id=listing_id AND l.vendor_profile_id=vendor_profile_id))
    )
    OR
    (reporter_role='vendor' AND public.has_evntora_role('vendor')
      AND vendor_profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.vendor_profiles v WHERE v.id=vendor_profile_id AND v.user_id=auth.uid())
      AND (booking_id IS NULL OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND b.vendor_profile_id=vendor_profile_id))
      AND (case_type='support' OR (case_type='booking_complaint' AND booking_id IS NOT NULL))
      AND review_id IS NULL AND listing_id IS NULL
    )
  )
);

-- Keep internal notes private to authorized support administrators.
GRANT UPDATE(internal_notes) ON public.support_cases TO authenticated;
