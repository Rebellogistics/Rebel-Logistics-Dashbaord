# Rebel Logistics — V4 Status

Rolling status log. New phase sections appended at the top so the most recent work is the first thing you see.

- Plan: [`V4_PHASED_PLAN.md`](V4_PHASED_PLAN.md)
- Source transcript: [`TRANSCRIPT_MAY04.md`](TRANSCRIPT_MAY04.md)
- Prior cycle: [`V3_STATUS.md`](V3_STATUS.md), [`V3_PHASED_PLAN.md`](V3_PHASED_PLAN.md)
- **Single SQL guide:** [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md) — Blocks 7 and 8 are V4's migrations. **Both have been applied to Yamin's project on 2026-05-04** via the Supabase MCP (no manual run needed).

---

## Phase 4 — Google Calendar overhaul
_Implemented: 2026-05-04. Source: V4_PHASED_PLAN.md §Phase 4._

### What's done (✅)
- **Per-truck calendar option.** Settings → Integrations → Google card now shows a *Calendar layout* toggle: **Single calendar** (legacy default) or **Per-truck calendars**. Switching to per-truck doesn't pre-create anything heavy — `/api/calendar/sync` lazy-creates *Rebel Logistics — Truck N* secondary calendars on first sync to a new truck (uses the same `calendar.app.created` scope already granted). Yamin can colour-code them in his iPhone Calendar so Truck 1 vs Truck 2 separate visually — the May 4 ask: *"I wanna click on the day and see all the jobs for the one truck and all the jobs for the second truck — without having to have a list."*
- **Synthetic time slots so events render as discrete blocks.** Calendar events were stacking as an all-day list because every job came in as a `start: { date }` all-day item. Now jobs with the V4 1.1 `sequence` set get a timed event: `start = 08:00 + sequence_index × 30min`, `end = +30min`, in `Australia/Melbourne`. Visualisation only — the dashboard stays the source of truth for ordering. Jobs without sequence (legacy) fall back to all-day.
- **Tappable Maps URLs** for both pickup and delivery in the event description — separate lines so iOS Calendar recognises them as links. The plain delivery address is also stored in `location` so Google Calendar's inline map preview still works.
- **Richer event description.** Rewritten layout:
  ```
  Contact: Jane Smith
  Phone: 04xx xxx xxx
  Pickup: 12 Hallam Rd, Hallam
    https://www.google.com/maps/search/...
  Delivery: 24 St Kilda Rd, St Kilda
    https://www.google.com/maps/search/...
  Metro · 2.5 m³ · 80 kg
  Notes: Heavy marble table — 2-person lift
  Driver: A. Driver
  Open on dashboard: https://<host>/?tab=Truck%20Runs&date=2026-05-08&truck=Truck%201
  Rebel Logistics · RL-2026-0042
  ```
  Lead identity is now company name (V4 1.3/1.8 alignment) — fall back to customer name when no company is set.
- **Deep-link from calendar event back to Truck Runs.** Tap the `Open on dashboard` URL in the event → lands on the dashboard with Truck Runs already selected and the day picker on the job's date. Required two tiny URL-state sync hooks on `App.tsx` (`?tab=`) and `TruckRunsView.tsx` (`?date=`).
- **Backfill button works with the new format.** The existing *Sync open jobs (N)* button on the integration card unchanged — it loops every truck-assigned active job through `/api/calendar/sync`, which now picks the right per-truck calendar and writes the new structured payload. After Yamin flips to per-truck mode, one click moves all open events to the new layout. (Old events on the legacy single calendar remain as orphans — Yamin can manually delete that calendar in Google Calendar after switching, if he wants a clean slate.)
- **New endpoint `/api/calendar/mode`** (POST) flips `integrations.metadata.calendar_mode` between `single` and `per_truck`. Auth-gated via the user's Supabase JWT. The sync endpoint reads the mode at request time so a flip takes effect on the very next sync — no redeploy.

