# Supabase setup — run this once

One file with every SQL block you need to paste into the Supabase **SQL Editor** (Dashboard → SQL Editor → New query) for the V3 changes from the April 28 call.

Every block is **idempotent** — safe to re-run if you're not sure whether it landed.

## Order matters

Run these in order. Each builds on the one before:

1. **Block 1 — Pricing engine + quote-form rebuild** (Phase 1)
2. **Block 2 — Job audit log** (Phase 2)
3. **Block 3 — Driver attribution + truck shifts** (Phase 3)
4. **Block 4 — Google Calendar event tracking** (Phase 5)
5. **Block 5 — Customer import polish** (Phase 7)
6. **Block 6 — Enable Realtime so the dashboard updates live** (post-Phase 7)

After every block, you should see a green "Success. No rows returned" message.

If you see an error and the block didn't fully apply, copy the error and send it across — usually it means a previous migration is missing or a table name has drifted.

---

## Block 1 — Pricing engine + quote-form rebuild

**What this does:**
- Adds the **rate book** (`pricing_rates`): one row holding the metro per-cube rate ($90), the regional flat minimum ($480), the hourly rate ($180), the minimum hours (3), and the GST percent (10). Editable from Settings → Pricing.
- Adds **per-customer rate overrides** to the customers table — for repeat clients on a special deal.
- Adds the morphing-quote-form columns to jobs: `location` (Metro / Regional), `cubic_metres`, `quote_number`, `valid_until`, `is_draft`, `gst_amount`.
- Auto-numbers every quote as `RL-2026-0001`, `RL-2026-0002`, etc. — sequence resets every calendar year.
- Backfills your existing jobs with quote numbers.
- Locks down `pricing_rates` so only owner/admin can edit it (anyone with a login can read it).
- Extends the repeat-customer lookup so the new-quote dialog can pre-apply the override rate.

```sql
-- ============================================================================
-- Block 1 — Pricing engine + quote-form rebuild  (Phase 1)
-- ============================================================================

-- 1. pricing_rates singleton
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

INSERT INTO pricing_rates (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. customers — per-customer rate overrides
ALTER TABLE customers ADD COLUMN IF NOT EXISTS override_metro_rate   DECIMAL(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS override_hourly_rate  DECIMAL(10,2);

-- 3. jobs — new columns for the morphing form
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location       TEXT
    CHECK (location IS NULL OR location IN ('Metro', 'Regional'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cubic_metres   DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quote_number   TEXT UNIQUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS valid_until    DATE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_draft       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gst_amount     DECIMAL(10,2);

-- 4. quote_number sequence + auto-assign trigger (RL-YYYY-NNNN)
CREATE TABLE IF NOT EXISTS quote_number_counter (
    year INTEGER PRIMARY KEY,
    next_number INTEGER NOT NULL DEFAULT 1
);

-- SECURITY DEFINER so the trigger can write to quote_number_counter even
-- though that table has RLS on (it's internal — no policies needed).
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS jobs_assign_quote_number ON jobs;
CREATE TRIGGER jobs_assign_quote_number
    BEFORE INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION assign_quote_number();

-- Backfill existing rows
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

-- 5. RLS — pricing_rates
ALTER TABLE pricing_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rates readable by authenticated" ON pricing_rates;
CREATE POLICY "pricing_rates readable by authenticated"
    ON pricing_rates FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "pricing_rates writable by owner/admin" ON pricing_rates;
CREATE POLICY "pricing_rates writable by owner/admin"
    ON pricing_rates FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('owner', 'admin')
              AND profiles.active = TRUE
        )
    );

DROP POLICY IF EXISTS "pricing_rates insert by owner/admin" ON pricing_rates;
CREATE POLICY "pricing_rates insert by owner/admin"
    ON pricing_rates FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('owner', 'admin')
              AND profiles.active = TRUE
        )
    );

ALTER TABLE quote_number_counter ENABLE ROW LEVEL SECURITY;

-- 6. Extend find_repeat_customer to return per-customer overrides
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
  IF length(v_normalized) < 6 THEN RETURN; END IF;
  RETURN QUERY
  WITH matches AS (
    SELECT j.customer_name, j.pickup_address, j.delivery_address, j.date, j.created_at, j.customer_id
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
```

---

## Block 2 — Job audit log

