-- Phase 10: track whether a job's price was manually overridden (vs auto-priced
-- from the rate book). When TRUE, type/cubes/hours changes do not silently
-- recompute the price — the job-detail dialog asks the user to reconfirm.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS price_is_manual BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN jobs.price_is_manual IS 'TRUE if the fee was set manually in the job dialog; FALSE if computed from the rate book.';