### What needs Yamin (⏳)
- **No SQL block to run.** Phase 4 is server + UI only — `integrations.metadata` already accepts arbitrary JSON, so no schema changes.
- **Try the per-truck mode end-to-end:**
  1. Settings → Integrations → Google card → click **Per-truck calendars**.
  2. Click **Sync open jobs (N)** to push every truck-assigned open job to the new calendars.
  3. Open Google Calendar on iPhone → toggle visibility per truck → colour them differently.
- **Confirm the deep-link lands on the right day** by tapping the `Open on dashboard` line in any new calendar event from his phone.

### What's deferred (🕐)
- **Two-way sync** (drag a Google Calendar event → dashboard date updates). Same V3 reasoning — Yamin lives in the dashboard for booking; flag if his preference shifts.
- **Auto-clean orphan events on the legacy calendar after switching to per-truck.** Today the old events stay (the new format files to new calendar IDs; the old IDs are forgotten). A "scrub the old calendar" tool is a follow-up if Yamin wants the cleanup automated.
- **Driver invite as event attendee** (driver gets the calendar event in their own Google account). Needs a driver email field — defer.
- **Multi-day or arrival-window events.** Today every job is a 30-minute slot. Real-world stop times vary; not a Phase 4 concern but flagged if Yamin wants it.

### How to try it
- **Synthetic time slots:** complete a real V4 1.1 reorder on Truck Runs, then click *Sync open jobs* on Settings → Integrations. Open Google Calendar on the device → events now appear at 08:00, 08:30, 09:00… mapping to run order, not stacked as one all-day list.
- **Per-truck calendars:** flip the toggle, sync, then open Google Calendar settings → see **Rebel Logistics — Truck 1** + **Rebel Logistics — Truck 2** as separate calendars. Hide one to see only the other; tap colour swatches to differentiate.
- **Tappable Maps + deep-link:** open any new event on iPhone Calendar → tap the *Pickup* or *Delivery* URL → Maps directions. Tap *Open on dashboard* → Truck Runs lands on the right day with that truck's column visible.

### Files touched
- `api/calendar/sync.ts` — new `buildPayload`, per-truck calendar selection, deep-link, `createCalendarForTruck` helper
- `api/calendar/mode.ts` (new) — POST endpoint to flip the mode
- `src/hooks/useIntegrations.ts` — `useSetCalendarMode` hook + `CalendarMode` type
- `src/components/settings/IntegrationsSection.tsx` — `CalendarModeToggle` component
- `src/App.tsx` — `?tab=` URL → activeTab on mount
- `src/components/truck-runs/TruckRunsView.tsx` — `?date=` URL → selectedDate on mount

---

## Migrations applied (2026-05-04)

Both V4 migrations have been applied **directly to Yamin's Supabase project** via the Supabase MCP — no need for him to run them by hand:

- **Block 7 (V4 1.1):** `jobs.sequence` column + `idx_jobs_truck_date_sequence` index.
- **Block 8 (V4 3.2):** `sms_log` extended with `direction`, `provider_message_id`, `parent_message_sid`, `customer_id` (TEXT to match `customers.id`), `read_at`. `direction` and `type` check constraints widened. Four new indexes for inbound/outbound query patterns.

Verified post-apply: every column + index exists.

**Note on `customer_id` type:** the migration originally used `UUID` but `customers.id` is `TEXT` in Yamin's project — fixed to `TEXT` and re-applied successfully. Both the local migration file and `SUPABASE-RUN-THIS.md` have been updated to match.

**Security advisor findings on the migrated project:** the post-migration security scan flagged 14 warnings, but **all of them are pre-existing** (RLS-policy permissiveness on `job_history`, `truck_shifts`, `sms_templates`; SECURITY DEFINER functions exposed to the `anon`/`authenticated` roles; one missing RLS policy on the `quote_number_counter` counter; auth-side leaked-password protection disabled). None were introduced by Phase 1.1 or 3.2. Worth a future hardening pass but not a Phase 4 concern.

