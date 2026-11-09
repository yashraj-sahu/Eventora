-- Phase 4: extend the existing booking/payment model with availability,
-- versioned quotations, participant messages, status history and notifications.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS request_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS vendor_package_id uuid REFERENCES public.vendor_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_service_id uuid REFERENCES public.vendor_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requested_advance_percentage smallint NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS allow_partial_payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_quotation_id uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_advance_percentage_valid CHECK (requested_advance_percentage BETWEEN 1 AND 100),
  ADD CONSTRAINT bookings_paid_not_over_total CHECK (paid_amount >= 0 AND total_amount >= 0 AND paid_amount <= total_amount),
  ADD CONSTRAINT bookings_reasons_length CHECK (
    (rejection_reason IS NULL OR length(rejection_reason) <= 1000) AND
    (cancellation_reason IS NULL OR length(cancellation_reason) <= 1000)
  );

CREATE UNIQUE INDEX IF NOT EXISTS bookings_request_idempotency_unique
  ON public.bookings(customer_id, request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_vendor_date_lifecycle_idx
  ON public.bookings(vendor_profile_id, event_date, status);

CREATE TABLE IF NOT EXISTS public.vendor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'unavailable', 'blocked')),
  note text CHECK (note IS NULL OR length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vendor_profile_id, available_date)
);
CREATE INDEX IF NOT EXISTS vendor_availability_date_idx ON public.vendor_availability(vendor_profile_id, available_date);

CREATE TABLE IF NOT EXISTS public.booking_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_reference text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_profile_id uuid NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('sent', 'accepted', 'declined', 'revision_requested', 'superseded', 'withdrawn', 'expired')),
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  discount_amount bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  additional_charges bigint NOT NULL DEFAULT 0 CHECK (additional_charges >= 0),
  total_amount bigint NOT NULL CHECK (total_amount > 0),
  advance_percentage smallint NOT NULL CHECK (advance_percentage BETWEEN 1 AND 100),
  advance_amount bigint NOT NULL CHECK (advance_amount > 0),
  allow_partial_payments boolean NOT NULL DEFAULT false,
  payment_terms text NOT NULL CHECK (length(payment_terms) <= 2000),
  remaining_balance bigint NOT NULL CHECK (remaining_balance >= 0),
  valid_until date NOT NULL,
  description text CHECK (description IS NULL OR length(description) <= 2000),
  conditions text CHECK (conditions IS NULL OR length(conditions) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  accepted_at timestamptz,
  UNIQUE(booking_id, version),
  CHECK (advance_amount <= total_amount),
  CHECK (remaining_balance = total_amount - advance_amount)
);
CREATE INDEX IF NOT EXISTS booking_quotations_booking_version_idx ON public.booking_quotations(booking_id, version DESC);
CREATE INDEX IF NOT EXISTS booking_quotations_participants_idx ON public.booking_quotations(customer_id, vendor_profile_id, status);

CREATE TABLE IF NOT EXISTS public.booking_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.booking_quotations(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 300),
  details text CHECK (details IS NULL OR length(details) <= 1000),
  quantity numeric(10,2) NOT NULL CHECK (quantity > 0 AND quantity <= 100000),
  unit_price bigint NOT NULL CHECK (unit_price >= 0),
  line_total bigint NOT NULL CHECK (line_total >= 0),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS booking_quotation_items_order_idx ON public.booking_quotation_items(quotation_id, sort_order);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_accepted_quotation_fk
  FOREIGN KEY (accepted_quotation_id) REFERENCES public.booking_quotations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  client_message_key uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_read_at timestamptz,
  vendor_read_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_messages_idempotency_unique ON public.booking_messages(booking_id,sender_id,client_message_key) WHERE client_message_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_messages_conversation_idx ON public.booking_messages(booking_id, created_at);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('customer', 'vendor', 'admin', 'system')),
  from_status public.booking_status,
  to_status public.booking_status NOT NULL,
  reason text CHECK (reason IS NULL OR length(reason) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_status_history_booking_idx ON public.booking_status_history(booking_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 500),
  dedupe_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS booking_notifications_user_idx ON public.booking_notifications(recipient_id, created_at DESC);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking availability: own vendor read" ON public.vendor_availability;
CREATE POLICY "booking availability: own vendor read" ON public.vendor_availability FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid()) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "booking quotations: participants read" ON public.booking_quotations;
CREATE POLICY "booking quotations: participants read" ON public.booking_quotations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = vendor_profile_id AND vp.user_id = auth.uid()) OR public.is_evntora_admin());
DROP POLICY IF EXISTS "booking quotation items: participants read" ON public.booking_quotation_items;
CREATE POLICY "booking quotation items: participants read" ON public.booking_quotation_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.booking_quotations q WHERE q.id = quotation_id AND
    (q.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = q.vendor_profile_id AND vp.user_id = auth.uid()) OR public.is_evntora_admin())));
DROP POLICY IF EXISTS "booking messages: participants read" ON public.booking_messages;
CREATE POLICY "booking messages: participants read" ON public.booking_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND
    (b.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = b.vendor_profile_id AND vp.user_id = auth.uid()) OR public.is_evntora_admin())));
DROP POLICY IF EXISTS "booking status history: participants read" ON public.booking_status_history;
CREATE POLICY "booking status history: participants read" ON public.booking_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND
    (b.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id = b.vendor_profile_id AND vp.user_id = auth.uid()) OR public.is_evntora_admin())));
DROP POLICY IF EXISTS "booking notifications: recipient read" ON public.booking_notifications;
CREATE POLICY "booking notifications: recipient read" ON public.booking_notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());

