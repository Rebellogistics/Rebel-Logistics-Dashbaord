-- Phase 14: soft-delete on jobs + customers, plus widen customer_phone to
-- nullable on the jobs table. Soft delete keeps the row but sets deleted_at;
-- main queries filter to WHERE deleted_at IS NULL. A Trash UI surfaces the
-- soft-deleted rows so Yamin can restore mistakes within 30 days. A separate
-- purge action (or a future cron) hard-deletes after the window.

ALTER TABLE jobs      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS jobs_deleted_at_idx
  ON jobs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_deleted_at_idx
  ON customers(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE jobs ALTER COLUMN customer_phone DROP NOT NULL;

COMMENT ON COLUMN jobs.deleted_at IS
  'Phase 14 soft-delete: NULL = active; non-NULL = in Trash since this timestamp.';
COMMENT ON COLUMN customers.deleted_at IS
  'Phase 14 soft-delete: NULL = active; non-NULL = in Trash since this timestamp.';