---

## Phase 3 — Day-prior bulk send + inbound SMS inbox
_Implemented: 2026-05-04. Source: V4_PHASED_PLAN.md §Phase 3._

### What's done (✅)
- **One-click day-prior bulk send.** Truck Runs day view header now carries a *Day-prior (N)* button. N = jobs assigned to a truck for the picker day with a phone number and no day-prior SMS sent yet. Click → confirm dialog → fires the editable `day_prior` template (Settings → SMS Templates) to every eligible customer in parallel. Result toast: *"Day-prior reminders fired · 6 sent · 1 failed"* with the failed customer + reason if any. Each send writes to `sms_log` with `direction='outbound'` and stamps `jobs.day_prior_sms_sent_at` so a re-fire skips already-sent jobs.
- **Per-job day-prior re-send.** The 3-dots menu on every job card (Truck Runs cards + Job Detail dialog header) gets a new *Send day-prior SMS* / *Resend day-prior SMS* item — uses the same bulk mutation with a 1-job payload so the logging + dedup behaviour is identical. For when a customer says "could you send me that confirmation again?"
- **Twilio inbound webhook now writes to `sms_log`.** `/api/sms/inbound` (already returns the auto-reply TwiML) now also: looks up the most recent outbound to the sender's phone in the last 7 days to attach a `parent_message_sid`, looks up the customer record by phone-digit match (last 9 digits, tolerant of `+61` vs `0` prefixes), and inserts an `sms_log` row with `direction='inbound'`. Done in parallel with the TwiML response — a DB hiccup never blocks the auto-reply.
- **Outbound SMS now captures the Twilio Message SID** in `provider_message_id` on every send (the manual SMS dialog, the auto-fire on status transitions, the bulk day-prior). Required for inbound replies to thread back to their parent outbound.
- **Replies tab in Settings → SMS Log.** New tab toggle (*All · Replies*) on the SMS Log view. Replies tab carries an unread badge (e.g. *Replies 7 · 3 new*) and filters to `direction='inbound'`. Inbound rows render with an amber "Reply" chip + a faint accent-tint background and an inline *Open job* / *Open & reschedule* button when linked to a job. *Mark all read* button clears the bell badge. Unread is driven by `read_at IS NULL`; reading a row is one click.
- **Inbound replies surface on the notifications bell.** New `inbound_sms_reply` alert kind in `useAlerts` — every unread inbound row contributes one alert. Severity = warning (so the bell ticks amber). Clicking the alert routes to the SMS Log Replies tab (or the linked job, if any). Bell unread count = critical (failed SMS, overdue) + this new warning count.
- **Driver-side inbound routing.** When the driver shell has an unread inbound reply linked to one of today's jobs on this truck, a Rebel-accent banner renders above the run list: *"N customer replies · Tap a message to open the job"*. Each row shows the customer name + first line of the reply; tap → opens the V4 1.2 detail sheet for that job (so the driver can call back), and marks the reply as read so it disappears from the banner. An × dismiss button skips opening and just marks read.
- **Truck-Runs card reply chip.** Job cards on Truck Runs now render a *Reply* chip when the customer has texted back (any unread inbound row linked to that job). Lets Yamin scan a day at a glance to see who needs a follow-up phone call.
- **One-tap reschedule cue.** Inbound rows in the Replies tab whose body matches a "reschedule / cancel / can't / push / [weekday name]" regex flip the *Open job* button to *Open & reschedule* with an amber tint. No date parsing yet — just a hint that the reply is probably a booking change. Yamin lands in the job dialog where the V3 Phase 2 inline edit lets him change the date in two clicks.
- **`auto_reply` is now a first-class SMS type.** Widened the `sms_log.type` constraint and the `SmsType` union to include `auto_reply`, so the V4 1.6 hot-fix template fits the schema cleanly.

