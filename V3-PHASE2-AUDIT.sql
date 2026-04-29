-- ============================================================================
-- Rebel Logistics — V3 Phase 2: Job audit log
-- ============================================================================
-- Run after V3-PHASE1-PRICING.sql. Idempotent.
--
-- Adds a generic per-field audit log so the History tab in the job detail
-- dialog can show who changed what (date, pickup address, delivery address,
-- etc.) and when. The dashboard writes rows from the app on update; nothing
-- is auto-recorded by triggers so we don't pollute history with no-op writes.
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

-- ----------------------------------------------------------------------------
-- RLS — anyone with a profile can read; anyone with edit_jobs equivalent can
-- insert. We don't gate by role here because the app already gates the edit
-- UI, but we keep INSERT scoped to authenticated users.
-- ----------------------------------------------------------------------------
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_history readable by authenticated" ON job_history;
CREATE POLICY "job_history readable by authenticated"
    ON job_history FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "job_history insert by authenticated" ON job_history;
CREATE POLICY "job_history insert by authenticated"
    ON job_history FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

NOTIFY pgrst, 'reload schema';
