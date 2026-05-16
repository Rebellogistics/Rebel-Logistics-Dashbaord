# V5 Phase 1 — Per-job SMS toggles + bulk send guardrails
**Status:** ✅ shipped 2026-05-16 · **Commit:** `2d4faaa`

## Source
2026-05-15 call. Yamin's two cases:
- Full-day single-customer jobs → customer doesn't need day-prior / complete texts.
- Mid-day half-day jobs slotted after deliveries → en-route signal still needed for dispatcher visibility on the run, but customer doesn't always need the text.

## What's done
- **Schema:** `jobs.send_day_prior / send_en_route / send_complete` — all `BOOLEAN NOT NULL DEFAULT true`. Existing rows backfill to true (no behaviour change).
- **JobDialog UI:** new "Customer SMS" section. 3 checkboxes when editing, 3 status pills (✓ Day-prior / ✓ En-route / ✗ Complete) when viewing.
- **Wiring invariant:** en-route status flip + completion status flip ALWAYS fire (dispatcher dashboard accuracy). Only the customer SMS is gated by the flag.
  - `maybeAutoFireStatusSms` early-returns when the matching flag is false.
  - `useSendDayPriorBulk` partitions input into eligible/opted-out, increments `skipped` counter, surfaces them in the failure list with reason "Day-prior SMS off".
- **Bulk send toast (`DailyReviewPanel`):** result shape `"Sent N · M opted out"` / `"N sent, K failed · M opted out"` / `"All N failed · M opted out"`.
- **Edits logged to job history** as `on` / `off` strings.

## What's left
✅ Nothing — fully shipped.

## Files touched
- `supabase/migrations/20260516000001_v5_phase1_sms_opt_out_flags.sql` (new)
- `src/lib/types.ts`, `src/lib/database.types.ts`
- `src/hooks/useSms.ts` (`maybeAutoFireStatusSms` + `useSendDayPriorBulk`)
- `src/components/jobs/JobDetailDialog.tsx`
- `src/components/dashboard/DailyReviewPanel.tsx`
