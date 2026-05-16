-- V5 Phase 6: pre-assign tasks to a specific driver.
--
-- truck_name already pins a task to a truck; this layer is OPTIONAL —
-- "this load-up is for Jacob specifically". Other drivers on the truck
-- still see it (they may need to cover) but it shows their colleague's
-- name as a hint.
--
-- Denormalised driver name follows the existing completed_by_driver_id /
-- completed_by_driver_name pattern (V4 P5) so a driver-record delete
-- doesn't leave the chip blank.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to_driver_id   UUID,
  ADD COLUMN IF NOT EXISTS assigned_to_driver_name TEXT;
