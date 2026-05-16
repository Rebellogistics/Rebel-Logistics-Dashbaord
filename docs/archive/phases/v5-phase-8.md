# V5 Phase 8 — Stop-number badges on run-order cards
**Status:** ✅ shipped 2026-05-16 · **Commit:** `e8a7d38`

## Discovery
Brief said "replace integer input on day view with a drag handle on each row" — but **drag-reorder already fully ships from V4 P1.1**. DndContext + `useReorderTruckJobs` + `insertIndex` threading + per-card `useDroppable` are all wired through `TruckRunsView.handleDropOnJobCard`. There was no integer input.

What was actually missing: visible cue of **which stop** each card is. Yamin and drivers had to count rows.

## What's done
- **Owner-side TruckRunsView JobCard:** bare GripVertical drag handle becomes a numbered chip ("1, 2, 3…") that's still the drag affordance. Closed jobs (Completed / Invoiced) get a muted static badge so the run-order story stays intact after a delivery completes.
- **Driver-side MyRunToday DriverJobCard:** prominent "Stop N" pill at the front of each card. Number is the position in the UNFILTERED day list — "Stop 3" stays Stop 3 even when 1 + 2 are filtered out to the "Done" tab. Drivers don't lose their place.

No schema changes, no DB roundtrips. Pure UI surfacing of state that was already in `jobs.sequence`.

## What's left
✅ Nothing — fully shipped.

## Files touched
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/driver/MyRunToday.tsx`