### What needs Yamin (⏳)
- **Run Block 8** in `SUPABASE-RUN-THIS.md`. Adds the new `sms_log` columns (`direction`, `provider_message_id`, `parent_message_sid`, `customer_id`, `read_at`), widens the type check, and adds indexes. Idempotent. **Without this block:** day-prior bulk send still works, but the Replies tab stays empty and the bell badge never lights up because there's nowhere to write inbound rows.
- **Confirm the Twilio webhook URL.** Already a Phase 1 ask — must be set to `https://<your-vercel-domain>/api/sms/inbound` on the AU number's Messaging settings. The endpoint is identical; this phase just made it write to the DB in addition to replying.
- **Test the round-trip** from a different phone:
  1. Schedule a job for today/tomorrow on Truck Runs, click *Day-prior (1)* → confirm → check the customer's phone for the SMS.
  2. Reply to that SMS from the customer phone.
  3. Within ~1s the dashboard bell pings (warning tier), the Replies tab shows the new message, and the linked Truck Runs card shows a *Reply* chip.

### What's deferred (🕐)
- **Smart date extraction.** The reschedule cue is keyword-based ("Monday", "tomorrow", "reschedule"). Auto-suggesting *[Mon 12 May] [Tue 13 May]* buttons that pre-fill the job date needs a small date parser — flag if Yamin wants it after he uses the keyword version for a week.
- **Per-truck phone numbers.** The plan flagged per-truck Twilio numbers eventually; replies are routed via `parent_message_sid` lookup so adding more numbers is straightforward. Defer until Yamin asks.
- **Inbound rich threading view.** The Replies tab shows each inbound row as a flat card. A real "thread by customer" UI (parent outbound + reply chain) would group related messages — flag if the flat list gets noisy in production.
- **Driver shell REPLY composer.** The driver banner is read-only today (open job → call back). A "tap to text back" composer is doable but adds Twilio outbound-from-driver cost considerations — defer.

### How to try it
- **Bulk day-prior**: Truck Runs → drop a couple of jobs onto Truck 1 for tomorrow → header shows *Day-prior (2)* → click → confirm → check the recipient's phone.
- **Inbound flow**: reply from a different phone to one of those messages → within ~1s:
  - Bell badge ticks up (top right of the dashboard)
  - SMS Log → Replies tab shows the message with a *Reply* chip
  - Truck Runs card for that job shows the *Reply* chip
  - On the driver shell, the banner appears at the top of *Today*
- **Mark read**: click *Mark all read* in the Replies tab, or click any single row to mark just that one.
- **Reschedule cue**: text "can we move to Tuesday" — the row in Replies shows *Open & reschedule* (amber). Click → job dialog opens. (Date stays for Yamin to set manually for now.)

### Files touched
- `supabase/migrations/20260504000002_v4_phase3_sms_inbound.sql` (new)
- `api/sms/inbound.ts`
- `src/hooks/useSms.ts`
- `src/hooks/useAlerts.ts`
- `src/lib/types.ts`
- `src/lib/database.types.ts`
- `src/lib/sms.ts`
- `src/components/sms/SmsLogView.tsx`
- `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/jobs/JobActionMenu.tsx`
- `src/components/jobs/JobDetailDialog.tsx`
- `src/components/driver/MyRunToday.tsx`
- `src/App.tsx`
- `SUPABASE-RUN-THIS.md` (Block 8 added)

---

## Hot-fix — SMS templates not updating
_Implemented: 2026-05-04 (during Phase 2). Triggered by Yamin's bug report: "can't get the SMS template to update on Twilio reply SMS when received."_

### What was wrong (3 things — all related to "edits in Settings → SMS Templates didn't reach customers")

