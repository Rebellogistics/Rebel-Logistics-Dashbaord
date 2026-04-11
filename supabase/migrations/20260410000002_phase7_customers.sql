-- Phase 7: Customer model overhaul.
-- Run after Phase 2 and Phase 4 migrations. Idempotent and safe to re-run.

-- -------- Relax legacy NOT NULL constraints on customers --------
-- The original COPY-THIS-SQL.sql marked email and phone as NOT NULL, which
-- prevents backfilling customers from jobs that have no email.
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN last_job_date DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN avatar DROP NOT NULL;

-- -------- Extend customers table --------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_type_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_type_check
  CHECK (type IN ('individual', 'company'));

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS abn TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vip BOOLEAN NOT NULL DEFAULT false;

-- -------- Add customer_id FK and B2B recipient fields to jobs --------
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_id TEXT
  REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- -------- Backfill customers from existing jobs --------
-- Generate a deterministic id from name + phone so re-running the migration
-- produces the same ids and ON CONFLICT DO NOTHING works correctly.
INSERT INTO public.customers (id, name, phone, last_job_date, avatar)
SELECT DISTINCT
  'C-' || substr(md5(j.customer_name || '|' || coalesce(j.customer_phone, '')), 1, 12),
  j.customer_name,
  j.customer_phone,
  j.date,
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' ||
    regexp_replace(j.customer_name, '[^A-Za-z0-9]', '', 'g')
FROM public.jobs j
WHERE j.customer_name IS NOT NULL AND j.customer_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- -------- Link existing jobs to their customer --------
UPDATE public.jobs j
SET customer_id = 'C-' || substr(
  md5(j.customer_name || '|' || coalesce(j.customer_phone, '')),
  1, 12
)
WHERE customer_id IS NULL AND customer_name IS NOT NULL;