GRANT SELECT ON public.vendor_availability, public.booking_quotations, public.booking_quotation_items,
  public.booking_messages, public.booking_status_history, public.booking_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_availability, public.booking_quotations,
  public.booking_quotation_items, public.booking_messages, public.booking_status_history,
  public.booking_notifications TO service_role;
REVOKE DELETE ON public.booking_quotations, public.booking_quotation_items, public.booking_messages,
  public.booking_status_history, public.booking_notifications FROM service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.vendor_availability, public.booking_quotations,
  public.booking_quotation_items, public.booking_messages, public.booking_status_history,
  public.booking_notifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_booking_participant(
  p_booking_id uuid, p_recipient_id uuid, p_event_type text, p_title text, p_message text, p_dedupe_key text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_recipient_id IS NULL THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.booking_notifications(recipient_id, booking_id, event_type, title, message, dedupe_key)
      VALUES (p_recipient_id, p_booking_id, p_event_type, p_title, p_message, p_dedupe_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Booking notification could not be persisted for booking %', p_booking_id;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_request(
  p_customer_id uuid, p_vendor_profile_id uuid, p_event_id uuid, p_package_id uuid, p_service_id uuid,
  p_event_date date, p_event_city text, p_guest_count integer, p_advance_percentage smallint,
  p_requirements text, p_idempotency_key uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  vendor_row public.vendor_profiles%ROWTYPE;
  package_row public.vendor_packages%ROWTYPE;
  service_row public.vendor_services%ROWTYPE;
  event_row public.events%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
  total_paise bigint;
  initial_status public.booking_status;
  known_availability text;
BEGIN
  IF p_customer_id IS NULL OR p_idempotency_key IS NULL OR p_event_date < current_date
     OR p_event_city IS NULL OR length(trim(p_event_city)) NOT BETWEEN 2 AND 120
     OR p_guest_count NOT BETWEEN 1 AND 10000 OR p_advance_percentage NOT IN (25,50,100)
     OR length(COALESCE(p_requirements,'')) > 3000 THEN
    RAISE EXCEPTION 'Booking details are invalid' USING ERRCODE = '22023';
  END IF;
  -- Serialize use of an idempotency key even when the retries target different vendors.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || p_idempotency_key::text, 0));
  SELECT * INTO booking_row FROM public.bookings
    WHERE customer_id = p_customer_id AND request_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF booking_row.vendor_profile_id <> p_vendor_profile_id OR booking_row.event_date <> p_event_date
       OR booking_row.event_id IS DISTINCT FROM p_event_id OR booking_row.vendor_package_id IS DISTINCT FROM p_package_id
       OR booking_row.vendor_service_id IS DISTINCT FROM p_service_id
       OR booking_row.event_city <> trim(p_event_city) OR booking_row.guest_count <> p_guest_count
       OR booking_row.requested_advance_percentage <> p_advance_percentage
       OR COALESCE(booking_row.requirements, '') <> COALESCE(nullif(trim(p_requirements), ''), '') THEN
      RAISE EXCEPTION 'Booking request key was reused with different details' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('id', booking_row.id, 'reference', booking_row.booking_reference, 'status', booking_row.status, 'duplicate', true);
  END IF;

  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE id = p_vendor_profile_id FOR UPDATE;
  IF NOT FOUND OR vendor_row.approval_status <> 'approved' OR NOT vendor_row.is_published OR vendor_row.user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor listing is not available' USING ERRCODE = '22023';
  END IF;
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO event_row FROM public.events WHERE id = p_event_id AND user_id = p_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Event does not belong to customer' USING ERRCODE = '42501'; END IF;
  END IF;
  IF p_package_id IS NOT NULL AND p_service_id IS NOT NULL THEN RAISE EXCEPTION 'Choose either a package or a service' USING ERRCODE = '22023'; END IF;
  IF p_package_id IS NOT NULL THEN
    SELECT * INTO package_row FROM public.vendor_packages WHERE id = p_package_id
      AND vendor_profile_id = vendor_row.id AND is_active FOR SHARE;
    IF NOT FOUND OR package_row.price <= 0 THEN RAISE EXCEPTION 'Package is not eligible' USING ERRCODE = '22023'; END IF;
    total_paise := package_row.price;
    initial_status := 'pending_vendor_confirmation';
  ELSIF p_service_id IS NOT NULL THEN
    SELECT * INTO service_row FROM public.vendor_services WHERE id = p_service_id
      AND vendor_profile_id = vendor_row.id AND is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Service is not eligible' USING ERRCODE = '22023'; END IF;
    total_paise := 0;
    initial_status := 'awaiting_quotation';
  ELSE
    total_paise := 0;
    initial_status := 'awaiting_quotation';
  END IF;
  SELECT status INTO known_availability FROM public.vendor_availability
    WHERE vendor_profile_id = vendor_row.id AND available_date = p_event_date;
  IF known_availability IN ('unavailable', 'blocked') THEN
    RAISE EXCEPTION 'Vendor is unavailable on the requested date' USING ERRCODE = '23P01';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE vendor_profile_id = vendor_row.id AND event_date = p_event_date
       AND status IN ('confirmed','in_progress') FOR UPDATE) THEN
    RAISE EXCEPTION 'Vendor has a confirmed booking on the requested date' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.bookings(
    booking_reference, customer_id, event_id, vendor_id, vendor_profile_id, vendor_name, vendor_category,
    package_name, vendor_package_id, vendor_service_id, service_details, event_date, event_city, guest_count, requirements, total_amount,
    advance_amount, paid_amount, currency, status, requested_advance_percentage, request_idempotency_key
  ) VALUES (
    'EVN-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_customer_id, p_event_id, vendor_row.user_id::text, vendor_row.id, vendor_row.business_name,
    vendor_row.business_category, CASE WHEN p_package_id IS NOT NULL THEN package_row.name WHEN p_service_id IS NOT NULL THEN service_row.name ELSE 'Custom service — quotation requested' END, p_package_id, p_service_id,
    CASE WHEN p_package_id IS NOT NULL THEN jsonb_build_object('description',package_row.description,'features',package_row.features)
      WHEN p_service_id IS NOT NULL THEN jsonb_build_object('serviceId',service_row.id,'description',service_row.description) ELSE '{}'::jsonb END,
    p_event_date, trim(p_event_city), p_guest_count, nullif(trim(COALESCE(p_requirements,'')),''), total_paise,
    CASE WHEN total_paise > 0 THEN round(total_paise * p_advance_percentage / 100.0)::bigint ELSE 0 END,
    0, 'INR', initial_status, p_advance_percentage, p_idempotency_key
  ) RETURNING * INTO booking_row;

  INSERT INTO public.booking_status_history(booking_id, actor_id, actor_role, from_status, to_status, reason)
    VALUES (booking_row.id, p_customer_id, 'customer', NULL, initial_status, 'Booking request submitted');
  PERFORM public.notify_booking_participant(booking_row.id, vendor_row.user_id, 'booking_request',
    'New booking request', 'A customer submitted a request for ' || to_char(p_event_date,'DD Mon YYYY') || '.', 'booking:' || booking_row.id || ':created');
  RETURN jsonb_build_object('id', booking_row.id, 'reference', booking_row.booking_reference, 'status', booking_row.status, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_vendor_availability(
  p_vendor_id uuid, p_date date, p_status text, p_note text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE vendor_row public.vendor_profiles%ROWTYPE; availability_row public.vendor_availability%ROWTYPE;
BEGIN
  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE user_id = p_vendor_id AND approval_status='approved' AND is_published FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approved vendor profile not found' USING ERRCODE = '42501'; END IF;
  IF p_date < current_date OR p_date > current_date + 730 OR p_status NOT IN ('available','unavailable','blocked') OR length(COALESCE(p_note,'')) > 500 THEN
    RAISE EXCEPTION 'Availability update is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_status IN ('unavailable','blocked') AND EXISTS (
    SELECT 1 FROM public.bookings WHERE vendor_profile_id=vendor_row.id AND event_date=p_date AND status IN ('awaiting_payment','confirmed','in_progress')
  ) THEN RAISE EXCEPTION 'A confirmed booking already uses this date' USING ERRCODE = '23P01'; END IF;
  INSERT INTO public.vendor_availability(vendor_profile_id,available_date,status,note)
    VALUES (vendor_row.id,p_date,p_status,nullif(trim(COALESCE(p_note,'')),''))
    ON CONFLICT (vendor_profile_id,available_date) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=now()
    RETURNING * INTO availability_row;
  RETURN jsonb_build_object('id',availability_row.id,'date',availability_row.available_date,'status',availability_row.status,'note',availability_row.note);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_vendor_availability(p_vendor_id uuid, p_date date)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE vendor_row public.vendor_profiles%ROWTYPE;
BEGIN
  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE user_id=p_vendor_id AND approval_status='approved' AND is_published FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approved vendor profile not found' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.vendor_availability WHERE vendor_profile_id=vendor_row.id AND available_date=p_date;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_booking(
  p_booking_id uuid, p_actor_id uuid, p_actor_role text, p_action text, p_reason text, p_expected_updated_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  vendor_row public.vendor_profiles%ROWTYPE;
  next_status public.booking_status;
  recipient uuid;
  notification_type text;
  notification_title text;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_actor_role = 'vendor' THEN
    SELECT * INTO vendor_row FROM public.vendor_profiles WHERE id = booking_row.vendor_profile_id AND user_id = p_actor_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendor does not own booking' USING ERRCODE = '42501'; END IF;
    PERFORM 1 FROM public.vendor_profiles WHERE id = vendor_row.id FOR UPDATE;
  ELSIF p_actor_role = 'customer' AND booking_row.customer_id <> p_actor_id THEN
    RAISE EXCEPTION 'Customer does not own booking' USING ERRCODE = '42501';
  ELSIF p_actor_role NOT IN ('customer','vendor','admin') THEN
    RAISE EXCEPTION 'Invalid booking actor' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_updated_at IS NOT NULL AND booking_row.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'Booking changed; reload before acting' USING ERRCODE = '40001';
  END IF;
  IF length(COALESCE(p_reason,'')) > 1000 THEN RAISE EXCEPTION 'Reason is too long' USING ERRCODE = '22023'; END IF;

  CASE p_action
    WHEN 'accept' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status <> 'pending_vendor_confirmation' THEN RAISE EXCEPTION 'Invalid accept transition' USING ERRCODE = '22023'; END IF;
      IF EXISTS (SELECT 1 FROM public.vendor_availability WHERE vendor_profile_id = booking_row.vendor_profile_id AND available_date = booking_row.event_date AND status IN ('unavailable','blocked'))
        OR EXISTS (SELECT 1 FROM public.bookings WHERE vendor_profile_id = booking_row.vendor_profile_id AND event_date = booking_row.event_date AND id <> booking_row.id AND status IN ('awaiting_payment','confirmed','in_progress')) THEN
        RAISE EXCEPTION 'The event date is unavailable or already booked' USING ERRCODE = '23P01';
      END IF;
      next_status := 'awaiting_payment';
      UPDATE public.bookings SET accepted_at = now() WHERE id = booking_row.id;
      recipient := booking_row.customer_id; notification_type := 'booking_accepted'; notification_title := 'Vendor accepted your request';
    WHEN 'reject' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status NOT IN ('pending_vendor_confirmation','awaiting_quotation','quotation_sent','quotation_revision_requested') OR booking_row.paid_amount > 0 THEN RAISE EXCEPTION 'Invalid reject transition' USING ERRCODE = '22023'; END IF;
      next_status := 'declined';
      UPDATE public.bookings SET rejection_reason = nullif(trim(COALESCE(p_reason,'')),'') WHERE id = booking_row.id;
      recipient := booking_row.customer_id; notification_type := 'booking_rejected'; notification_title := 'Vendor declined your request';
    WHEN 'withdraw' THEN
      IF p_actor_role <> 'customer' OR booking_row.status NOT IN ('pending_vendor_confirmation','awaiting_quotation','quotation_sent','quotation_revision_requested') OR booking_row.paid_amount > 0 THEN RAISE EXCEPTION 'Invalid withdrawal transition' USING ERRCODE = '22023'; END IF;
      next_status := 'cancelled'; UPDATE public.bookings SET cancelled_at = now(), cancellation_reason = nullif(trim(COALESCE(p_reason,'')),'') WHERE id = booking_row.id;
      recipient := booking_row.vendor_id::uuid; notification_type := 'booking_cancelled'; notification_title := 'Booking request withdrawn';
    WHEN 'request_cancellation' THEN
      IF p_actor_role NOT IN ('customer','vendor') OR (p_actor_role = 'customer' AND booking_row.customer_id <> p_actor_id)
        OR booking_row.status NOT IN ('awaiting_payment','confirmed','in_progress') THEN RAISE EXCEPTION 'Invalid cancellation request' USING ERRCODE = '22023'; END IF;
      next_status := CASE WHEN booking_row.paid_amount = 0 THEN 'cancelled'::public.booking_status ELSE 'cancellation_requested'::public.booking_status END;
      UPDATE public.bookings SET cancellation_requested_at = now(), cancellation_reason = nullif(trim(COALESCE(p_reason,'')),'') WHERE id = booking_row.id;
      recipient := CASE WHEN p_actor_role = 'customer' THEN booking_row.vendor_id::uuid ELSE booking_row.customer_id END;
      notification_type := CASE WHEN next_status = 'cancelled' THEN 'booking_cancelled' ELSE 'cancellation_requested' END;
      notification_title := CASE WHEN next_status = 'cancelled' THEN 'Booking cancelled' ELSE 'Cancellation requested' END;
    WHEN 'approve_cancellation' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status <> 'cancellation_requested' THEN RAISE EXCEPTION 'Invalid cancellation approval' USING ERRCODE = '22023'; END IF;
      next_status := 'cancelled'; UPDATE public.bookings SET cancelled_at = now() WHERE id = booking_row.id;
      recipient := booking_row.customer_id; notification_type := 'booking_cancelled'; notification_title := 'Booking cancelled';
    WHEN 'start' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status <> 'confirmed' THEN RAISE EXCEPTION 'Invalid start transition' USING ERRCODE = '22023'; END IF;
      next_status := 'in_progress'; UPDATE public.bookings SET started_at = now() WHERE id = booking_row.id;
      recipient := booking_row.customer_id; notification_type := 'service_started'; notification_title := 'Vendor started the service';
    WHEN 'complete' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Invalid completion transition' USING ERRCODE = '22023'; END IF;
      next_status := 'completed'; UPDATE public.bookings SET completed_at = now() WHERE id = booking_row.id;
      recipient := booking_row.customer_id; notification_type := 'service_completed'; notification_title := 'Service marked complete';
    WHEN 'acknowledge_completion' THEN
      IF p_actor_role <> 'customer' OR booking_row.customer_id <> p_actor_id OR booking_row.status <> 'completed' THEN RAISE EXCEPTION 'Invalid completion acknowledgement' USING ERRCODE = '22023'; END IF;
      UPDATE public.bookings SET completion_acknowledged_at = COALESCE(completion_acknowledged_at, now()) WHERE id = booking_row.id;
      RETURN jsonb_build_object('id', booking_row.id, 'status', booking_row.status, 'acknowledged', true);
    ELSE RAISE EXCEPTION 'Unknown booking action' USING ERRCODE = '22023';
  END CASE;

  UPDATE public.bookings SET status = next_status WHERE id = booking_row.id;
  INSERT INTO public.booking_status_history(booking_id, actor_id, actor_role, from_status, to_status, reason)
    VALUES (booking_row.id, p_actor_id, p_actor_role, booking_row.status, next_status, nullif(trim(COALESCE(p_reason,'')),''));
  PERFORM public.notify_booking_participant(booking_row.id, recipient, notification_type, notification_title,
    COALESCE(nullif(trim(p_reason),''), notification_title || '.'), 'booking:' || booking_row.id || ':' || notification_type || ':' || extract(epoch FROM clock_timestamp())::text);
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id;
  RETURN jsonb_build_object('id', booking_row.id, 'status', booking_row.status, 'updatedAt', booking_row.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_quotation(
  p_booking_id uuid, p_vendor_id uuid, p_items jsonb, p_discount bigint, p_additional_charges bigint,
  p_advance_percentage smallint, p_allow_partial boolean, p_payment_terms text, p_valid_until date,
  p_description text, p_conditions text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  vendor_row public.vendor_profiles%ROWTYPE;
  quote_row public.booking_quotations%ROWTYPE;
  item jsonb;
  item_count integer := 0;
  subtotal bigint := 0;
  line_amount bigint;
  quote_total bigint;
  quote_advance bigint;
  next_version integer;
  item_description text;
  item_details text;
  item_quantity numeric;
  item_price bigint;
  notification_type text;
  notification_title text;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE id = booking_row.vendor_profile_id AND user_id = p_vendor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor does not own booking' USING ERRCODE = '42501'; END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR booking_row.vendor_profile_id <> vendor_row.id THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF booking_row.status NOT IN ('awaiting_quotation','quotation_sent','quotation_revision_requested') OR booking_row.paid_amount > 0 THEN
    RAISE EXCEPTION 'Booking is not eligible for a quotation' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 30
     OR COALESCE(p_discount,0) < 0 OR COALESCE(p_additional_charges,0) < 0
     OR p_advance_percentage NOT BETWEEN 1 AND 100 OR p_valid_until <= current_date
     OR length(COALESCE(p_payment_terms,'')) > 2000 OR length(COALESCE(p_description,'')) > 2000
     OR length(COALESCE(p_conditions,'')) > 4000 THEN
    RAISE EXCEPTION 'Quotation details are invalid' USING ERRCODE = '22023';
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    item_description := trim(item->>'description');
    item_details := item->>'details';
    item_quantity := (item->>'quantity')::numeric;
    item_price := (item->>'unitPricePaise')::bigint;
    IF item_description IS NULL OR length(item_description) NOT BETWEEN 1 AND 300 OR item_quantity <= 0 OR item_quantity > 100000 OR item_quantity <> round(item_quantity,2)
      OR item_price < 0 OR length(COALESCE(item_details,'')) > 1000 THEN RAISE EXCEPTION 'Quotation item is invalid' USING ERRCODE = '22023'; END IF;
    line_amount := round(item_quantity * item_price)::bigint;
    subtotal := subtotal + line_amount;
    item_count := item_count + 1;
  END LOOP;
  quote_total := subtotal - p_discount + p_additional_charges;
  IF quote_total <= 0 OR quote_total > 100000000000 THEN RAISE EXCEPTION 'Quotation total is invalid' USING ERRCODE = '22023'; END IF;
  quote_advance := round(quote_total * p_advance_percentage / 100.0)::bigint;
  SELECT COALESCE(max(version),0) + 1 INTO next_version FROM public.booking_quotations WHERE booking_id = booking_row.id;
  UPDATE public.booking_quotations SET status = 'superseded', updated_at = now()
    WHERE booking_id = booking_row.id AND status IN ('sent','revision_requested');
  INSERT INTO public.booking_quotations(quotation_reference, booking_id, customer_id, vendor_profile_id, event_id, version,
    status, subtotal, discount_amount, additional_charges, total_amount, advance_percentage, advance_amount,
    allow_partial_payments, payment_terms, remaining_balance, valid_until, description, conditions)
  VALUES ('EVQ-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    booking_row.id, booking_row.customer_id, vendor_row.id, booking_row.event_id, next_version, 'sent', subtotal, p_discount,
    p_additional_charges, quote_total, p_advance_percentage, quote_advance, p_allow_partial, trim(p_payment_terms),
    quote_total - quote_advance, p_valid_until, nullif(trim(COALESCE(p_description,'')),''), nullif(trim(COALESCE(p_conditions,'')),''))
  RETURNING * INTO quote_row;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    item_description := trim(item->>'description'); item_details := item->>'details';
    item_quantity := (item->>'quantity')::numeric; item_price := (item->>'unitPricePaise')::bigint;
    INSERT INTO public.booking_quotation_items(quotation_id, description, details, quantity, unit_price, line_total, sort_order)
      VALUES (quote_row.id, item_description, nullif(trim(COALESCE(item_details,'')),''), item_quantity, item_price,
        round(item_quantity * item_price)::bigint, item_count - jsonb_array_length(p_items));
    item_count := item_count + 1;
  END LOOP;
  UPDATE public.bookings SET status = 'quotation_sent' WHERE id = booking_row.id;
  INSERT INTO public.booking_status_history(booking_id, actor_id, actor_role, from_status, to_status, reason)
    VALUES (booking_row.id, p_vendor_id, 'vendor', booking_row.status, 'quotation_sent', 'Quotation ' || quote_row.quotation_reference || ' sent');
  notification_type := CASE WHEN booking_row.status = 'quotation_revision_requested' THEN 'quotation_revised' ELSE 'quotation_received' END;
  notification_title := CASE WHEN booking_row.status = 'quotation_revision_requested' THEN 'Quotation revised' ELSE 'You received a quotation' END;
  PERFORM public.notify_booking_participant(booking_row.id, booking_row.customer_id, notification_type, notification_title,
    'Review quotation ' || quote_row.quotation_reference || ' before ' || to_char(quote_row.valid_until,'DD Mon YYYY') || '.', 'quotation:' || quote_row.id || ':sent');
  RETURN jsonb_build_object('id', quote_row.id, 'reference', quote_row.quotation_reference, 'version', quote_row.version, 'totalAmount', quote_row.total_amount, 'status', quote_row.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_booking_quotation(
  p_booking_id uuid, p_quotation_id uuid, p_customer_id uuid, p_action text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  quote_row public.booking_quotations%ROWTYPE;
  next_status public.booking_status;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR booking_row.customer_id <> p_customer_id THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = '42501'; END IF;
  SELECT * INTO quote_row FROM public.booking_quotations WHERE id = p_quotation_id AND booking_id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR quote_row.status <> 'sent' OR quote_row.valid_until < current_date
     OR quote_row.customer_id <> p_customer_id THEN RAISE EXCEPTION 'Quotation is unavailable or expired' USING ERRCODE = '22023'; END IF;
  IF p_action NOT IN ('accept','decline','request_revision') OR length(COALESCE(p_reason,'')) > 1000 THEN RAISE EXCEPTION 'Quotation action is invalid' USING ERRCODE = '22023'; END IF;
  IF p_action = 'accept' THEN
    UPDATE public.booking_quotations SET status = 'accepted', responded_at = now(), accepted_at = now() WHERE id = quote_row.id;
    next_status := 'awaiting_payment';
    UPDATE public.bookings SET status = next_status, total_amount = quote_row.total_amount, advance_amount = quote_row.advance_amount,
      requested_advance_percentage = quote_row.advance_percentage, allow_partial_payments = quote_row.allow_partial_payments,
      accepted_quotation_id = quote_row.id, accepted_at = now(), confirmed_at = NULL WHERE id = booking_row.id;
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'quotation_accepted', 'Quotation accepted',
      'The customer accepted ' || quote_row.quotation_reference || '. Payment remains outstanding.', 'quotation:' || quote_row.id || ':accepted');
  ELSIF p_action = 'decline' THEN
    UPDATE public.booking_quotations SET status = 'declined', responded_at = now(), updated_at = now() WHERE id = quote_row.id;
    next_status := 'declined'; UPDATE public.bookings SET status = next_status WHERE id = booking_row.id;
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'quotation_declined', 'Quotation declined',
      COALESCE(nullif(trim(p_reason),''),'The customer declined the quotation.'), 'quotation:' || quote_row.id || ':declined');
  ELSE
    UPDATE public.booking_quotations SET status = 'revision_requested', responded_at = now(), updated_at = now() WHERE id = quote_row.id;
    next_status := 'quotation_revision_requested'; UPDATE public.bookings SET status = next_status WHERE id = booking_row.id;
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'quotation_revision_requested', 'Quotation revision requested',
      COALESCE(nullif(trim(p_reason),''),'The customer requested changes to the quotation.'), 'quotation:' || quote_row.id || ':revision-requested');
  END IF;
  INSERT INTO public.booking_status_history(booking_id, actor_id, actor_role, from_status, to_status, reason)
    VALUES (booking_row.id, p_customer_id, 'customer', booking_row.status, next_status, COALESCE(nullif(trim(p_reason),''), 'Quotation ' || p_action));
  RETURN jsonb_build_object('quotationId', quote_row.id, 'quotationStatus', CASE WHEN p_action='request_revision' THEN 'revision_requested' WHEN p_action='accept' THEN 'accepted' ELSE 'declined' END, 'bookingStatus', next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_booking_quotation(p_booking_id uuid, p_quotation_id uuid, p_vendor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  quote_row public.booking_quotations%ROWTYPE;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM 1 FROM public.vendor_profiles WHERE id = booking_row.vendor_profile_id AND user_id = p_vendor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor does not own booking' USING ERRCODE = '42501'; END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO quote_row FROM public.booking_quotations WHERE id = p_quotation_id AND booking_id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR quote_row.status <> 'sent' THEN RAISE EXCEPTION 'Quotation cannot be withdrawn' USING ERRCODE = '22023'; END IF;
  UPDATE public.booking_quotations SET status='withdrawn',updated_at=now() WHERE id=quote_row.id;
  IF booking_row.status = 'quotation_sent' THEN
    UPDATE public.bookings SET status='awaiting_quotation' WHERE id=booking_row.id;
    INSERT INTO public.booking_status_history(booking_id,actor_id,actor_role,from_status,to_status,reason)
      VALUES (booking_row.id,p_vendor_id,'vendor',booking_row.status,'awaiting_quotation','Quotation withdrawn');
  END IF;
  PERFORM public.notify_booking_participant(booking_row.id,booking_row.customer_id,'quotation_withdrawn','Quotation withdrawn',
    'The vendor withdrew quotation ' || quote_row.quotation_reference || '.', 'quotation:' || quote_row.id || ':withdrawn');
  RETURN jsonb_build_object('quotationId',quote_row.id,'status','withdrawn');
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_accepted_quotation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'accepted' AND (NEW.quotation_reference, NEW.booking_id, NEW.customer_id, NEW.vendor_profile_id, NEW.event_id,
    NEW.version, NEW.subtotal, NEW.discount_amount, NEW.additional_charges, NEW.total_amount, NEW.advance_percentage,
    NEW.advance_amount, NEW.allow_partial_payments, NEW.payment_terms, NEW.remaining_balance, NEW.valid_until,
    NEW.description, NEW.conditions) IS DISTINCT FROM (OLD.quotation_reference, OLD.booking_id, OLD.customer_id,
    OLD.vendor_profile_id, OLD.event_id, OLD.version, OLD.subtotal, OLD.discount_amount, OLD.additional_charges,
    OLD.total_amount, OLD.advance_percentage, OLD.advance_amount, OLD.allow_partial_payments, OLD.payment_terms,
    OLD.remaining_balance, OLD.valid_until, OLD.description, OLD.conditions) THEN
    RAISE EXCEPTION 'Accepted quotation terms are immutable' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_quotation_accepted_immutable ON public.booking_quotations;
CREATE TRIGGER booking_quotation_accepted_immutable BEFORE UPDATE ON public.booking_quotations FOR EACH ROW EXECUTE FUNCTION public.protect_accepted_quotation();

CREATE OR REPLACE FUNCTION public.protect_accepted_quotation_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE quote_status text; quote_id uuid;
BEGIN
  quote_id := COALESCE(NEW.quotation_id, OLD.quotation_id);
  SELECT status INTO quote_status FROM public.booking_quotations WHERE id = quote_id;
  IF quote_status = 'accepted' THEN RAISE EXCEPTION 'Accepted quotation items are immutable' USING ERRCODE = '22023'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_quotation_items_accepted_immutable ON public.booking_quotation_items;
CREATE TRIGGER booking_quotation_items_accepted_immutable BEFORE UPDATE OR DELETE ON public.booking_quotation_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_accepted_quotation_items();

CREATE OR REPLACE FUNCTION public.apply_razorpay_capture(
  p_order_id text, p_payment_id text, p_amount bigint, p_currency text,
  p_payment_method text, p_verified_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
  new_paid bigint;
  next_status public.booking_status;
BEGIN
  SELECT * INTO payment_row FROM public.payments WHERE razorpay_order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order not found' USING ERRCODE = 'P0002'; END IF;
  IF payment_row.amount <> p_amount OR upper(payment_row.currency) <> upper(p_currency) THEN RAISE EXCEPTION 'Captured amount or currency does not match order' USING ERRCODE = '22023'; END IF;
  IF payment_row.status IN ('captured','partially_refunded','refunded') THEN
    IF payment_row.razorpay_payment_id = p_payment_id THEN RETURN jsonb_build_object('ok',true,'alreadyProcessed',true,'paymentId',payment_row.id,'bookingId',payment_row.booking_id); END IF;
    RAISE EXCEPTION 'Payment order already captured by another payment' USING ERRCODE = '23505';
  END IF;
  IF payment_row.status NOT IN ('created','failed') THEN RAISE EXCEPTION 'Payment is not eligible for capture' USING ERRCODE = '22023'; END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = payment_row.booking_id FOR UPDATE;
  IF NOT FOUND OR booking_row.status NOT IN ('awaiting_payment','confirmed') THEN RAISE EXCEPTION 'Booking is not eligible to accept payment' USING ERRCODE = '22023'; END IF;
  new_paid := booking_row.paid_amount + payment_row.amount;
  IF new_paid > booking_row.total_amount THEN RAISE EXCEPTION 'Payment exceeds the remaining booking balance' USING ERRCODE = '22023'; END IF;
  UPDATE public.payments SET razorpay_payment_id = p_payment_id, status = 'captured', payment_method = p_payment_method, verified_at = p_verified_at WHERE id = payment_row.id;
  next_status := CASE WHEN new_paid >= booking_row.advance_amount THEN 'confirmed'::public.booking_status ELSE 'awaiting_payment'::public.booking_status END;
  UPDATE public.bookings SET paid_amount = new_paid, status = next_status,
    confirmed_at = CASE WHEN next_status = 'confirmed' THEN COALESCE(confirmed_at, p_verified_at) ELSE confirmed_at END WHERE id = booking_row.id;
  IF next_status <> booking_row.status THEN
    INSERT INTO public.booking_status_history(booking_id, actor_id, actor_role, from_status, to_status, reason)
      VALUES (booking_row.id, payment_row.customer_id, 'system', booking_row.status, next_status, 'Verified Razorpay capture');
  END IF;
  PERFORM public.notify_booking_participant(booking_row.id, booking_row.customer_id, 'payment_received', 'Payment received',
    'A verified payment of ' || (payment_row.amount / 100.0)::text || ' INR was recorded.', 'payment:' || payment_row.id || ':captured:customer');
  PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'payment_received', 'Customer payment received',
    'A verified payment was recorded for booking ' || booking_row.booking_reference || '.', 'payment:' || payment_row.id || ':captured:vendor');
  IF next_status = 'confirmed' AND booking_row.status <> 'confirmed' THEN
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'booking_confirmed', 'Booking confirmed',
      'The required advance is paid and the booking is confirmed.', 'booking:' || booking_row.id || ':confirmed');
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.customer_id, 'booking_confirmed', 'Booking confirmed',
      'Your required advance is paid and the booking is confirmed.', 'booking:' || booking_row.id || ':confirmed:customer');
  END IF;
  RETURN jsonb_build_object('ok',true,'alreadyProcessed',false,'paymentId',payment_row.id,'bookingId',payment_row.booking_id,'bookingStatus',next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_refund(p_refund_id uuid, p_razorpay_refund_id text, p_provider_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  refund_row public.refunds%ROWTYPE;
  payment_row public.payments%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
  processed_amount bigint;
  net_paid bigint;
BEGIN
  SELECT * INTO refund_row FROM public.refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund reservation not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO payment_row FROM public.payments WHERE id = refund_row.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002'; END IF;
  IF refund_row.status = 'processed' THEN RETURN jsonb_build_object('refundId',refund_row.id,'amount',refund_row.amount,'providerRefundId',refund_row.razorpay_refund_id,'providerPaymentId',payment_row.razorpay_payment_id,'status','processed'); END IF;
  IF refund_row.status <> 'pending' OR p_provider_status NOT IN ('processed','pending','failed') THEN RAISE EXCEPTION 'Refund is not eligible for completion' USING ERRCODE = '22023'; END IF;
  UPDATE public.refunds SET razorpay_refund_id = p_razorpay_refund_id, status = p_provider_status::public.refund_status WHERE id = refund_row.id;
  IF p_provider_status = 'processed' THEN
    SELECT COALESCE(sum(amount),0) INTO processed_amount FROM public.refunds WHERE payment_id = payment_row.id AND status = 'processed';
    UPDATE public.payments SET status = CASE WHEN processed_amount >= payment_row.amount THEN 'refunded'::public.payment_status ELSE 'partially_refunded'::public.payment_status END WHERE id = payment_row.id;
    SELECT * INTO booking_row FROM public.bookings WHERE id = refund_row.booking_id FOR UPDATE;
    SELECT GREATEST(0, COALESCE(sum(p.amount),0) - COALESCE((SELECT sum(r.amount) FROM public.refunds r WHERE r.booking_id = booking_row.id AND r.status='processed'),0))
      INTO net_paid FROM public.payments p WHERE p.booking_id = booking_row.id AND p.status IN ('captured','partially_refunded','refunded');
    UPDATE public.bookings SET paid_amount = net_paid,
      status = CASE WHEN net_paid = 0 AND booking_row.status = 'cancellation_requested' THEN 'cancelled'::public.booking_status ELSE booking_row.status END,
      cancelled_at = CASE WHEN net_paid = 0 AND booking_row.status = 'cancellation_requested' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END
      WHERE id = booking_row.id;
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.customer_id, 'refund_completed', 'Refund updated',
      'A refund of ' || (refund_row.amount / 100.0)::text || ' INR was processed.', 'refund:' || refund_row.id || ':customer');
    PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'refund_completed', 'Refund processed',
      'A refund was processed for booking ' || booking_row.booking_reference || '.', 'refund:' || refund_row.id || ':vendor');
  END IF;
  RETURN jsonb_build_object('refundId',refund_row.id,'amount',refund_row.amount,'providerRefundId',p_razorpay_refund_id,'providerPaymentId',payment_row.razorpay_payment_id,'status',p_provider_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_razorpay_refund_webhook(p_razorpay_refund_id text, p_razorpay_payment_id text, p_amount bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  refund_row public.refunds%ROWTYPE;
  matches integer;
  processed_amount bigint;
  booking_row public.bookings%ROWTYPE;
  net_paid bigint;
BEGIN
  SELECT * INTO payment_row FROM public.payments WHERE razorpay_payment_id = p_razorpay_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found for refund webhook' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO refund_row FROM public.refunds WHERE razorpay_refund_id = p_razorpay_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT count(*) INTO matches FROM public.refunds WHERE payment_id = payment_row.id AND amount = p_amount AND status='pending' AND razorpay_refund_id IS NULL;
    IF matches <> 1 THEN RAISE EXCEPTION 'Refund webhook has no unique reservation' USING ERRCODE = 'P0002'; END IF;
    SELECT * INTO refund_row FROM public.refunds WHERE payment_id = payment_row.id AND amount = p_amount AND status='pending' AND razorpay_refund_id IS NULL FOR UPDATE;
  END IF;
  IF refund_row.payment_id <> payment_row.id OR refund_row.amount <> p_amount THEN RAISE EXCEPTION 'Refund webhook does not match reservation' USING ERRCODE = '22023'; END IF;
  IF refund_row.status <> 'processed' THEN UPDATE public.refunds SET razorpay_refund_id=p_razorpay_refund_id,status='processed' WHERE id=refund_row.id; END IF;
  SELECT COALESCE(sum(amount),0) INTO processed_amount FROM public.refunds WHERE payment_id=payment_row.id AND status='processed';
  UPDATE public.payments SET status=CASE WHEN processed_amount >= payment_row.amount THEN 'refunded'::public.payment_status ELSE 'partially_refunded'::public.payment_status END WHERE id=payment_row.id;
  SELECT * INTO booking_row FROM public.bookings WHERE id=refund_row.booking_id FOR UPDATE;
  SELECT GREATEST(0, COALESCE(sum(p.amount),0) - COALESCE((SELECT sum(r.amount) FROM public.refunds r WHERE r.booking_id=booking_row.id AND r.status='processed'),0))
    INTO net_paid FROM public.payments p WHERE p.booking_id=booking_row.id AND p.status IN ('captured','partially_refunded','refunded');
  UPDATE public.bookings SET paid_amount=net_paid,
    status=CASE WHEN net_paid=0 AND booking_row.status='cancellation_requested' THEN 'cancelled'::public.booking_status ELSE booking_row.status END,
    cancelled_at=CASE WHEN net_paid=0 AND booking_row.status='cancellation_requested' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END WHERE id=booking_row.id;
  PERFORM public.notify_booking_participant(booking_row.id, booking_row.customer_id, 'refund_completed', 'Refund updated',
    'A refund of ' || (refund_row.amount / 100.0)::text || ' INR was processed.', 'refund:' || refund_row.id || ':customer');
  PERFORM public.notify_booking_participant(booking_row.id, booking_row.vendor_id::uuid, 'refund_completed', 'Refund processed',
    'A refund was processed for booking ' || booking_row.booking_reference || '.', 'refund:' || refund_row.id || ':vendor');
  RETURN jsonb_build_object('refundId',refund_row.id,'amount',refund_row.amount,'providerRefundId',p_razorpay_refund_id,'providerPaymentId',payment_row.razorpay_payment_id,'status','processed');
END;
$$;

REVOKE ALL ON FUNCTION public.notify_booking_participant(uuid,uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking_request(uuid,uuid,uuid,uuid,uuid,date,text,integer,smallint,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_vendor_availability(uuid,date,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_vendor_availability(uuid,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_booking(uuid,uuid,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking_quotation(uuid,uuid,jsonb,bigint,bigint,smallint,boolean,text,date,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_to_booking_quotation(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.withdraw_booking_quotation(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_razorpay_capture(text,text,bigint,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payment_refund(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_razorpay_refund_webhook(text,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_booking_participant(uuid,uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_booking_request(uuid,uuid,uuid,uuid,uuid,date,text,integer,smallint,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_vendor_availability(uuid,date,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_vendor_availability(uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_booking(uuid,uuid,text,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_booking_quotation(uuid,uuid,jsonb,bigint,bigint,smallint,boolean,text,date,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_booking_quotation(uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_booking_quotation(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_capture(text,text,bigint,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_refund(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_refund_webhook(text,text,bigint) TO service_role;