1. **Auto-fired SMS** (en-route on *Start run*, delivered on *Mark delivered*) was reading from the hardcoded `DEFAULT_TEMPLATES` constant in `src/lib/sms.ts`, **never** the `sms_templates` DB rows that Yamin edits in Settings. So Yamin could save an edit, see it persisted, then the next status-transition SMS would still go out with the original wording.
2. **Twilio inbound auto-reply** (the message customers get when they text the Rebel number) was hardcoded inline in `api/sms/inbound.ts`. There was no template row, no Settings UI to change it. The exact bug Yamin flagged tonight.
3. **Settings → SMS Templates editor** had a `setState`-during-render anti-pattern (lines 67–72 of `SmsTemplatesSection.tsx`). It would sync the draft once on first selection, then refuse to re-sync after a Save refetch — which made it *look* like the edit hadn't landed in some flows.

### What's done (✅)
- **Auto-fire path now reads `sms_templates`.** `maybeAutoFireStatusSms` in `src/hooks/useSms.ts` queries the DB row for the matching key (`en_route` / `completed`) and only falls back to `DEFAULT_TEMPLATES` if the row is missing, inactive, or the table errors. Logged on fall-back so we'd notice if the DB call is failing silently.
- **Twilio inbound now reads `sms_templates`.** `api/sms/inbound.ts` queries `sms_templates` (key=`auto_reply`) via the service-role admin client at request time. Renders `{{owner.businessName}}` and `{{owner.phone}}` from `REBEL_BUSINESS_NAME` / `REBEL_SUPPORT_PHONE` env vars, falls back to a hardcoded default when the row is missing.
- **New built-in `auto_reply` template** added to `DEFAULT_TEMPLATES` so it shows up in the Settings → SMS Templates list immediately. Yamin can edit the wording without redeploying. The Settings preview renders with a sample `+61 4xx xxx xxx` for `{{owner.phone}}`; production swaps in the real env-var value.
- **Editor anti-pattern fixed.** Replaced the during-render `setState` with a `useEffect` keyed on the selected template's key/id. Background refetches no longer clobber an in-progress edit; the editor draft only resets when Yamin picks a different template.
- **Variable palette + template-context** now expose `{{owner.phone}}` so the auto-reply preview substitutes correctly.

### What needs Yamin (⏳)
- **Set two env vars** on Vercel (Production):
  - `REBEL_SUPPORT_PHONE` — the support phone customers should call. Already required for V4 1.6; if it was set earlier, nothing to do.
  - `REBEL_BUSINESS_NAME` — defaults to `Rebel Logistics` when unset, so this is optional unless he wants a different name in the auto-reply.
- **Edit the templates** that needed wording changes (Settings → SMS Templates → pick *En route* / *Job complete* / *Auto-reply (when customer texts back)* → edit → Save). The next time the matching event fires, the customer will see the new wording.
- **Re-test the failing scenario:** edit the *Auto-reply* template, save, then text the Twilio number from a different phone. The reply should match what's in Settings — not the V4 1.6 hardcoded fallback.

### Files touched
- `src/hooks/useSms.ts`
- `src/lib/sms.ts`
- `src/components/settings/SmsTemplatesSection.tsx`
- `api/sms/inbound.ts`

---

## Phase 2 — Quote-form correctness + small UX debts
_Implemented: 2026-05-04. Source: V4_PHASED_PLAN.md §Phase 2._

