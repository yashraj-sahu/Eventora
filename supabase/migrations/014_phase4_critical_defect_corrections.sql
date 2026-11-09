-- Phase 4 corrective migration. Apply after 012 and 013.
-- This migration serializes checkout order creation, aligns date reservations,
-- restricts private message access to participants, and records refund cancellation.

-- Do not carry the legacy, unsupported refund promise into newly created rows.
ALTER TABLE public.bookings
  ALTER COLUMN cancellation_terms SET DEFAULT 'Cancellation and refund eligibility are subject to the agreed booking terms and authorized review.';

-- A booking can have only one provider order being created, payable, or awaiting
-- reconciliation at a time. An uncertain provider result deliberately remains
-- reserved until reconciled; it must not trigger a second provider-side order.
-- Known provider rejections may release a reservation as failed. A customer
-- closing checkout or receiving a payment.failed attempt does not cancel/expire
-- the provider order; its same ready order is reused. Expiration/cancellation
-- is only safe after provider-side confirmation. For uncertain creates, reconcile
-- the EVN-<intent UUID> receipt against Razorpay before finalizing or releasing it.
CREATE TABLE IF NOT EXISTS public.payment_order_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (length(currency) = 3),
  purpose public.payment_purpose NOT NULL,
  status text NOT NULL CHECK (status IN ('creating','ready','uncertain','failed','expired','cancelled','completed')),
  razorpay_order_id text UNIQUE,
  payment_id uuid UNIQUE REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status IN ('ready','completed') AND razorpay_order_id IS NOT NULL AND payment_id IS NOT NULL)
      OR (status IN ('creating','uncertain','failed','expired','cancelled') AND payment_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_order_intents_one_active_per_booking
  ON public.payment_order_intents(booking_id) WHERE status IN ('creating','ready','uncertain');
ALTER TABLE public.payment_order_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_order_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_order_intents TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_payment_order(
  p_booking_id uuid, p_customer_id uuid, p_purpose text, p_partial_amount bigint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  intent_row public.payment_order_intents%ROWTYPE;
  payment_row public.payments%ROWTYPE;
  remaining_amount bigint;
  payable_amount bigint;
  normalized_purpose public.payment_purpose;
BEGIN
  IF p_purpose NOT IN ('advance','remaining','full','partial') THEN
    RAISE EXCEPTION 'Payment purpose is invalid' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR booking_row.customer_id <> p_customer_id THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = '42501';
  END IF;
  IF booking_row.status NOT IN ('awaiting_payment','confirmed') THEN
    RAISE EXCEPTION 'Booking is not ready for payment' USING ERRCODE = '22023';
  END IF;
  remaining_amount := booking_row.total_amount - booking_row.paid_amount;
  IF remaining_amount <= 0 THEN RAISE EXCEPTION 'Booking is already paid in full' USING ERRCODE = '22023'; END IF;
  normalized_purpose := p_purpose::public.payment_purpose;
  CASE p_purpose
    WHEN 'advance' THEN
      IF booking_row.paid_amount > 0 THEN RAISE EXCEPTION 'Advance has already been paid' USING ERRCODE = '22023'; END IF;
      payable_amount := LEAST(booking_row.advance_amount, remaining_amount);
    WHEN 'remaining','full' THEN payable_amount := remaining_amount;
    WHEN 'partial' THEN
      IF NOT booking_row.allow_partial_payments OR p_partial_amount IS NULL OR p_partial_amount <= 0
         OR p_partial_amount > remaining_amount THEN
        RAISE EXCEPTION 'Partial payment is not permitted for this amount' USING ERRCODE = '22023';
      END IF;
      payable_amount := p_partial_amount;
  END CASE;
  IF payable_amount IS NULL OR payable_amount <= 0 THEN RAISE EXCEPTION 'Payment amount is invalid' USING ERRCODE = '22023'; END IF;

  SELECT * INTO intent_row FROM public.payment_order_intents
    WHERE booking_id = booking_row.id AND status IN ('creating','ready','uncertain') FOR UPDATE;
  IF FOUND THEN
    IF intent_row.amount <> payable_amount OR intent_row.purpose <> normalized_purpose THEN
      RAISE EXCEPTION 'A different amount already has a pending payment order; finish or reconcile it first' USING ERRCODE = '55000';
    END IF;
    IF intent_row.status = 'ready' THEN
      SELECT * INTO payment_row FROM public.payments WHERE id = intent_row.payment_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Reserved payment record is unavailable' USING ERRCODE = '55000'; END IF;
      RETURN jsonb_build_object('status','reuse','intentId',intent_row.id,'paymentId',payment_row.id,
        'orderId',intent_row.razorpay_order_id,'amount',intent_row.amount,'currency',intent_row.currency,
        'purpose',intent_row.purpose,'bookingReference',booking_row.booking_reference,'vendorName',booking_row.vendor_name);
    END IF;
    RETURN jsonb_build_object('status',intent_row.status,'intentId',intent_row.id,
      'amount',intent_row.amount,'currency',intent_row.currency,'purpose',intent_row.purpose);
  END IF;

  INSERT INTO public.payment_order_intents(booking_id,amount,currency,purpose,status)
    VALUES (booking_row.id,payable_amount,COALESCE(booking_row.currency,'INR'),normalized_purpose,'creating')
    RETURNING * INTO intent_row;
  RETURN jsonb_build_object('status','reserved','intentId',intent_row.id,'amount',intent_row.amount,
    'currency',intent_row.currency,'purpose',intent_row.purpose,'bookingReference',booking_row.booking_reference,
    'vendorName',booking_row.vendor_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_payment_order_intent(
  p_intent_id uuid, p_razorpay_order_id text, p_receipt text, p_amount bigint,
  p_currency text, p_provider_status text, p_provider_intent_id text, p_provider_booking_id text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  intent_row public.payment_order_intents%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
  payment_row public.payments%ROWTYPE;
BEGIN
  SELECT * INTO intent_row FROM public.payment_order_intents WHERE id = p_intent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment reservation not found' USING ERRCODE = 'P0002'; END IF;
  IF p_razorpay_order_id IS NULL OR length(p_razorpay_order_id) NOT BETWEEN 1 AND 100
     OR p_receipt IS DISTINCT FROM ('EVN-' || intent_row.id::text)
     OR p_amount IS DISTINCT FROM intent_row.amount
     OR upper(COALESCE(p_currency,'')) IS DISTINCT FROM upper(intent_row.currency)
     OR p_provider_intent_id IS DISTINCT FROM intent_row.id::text
     OR p_provider_status IS NULL OR p_provider_status NOT IN ('created','attempted','paid') THEN
    RAISE EXCEPTION 'Provider order does not match the reserved intent' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id = intent_row.booking_id;
  IF NOT FOUND OR p_provider_booking_id IS DISTINCT FROM booking_row.id::text THEN
    RAISE EXCEPTION 'Provider order booking identity does not match' USING ERRCODE = '22023';
  END IF;
  IF intent_row.status = 'ready' AND intent_row.razorpay_order_id = p_razorpay_order_id THEN
    SELECT * INTO payment_row FROM public.payments WHERE id = intent_row.payment_id;
    RETURN jsonb_build_object('paymentId',payment_row.id,'orderId',intent_row.razorpay_order_id,
      'amount',intent_row.amount,'currency',intent_row.currency,'purpose',intent_row.purpose);
  END IF;
  IF intent_row.status NOT IN ('creating','uncertain') OR intent_row.razorpay_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payment reservation cannot be finalized' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.payments(booking_id,customer_id,razorpay_order_id,amount,currency,status,purpose)
    VALUES (booking_row.id,booking_row.customer_id,p_razorpay_order_id,intent_row.amount,intent_row.currency,'created',intent_row.purpose)
    RETURNING * INTO payment_row;
  UPDATE public.payment_order_intents SET status='ready',razorpay_order_id=p_razorpay_order_id,
    payment_id=payment_row.id,updated_at=now() WHERE id=intent_row.id;
  RETURN jsonb_build_object('paymentId',payment_row.id,'orderId',p_razorpay_order_id,
    'amount',intent_row.amount,'currency',intent_row.currency,'purpose',intent_row.purpose);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payment_order_intent(
  p_intent_id uuid, p_outcome text
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF p_outcome NOT IN ('uncertain','failed') THEN RAISE EXCEPTION 'Invalid payment order outcome' USING ERRCODE = '22023'; END IF;
  UPDATE public.payment_order_intents SET status=p_outcome,updated_at=now()
    WHERE id=p_intent_id AND status='creating';
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.payment_order_intents WHERE id=p_intent_id AND status=p_outcome) THEN
    RAISE EXCEPTION 'Payment reservation cannot be updated' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_order_intent_on_capture() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.status IN ('captured','partially_refunded','refunded') AND OLD.status NOT IN ('captured','partially_refunded','refunded') THEN
    UPDATE public.payment_order_intents SET status='completed',updated_at=now()
      WHERE payment_id=NEW.id AND status='ready';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS payment_order_intent_captured ON public.payments;
CREATE TRIGGER payment_order_intent_captured AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.complete_payment_order_intent_on_capture();

REVOKE ALL ON FUNCTION public.reserve_payment_order(uuid,uuid,text,bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_payment_order_intent(uuid,text,text,bigint,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_payment_order_intent(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_payment_order(uuid,uuid,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_payment_order_intent(uuid,text,text,bigint,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_payment_order_intent(uuid,text) TO service_role;

-- The booking row lock serializes status-independent request creation; locking
-- the vendor row serializes both requests and acceptance into a date reservation.
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
  PERFORM pg_advisory_xact_lock(hashtextextended(p_customer_id::text || ':' || p_idempotency_key::text, 0));
  SELECT * INTO booking_row FROM public.bookings WHERE customer_id=p_customer_id AND request_idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF booking_row.vendor_profile_id <> p_vendor_profile_id OR booking_row.event_date <> p_event_date
       OR booking_row.event_id IS DISTINCT FROM p_event_id OR booking_row.vendor_package_id IS DISTINCT FROM p_package_id
       OR booking_row.vendor_service_id IS DISTINCT FROM p_service_id OR booking_row.event_city <> trim(p_event_city)
       OR booking_row.guest_count <> p_guest_count OR booking_row.requested_advance_percentage <> p_advance_percentage
       OR COALESCE(booking_row.requirements,'') <> COALESCE(nullif(trim(p_requirements),''),'') THEN
      RAISE EXCEPTION 'Booking request key was reused with different details' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('id',booking_row.id,'reference',booking_row.booking_reference,'status',booking_row.status,'duplicate',true);
  END IF;

  SELECT * INTO vendor_row FROM public.vendor_profiles WHERE id=p_vendor_profile_id FOR UPDATE;
  IF NOT FOUND OR vendor_row.approval_status <> 'approved' OR NOT vendor_row.is_published OR vendor_row.user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor listing is not available' USING ERRCODE = '22023';
  END IF;
  IF p_event_id IS NOT NULL THEN
    SELECT * INTO event_row FROM public.events WHERE id=p_event_id AND user_id=p_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Event does not belong to customer' USING ERRCODE = '42501'; END IF;
  END IF;
  IF p_package_id IS NOT NULL AND p_service_id IS NOT NULL THEN RAISE EXCEPTION 'Choose either a package or a service' USING ERRCODE = '22023'; END IF;
  IF p_package_id IS NOT NULL THEN
    SELECT * INTO package_row FROM public.vendor_packages WHERE id=p_package_id AND vendor_profile_id=vendor_row.id AND is_active FOR SHARE;
    IF NOT FOUND OR package_row.price <= 0 THEN RAISE EXCEPTION 'Package is not eligible' USING ERRCODE = '22023'; END IF;
    total_paise := package_row.price; initial_status := 'pending_vendor_confirmation';
  ELSIF p_service_id IS NOT NULL THEN
    SELECT * INTO service_row FROM public.vendor_services WHERE id=p_service_id AND vendor_profile_id=vendor_row.id AND is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Service is not eligible' USING ERRCODE = '22023'; END IF;
    total_paise := 0; initial_status := 'awaiting_quotation';
  ELSE
    total_paise := 0; initial_status := 'awaiting_quotation';
  END IF;
  SELECT status INTO known_availability FROM public.vendor_availability
    WHERE vendor_profile_id=vendor_row.id AND available_date=p_event_date;
  IF known_availability IN ('unavailable','blocked') THEN RAISE EXCEPTION 'Vendor is unavailable on the requested date' USING ERRCODE = '23P01'; END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE vendor_profile_id=vendor_row.id AND event_date=p_event_date
       AND status IN ('awaiting_payment','confirmed','in_progress','cancellation_requested')) THEN
    RAISE EXCEPTION 'Vendor has an accepted booking on the requested date' USING ERRCODE = '23P01';
  END IF;
  INSERT INTO public.bookings(
    booking_reference,customer_id,event_id,vendor_id,vendor_profile_id,vendor_name,vendor_category,
    package_name,vendor_package_id,vendor_service_id,service_details,event_date,event_city,guest_count,requirements,total_amount,
    advance_amount,paid_amount,currency,status,requested_advance_percentage,request_idempotency_key
  ) VALUES (
    'EVN-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    p_customer_id,p_event_id,vendor_row.user_id::text,vendor_row.id,vendor_row.business_name,vendor_row.business_category,
    CASE WHEN p_package_id IS NOT NULL THEN package_row.name WHEN p_service_id IS NOT NULL THEN service_row.name ELSE 'Custom service — quotation requested' END,
    p_package_id,p_service_id,
    CASE WHEN p_package_id IS NOT NULL THEN jsonb_build_object('description',package_row.description,'features',package_row.features)
      WHEN p_service_id IS NOT NULL THEN jsonb_build_object('serviceId',service_row.id,'description',service_row.description) ELSE '{}'::jsonb END,
    p_event_date,trim(p_event_city),p_guest_count,nullif(trim(COALESCE(p_requirements,'')),''),total_paise,
    CASE WHEN total_paise > 0 THEN round(total_paise*p_advance_percentage/100.0)::bigint ELSE 0 END,
    0,'INR',initial_status,p_advance_percentage,p_idempotency_key
  ) RETURNING * INTO booking_row;
  INSERT INTO public.booking_status_history(booking_id,actor_id,actor_role,from_status,to_status,reason)
    VALUES (booking_row.id,p_customer_id,'customer',NULL,initial_status,'Booking request submitted');
  PERFORM public.notify_booking_participant(booking_row.id,vendor_row.user_id,'booking_request','New booking request',
    'A customer submitted a request for ' || to_char(p_event_date,'DD Mon YYYY') || '.', 'booking:' || booking_row.id || ':created');
  RETURN jsonb_build_object('id',booking_row.id,'reference',booking_row.booking_reference,'status',booking_row.status,'duplicate',false);
END;
$$;

-- Request creation and vendor acceptance both lock the vendor profile before
-- testing the same reserved states, so concurrent accepted requests serialize.
CREATE OR REPLACE FUNCTION public.transition_booking(
  p_booking_id uuid,p_actor_id uuid,p_actor_role text,p_action text,p_reason text,p_expected_updated_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  booking_row public.bookings%ROWTYPE;
  vendor_row public.vendor_profiles%ROWTYPE;
  next_status public.booking_status;
  recipient uuid;
  notification_type text;
  notification_title text;
BEGIN
  SELECT * INTO booking_row FROM public.bookings WHERE id=p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF p_actor_role='vendor' THEN
    SELECT * INTO vendor_row FROM public.vendor_profiles WHERE id=booking_row.vendor_profile_id AND user_id=p_actor_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Vendor does not own booking' USING ERRCODE = '42501'; END IF;
    PERFORM 1 FROM public.vendor_profiles WHERE id=vendor_row.id FOR UPDATE;
  ELSIF p_actor_role='customer' AND booking_row.customer_id <> p_actor_id THEN
    RAISE EXCEPTION 'Customer does not own booking' USING ERRCODE = '42501';
  ELSIF p_actor_role NOT IN ('customer','vendor','admin') THEN
    RAISE EXCEPTION 'Invalid booking actor' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO booking_row FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF p_expected_updated_at IS NOT NULL AND booking_row.updated_at <> p_expected_updated_at THEN RAISE EXCEPTION 'Booking changed; reload before acting' USING ERRCODE = '40001'; END IF;
  IF length(COALESCE(p_reason,'')) > 1000 THEN RAISE EXCEPTION 'Reason is too long' USING ERRCODE = '22023'; END IF;
  CASE p_action
    WHEN 'accept' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status <> 'pending_vendor_confirmation' THEN RAISE EXCEPTION 'Invalid accept transition' USING ERRCODE = '22023'; END IF;
      IF EXISTS (SELECT 1 FROM public.vendor_availability WHERE vendor_profile_id=booking_row.vendor_profile_id AND available_date=booking_row.event_date AND status IN ('unavailable','blocked'))
        OR EXISTS (SELECT 1 FROM public.bookings WHERE vendor_profile_id=booking_row.vendor_profile_id AND event_date=booking_row.event_date AND id<>booking_row.id AND status IN ('awaiting_payment','confirmed','in_progress','cancellation_requested')) THEN
        RAISE EXCEPTION 'The event date is unavailable or already booked' USING ERRCODE = '23P01';
      END IF;
      next_status:='awaiting_payment'; UPDATE public.bookings SET accepted_at=now() WHERE id=booking_row.id;
      recipient:=booking_row.customer_id; notification_type:='booking_accepted'; notification_title:='Vendor accepted your request';
    WHEN 'reject' THEN
      IF p_actor_role <> 'vendor' OR booking_row.status NOT IN ('pending_vendor_confirmation','awaiting_quotation','quotation_sent','quotation_revision_requested') OR booking_row.paid_amount>0 THEN RAISE EXCEPTION 'Invalid reject transition' USING ERRCODE = '22023'; END IF;
      next_status:='declined'; UPDATE public.bookings SET rejection_reason=nullif(trim(COALESCE(p_reason,'')),'') WHERE id=booking_row.id;
      recipient:=booking_row.customer_id; notification_type:='booking_rejected'; notification_title:='Vendor declined your request';
    WHEN 'withdraw' THEN
      IF p_actor_role <> 'customer' OR booking_row.status NOT IN ('pending_vendor_confirmation','awaiting_quotation','quotation_sent','quotation_revision_requested') OR booking_row.paid_amount>0 THEN RAISE EXCEPTION 'Invalid withdrawal transition' USING ERRCODE = '22023'; END IF;
      next_status:='cancelled'; UPDATE public.bookings SET cancelled_at=now(),cancellation_reason=nullif(trim(COALESCE(p_reason,'')),'') WHERE id=booking_row.id;
      recipient:=booking_row.vendor_id::uuid; notification_type:='booking_cancelled'; notification_title:='Booking request withdrawn';
    WHEN 'request_cancellation' THEN
      IF p_actor_role NOT IN ('customer','vendor') OR (p_actor_role='customer' AND booking_row.customer_id<>p_actor_id) OR booking_row.status NOT IN ('awaiting_payment','confirmed','in_progress') THEN RAISE EXCEPTION 'Invalid cancellation request' USING ERRCODE = '22023'; END IF;
      next_status:=CASE WHEN booking_row.paid_amount=0 THEN 'cancelled'::public.booking_status ELSE 'cancellation_requested'::public.booking_status END;
      UPDATE public.bookings SET cancellation_requested_at=now(),cancellation_reason=nullif(trim(COALESCE(p_reason,'')),'') WHERE id=booking_row.id;
      recipient:=CASE WHEN p_actor_role='customer' THEN booking_row.vendor_id::uuid ELSE booking_row.customer_id END; notification_type:='cancellation_requested'; notification_title:='Cancellation requested';
    WHEN 'approve_cancellation' THEN
      IF p_actor_role<>'vendor' OR booking_row.status<>'cancellation_requested' THEN RAISE EXCEPTION 'Invalid cancellation approval' USING ERRCODE = '22023'; END IF;
      next_status:='cancelled'; UPDATE public.bookings SET cancelled_at=now() WHERE id=booking_row.id;
      recipient:=booking_row.customer_id; notification_type:='booking_cancelled'; notification_title:='Booking cancelled';
    WHEN 'start' THEN
      IF p_actor_role<>'vendor' OR booking_row.status<>'confirmed' THEN RAISE EXCEPTION 'Invalid start transition' USING ERRCODE = '22023'; END IF;
      next_status:='in_progress'; UPDATE public.bookings SET started_at=now() WHERE id=booking_row.id;
      recipient:=booking_row.customer_id; notification_type:='service_started'; notification_title:='Vendor started the service';
    WHEN 'complete' THEN
      IF p_actor_role<>'vendor' OR booking_row.status<>'in_progress' THEN RAISE EXCEPTION 'Invalid completion transition' USING ERRCODE = '22023'; END IF;
      next_status:='completed'; UPDATE public.bookings SET completed_at=now() WHERE id=booking_row.id;
      recipient:=booking_row.customer_id; notification_type:='service_completed'; notification_title:='Service marked complete';
    WHEN 'acknowledge_completion' THEN
      IF p_actor_role<>'customer' OR booking_row.customer_id<>p_actor_id OR booking_row.status<>'completed' THEN RAISE EXCEPTION 'Invalid completion acknowledgement' USING ERRCODE = '22023'; END IF;
      UPDATE public.bookings SET completion_acknowledged_at=COALESCE(completion_acknowledged_at,now()) WHERE id=booking_row.id;
      RETURN jsonb_build_object('id',booking_row.id,'status',booking_row.status,'acknowledged',true);
    ELSE RAISE EXCEPTION 'Unknown booking action' USING ERRCODE = '22023';
  END CASE;
  UPDATE public.bookings SET status=next_status WHERE id=booking_row.id;
  INSERT INTO public.booking_status_history(booking_id,actor_id,actor_role,from_status,to_status,reason)
    VALUES (booking_row.id,p_actor_id,p_actor_role,booking_row.status,next_status,nullif(trim(COALESCE(p_reason,'')),''));
  PERFORM public.notify_booking_participant(booking_row.id,recipient,notification_type,notification_title,
    COALESCE(nullif(trim(p_reason),''),notification_title || '.'),'booking:' || booking_row.id || ':' || notification_type || ':' || extract(epoch FROM clock_timestamp())::text);
  SELECT * INTO booking_row FROM public.bookings WHERE id=p_booking_id;
  RETURN jsonb_build_object('id',booking_row.id,'status',booking_row.status,'updatedAt',booking_row.updated_at);
END;
$$;

-- A status transition written by either refund path now records history in the
-- same transaction. The transition-only trigger makes duplicate webhook replay safe.
CREATE OR REPLACE FUNCTION public.record_refund_cancellation_history() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.status='cancellation_requested' AND NEW.status='cancelled' THEN
    INSERT INTO public.booking_status_history(booking_id,actor_id,actor_role,from_status,to_status,reason,created_at)
      VALUES (NEW.id,NULL,'system',OLD.status,NEW.status,'Cancellation finalized after refund settlement.',now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS booking_refund_cancellation_history ON public.bookings;
CREATE TRIGGER booking_refund_cancellation_history AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW WHEN (OLD.status='cancellation_requested' AND NEW.status='cancelled')
  EXECUTE FUNCTION public.record_refund_cancellation_history();

-- Private booking conversations are visible only to the customer and assigned vendor.
DROP POLICY IF EXISTS "booking messages: participants read" ON public.booking_messages;
DROP POLICY IF EXISTS "booking messages: participants insert" ON public.booking_messages;
CREATE POLICY "booking messages: participants read" ON public.booking_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND
    (b.customer_id=auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=b.vendor_profile_id AND vp.user_id=auth.uid()))));
CREATE POLICY "booking messages: participants insert" ON public.booking_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id=auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND
    (b.customer_id=auth.uid() OR EXISTS (SELECT 1 FROM public.vendor_profiles vp WHERE vp.id=b.vendor_profile_id AND vp.user_id=auth.uid()))));

REVOKE ALL ON FUNCTION public.create_booking_request(uuid,uuid,uuid,uuid,uuid,date,text,integer,smallint,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_booking(uuid,uuid,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_request(uuid,uuid,uuid,uuid,uuid,date,text,integer,smallint,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_booking(uuid,uuid,text,text,text,timestamptz) TO service_role;