**What this does:**
- Adds the `job_history` table that powers the **History tab** in the job dialog. Every time you edit a date or an address, the change is recorded here with a "before → after" snapshot and the user who made it. Liability-grade audit trail — meaningful when something gets re-routed and someone says "I never agreed to that change."

```sql
-- ============================================================================
-- Block 2 — Job audit log  (Phase 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    field        TEXT NOT NULL,
    old_value    TEXT,
    new_value    TEXT,
    changed_by   UUID,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_history_job_id_idx ON job_history(job_id, changed_at DESC);

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_history readable by authenticated" ON job_history;
CREATE POLICY "job_history readable by authenticated"
    ON job_history FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "job_history insert by authenticated" ON job_history;
CREATE POLICY "job_history insert by authenticated"
    ON job_history FOR INSERT TO authenticated WITH CHECK (TRUE);

NOTIFY pgrst, 'reload schema';
```

---

## Block 3 — Driver attribution + truck shifts

**What this does:**
- Adds the **driver-on-shift record** (`truck_shifts`) so the new **Trucks** sidebar tab has data to show. Every time a job is marked complete, this writes a `(truck, driver, day)` row.
- Adds three columns to `jobs` that **freeze the driver name on completion** — so even if a driver record is deleted later, the attribution sticks. This is the "fines come 2-3 weeks later, who was driving Truck 1 on April 22?" lookup Yamin asked for.
- Adds the `record_job_completion()` RPC so the driver stamp + shift upsert happen in a single transaction (no half-written state).

```sql
-- ============================================================================
-- Block 3 — Driver attribution + truck shifts  (Phase 3)
-- ============================================================================

-- 1. Driver columns on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by_driver_id   UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by_driver_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at             TIMESTAMPTZ;

-- 2. truck_shifts
CREATE TABLE IF NOT EXISTS truck_shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_name      TEXT NOT NULL,
    driver_user_id  UUID,
    driver_name     TEXT NOT NULL,
    shift_date      DATE NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    job_count       INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS truck_shifts_unique_idx
    ON truck_shifts (truck_name, driver_name, shift_date);
CREATE INDEX IF NOT EXISTS truck_shifts_by_date_idx
    ON truck_shifts (shift_date);
CREATE INDEX IF NOT EXISTS truck_shifts_by_truck_date_idx
    ON truck_shifts (truck_name, shift_date DESC);

ALTER TABLE truck_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "truck_shifts readable by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts readable by authenticated"
    ON truck_shifts FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "truck_shifts insert by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts insert by authenticated"
    ON truck_shifts FOR INSERT TO authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "truck_shifts update by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts update by authenticated"
    ON truck_shifts FOR UPDATE TO authenticated USING (TRUE);

-- 3. record_job_completion()
CREATE OR REPLACE FUNCTION public.record_job_completion(
    p_job_id        TEXT,
    p_driver_id     UUID,
    p_driver_name   TEXT
) RETURNS VOID AS $$
DECLARE
    v_truck TEXT;
    v_date  DATE;
BEGIN
    UPDATE jobs
       SET completed_by_driver_id   = p_driver_id,
           completed_by_driver_name = p_driver_name,
           completed_at             = COALESCE(completed_at, NOW())
     WHERE id = p_job_id
    RETURNING assigned_truck, COALESCE(date::DATE, NOW()::DATE)
      INTO v_truck, v_date;

    IF v_truck IS NULL OR coalesce(p_driver_name, '') = '' THEN RETURN; END IF;

    INSERT INTO truck_shifts (truck_name, driver_user_id, driver_name, shift_date, started_at, ended_at, job_count)
    VALUES (v_truck, p_driver_id, p_driver_name, v_date, NOW(), NOW(), 1)
    ON CONFLICT (truck_name, driver_name, shift_date)
    DO UPDATE SET
        ended_at      = NOW(),
        job_count     = truck_shifts.job_count + 1,
        driver_user_id = COALESCE(EXCLUDED.driver_user_id, truck_shifts.driver_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_job_completion(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_job_completion(TEXT, UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

---

## Block 4 — Google Calendar event tracking

**What this does:**
- Adds one column on `jobs` (`google_calendar_event_id`) so the calendar sync remembers which Google event corresponds to which job. Lets the dashboard update the right event when you change a date or unassign a truck — and delete the right event when a job's cancelled. Without this column it would create a duplicate every time.

```sql
-- ============================================================================
-- Block 4 — Google Calendar event tracking  (Phase 5)
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