### What's done (✅)
- **Desktop New Job button** in the top bar (right cluster, hidden on `<lg`). Wired through `App.tsx` → `setNewQuoteOpen(true)` → opens the full `NewQuoteDialog` (not the mobile QuickQuote). Yamin's call quote: *"From the dashboard, where can I add new job?"* — now one tap from any tab on desktop.
- **Duplicate customer prevention.** `NewQuoteDialog` now scans the customer book against the typed company-name / customer-name as Yamin types. When a near-match is found (Levenshtein-based fuzzy compare with a 20% tolerance — *"Bayless"* vs *"Bayleys"* trips it; short names need exact-ish matches), an amber banner appears above the combobox: *"Did you mean Bayleys Rugs? They're already in your customer book · 7 previous bookings · Linking avoids a duplicate row."* One-click *Use existing* button links the quote to that customer. Helpers landed in `src/lib/utils.ts` (`normaliseName`, `levenshtein`, `isNearDuplicate`).
- **Match-reason chip in customer combobox.** Each result row in `CustomerCombobox` now displays a tiny *company / contact / phone / email* uppercase chip indicating which field triggered the match. Removes the "why is this customer showing up?" guesswork from the May 4 call.
- **Required-field rules locked.** `NewQuoteDialog`'s submit handler now confirms before saving when delivery address is empty (Yamin's "delivery is always a must" rule). Drafts skip the confirm — a half-finished phone-call quote is the explicit use-case. Customer/company name remains the only hard required identity (V4 1.5 already in place).
- **Customer search by phone — verified working.** Both `CustomersView` (Customers tab) and the global `useSearch` hook already match against normalised phone digits (3-digit minimum). The `MatchReason` chip in 2.7 surfaces *why* each row matched so Yamin can tell at a glance.
- **Stops counter — verified job-based.** Both `TruckRunsView` and `TrucksView` already count `jobs.length`, not unique addresses. Yamin's call wording was ambiguous; the existing implementation matches the spirit of his ask. No code change needed.
- **3-dots menu in the dialog edit pane.** `JobDetailDialog` now renders `JobActionMenu` next to both the *Edit* button (non-edit mode) and the *Cancel/Save* cluster (edit mode). The menu's *Mark complete…* path triggers a local `MarkCompleteDialog` instance scoped to the dialog so the proof flow runs without exiting edit. *Move to truck*, *Move to status*, *Decline*, *Back to Accepted* all use the existing `useUpdateJob` mutation; unassign clears `sequence` to mirror V4 1.1's drop-on-Accepted handler.
- **Live identity preview** under the contact-phone field. A small bordered card shows what the quote will save as — primary identity, contact line, phone — updating live as Yamin types. Catches the "I typed the contact person in the customer field" pattern before save.

### What needs Yamin (⏳)
- Nothing — all client/server changes ship without new SQL or env vars (the auto-reply env vars are part of the SMS hot-fix above).

### What's deferred (🕐)
- **Quote-form contact UX cosmetic polish.** The "Optional" label on the contact field switches based on whether company is set; happy with this until Yamin says otherwise.
- **Edit-mode delivery confirm.** The *create* path now confirms before saving without delivery; the *edit* path doesn't. Edits are usually adding info, not removing — flag if Yamin clears delivery and saves silently.
- **QuickQuoteDialog parity.** The mobile quick-add still uses the simple name+phone flow with no company field, so the dup detection and B2B model don't apply there. If Yamin wants company-aware quick-add, easy follow-up.

### How to try it
- **Desktop New Job:** open the dashboard at `≥lg` width → blue *+ New job* button in the top-right of the header → opens the full quote dialog.
- **Dup warning:** Customers → make sure *Bayleys Rugs* exists. New Quote → start typing *Bayless* in the company field → amber banner appears with *"Did you mean Bayleys Rugs?"*. Click *Use existing* → linked.
- **Required field gate:** New Quote → enter customer + cubic metres but leave delivery blank → click *Create quote* → confirm prompt fires; cancel and add the address, or proceed to save anyway.
- **3-dots in edit:** open any non-completed job → *Edit* → 3-dots in the header cluster → pick *Mark complete…* → proof sheet opens without exiting edit.
- **Live preview:** start typing in the customer combobox → preview card under Phone updates each keystroke.

### Files touched
- `src/App.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/jobs/NewQuoteDialog.tsx`
- `src/components/jobs/JobDetailDialog.tsx`
- `src/components/customers/CustomerCombobox.tsx`
- `src/lib/utils.ts`

---

## Phase 1 — Tuesday shakedown blockers
_Implemented: 2026-05-04. Source: V4_PHASED_PLAN.md §Phase 1._

