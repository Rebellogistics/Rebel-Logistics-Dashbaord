# V4 Phase 3 — Day-prior bulk send + inbound SMS inbox
**Status:** ✅ shipped 2026-05-04 · **Commit:** `651e70f`

## What's done
- **One-click day-prior bulk send.** Truck Runs day view header carries *Day-prior (N)* button. N = jobs assigned to a truck for the picker day with phone + no day-prior sent. Click → confirm → fires the editable `day_prior` template to every eligible customer in parallel. Toast shows sent / failed / skipped. Each send writes to `sms_log` with `direction='outbound'` and stamps `jobs.day_prior_sms_sent_at`.
- **Per-job day-prior re-send.** 3-dots menu on every job card gets *Send day-prior SMS* / *Resend day-prior SMS* item.
- **Twilio inbound webhook writes to `sms_log`.** `/api/sms/inbound` looks up the most recent outbound to the sender's phone in the last 7 days for `parent_message_sid`, looks up customer by phone-digit match (last 9 digits, tolerant of `+61` vs `0`). Inserts row with `direction='inbound'`. Done in parallel with TwiML response.
- **Outbound captures Twilio Message SID** in `provider_message_id` on every send (manual, auto-fire, bulk day-prior).
- **Replies tab in SMS Log.** Tab toggle (*All · Replies*) with unread badge. Inbound rows render with amber "Reply" chip + accent-tint background + inline *Open job* / *Open & reschedule* button. *Mark all read* button. Driven by `read_at IS NULL`.
- **Inbound replies on the bell.** `inbound_sms_reply` alert kind in `useAlerts`. Severity = warning. Click routes to Replies tab or linked job.
- **Driver-side inbound routing.** Driver shell shows banner above run list when there's an unread reply linked to today's truck-day jobs. Tap → opens detail sheet, marks reply read.
- **Truck-Runs card reply chip.** Cards show *Reply* chip when customer texted back.
- **One-tap reschedule cue.** Inbound rows whose body matches "reschedule / cancel / can't / push / [weekday]" flip *Open job* → *Open & reschedule* with amber tint.
- **`auto_reply` first-class SMS type.** Widened `sms_log.type` constraint and `SmsType` union.

## What's left
✅ Nothing — fully shipped.

## Yamin must do (already in STATUS.md punch list — NOT phase-blocking, just Twilio config)
- Block 8 SQL applied via MCP ✅
- Confirm Twilio webhook URL on AU number → `https://<vercel-domain>/api/sms/inbound` ⏳

## Deferred
- Smart date extraction on inbound replies.
- Per-truck phone numbers.
- Inbound rich threading view.
- Driver shell SMS composer.

## Files touched
- `supabase/migrations/20260504000002_v4_phase3_sms_inbound.sql` (new)
- `api/sms/inbound.ts`
- `src/hooks/useSms.ts`, `src/hooks/useAlerts.ts`
- `src/lib/types.ts`, `src/lib/database.types.ts`, `src/lib/sms.ts`
- `src/components/sms/SmsLogView.tsx`
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/jobs/JobActionMenu.tsx`, `JobDetailDialog.tsx`
- `src/components/driver/MyRunToday.tsx`
- `src/App.tsx`
- `SUPABASE-RUN-THIS.md` (Block 8)
