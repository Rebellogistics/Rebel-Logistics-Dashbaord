-- Phase 17: extend Phase-14's soft-delete pattern to trucks + drivers.
-- Same shape as jobs.deleted_at / customers.deleted_at: NULL = active row,
-- non-NULL timestamp = in Trash. Main queries filter to NULL; the Trash UI
-- shows non-NULL with Restore + Delete-forever buttons.

ALTER TABLE trucks  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS trucks_deleted_at_idx
  ON trucks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS drivers_deleted_at_idx
  ON drivers(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN trucks.deleted_at IS
  'Phase 17 soft-delete. NULL = active; non-NULL = in Trash since this timestamp.';
COMMENT ON COLUMN drivers.deleted_at IS
  'Phase 17 soft-delete. NULL = active; non-NULL = in Trash. Distinct from drivers.active, which means "temporarily off the picker but still in the system".';