### What's done (✅)
- **Drag-to-reorder inside truck columns.** Every truck-column card on Truck Runs is now both draggable AND a drop target. Drag a card and drop it on another card to slot the dragged job into that position — Yamin's exact "I get a phone call, push this job before that one" flow. Drop on the column header / empty area still appends to the end. Order persists via a new `sequence` integer column on `jobs` (Block 7 — `V4-PHASE1-SEQUENCE.sql` at `supabase/migrations/20260504000001_v4_phase1_run_sequence.sql`). On every drop the dashboard rewrites `sequence = 0,1,2,…` for the whole truck-day so the list always sorts cleanly.
- **Driver shell respects the new run order.** `MyRunToday` sorts today's jobs by `sequence ASC` with a `created_at` fallback for jobs created before V4. The order Yamin sees on Truck Runs is exactly the order the driver sees on the truck shell.
- **Driver shell tap-to-open.** The truck-side run cards are now clickable — tapping anywhere away from the action buttons opens a full-detail sheet showing **company name** (primary line), contact person + phone (tappable `tel:`), pickup + delivery (Maps deep-links), **job type chip** (Standard / White Glove / House Move + Metro/Regional + cubic metres), date, truck, completed-by attribution if applicable, and the full notes block from the booking. **No price** — Yamin called this out specifically. The phone tap, Maps tap, Start run, and Mark delivered buttons all `stopPropagation` so they keep working without double-firing into the detail sheet.
- **Driver shell card primary identity.** The run-list card now leads with **company name** (e.g. *Bayleys Rugs*) when one is set, falling back to the customer name. The contact person renders as a sub-line `Contact: Jane Smith`. Yamin's quote: *"the company name is what will show up on there. They don't need to know them personally."*
- **Numeric inputs accept direct typing again.** The cubic-metres, item-weight, estimated-hours, hourly-rate, fee, fuel-levy, and per-customer override-rate fields all swapped from `<input type="number">` to `<input type="text" inputMode="decimal">` with a `sanitiseDecimal` filter (`src/lib/utils.ts`). Fixes Yamin's reproduction on the call where typing 8 to replace a 3 was getting suppressed; mobile users still see the decimal keypad via `inputMode`. Covers `NewQuoteDialog`, `JobDetailDialog`, `AcceptDialog`, `CustomerDialog`.
- **B2B pre-fill cleanup on quote-create.** When a customer with a `companyName` is picked from the dropdown, the contact name, phone, and pickup address all stay **blank** — the contact person and pickup change every booking for B2B clients (Bayleys Rugs etc.). Only the company identity + `customerId` carry across. Individual customers (no `companyName`) keep the existing pre-fill behaviour. Validation also relaxed: a quote can now be saved with **just a company name** (the contact-person field is optional for B2B), matching Yamin's "customer is the only thing that's not optional" rule from the call.
- **Owner job dialog identity** already led with company-name-as-primary via `customerDisplay()` in V3 (verified line ~485 of `JobDetailDialog.tsx`). Logging here so the symmetry across owner ↔ driver is captured.
- **Twilio inbound auto-reply replaced.** New `/api/sms/inbound` endpoint returns a Rebel-branded TwiML auto-reply ("Hi! This number isn't monitored. For booking changes, please call Rebel Logistics on `<REBEL_SUPPORT_PHONE>`") instead of Twilio's default `Configure your number's SMS URL…` boilerplate. The endpoint verifies Twilio's signature header so a random caller can't trigger us to mint replies. Yamin saw the default boilerplate on the call and we cannot ship that to customers on Tuesday.
- **Live updates on the truck shell.** `useRealtimeJobs` is now mounted in `DriverShell` so when Yamin reorders / reassigns / edits a job from the office mid-shift, the truck shell refreshes within ~1s without a manual reload.
- **Run-order change toast on driver shell.** After every realtime broadcast, `MyRunToday` compares the current run-order signature (`id:sequence:truck` joined) against the previous render and fires a one-line toast — *"Run updated by office · Today's order changed at HH:MM"* — when the order shifts. First paint is silent; only mid-shift changes show the toast.

### What needs Yamin (⏳)
- **Run Block 7** in `SUPABASE-RUN-THIS.md` (the single new SQL block for V4). Idempotent. Without it the `sequence` column doesn't exist and the dashboard's reorder writes will fail.
- **Set the Twilio inbound webhook** on the AU number (Twilio Console → Phone Numbers → Active Numbers → click the Rebel number → Messaging → "A message comes in" → `Webhook` → `https://<your-vercel-domain>/api/sms/inbound` → POST → Save). Without this, customers replying to outbound SMS still get Twilio's default boilerplate.
- **Add two env vars on Vercel** (Production + Preview):
  - `REBEL_SUPPORT_PHONE` — the phone customers should call instead of replying. e.g. `+61 412 345 678`. If unset, a generic fallback message goes out.
  - `TWILIO_WEBHOOK_PUBLIC_URL` (optional) — only if your custom domain differs from the Vercel host. e.g. `https://app.rebellogistics.com.au/api/sms/inbound`. The signature-validation step uses this exact URL.
