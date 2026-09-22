-- V7 Phase 7: travel time on an hourly job.
--
-- A multi-drop or long-distance hourly job isn't bound by the metro postcode
-- list — an install run can collect from three supplier warehouses and still
-- be priced by the hour. There was no way to recover the time spent getting
-- there. This adds one.
--
-- Billed at the SAME truck rate as the job itself (Yamin, 2026-09-22), in the
-- usual 30-minute increments rounded up, with NO minimum — the minimum is for
-- a booked job, not for getting to it. The fuel levy applies, because it is
-- transport.
--
-- Deliberately NOT a distance calculation. Per-km mechanics were removed by
-- decision on 2026-09-16; whether a run is far enough out to charge travel on
-- is a judgement made at quote time and typed in.
--
-- Additive and nullable, so every one of the 101 existing jobs is untouched
-- and prices exactly as it does today.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS travel_hours NUMERIC(5,2);

COMMENT ON COLUMN public.jobs.travel_hours IS
  'Hourly jobs only. Travel time billed at jobs.truck_size''s hourly rate with no minimum, rounded up to the billing increment. NULL on every job that does not charge travel, which is most of them.';
