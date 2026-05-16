# V5 Phase 9 — Clocked-time reconciliation on hourly jobs
**Status:** ✅ shipped 2026-05-16 · **Commit:** `f07ec17`

## Source
Sumanyu proactive, Yamin confirmed. Stop underbilling on hourly jobs by surfacing the gap between clocked time and billed hours before invoicing.

## What's done
- **New `ClockedTimeReconciliation` section in JobDetailDialog** (renders only on hourly jobs: `job.type === 'House Move'` OR `job.pricingType === 'hourly'`).
- **Clocked hours** computed from `enRouteSmsSentAt → (completionSmsSentAt ?? completedAt)`. Both numbers shown with HH:mm bookends.
- **Threshold ±30 min** in either direction → swaps to a yellow callout:
  - Undercharge: "Boys clocked X.Xh · you billed Y.Yh" + nudge to bump.
  - Overcharge: "You billed X.Xh · boys only clocked Y.Yh" + nudge to trim (or confirm if it's a minimum).
- Reads live `draft.estimatedHours` in edit mode so Yamin sees the callout disappear as he adjusts the bill.
- Gracefully hides when timestamps are missing (incomplete job, en-route SMS opted out via V5 P1, etc.) so it doesn't render empty on every fixed-fee delivery.

## Design call
Used existing `enRouteSmsSentAt` as the start signal instead of adding an explicit `jobs.en_route_at` column. Tradeoff: hourly jobs that opted out of en-route SMS (V5 P1) won't have a start timestamp → widget hides.

## What's left
- **Optional follow-up:** explicit `jobs.en_route_at` column wired in `useUpdateJob` so the widget works even when en-route SMS is opted out. ~30 min if Yamin reports missing widget on hourly jobs.

## Files touched
- `src/components/jobs/JobDetailDialog.tsx`
