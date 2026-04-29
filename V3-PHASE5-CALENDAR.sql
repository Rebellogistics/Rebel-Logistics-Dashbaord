-- ============================================================================
-- Rebel Logistics — V3 Phase 5: Google Calendar event tracking
-- ============================================================================
-- Run after V3-PHASE3-DRIVERS.sql. Idempotent.
--
-- Adds a single column to `jobs` so the sync endpoint can remember which
-- Google Calendar event corresponds to each job. When an event is created
-- the API stores its ID here; when it's deleted we null this back out.
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

CREATE INDEX IF NOT EXISTS jobs_gcal_event_id_idx
    ON jobs(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
