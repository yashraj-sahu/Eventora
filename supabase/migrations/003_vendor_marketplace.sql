-- ============================================================
-- EVNTORA — VENDOR MARKETPLACE SCHEMA EXTENSION
-- Migration 003: Extends vendor_profiles, adds services/packages/portfolio
-- Run in Supabase SQL Editor AFTER 001 and 002.
-- ============================================================

-- ──────────────────────────────────────────
-- 1. EXTEND vendor_profiles WITH MARKETPLACE FIELDS
-- ──────────────────────────────────────────

-- Allow admin-created unclaimed listings (user_id nullable)
ALTER TABLE public.vendor_profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- Add marketplace-display fields
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS short_bio TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS starting_price BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'per event',
  ADD COLUMN IF NOT EXISTS price_range TEXT DEFAULT '₹₹₹',
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS past_events_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Drop existing unique constraint on user_id to allow NULL for unclaimed
-- (the constraint prevents multiple NULL user_ids in some DBs, so we
--  replace it with a partial unique index that only enforces uniqueness
--  when user_id IS NOT NULL)
ALTER TABLE public.vendor_profiles
  DROP CONSTRAINT IF EXISTS uq_vendor_profiles_user;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_profiles_user_unique
  ON public.vendor_profiles (user_id)
  WHERE user_id IS NOT NULL;

-- Index for public marketplace queries
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_published
  ON public.vendor_profiles (is_published, approval_status);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_category
  ON public.vendor_profiles (business_category);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_city
  ON public.vendor_profiles (city);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_featured
  ON public.vendor_profiles (is_featured)
  WHERE is_featured = TRUE;

-- ──────────────────────────────────────────
-- 2. VENDOR SERVICES TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_services_vendor
  ON public.vendor_services (vendor_profile_id);

-- ──────────────────────────────────────────
-- 3. VENDOR PACKAGES TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_packages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  price             BIGINT NOT NULL DEFAULT 0,       -- in paise
  price_display     TEXT,                              -- e.g. "₹85,000" for display override
  features          JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of feature strings
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_packages_vendor
  ON public.vendor_packages (vendor_profile_id);

-- ──────────────────────────────────────────
-- 4. VENDOR PORTFOLIO TABLE (image metadata)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_portfolio (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,                    -- Supabase Storage path
  public_url        TEXT,                             -- cached public URL
  caption           TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_portfolio_vendor
  ON public.vendor_portfolio (vendor_profile_id);

-- ──────────────────────────────────────────
-- 5. TIMESTAMPS TRIGGERS FOR NEW TABLES
-- ──────────────────────────────────────────
DROP TRIGGER IF EXISTS set_vendor_services_updated_at ON public.vendor_services;
CREATE TRIGGER set_vendor_services_updated_at
  BEFORE UPDATE ON public.vendor_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_vendor_packages_updated_at ON public.vendor_packages;
CREATE TRIGGER set_vendor_packages_updated_at
  BEFORE UPDATE ON public.vendor_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 6. ROW LEVEL SECURITY FOR NEW TABLES
-- ──────────────────────────────────────────
ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portfolio ENABLE ROW LEVEL SECURITY;

-- ── PUBLIC READ for approved & published vendors ──
-- Anyone can read vendor profiles that are approved AND published
DROP POLICY IF EXISTS "vendor_profiles: public read approved" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: public read approved"
  ON public.vendor_profiles FOR SELECT
  USING (
    approval_status = 'approved' AND is_published = TRUE
  );

-- ── VENDOR SERVICES: public read for active services of approved vendors ──
DROP POLICY IF EXISTS "vendor_services: public read" ON public.vendor_services;
CREATE POLICY "vendor_services: public read"
  ON public.vendor_services FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.approval_status = 'approved'
        AND vp.is_published = TRUE
    )
  );

-- Vendors can manage their own services
DROP POLICY IF EXISTS "vendor_services: own manage" ON public.vendor_services;
CREATE POLICY "vendor_services: own manage"
  ON public.vendor_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  );

-- Admins can manage all services
DROP POLICY IF EXISTS "vendor_services: admin manage" ON public.vendor_services;
CREATE POLICY "vendor_services: admin manage"
  ON public.vendor_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── VENDOR PACKAGES: same pattern ──
DROP POLICY IF EXISTS "vendor_packages: public read" ON public.vendor_packages;
CREATE POLICY "vendor_packages: public read"
  ON public.vendor_packages FOR SELECT
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.approval_status = 'approved'
        AND vp.is_published = TRUE
    )
  );

DROP POLICY IF EXISTS "vendor_packages: own manage" ON public.vendor_packages;
CREATE POLICY "vendor_packages: own manage"
  ON public.vendor_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendor_packages: admin manage" ON public.vendor_packages;
CREATE POLICY "vendor_packages: admin manage"
  ON public.vendor_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── VENDOR PORTFOLIO: same pattern ──
DROP POLICY IF EXISTS "vendor_portfolio: public read" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: public read"
  ON public.vendor_portfolio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.approval_status = 'approved'
        AND vp.is_published = TRUE
    )
  );

DROP POLICY IF EXISTS "vendor_portfolio: own manage" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: own manage"
  ON public.vendor_portfolio FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_profile_id
        AND vp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vendor_portfolio: admin manage" ON public.vendor_portfolio;
CREATE POLICY "vendor_portfolio: admin manage"
  ON public.vendor_portfolio FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── Allow vendors to INSERT their own vendor_profile (registration) ──
DROP POLICY IF EXISTS "vendor_profiles: self register" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: self register"
  ON public.vendor_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND approval_status = 'pending'
  );

-- ── Allow admins to INSERT vendor profiles (admin-created listings) ──
DROP POLICY IF EXISTS "vendor_profiles: admin insert" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin insert"
  ON public.vendor_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ──────────────────────────────────────────
-- 7. SUPABASE STORAGE BUCKET (manual step)
-- ──────────────────────────────────────────
-- You must create a storage bucket named 'vendor-portfolio' in your
-- Supabase dashboard under Storage → New bucket:
--   Name: vendor-portfolio
--   Public: Yes (for serving images via public URL)
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Then add storage policies:
--   SELECT: Allow public read
--   INSERT: Allow authenticated users where path starts with their vendor_profile_id
--   DELETE: Allow authenticated users where path starts with their vendor_profile_id
-- ──────────────────────────────────────────

