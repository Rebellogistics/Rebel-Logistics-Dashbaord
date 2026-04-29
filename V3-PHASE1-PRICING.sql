-- ============================================================================
-- Rebel Logistics — V3 Phase 1: Pricing engine + quote-form rebuild
-- ============================================================================
-- Run this once in Supabase SQL editor. Idempotent — safe to re-run.
--
-- Adds:
--   1. pricing_rates    — singleton row with the editable rate book
--   2. customers        — per-customer override columns
--   3. jobs             — location, cubic_metres, quote_number, valid_until,
--                         is_draft, gst_amount
--   4. quote_number sequence + trigger so every quote auto-numbers as
--      RL-YYYY-NNNN (e.g. RL-2026-0042)
--   5. RLS policies     — pricing_rates readable by all authenticated users,
--                         writable only by owner/admin
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. pricing_rates — singleton table (id is locked to 'default')
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_rates (
    id                       TEXT PRIMARY KEY DEFAULT 'default',
    metro_per_cube_aud       DECIMAL(10,2) NOT NULL DEFAULT 90.00,
    regional_minimum_aud     DECIMAL(10,2) NOT NULL DEFAULT 480.00,
    hourly_rate_aud          DECIMAL(10,2) NOT NULL DEFAULT 180.00,
    minimum_hours            INTEGER       NOT NULL DEFAULT 3,
    gst_percent              DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_by               UUID,
    CONSTRAINT pricing_rates_singleton CHECK (id = 'default')
);

-- Seed the singleton row if it doesn't exist
INSERT INTO pricing_rates (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. customers — per-customer rate overrides
-- ----------------------------------------------------------------------------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS override_metro_rate   DECIMAL(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS override_hourly_rate  DECIMAL(10,2);

-- ----------------------------------------------------------------------------
-- 3. jobs — new columns for the morphing quote form
-- ----------------------------------------------------------------------------
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location       TEXT
    CHECK (location IS NULL OR location IN ('Metro', 'Regional'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cubic_metres   DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_number   TEXT UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS valid_until    DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_draft       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gst_amount     DECIMAL(10,2);

-- ----------------------------------------------------------------------------
-- 4. quote_number sequence + auto-assign trigger
--    Format: RL-YYYY-NNNN (e.g. RL-2026-0042). The sequence is cycled per year
--    so 2027 starts at 0001 again.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quote_number_counter (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION assign_quote_number() RETURNS TRIGGER AS $$
DECLARE
    yr INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
    n  INTEGER;
BEGIN
    IF NEW.quote_number IS NOT NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO quote_number_counter (year, next_number) VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE
       SET next_number = quote_number_counter.next_number + 1
    RETURNING next_number INTO n;

    NEW.quote_number := 'RL-' || yr::TEXT || '-' || LPAD(n::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_assign_quote_number ON jobs;
CREATE TRIGGER jobs_assign_quote_number
    BEFORE INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION assign_quote_number();

-- Backfill existing rows that don't yet have a quote_number
DO $$
DECLARE
    r RECORD;
    yr INTEGER;
    n  INTEGER;
BEGIN
    FOR r IN SELECT id, created_at FROM jobs WHERE quote_number IS NULL ORDER BY created_at LOOP
        yr := EXTRACT(YEAR FROM r.created_at)::INTEGER;
        INSERT INTO quote_number_counter (year, next_number) VALUES (yr, 1)
        ON CONFLICT (year) DO UPDATE
           SET next_number = quote_number_counter.next_number + 1
        RETURNING next_number INTO n;
        UPDATE jobs SET quote_number = 'RL-' || yr::TEXT || '-' || LPAD(n::TEXT, 4, '0')
            WHERE id = r.id;
    END LOOP;
END$$;

-- ----------------------------------------------------------------------------
-- 5. RLS — pricing_rates
-- ----------------------------------------------------------------------------
ALTER TABLE pricing_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rates readable by authenticated" ON pricing_rates;
CREATE POLICY "pricing_rates readable by authenticated"
    ON pricing_rates FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "pricing_rates writable by owner/admin" ON pricing_rates;
CREATE POLICY "pricing_rates writable by owner/admin"
    ON pricing_rates FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('owner', 'admin')
              AND profiles.active = TRUE
        )
    );

-- pricing_rates is singleton; we never insert another row from the app, but
-- allow it for owner/admin in case the seed ever needs replanting.
DROP POLICY IF EXISTS "pricing_rates insert by owner/admin" ON pricing_rates;
CREATE POLICY "pricing_rates insert by owner/admin"
    ON pricing_rates FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('owner', 'admin')
              AND profiles.active = TRUE
        )
    );

-- quote_number_counter is internal; no app reads or writes
ALTER TABLE quote_number_counter ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6. Extend find_repeat_customer RPC to also return per-customer rate overrides.
--    Drop-and-replace because the return-type signature is changing.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.find_repeat_customer(TEXT);

CREATE OR REPLACE FUNCTION public.find_repeat_customer(p_phone TEXT)
RETURNS TABLE(
  customer_name          TEXT,
  job_count              INT,
  last_job_date          TEXT,
  last_pickup            TEXT,
  last_delivery          TEXT,
  override_metro_rate    DECIMAL,
  override_hourly_rate   DECIMAL
) AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_normalized) < 6 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      j.customer_name,
      j.pickup_address,
      j.delivery_address,
      j.date,
      j.created_at,
      j.customer_id
    FROM public.jobs j
    WHERE regexp_replace(coalesce(j.customer_phone, ''), '[^0-9]', '', 'g') = v_normalized
  ),
  latest_customer AS (
    SELECT c.override_metro_rate, c.override_hourly_rate
    FROM public.customers c
    WHERE c.id = (SELECT m.customer_id FROM matches m ORDER BY m.created_at DESC LIMIT 1)
    LIMIT 1
  )
  SELECT
    (SELECT m.customer_name FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT count(*)::INT FROM matches),
    (SELECT m.date FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.pickup_address FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.delivery_address FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT lc.override_metro_rate FROM latest_customer lc),
    (SELECT lc.override_hourly_rate FROM latest_customer lc)
  WHERE EXISTS (SELECT 1 FROM matches);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.find_repeat_customer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_repeat_customer(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- Done.
-- ----------------------------------------------------------------------------
