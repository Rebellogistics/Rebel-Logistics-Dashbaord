-- Phase 2: Quote workflow fields and Declined status.
-- Run against your Supabase project via the SQL editor or the Supabase CLI.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS item_weight_kg DECIMAL(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS item_dimensions TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS pricing_type TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hours_estimated DECIMAL(10, 2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS decline_reason TEXT;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pricing_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_pricing_type_check
  CHECK (pricing_type IS NULL OR pricing_type IN ('fixed', 'hourly'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('Quote', 'Accepted', 'Scheduled', 'Notified', 'In Delivery', 'Completed', 'Invoiced', 'Declined'));
