-- V5 Phase 1: per-job SMS opt-out flags.
--
-- Three independent toggles let Yamin opt a job out of each customer-facing
-- SMS template without disabling the underlying dispatch signal.
--
--   send_day_prior — gates the day-prior reminder bulk send.
--   send_en_route  — gates the customer en-route SMS. Driver shell still
--                    flips status to 'In Delivery' regardless (dispatcher
--                    visibility on truck run is required for half-day jobs
--                    booked after deliveries).
--   send_complete  — gates the delivery-complete SMS. Job completion event
--                    is always recorded; only the customer text is gated.
--
-- All default true so existing jobs behave exactly as before. UI surfaces
-- the three checkboxes under a "Customer SMS" sub-heading on the job
-- dialog.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS send_day_prior BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_en_route  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_complete  BOOLEAN NOT NULL DEFAULT true;
