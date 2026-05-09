# V4 Phase 1 — Tuesday shakedown blockers
**Status:** ✅ shipped 2026-05-04 · **Commit:** `651e70f`

## What's done
- **Drag-to-reorder inside truck columns.** Every truck-column card on Truck Runs is now both draggable AND a drop target. Drag a card and drop it on another card to slot the dragged job into that position. Drop on the column header / empty area still appends to the end. Order persists via a new `sequence` integer column on `jobs` (Block 7 — `supabase/migrations/20260504000001_v4_phase1_run_sequence.sql`). On every drop the dashboard rewrites `sequence = 0,1,2,…` for the whole truck-day.
- **Driver shell respects the new run order.** `MyRunToday` sorts today's jobs by `sequence ASC` with a `created_at` fallback for jobs created before V4.
- **Driver shell tap-to-open.** Truck-side run cards open a full-detail sheet showing **company name** (primary), contact + phone (tappable `tel:`), pickup + delivery (Maps deep-links), **job type chip**, date, truck, completed-by attribution, full notes. **No price** — Yamin called this out specifically. Phone, Maps, Start run, Mark delivered all `stopPropagation`.
- **Driver shell card primary identity.** Cards lead with **company name** when set, falling back to the customer name. Contact person is a sub-line.
- **Numeric inputs accept direct typing again.** Cubic-metres, item-weight, estimated-hours, hourly-rate, fee, fuel-levy, override-rate fields swapped from `<input type="number">` to `<input type="text" inputMode="decimal">` with `sanitiseDecimal` filter. Fixes Yamin's reproduction where typing 8 to replace a 3 was suppressed.
- **B2B pre-fill cleanup on quote-create.** When a customer with `companyName` is picked, contact name, phone, and pickup all stay **blank** — they change every booking. Validation also relaxed: a quote can save with **just a company name**.
- **Twilio inbound auto-reply replaced.** New `/api/sms/inbound` endpoint returns Rebel-branded TwiML auto-reply ("Hi! This number isn't monitored. Please call Rebel Logistics on `<REBEL_SUPPORT_PHONE>`") instead of Twilio's default `Configure your number's SMS URL…` boilerplate. Verifies Twilio's signature header.
- **Live updates on the truck shell.** `useRealtimeJobs` mounted in `DriverShell`.
- **Run-order change toast on driver shell.** Compares run-order signature across renders; shows toast when office reorders mid-shift.

## What's left
✅ Nothing — fully shipped.

## Files touched
- `supabase/migrations/20260504000001_v4_phase1_run_sequence.sql` (new)
- `api/sms/inbound.ts` (new)
- `src/components/driver/DriverJobDetailSheet.tsx` (new)
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/driver/MyRunToday.tsx`
- `src/components/driver/DriverShell.tsx`
- `src/components/jobs/NewQuoteDialog.tsx`
- `src/components/jobs/JobDetailDialog.tsx`
- `src/components/jobs/AcceptDialog.tsx`
- `src/components/customers/CustomerDialog.tsx`
- `src/hooks/useSupabaseData.ts`
- `src/lib/types.ts`, `src/lib/utils.ts`, `src/lib/database.types.ts`
- `SUPABASE-RUN-THIS.md` (Block 7)
