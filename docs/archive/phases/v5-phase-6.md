# V5 Phase 6 — Optional driver pre-assignment on tasks
**Status:** ✅ shipped 2026-05-16 · **Commit:** `7ab26bf`

## Source
2026-05-15 call. V4 P5 tasks shipped with a working AddTaskDialog but no driver assignment — Sumanyu had been hardcoding a demo "Jacob" driver for testing. Yamin wants the option to say "this load-up is for Jacob specifically."

## Design call
Tasks already pin to a truck (`tasks.truck_name NOT NULL` since V4 P5) — so the original brief's `assigned_to_truck` column was redundant and got dropped. Driver pre-assignment is **soft** — other drivers on the truck still see the task and can mark it done if they need to cover. The chip just shows whose lane the work normally falls in.

## What's done
- **Schema:** `tasks.assigned_to_driver_id UUID` + `tasks.assigned_to_driver_name TEXT` (denormalised, mirroring `completed_by_driver_name` from V4 P5 so a driver delete doesn't blank the chip).
- **TasksStrip AddTaskDialog:** new "Assign driver (optional)" dropdown defaulting to "Anyone on {truck}", populated from `useDrivers({ activeOnly: true })`.
- **Owner-side task chip** on Truck Runs shows "· for {driver}" inline with the kind label when assigned and not yet done.
- **Driver-side TaskCard** (MyTasksToday) shows the same hint.

## What's left
✅ Nothing — fully shipped.

## Files touched
- `supabase/migrations/20260516000005_v5_phase6_task_driver_assignment.sql` (new)
- `src/lib/types.ts`, `src/lib/database.types.ts`
- `src/hooks/useTasks.ts`
- `src/components/truck-runs/TasksStrip.tsx`
- `src/components/driver/MyTasksToday.tsx`
