-- ==============================================================
-- REBEL LOGISTICS — Combined migration (Phase 2 + 4 + 7)
-- ==============================================================
--
-- Instructions (follow exactly):
-- 1. Open https://app.supabase.com → your Rebel Logistics project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "+ New query"
-- 4. Select EVERYTHING in this file (Cmd+A in your editor, Cmd+C to copy)
-- 5. Paste into the Supabase SQL editor (Cmd+V)
-- 6. Click "Run" (or press Cmd+Enter)
-- 7. LOOK at the output pane at the bottom of the SQL editor:
--    - You should see a results table with 15+ rows listing columns
--      like customer_id, type, vip, distance_km, sms_log table, etc.
--    - If instead you see a red error message, STOP and share the error
-- 8. Hard-refresh your app (Cmd+Shift+R) and retry the quote form
--
-- This file is idempotent. Running it twice causes no harm.
--
-- ==============================================================

-- -------- Phase 2: quote workflow fields and Declined status --------

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

-- -------- Phase 4: SMS notifications and audit log --------

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS day_prior_sms_sent_at TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS en_route_sms_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT REFERENCES public.jobs(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('day_prior', 'en_route', 'other')),
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_sent_at ON public.sms_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_log_job_id ON public.sms_log(job_id);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.sms_log;
CREATE POLICY "Enable read access for all users" ON public.sms_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.sms_log;
CREATE POLICY "Enable insert access for all users" ON public.sms_log FOR INSERT WITH CHECK (true);

-- -------- Phase 7: Customer model overhaul --------

-- Relax legacy NOT NULL constraints on customers so backfill works
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN last_job_date DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN avatar DROP NOT NULL;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_type_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_type_check
  CHECK (type IN ('individual', 'company'));

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS abn TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vip BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_id TEXT
  REFERENCES public.customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Backfill customers from existing jobs
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

UPDATE public.jobs j
SET customer_id = 'C-' || substr(
  md5(j.customer_name || '|' || coalesce(j.customer_phone, '')),
  1, 12
)
WHERE customer_id IS NULL AND customer_name IS NOT NULL;

-- -------- Force PostgREST to reload its schema cache --------
NOTIFY pgrst, 'reload schema';

-- ==============================================================
-- VERIFICATION QUERY — This should return a results table
-- showing all the new columns. If the table is missing any of
-- these rows, the migration did NOT fully apply and something
-- above errored. Share the output with Claude if unsure.
-- ==============================================================

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'jobs' AND column_name IN (
      'customer_id', 'recipient_name', 'recipient_phone', 'recipient_address',
      'day_prior_sms_sent_at', 'en_route_sms_sent_at',
      'distance_km', 'pricing_type', 'hourly_rate', 'item_weight_kg', 'decline_reason'
    ))
    OR
    (table_name = 'customers' AND column_name IN (
      'type', 'vip', 'company_name', 'abn', 'source', 'notes'
    ))
    OR
    (table_name = 'sms_log')
  )
ORDER BY table_name, column_name;
