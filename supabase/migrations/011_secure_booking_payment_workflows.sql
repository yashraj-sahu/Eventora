-- Secure booking/payment mutations behind validated server routes and atomic RPCs.
-- Apply only after reviewing the deployed schema and migration history.

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_idempotency_key_unique
  ON public.refunds (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS refunds_razorpay_refund_id_unique
  ON public.refunds (razorpay_refund_id)
  WHERE razorpay_refund_id IS NOT NULL;

-- No browser needs to insert/update booking or payment state. Keep the SELECT
-- grants for existing customer, vendor and admin pages; their RLS policies apply.
DROP POLICY IF EXISTS "bookings: customer insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings: customer or vendor update" ON public.bookings;
DROP POLICY IF EXISTS "payments: customer insert" ON public.payments;
DROP POLICY IF EXISTS "payments: admin update" ON public.payments;
DROP POLICY IF EXISTS "refunds: select policy" ON public.refunds;

REVOKE ALL ON TABLE public.bookings, public.payments, public.refunds FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bookings, public.payments FROM authenticated;
REVOKE ALL ON TABLE public.refunds FROM authenticated;
GRANT SELECT ON TABLE public.bookings, public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.bookings, public.payments, public.refunds TO service_role;
REVOKE DELETE ON TABLE public.bookings, public.payments, public.refunds FROM service_role;
GRANT SELECT, INSERT ON TABLE public.payment_events TO service_role;

CREATE OR REPLACE FUNCTION public.apply_razorpay_capture(
  p_order_id text,
  p_payment_id text,
  p_amount bigint,
  p_currency text,
  p_payment_method text,
  p_verified_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  booking_row public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO payment_row
    FROM public.payments
    WHERE razorpay_order_id = p_order_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order not found' USING ERRCODE = 'P0002'; END IF;
  IF payment_row.amount <> p_amount OR upper(payment_row.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'Captured amount or currency does not match order' USING ERRCODE = '22023';
  END IF;

  IF payment_row.status IN ('captured', 'partially_refunded', 'refunded') THEN
    IF payment_row.razorpay_payment_id = p_payment_id THEN
      RETURN jsonb_build_object('ok', true, 'alreadyProcessed', true, 'paymentId', payment_row.id, 'bookingId', payment_row.booking_id);
    END IF;
    RAISE EXCEPTION 'Payment order has already been captured by another payment' USING ERRCODE = '23505';
  END IF;
  IF payment_row.status NOT IN ('created', 'failed') THEN
    RAISE EXCEPTION 'Payment is not eligible for capture' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO booking_row
    FROM public.bookings
    WHERE id = payment_row.booking_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF booking_row.status = 'completed' OR booking_row.paid_amount + payment_row.amount > booking_row.total_amount THEN
    RAISE EXCEPTION 'Payment exceeds the remaining booking balance' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payments
    SET razorpay_payment_id = p_payment_id,
        status = 'captured',
        payment_method = p_payment_method,
        verified_at = p_verified_at
    WHERE id = payment_row.id;

  UPDATE public.bookings
    SET paid_amount = booking_row.paid_amount + payment_row.amount,
        status = CASE WHEN booking_row.status = 'cancelled' THEN 'cancelled'::public.booking_status ELSE 'confirmed'::public.booking_status END
    WHERE id = booking_row.id;

  RETURN jsonb_build_object('ok', true, 'alreadyProcessed', false, 'paymentId', payment_row.id, 'bookingId', payment_row.booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_payment_refund(
  p_payment_id uuid,
  p_requested_amount bigint,
  p_reason text,
  p_created_by uuid,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  refund_row public.refunds%ROWTYPE;
  already_reserved bigint;
  available_amount bigint;
  refund_amount bigint;
BEGIN
  SELECT * INTO payment_row FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002'; END IF;

  SELECT * INTO refund_row FROM public.refunds WHERE idempotency_key = p_idempotency_key FOR UPDATE;
  IF FOUND THEN
    IF refund_row.payment_id <> p_payment_id OR refund_row.created_by <> p_created_by
       OR (p_requested_amount IS NOT NULL AND refund_row.amount <> p_requested_amount) THEN
      RAISE EXCEPTION 'Refund idempotency key was reused with different details' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object(
      'refundId', refund_row.id, 'amount', refund_row.amount,
      'providerRefundId', refund_row.razorpay_refund_id,
      'providerPaymentId', payment_row.razorpay_payment_id,
      'status', refund_row.status
    );
  END IF;

  IF payment_row.status NOT IN ('captured', 'partially_refunded') OR payment_row.razorpay_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment is not refundable' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO already_reserved
    FROM public.refunds
    WHERE payment_id = p_payment_id AND status IN ('pending', 'processed');
  available_amount := payment_row.amount - already_reserved;
  refund_amount := COALESCE(p_requested_amount, available_amount);
  IF refund_amount <= 0 OR refund_amount > available_amount THEN
    RAISE EXCEPTION 'Refund exceeds remaining refundable balance' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.refunds(payment_id, booking_id, amount, reason, status, created_by, idempotency_key)
    VALUES (payment_row.id, payment_row.booking_id, refund_amount, p_reason, 'pending', p_created_by, p_idempotency_key)
    RETURNING * INTO refund_row;

  RETURN jsonb_build_object(
    'refundId', refund_row.id, 'amount', refund_row.amount,
    'providerRefundId', NULL, 'providerPaymentId', payment_row.razorpay_payment_id,
    'status', 'reserved'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_payment_refund(
  p_refund_id uuid,
  p_razorpay_refund_id text,
  p_provider_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  refund_row public.refunds%ROWTYPE;
  payment_row public.payments%ROWTYPE;
  processed_amount bigint;
BEGIN
  SELECT * INTO refund_row FROM public.refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund reservation not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO payment_row FROM public.payments WHERE id = refund_row.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002'; END IF;
  IF refund_row.status = 'processed' THEN
    RETURN jsonb_build_object('refundId', refund_row.id, 'amount', refund_row.amount, 'providerRefundId', refund_row.razorpay_refund_id, 'providerPaymentId', payment_row.razorpay_payment_id, 'status', 'processed');
  END IF;
  IF refund_row.status <> 'pending' OR p_provider_status NOT IN ('processed', 'pending', 'failed') THEN
    RAISE EXCEPTION 'Refund is not eligible for completion' USING ERRCODE = '22023';
  END IF;

  UPDATE public.refunds
    SET razorpay_refund_id = p_razorpay_refund_id,
        status = p_provider_status::public.refund_status
    WHERE id = refund_row.id;

  IF p_provider_status = 'processed' THEN
    SELECT COALESCE(sum(amount), 0) INTO processed_amount FROM public.refunds WHERE payment_id = payment_row.id AND status = 'processed';
    UPDATE public.payments SET status = CASE WHEN processed_amount >= payment_row.amount THEN 'refunded'::public.payment_status ELSE 'partially_refunded'::public.payment_status END WHERE id = payment_row.id;
  END IF;

  RETURN jsonb_build_object('refundId', refund_row.id, 'amount', refund_row.amount, 'providerRefundId', p_razorpay_refund_id, 'providerPaymentId', payment_row.razorpay_payment_id, 'status', p_provider_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_razorpay_refund_webhook(
  p_razorpay_refund_id text,
  p_razorpay_payment_id text,
  p_amount bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  payment_row public.payments%ROWTYPE;
  refund_row public.refunds%ROWTYPE;
  matches integer;
  processed_amount bigint;
BEGIN
  SELECT * INTO payment_row FROM public.payments WHERE razorpay_payment_id = p_razorpay_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found for refund webhook' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO refund_row FROM public.refunds WHERE razorpay_refund_id = p_razorpay_refund_id FOR UPDATE;
  IF NOT FOUND THEN
    SELECT count(*) INTO matches FROM public.refunds
      WHERE payment_id = payment_row.id AND amount = p_amount AND status = 'pending' AND razorpay_refund_id IS NULL;
    IF matches <> 1 THEN RAISE EXCEPTION 'Refund webhook has no unique reservation' USING ERRCODE = 'P0002'; END IF;
    SELECT * INTO refund_row FROM public.refunds
      WHERE payment_id = payment_row.id AND amount = p_amount AND status = 'pending' AND razorpay_refund_id IS NULL
      FOR UPDATE;
  END IF;
  IF refund_row.payment_id <> payment_row.id OR refund_row.amount <> p_amount THEN
    RAISE EXCEPTION 'Refund webhook does not match reservation' USING ERRCODE = '22023';
  END IF;
  IF refund_row.status <> 'processed' THEN
    UPDATE public.refunds SET razorpay_refund_id = p_razorpay_refund_id, status = 'processed' WHERE id = refund_row.id;
  END IF;
  SELECT COALESCE(sum(amount), 0) INTO processed_amount FROM public.refunds WHERE payment_id = payment_row.id AND status = 'processed';
  UPDATE public.payments SET status = CASE WHEN processed_amount >= payment_row.amount THEN 'refunded'::public.payment_status ELSE 'partially_refunded'::public.payment_status END WHERE id = payment_row.id;
  RETURN jsonb_build_object('refundId', refund_row.id, 'amount', refund_row.amount, 'providerRefundId', p_razorpay_refund_id, 'providerPaymentId', payment_row.razorpay_payment_id, 'status', 'processed');
END;
$$;

REVOKE ALL ON FUNCTION public.apply_razorpay_capture(text,text,bigint,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_payment_refund(uuid,bigint,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_payment_refund(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_razorpay_refund_webhook(text,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_capture(text,text,bigint,text,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_payment_refund(uuid,bigint,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment_refund(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_razorpay_refund_webhook(text,text,bigint) TO service_role;

