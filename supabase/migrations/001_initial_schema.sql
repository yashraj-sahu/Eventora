-- ============================================================
-- EVNTORA — DATABASE SCHEMA & SECURITY MIGRATION
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────
-- 1. ENUM TYPES
-- ──────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────
-- 2. PROFILES TABLE
-- Mirrors auth.users — one row per authenticated user
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  role        user_role NOT NULL DEFAULT 'customer',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast role lookups (used by middleware)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ──────────────────────────────────────────
-- 3. VENDOR PROFILES TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name        TEXT NOT NULL,
  business_category    TEXT NOT NULL,
  city                 TEXT NOT NULL,
  business_description TEXT,
  contact_phone        TEXT,
  approval_status      approval_status NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vendor_profiles_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON public.vendor_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_approval ON public.vendor_profiles (approval_status);

-- ──────────────────────────────────────────
-- 4. AUTO-CREATE PROFILE ON SIGNUP (TRIGGER)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'customer'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- 5. AUTO-UPDATE updated_at TIMESTAMP
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_vendor_profiles_updated_at ON public.vendor_profiles;
CREATE TRIGGER set_vendor_profiles_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ──────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- ── PROFILES policies ──

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles: own read" ON public.profiles;
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update limited fields on their own profile
-- IMPORTANT: role cannot be changed by the user themselves
DROP POLICY IF EXISTS "profiles: own update" ON public.profiles;
CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent role escalation: new role must equal existing role
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can read all profiles
DROP POLICY IF EXISTS "profiles: admin read all" ON public.profiles;
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile (including role assignment)
DROP POLICY IF EXISTS "profiles: admin update all" ON public.profiles;
CREATE POLICY "profiles: admin update all"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service-role inserts are handled by the trigger (no user-facing insert policy needed)

-- ── VENDOR_PROFILES policies ──

-- Vendors can read their own vendor profile
DROP POLICY IF EXISTS "vendor_profiles: own read" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: own read"
  ON public.vendor_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Vendors can update their own vendor profile (except approval_status)
DROP POLICY IF EXISTS "vendor_profiles: own update" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: own update"
  ON public.vendor_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Vendors cannot approve themselves
    AND approval_status = (SELECT approval_status FROM public.vendor_profiles WHERE user_id = auth.uid())
  );

-- Admins can read all vendor profiles
DROP POLICY IF EXISTS "vendor_profiles: admin read all" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin read all"
  ON public.vendor_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any vendor profile (including approval_status)
DROP POLICY IF EXISTS "vendor_profiles: admin update all" ON public.vendor_profiles;
CREATE POLICY "vendor_profiles: admin update all"
  ON public.vendor_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ──────────────────────────────────────────
-- 7. ASSIGN FIRST ADMIN
-- After running this migration, replace the email below
-- and run it separately to grant admin access:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'your-admin-email@example.com';
--
-- ──────────────────────────────────────────

