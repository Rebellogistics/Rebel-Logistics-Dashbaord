# V4 Phase 5 — Tasks (warehouse load-up)
**Status:** ✅ shipped 2026-05-04 · **Commit:** `515efdd`

## What's done
- **`tasks` table** with `truck_name + scheduled_date + kind (load_up | clean | fuel | other) + title + description + sequence + completion attribution + soft delete`. RLS: owner CRUD; truck/driver SELECT + UPDATE on their own truck (within 7-day window — mirrors jobs policy). Realtime publication on `tasks`.
- **Hooks** in `src/hooks/useTasks.ts`: `useTasks` (camelCase, sorted by date+sequence), `useCreateTask` (auto-appends to truck-day sequence), `useUpdateTask`, `useDeleteTask` (soft via `deleted_at`), `useMarkTaskDone` (stamps driver id + frozen name + timestamp), `useReopenTask`, `useRealtimeTasks` subscription.
- **Owner UI: `TasksStrip`** rendered above truck columns on Truck Runs day view. Per-truck row showing open/done counts, kind icons (Boxes / Brush / Fuel / Package), inline mark-done / reopen / delete on each chip, full Add-task dialog (kind picker + title + description). `useRealtimeTasks` mounted in OwnerShell + DriverShell.
- **Driver UI: `MyTasksToday`** — new "Tasks" tab on the truck shell (the default landing surface on shift start, before Jobs). Open + Done sections for today. Big *Mark done* button per card. Completion stamps driver name from WhoDriving picker. Tab bar carries open-count badge.
- **Dashboard: 4th KPI tile** *Warehouse Load-up* with today's open count. Amber accent when actionable. Click → Truck Runs. Grid expands to `lg:grid-cols-4`.

## What's left
✅ Nothing — fully shipped.

## Migration
Block 9 in `SUPABASE-RUN-THIS.md`. **Already applied via MCP** to Yamin's project on 2026-05-04 (no manual run needed).

## Deferred
- Task templates ("Daily warehouse load-up", "Weekly Friday truck wash") — bulk-add for date ranges.
- Driver-side reorder for tasks.

## Files touched
- `supabase/migrations/20260504000003_v4_phase5_tasks.sql` (new)
- `src/hooks/useTasks.ts` (new)
- `src/components/truck-runs/TasksStrip.tsx` (new)
- `src/components/driver/MyTasksToday.tsx` (new)
- `src/lib/types.ts`, `src/lib/database.types.ts`
- `src/components/driver/DriverShell.tsx`
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/dashboard/KPIStats.tsx`
- `src/App.tsx`
- `SUPABASE-RUN-THIS.md` (Block 9)
