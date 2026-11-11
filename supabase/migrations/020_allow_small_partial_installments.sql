-- Allow customer-selected installments (minimum ₹1) toward any accepted booking.
-- The booking remains awaiting_payment until verified captures cumulatively
-- satisfy its agreed advance; the total contract amount and advance are unchanged.
CREATE OR REPLACE FUNCTION public.enforce_partial_payment_advance_floor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  booking_total bigint;
  booking_paid bigint;
BEGIN
  IF NEW.purpose <> 'partial' THEN
    RETURN NEW;
  END IF;

  SELECT b.total_amount, b.paid_amount
    INTO booking_total, booking_paid
    FROM public.bookings AS b
    WHERE b.id = NEW.booking_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking for this payment could not be found'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.amount < 100 OR NEW.amount > booking_total - booking_paid THEN
    RAISE EXCEPTION 'Partial payment must be at least 100 paise and cannot exceed the outstanding balance'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_partial_payment_advance_floor() FROM PUBLIC, anon, authenticated;