- **Re-test the driver flow on Tuesday with two devices.** Open Truck Runs on the laptop, open the driver shell on the tablet/phone, drag a card to a different position → confirm the order changes on the tablet within a second and the toast fires.

### What's deferred (🕐)
- **Reorder inside Accepted / Scheduled columns.** Only truck columns are reorderable today — Yamin's specific use-case. Easy add later if he wants quote-priority signalling.
- **Quote-form contact-person UX polish** (hint text says "Optional" when a company is set; visual nudge when starting from a B2B pick) — already partly there. Flag if Yamin asks for the right-rail identity preview from the +1 list.
- **Twilio inbound inbox in the dashboard.** The auto-reply is the gap-stop; Phase 3 adds the proper inbox + reply routing (day-prior → owner, en-route → driver) and threads inbound replies into `sms_log`.
- **QuickQuoteDialog identity model** — the mobile quick-add dialog still uses the simple `name + phone` flow, no company field. Not a B2B path so the duplicate-customer bug doesn't manifest there. If Yamin wants company-aware quick-add, easy follow-up.

### How to try it
- **Reorder**: Truck Runs → drag a card from Accepted onto Truck 1 → drop it on the second card in Truck 1 → it slots **above** that card. Drag again within Truck 1 → drop on a different card → it moves to that slot. Open the driver shell on a second device → cards appear in the same order. Office-side reorder mid-session → the truck shell shows the toast and re-orders.
- **Driver detail sheet**: log in to `/` as a truck role → tap any job card on the run list → full-detail sheet opens. Tap the phone number → dialer. Tap Maps icon → directions. Tap *Start run* → starts without re-opening the sheet.
- **Numeric inputs**: open a quote → House Move → type `2` in estimated hours → it bumps to `3` on blur (still works). Now select the `3` and type `8` directly — works (this was broken before today).
- **B2B pick**: Customers → find Bayleys Rugs → New Quote → pick Bayleys from the dropdown. The contact name, phone, and pickup all stay blank. Type the new contact + phone for THIS booking → save. Repeat with a different contact → no duplicate customer is created (linked via `customerId`).
- **Twilio auto-reply**: after Yamin sets the webhook, reply to any outbound Rebel SMS. You should see the new branded message, not the Twilio boilerplate.

### Files touched
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
- `src/lib/types.ts`
- `src/lib/utils.ts`
- `src/lib/database.types.ts`
- `SUPABASE-RUN-THIS.md` (Block 7 added)

---

**Next milestones:**
- **Tue 2026-05-05** — first real-world driver trial. Phase 1 live (this entry).
- **Thu 2026-05-07, 8:30pm** — sync meeting. **Phases 2–3** demoable (quote-form correctness · day-prior SMS button · inbound SMS inbox).
- **~Mon 2026-05-18** — marketing website work resumes after Phases 4–6 are closed.
