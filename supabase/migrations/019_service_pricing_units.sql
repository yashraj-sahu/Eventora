-- Service-level pricing details for vendor listings.
-- Additive only. Apply only after the actual remote migration history is reconciled.

ALTER TABLE public.vendor_listings
  ADD COLUMN IF NOT EXISTS pricing_unit text NOT NULL DEFAULT 'per_event',
  ADD COLUMN IF NOT EXISTS minimum_quantity numeric(10,2),
  ADD COLUMN IF NOT EXISTS pricing_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS inclusions text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS exclusions text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.vendor_listings
  ADD CONSTRAINT vendor_listings_pricing_unit_valid
    CHECK (pricing_unit IN ('per_hour','per_day','per_event','per_guest','per_item','per_package','custom_quote')),
  ADD CONSTRAINT vendor_listings_minimum_quantity_valid
    CHECK (minimum_quantity IS NULL OR minimum_quantity > 0),
  ADD CONSTRAINT vendor_listings_pricing_details_object
    CHECK (jsonb_typeof(pricing_details) = 'object');

COMMENT ON COLUMN public.vendor_listings.pricing_unit IS
  'Vendor-defined unit for starting_price; custom_quote listings have no published price.';
COMMENT ON COLUMN public.vendor_listings.pricing_details IS
  'Vendor-authored service-specific pricing details such as duration, capacity, meal type, or equipment terms.';