CREATE INDEX IF NOT EXISTS jobs_gcal_event_id_idx
    ON jobs(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
```

---

## Block 5 — Customer import polish

**What this does:**
- Adds an `import_batch` tag on `customers` so the new CSV import wizard can stamp every row from a single import (e.g. `xero-2026-04-28`) and you can later filter, audit, or bulk-delete that batch.

```sql
-- ============================================================================
-- Block 5 — Customer import polish  (Phase 7)
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS import_batch TEXT;

CREATE INDEX IF NOT EXISTS customers_import_batch_idx
    ON customers(import_batch) WHERE import_batch IS NOT NULL;

NOTIFY pgrst, 'reload schema';
```

---

## Block 6 — Enable Realtime so the dashboard updates live

**What this does:**
- Tells Supabase to **broadcast row changes** on `jobs`, `truck_shifts`, and `sms_log` to subscribed clients. Without this, when a driver marks a job Complete on their phone, your dashboard wouldn't notice until you manually refreshed. With it, the bell notification, the dashboard, the Board, the Truck Runs, and the Trucks calendar all update **the moment** the driver hits Save.

This is what fixes the "notifications from truck → main dashboard" issue.

```sql
-- ============================================================================
-- Block 6 — Enable Realtime publication  (notification flow fix)
-- ============================================================================
-- Adds three tables to the `supabase_realtime` publication. Re-running these
-- statements when the table is already published is a no-op — Postgres will
-- raise an exception that you can safely ignore. To check the current state,
-- run the SELECT at the bottom.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
  EXCEPTION WHEN duplicate_object THEN
    -- Already in the publication — skip
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE truck_shifts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sms_log;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;

-- Verify — should list all three table names:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('jobs', 'truck_shifts', 'sms_log')
ORDER BY tablename;
```

> **Alternative via the Supabase UI** if the SQL above doesn't agree with you:
> Dashboard → Database → Replication → click `supabase_realtime` → toggle the green switch on `jobs`, `truck_shifts`, and `sms_log`. Refresh the dashboard tab in your browser and you should see updates land live.

---

## How to verify everything ran

Paste this into the SQL editor and you should see eight `OK` rows:

```sql
SELECT 'pricing_rates' AS check, count(*)::TEXT AS rows FROM pricing_rates
UNION ALL SELECT 'jobs.location column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='jobs' AND column_name='location') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'jobs.cubic_metres column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='jobs' AND column_name='cubic_metres') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'jobs.quote_number column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='jobs' AND column_name='quote_number') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'jobs.completed_by_driver_name column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='jobs' AND column_name='completed_by_driver_name') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'jobs.google_calendar_event_id column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='jobs' AND column_name='google_calendar_event_id') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'truck_shifts table', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.tables WHERE table_name='truck_shifts') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'job_history table', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.tables WHERE table_name='job_history') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'customers.import_batch column', CASE WHEN EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_name='customers' AND column_name='import_batch') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'realtime: jobs', CASE WHEN EXISTS(
  SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='jobs') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'realtime: truck_shifts', CASE WHEN EXISTS(
  SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='truck_shifts') THEN 'OK' ELSE 'MISSING' END
UNION ALL SELECT 'realtime: sms_log', CASE WHEN EXISTS(
  SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='sms_log') THEN 'OK' ELSE 'MISSING' END;
```

If anything says `MISSING`, re-run the matching block.

---

## Cheat sheet — what the dashboard does once each block lands

| Block | Unlocks |
|---|---|
| 1 | Settings → Pricing panel · morphing quote form (Standard / White Glove / House Move) · auto-numbered quotes (`RL-2026-NNNN`) · per-customer rate overrides · GST display on quotes |
| 2 | History tab inside the job dialog — every date/address edit recorded |
| 3 | Driver name on completed-job notifications · Driver line on the job dialog · the new **Trucks** sidebar tab with the month calendar + heat-map + "Find a fine" search |
| 4 | Google Calendar sync (auto on truck assignment, also the manual *Sync open jobs* button on Settings → Integrations) |
| 5 | The new CSV import wizard's **"Imported from"** tag, batchable filter |
| 6 | **Live notifications** — drivers' Complete events reach the owner dashboard the second they happen, no refresh needed |
