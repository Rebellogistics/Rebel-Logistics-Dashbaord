-- V4 Phase 1.1 — per-truck-day run order
--
-- Yamin's complaint on the May 4 call: when he drags an Accepted card onto
-- a truck column, it lands at the bottom of the column regardless of where
-- he dropped it. He can't reorder afterwards either. The driver shell uses
-- the truck-column order as the run order, so this is functionally broken
-- for the Tuesday May 5 driver trial.
--
-- This migration adds an explicit `sequence` integer column. The dashboard
-- writes 0,1,2,… per truck-day on every drop or reorder; both the truck
-- column and the driver shell sort by sequence ascending, falling back to
-- created_at when sequence is NULL (existing rows pre-V4-1.1).
--
-- Idempotent: safe to re-run.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS sequence INTEGER;

CREATE INDEX IF NOT EXISTS idx_jobs_truck_date_sequence
  ON jobs (assigned_truck, date, sequence)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN jobs.sequence IS
  'V4 Phase 1.1: position within the truck-day run order (0 = first stop). '
  'NULL on rows created before V4 — sort fall-back is created_at. Re-written '
  'as a contiguous 0..N-1 sequence on every reorder.';
