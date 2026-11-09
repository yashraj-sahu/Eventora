-- Booking lifecycle states used by Phase 4 APIs. Keep existing values intact.
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'awaiting_quotation';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quotation_sent';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'quotation_revision_requested';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'declined';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'cancellation_requested';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.payment_purpose ADD VALUE IF NOT EXISTS 'partial';
