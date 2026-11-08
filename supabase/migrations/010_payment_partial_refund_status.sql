-- Add the state before later migrations reference it in functions or updates.
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'partially_refunded';
