-- ============================================================
-- EVNTORA — BOOKINGS, PAYMENTS & AUDIT SCHEMA MIGRATION
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────
-- 1. ENUMS FOR BOOKING & PAYMENT STATES
-- ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'draft',
    'pending_vendor_confirmation',
    'awaiting_payment',
    'confirmed',
    'cancelled',
    'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'created',
    'captured',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_purpose AS ENUM (
    'advance',
    'remaining',
    'full'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM (
    'pending',
    'processed',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────
-- 2. EVENTS TABLE (PERSISTENT CELEBRATIONS)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL,
  city             TEXT NOT NULL,
  date             DATE NOT NULL,
  guest_count      INTEGER NOT NULL DEFAULT 100,
  total_budget     BIGINT NOT NULL DEFAULT 0,
  venue_preference TEXT,
  style_theme      TEXT,
  status           TEXT NOT NULL DEFAULT 'planning',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (date);

-- ──────────────────────────────────────────
-- 3. BOOKINGS TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference     TEXT NOT NULL UNIQUE,
  customer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id              UUID REFERENCES public.events(id) ON DELETE SET NULL,
  vendor_id             TEXT NOT NULL,
  vendor_profile_id     UUID REFERENCES public.vendor_profiles(id) ON DELETE SET NULL,
  vendor_name           TEXT NOT NULL,
  vendor_category       TEXT NOT NULL,
  package_name          TEXT,
  service_details       JSONB DEFAULT '{}'::jsonb,
  event_date            DATE NOT NULL,
  event_city            TEXT NOT NULL,
  guest_count           INTEGER DEFAULT 0,
  requirements          TEXT,
  total_amount          BIGINT NOT NULL,          -- in integer paise
  advance_amount        BIGINT NOT NULL,          -- in integer paise
  paid_amount           BIGINT NOT NULL DEFAULT 0, -- in integer paise
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                booking_status NOT NULL DEFAULT 'awaiting_payment',
  cancellation_terms    TEXT DEFAULT 'Standard luxury event terms: 100% refund up to 30 days prior, 50% refund up to 14 days prior to event date.',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_id ON public.bookings (vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_profile_id ON public.bookings (vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings (booking_reference);

-- ──────────────────────────────────────────
-- 4. PAYMENTS TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT NOT NULL,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  amount                BIGINT NOT NULL,          -- in integer paise
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                payment_status NOT NULL DEFAULT 'created',
  purpose               payment_purpose NOT NULL DEFAULT 'advance',
  payment_method        TEXT,                     -- upi, card, netbanking, etc.
  error_code            TEXT,
  error_description     TEXT,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- ──────────────────────────────────────────
-- 5. PAYMENT_EVENTS TABLE (WEBHOOK AUDIT & IDEMPOTENCY)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              TEXT NOT NULL UNIQUE,     -- Razorpay webhook event id
  event_type            TEXT NOT NULL,
  payload               JSONB NOT NULL,
  status                TEXT NOT NULL DEFAULT 'processed',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_type ON public.payment_events (event_type);

-- ──────────────────────────────────────────
-- 6. REFUNDS TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refunds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id            UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  razorpay_refund_id    TEXT,
  amount                BIGINT NOT NULL,          -- in integer paise
  reason                TEXT,
  status                refund_status NOT NULL DEFAULT 'pending',
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds (payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds (booking_id);

-- ──────────────────────────────────────────
-- 7. TIMESTAMPS TRIGGERS
-- ──────────────────────────────────────────
DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_refunds_updated_at ON public.refunds;
CREATE TRIGGER set_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- ── EVENTS RLS ──
DROP POLICY IF EXISTS "events: own select" ON public.events;
CREATE POLICY "events: own select"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "events: own insert" ON public.events;
CREATE POLICY "events: own insert"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "events: own update" ON public.events;
CREATE POLICY "events: own update"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "events: own delete" ON public.events;
CREATE POLICY "events: own delete"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ── BOOKINGS RLS ──
DROP POLICY IF EXISTS "bookings: customer select" ON public.bookings;
CREATE POLICY "bookings: customer select"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = customer_id
    OR (vendor_profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendor_profiles WHERE id = vendor_profile_id AND user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "bookings: customer insert" ON public.bookings;
CREATE POLICY "bookings: customer insert"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "bookings: customer or vendor update" ON public.bookings;
CREATE POLICY "bookings: customer or vendor update"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid() = customer_id
    OR (vendor_profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vendor_profiles WHERE id = vendor_profile_id AND user_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── PAYMENTS RLS ──
-- Customers can read their own payments; vendors can read payments linked to their bookings; admins can read all
DROP POLICY IF EXISTS "payments: select policy" ON public.payments;
CREATE POLICY "payments: select policy"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.vendor_profiles vp ON b.vendor_profile_id = vp.id
      WHERE b.id = booking_id AND vp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customers can insert payment records when initiating checkout
DROP POLICY IF EXISTS "payments: customer insert" ON public.payments;
CREATE POLICY "payments: customer insert"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Only admins and service role can directly update payment records
DROP POLICY IF EXISTS "payments: admin update" ON public.payments;
CREATE POLICY "payments: admin update"
  ON public.payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── PAYMENT_EVENTS RLS (WEBHOOK AUDIT) ──
-- Only admins can view webhook events
DROP POLICY IF EXISTS "payment_events: admin select" ON public.payment_events;
CREATE POLICY "payment_events: admin select"
  ON public.payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── REFUNDS RLS ──
DROP POLICY IF EXISTS "refunds: select policy" ON public.refunds;
CREATE POLICY "refunds: select policy"
  ON public.refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_id AND (
        p.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.bookings b
          JOIN public.vendor_profiles vp ON b.vendor_profile_id = vp.id
          WHERE b.id = p.booking_id AND vp.user_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

