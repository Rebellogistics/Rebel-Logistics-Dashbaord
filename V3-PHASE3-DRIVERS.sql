-- ============================================================================
-- Rebel Logistics — V3 Phase 3: Driver attribution + truck shifts
-- ============================================================================
-- Run after V3-PHASE1-PRICING.sql and V3-PHASE2-AUDIT.sql. Idempotent.
--
-- Adds:
--   1. jobs.completed_by_driver_id / completed_by_driver_name — frozen at
--      completion so a driver record can be deleted later without losing
--      attribution for a fine that arrives weeks afterwards.
--   2. truck_shifts — one row per (truck, driver, day). The app upserts on
--      every completion: started_at is fixed at the first completion of the
--      day, ended_at moves forward with each subsequent completion. This is
--      a coarse but reliable "who was driving Truck 1 on April 22?" record.
--   3. record_job_completion() RPC — single transaction that updates the
--      job + upserts the shift, so we don't end up with mismatched data if
--      one of the writes fails.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. jobs.completed_by_driver_*
-- ----------------------------------------------------------------------------
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by_driver_id   UUID;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_by_driver_name TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at             TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 2. truck_shifts
-- ----------------------------------------------------------------------------
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

-- Each (truck, driver, day) gets exactly one row — the upsert key.
CREATE UNIQUE INDEX IF NOT EXISTS truck_shifts_unique_idx
    ON truck_shifts (truck_name, driver_name, shift_date);

CREATE INDEX IF NOT EXISTS truck_shifts_by_date_idx
    ON truck_shifts (shift_date);
CREATE INDEX IF NOT EXISTS truck_shifts_by_truck_date_idx
    ON truck_shifts (truck_name, shift_date DESC);

ALTER TABLE truck_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "truck_shifts readable by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts readable by authenticated"
    ON truck_shifts FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "truck_shifts insert by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts insert by authenticated"
    ON truck_shifts FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "truck_shifts update by authenticated" ON truck_shifts;
CREATE POLICY "truck_shifts update by authenticated"
    ON truck_shifts FOR UPDATE
    TO authenticated
    USING (TRUE);

-- ----------------------------------------------------------------------------
-- 3. record_job_completion() — idempotent end-of-job RPC.
--    The app calls this from MarkCompleteDialog / MarkDeliveredSheet so the
--    driver stamp + shift upsert happen atomically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_job_completion(
    p_job_id        TEXT,
    p_driver_id     UUID,
    p_driver_name   TEXT
) RETURNS VOID AS $$
DECLARE
    v_truck TEXT;
    v_date  DATE;
BEGIN
    -- Stamp the job
    UPDATE jobs
       SET completed_by_driver_id   = p_driver_id,
           completed_by_driver_name = p_driver_name,
           completed_at             = COALESCE(completed_at, NOW())
     WHERE id = p_job_id
    RETURNING assigned_truck, COALESCE(date::DATE, NOW()::DATE)
      INTO v_truck, v_date;

    -- Don't write a shift row if there's no truck or no driver name to
    -- attribute it to — those are edge cases (e.g. a back-office cleanup
    -- of an old quote) and shouldn't pollute the calendar.
    IF v_truck IS NULL OR coalesce(p_driver_name, '') = '' THEN
        RETURN;
    END IF;

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
