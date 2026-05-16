# Rebel Logistics — STATUS

The single living state doc. Every cycle, every phase, what's left. New
cycles append at the bottom of the **Phase index**. Per-phase detail
lives in `docs/archive/phases/<phase>.md`. In-flight phases stay
inline at the bottom of this file until they ship.

_Last refreshed: 2026-05-15 (post-call). Transcript: [`transcripts/TRANSCRIPT_20260515.md`](docs/archive/transcripts/TRANSCRIPT_20260515.md)._

---

## 🔴 Open action items (cross-phase)

### Blocking — needs Sumanyu this week

1. **Inbound webhook URL** on the AU Twilio number → `https://<vercel-domain>/api/sms/inbound` (POST). Sumanyu confirmed on 2026-05-15 call still pending. Without this, customer replies vanish into Twilio's default boilerplate instead of landing in the dashboard Replies tab.

2. **Owner-context env vars on Vercel** (Production scope, no redeploy needed):
   - `VITE_REBEL_SUPPORT_PHONE="+61 420 411 168"` — fills `{{owner.phone}}` in en-route, day-prior, delivered templates.
   - `VITE_REBEL_BUSINESS_NAME="Rebel Logistics"` — defaults to that anyway, optional.
   - `REBEL_SUPPORT_PHONE="+61 420 411 168"` — server-side equivalent for the inbound TwiML auto-reply.
   - `REBEL_BUSINESS_NAME="Rebel Logistics"` — server-side equivalent.

### Blocking — needs Yamin

3. **Cancel Anthropic Claude $170/mo subscription.** Sumanyu now has own cloud. Yamin agreed on 2026-05-15 call; data export ZIP already shared. Recurring charge until cancelled.

4. **Send Sumanyu Google review URL** (or grant edit access to the Rebel Logistics GMB page). Needed to wire V5 Phase 4 (review-request SMS). On-call MacBook couldn't fetch the link.

5. **Call accountant Malik → $1,000 Remitly transfer.** Yamin emailed Malik before call, no response yet. Following up this week.

### Awaiting external

6. **Twilio AU sender registration** — Submitted live on 2026-05-15 call as `RBL Logistics` (Australia, transactional, ABN-backed, LLC, transportation). In manual review, 25 business days → expected approval **~2026-06-19**. When approval email lands → set `TWILIO_SENDER_ID="RBL Logistics"` on Vercel and outbound flips immediately.

### Open thread (workaround in place)

7. **Calendar cleanup-legacy "every push failed"** during per-truck migration testing. **Workaround:** stay on **Single calendar** mode (re-confirmed on 2026-05-15 call — Sumanyu told Yamin not to toggle). Per-truck retry scheduled as V5 Phase 7.

### Recommended / scheduled

8. **Marketing website kicked off 2026-05-15.** V1 demo scheduled for Sun 2026-05-17 evening call (same Sunday slot as platform check-ins). Yamin's separate engagement, same Sumanyu.

9. **Cousin lead (referral).** Yamin gave his marketing-business cousin Sumanyu's portfolio + contact. Cousin lost customers for not bundling websites. Yamin will follow up over the weekend (~2026-05-17). Track but no action needed from Sumanyu.

### Deferred (not blocking)

- Per-truck phone numbers (V4 7.2 +1) — every truck = its own Twilio number.
- Smart date extraction on inbound replies (V4 3.5 +1).
- Driver SMS composer.
- Auto-clean orphan events on legacy calendar after per-truck switch.
- Pre-existing security advisor warnings (RLS permissiveness, SECURITY DEFINER on anon, leaked-password protection off).
- **Editable service catalog** (V5 Phase 10) — Yamin asked, Sumanyu flagged as scope-expander; revisit after V5 1–9 ship.

### Money + meeting state

- $1,500 total (platform + website). $1,000 invoice pending Malik signoff.
- $500 invoice separately, before/after website at Yamin's discretion.
- AUD $120/month retainer kicks in once $500 clears.
- Indian-business invoice fine (no AU GST needed) provided business is matchable.
- **Next call:** Sun 2026-05-17 evening — platform updates async via text in between, website V1 reviewed live on call.

---

## Phase index

### V4 cycle (closing out)

| Phase | Name | Status | What's left | Detail |
|---|---|---|---|---|
| 1 | Tuesday shakedown blockers | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-1.md`](docs/archive/phases/v4-phase-1.md) |
| 2 | Quote-form correctness + UX | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-2.md`](docs/archive/phases/v4-phase-2.md) |
| 3 | Day-prior bulk + inbound inbox | ✅ shipped 2026-05-04 | 🟡 bulk send must respect new V5 P1 flags + toast (rolled into V5 P1) | [`phases/v4-phase-3.md`](docs/archive/phases/v4-phase-3.md) |
| 4 | Google Calendar overhaul | ✅ shipped 2026-05-04 | 🟡 cleanup-legacy fails; per-truck retry in V5 P7 | [`phases/v4-phase-4.md`](docs/archive/phases/v4-phase-4.md) |
| 5 | Tasks (warehouse load-up) | ✅ shipped 2026-05-04 | 🟡 driver/truck assignment UI in V5 P6 | [`phases/v4-phase-5.md`](docs/archive/phases/v4-phase-5.md) |
| 6 | Dashboard reorg + small things | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-6.md`](docs/archive/phases/v4-phase-6.md) |
| 7 | Twilio AU alphanumeric | ⏳ submitted 2026-05-15 as `RBL Logistics` | ⏳ awaiting AU carrier approval ~2026-06-19 | [`phases/v4-phase-7.md`](docs/archive/phases/v4-phase-7.md) |

### Hot-fixes (bug reports during V4 cycle)

| Hot-fix | Status | Detail |
|---|---|---|
| SMS templates not updating | ✅ shipped 2026-05-04 | [`phases/hot-fix-sms-templates.md`](docs/archive/phases/hot-fix-sms-templates.md) |
| En-route button missing on dashboard | ✅ shipped 2026-05-04 | commit `364d0a3` |
| Driver-shell en-route double-fire | ✅ shipped 2026-05-04 | commit `364d0a3` |
| `/api/sms/send` returning 404 on plain Vite | ✅ shipped 2026-05-05 | commit `651e70f` |

### V5 cycle (kicked off 2026-05-15)

Yamin's batch from the 2026-05-15 call + 4 proactive items Yamin confirmed (customer history view, drag-reorder, cost reconciliation, firstname SMS variable). 10 phases total, sequenced for value-per-dev-hour.

| Phase | Name | Status | Detail |
|---|---|---|---|
| 1 | Per-job SMS toggles + bulk send guardrails + toast | 🟣 in flight (this week) | inline below |
| 2 | PWA polish (safe-area + manifest + icons) | 🟣 in flight (this week) | inline below |
| 3 | Customer pricing presets + full edit + history view | 🟣 in flight (this week) | inline below |
| 4 | SMS template pack: Google review + firstname variable + URL shortener | 🟣 in flight (this week) | inline below — blocked on Yamin sending GMB review URL |
| 5 | Storage module (new top-level tab + reminders + convert) | ⏸ next-week batch | inline below |
| 6 | Tasks: driver/truck assignment | ⏸ next-week batch | inline below |
| 7 | Calendar dedup UI + per-truck cleanup retry | ⏸ next-week batch | inline below |
| 8 | Drag-reorder daily run order | ⏸ next-week batch | inline below |
| 9 | Job cost reconciliation (clocked vs billed) | ⏸ next-week batch | inline below |
| 10 | Editable service catalog | ⏸ deferred | inline below |

### V3 cycle (archived)

Fully shipped 2026-04 to 2026-05. Per-phase detail lives in [`docs/archive/v3/`](docs/archive/v3/). Read only if a question references V3 specifically.

---

## In-flight phase detail

Full content of every V5 phase below until shipped. Once a phase ships, it collapses to a one-liner above and full detail moves to `docs/archive/phases/v5-phase-<m>.md`.

### V5 Phase 1 — Per-job SMS toggles + bulk send guardrails (this week)

**Source:** 2026-05-15 call. Yamin asked for 3 independent per-job SMS opt-out toggles, citing two real cases:
- Full-day single-customer jobs: customer already knows, doesn't need day-prior or complete texts.
- Mid-day half-day jobs slotted after deliveries: en-route signal still needed for dispatcher visibility, but customer doesn't always need the text.

**Schema:**
```sql
ALTER TABLE jobs
  ADD COLUMN send_day_prior BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN send_en_route  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN send_complete  BOOLEAN NOT NULL DEFAULT true;
```

**UI:**
- 3 checkboxes in job dialog under a "Customer SMS" sub-heading.
- Labels match the template names ("Day-prior reminder", "En-route notice", "Job complete").
- Default all-ON for new jobs; backfill all existing jobs to true.

**Wiring (key invariant Yamin called out):**
- En-route button on driver shell ALWAYS fires the status update (dispatcher dashboard must see truck movement). Only the customer SMS is gated by `send_en_route`.
- Same for complete: completion event always recorded; customer SMS gated by `send_complete`.
- Day-prior bulk send (V4 Phase 3): exclude jobs where `send_day_prior = false` from the recipient list.

**Smart defaults (proactive — flag if not wanted):**
- Customer with `billing_basis = 'hourly'` or a custom-priced rule (set in V5 P3): default `send_day_prior` OFF on new jobs.
- New one-off residential customer: all three default ON.

**Toast notifications (from 2026-05-15 ask):**
- Bulk day-prior send result toast: "Sent N day-prior reminders. Skipped M (SMS off). Failed K."
- Same pattern for en-route + complete (per-job toast on send result).

**Bulk send guardrail verification:**
- Phase 3 bulk send currently fans out to every job on the selected date. After this phase MUST filter by `send_day_prior = true`. Verify in dev with a job whose flag is OFF before deploying.

---

### V5 Phase 2 — PWA polish (this week)

**Source:** 2026-05-15 — Yamin uses dashboard as home-screen app on his phone ("set up on the bottom of my phone"). Reports it as "finicky" — specifically the top of the dashboard is clipped by the iOS notch/status bar. Confirmed it's PWA-only (browser is fine).

**Build:**
- `public/manifest.json`: `name`, `short_name: "Rebel"`, `display: standalone`, `theme_color`, `background_color`, icon set (192, 512, maskable).
- `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` + apple-touch-icon links + theme-color meta.
- Top nav: `padding-top: env(safe-area-inset-top)`.
- Generate icons from the Rebel logo (PNG: 192/512/maskable-512).

**Test:**
- Re-add to home screen on iOS Safari, verify no notch clipping, verify icon renders correctly, verify status bar overlay color matches theme.

---

### V5 Phase 3 — Customer pricing presets + full customer edit + history view (this week)

**Source:** 2026-05-15. Two asks merged with one proactive:
- Per-customer preset pricing (negotiated flat or hourly rates).
- Full edit-customer dialog (currently exposes only a couple fields).
- Customer history view ("mini-CRM") — proactive, confirmed by Yamin.

**Schema:**
```sql
ALTER TABLE customers
  ADD COLUMN default_service     TEXT,
  ADD COLUMN default_rate_cents  INTEGER,
  ADD COLUMN billing_basis       TEXT CHECK (billing_basis IN ('hourly','flat','per_item','none')) DEFAULT 'none',
  ADD COLUMN default_notes       TEXT;
```
(Use TEXT for `default_service` since service catalog isn't a separate table yet — V5 P10 makes it one. Migration-safe later.)

**UI — pricing + edit:**
- Full customer-edit dialog: all contact fields + new pricing fields editable. Reachable from customer row in list and from the customer chip on any job.
- New job dialog: when a customer with a pricing rule is selected, show a "**Pre-fill from {Customer}**" button. Loads service + rate + notes. Yamin still confirms by clicking; never auto-overwrite job fields.
- **GST label invariant:** wherever the default rate is shown, render via `jobTotalIncGst()` helper so the GST stance is labelled (memory rule).

**UI — history view:**
- New section on customer page (or expandable drawer): every past job (date, service, total, status), every past storage record (V5 P5), lifetime revenue total, last contact date.
- Default sort: date desc. Row click → opens the job / storage record.
- Skip storage rows until V5 P5 ships; placeholder is fine.

---

### V5 Phase 4 — SMS template pack: Google review + firstname variable + URL shortener (this week)

**Source:** 2026-05-15. Yamin wants a Google review request SMS after job complete. Sumanyu offered to handle the URL shortener so the link doesn't look ugly. Customer firstname variable confirmed proactive.

**Blocked on:** Yamin sending the Google review URL (or granting GMB edit access).

**Build:**
- New template type `review_request` in `sms_templates`.
- New variable `{{customer.firstname}}` — derived from existing customer name (split on first space; fallback to full name if no space).
- URL shortener: new API route `/api/r/[slug]` doing 301 redirect, backed by `short_links` table (slug, target_url, owner_label, created_at, hit_count). Brand-owned, no third-party.
- Seed link: slug `rebel` → Yamin's Google review URL. Template body uses `https://<vercel-domain>/r/rebel` so it stays tidy.

**Schema:**
```sql
CREATE TABLE short_links (
  slug         TEXT PRIMARY KEY,
  target_url   TEXT NOT NULL,
  owner_label  TEXT,
  hit_count    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Trigger options (Yamin to confirm before deploying):**
- Manual "Send review request" button on completed job (default behavior).
- Optional auto-send at **6pm same day** of completion (not 3h after — too soon; people still unpacking).
- Dedupe: never send the same customer a review request within 90 days.

**Verification:**
- Send to Sumanyu's phone first, then Yamin's. Confirm link opens GMB review form on iOS + Android.

---

### V5 Phase 5 — Storage module (next-week batch)

**Source:** 2026-05-15 — Yamin needs a separate "Storage" tab for jobs in his warehouse (furniture stored during renos / house sales). Track in-date, planned out-date, billing duration, auto-reminders, and one-click conversion to/from delivery jobs.

**Schema:**
```sql
CREATE TABLE storage_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         TEXT REFERENCES customers(id),
  items_description   TEXT NOT NULL,
  in_date             DATE NOT NULL,
  planned_out_date    DATE,
  actual_out_date     DATE,
  monthly_rate_cents  INTEGER,
  status              TEXT NOT NULL CHECK (status IN ('active','released','overdue')) DEFAULT 'active',
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
```
+ RLS (owner-only, same pattern as `tasks` table) + realtime publication.

**UI:**
- New "Storage" top-level tab next to Jobs.
- Storage row UX: customer, items summary, in/planned-out dates, days-elapsed badge, monthly rate (GST-labelled), status.
- Status auto-flips to `overdue` if `planned_out_date < today` and no `actual_out_date`.

**Automations:**
- 7 days before `planned_out_date`: auto-create task "Check storage exit for {customer} — out by {planned_out_date}".
- Monthly billing reminders: on day 30/60/90 of storage, auto-create task "Send storage invoice — {customer}, month {N}".

**Conversions (key UX Yamin asked for):**
- **Convert to job** on a storage row: opens new-job dialog pre-filled (customer, items, pickup = warehouse address, dropoff blank for Yamin to set). On save: storage `actual_out_date = job_date`, `status = 'released'`.
- **Convert to storage** on a completed delivery job: opens new-storage dialog pre-filled (customer, items description from job notes, in_date = job_date).

---

### V5 Phase 6 — Tasks: driver/truck assignment (next-week batch)

**Source:** 2026-05-15 — Sumanyu acknowledged V4 Phase 5 tasks shipped without assignment UI. Currently a demo "Jacob" driver. Yamin wants real driver/truck assignment.

**Schema:**
```sql
ALTER TABLE tasks
  ADD COLUMN assigned_to_truck     TEXT,
  ADD COLUMN assigned_to_driver_id UUID;
```

**UI:**
- "+ New Task" modal: truck dropdown (required), driver dropdown (optional, defaults to current shift's driver if active).
- Truck-side shell: separate "Tasks for today" section (distinct from job list), filtered by `assigned_to_truck = my_truck`.

---

### V5 Phase 7 — Calendar dedup + per-truck cleanup retry (next-week batch)

**Source:** 2026-05-15 — Yamin saw duplicate calendar events (synced twice). Sumanyu offered to fix from his end + expose UI option. Plus retry the V4 Phase 4 per-truck cleanup-legacy bug now that Vite api-handler plugin enables local repro.

**Build:**
- "Clean duplicate calendar events" button in Settings → Integrations → Google card. Backend: find `(job_id, calendar_id)` pairs with multiple events, keep the most recent, delete older. Wrap in confirmation modal.
- Retry per-truck cleanup with structured error logging from `/api/calendar/sync`. Log Google API response into new `integration_log` table for postmortem.
- If per-truck mode works end-to-end, unblock Yamin to toggle from single → per-truck and update STATUS action item 7.

---

### V5 Phase 8 — Drag-reorder daily run order (next-week batch)

**Source:** Sumanyu proactive, Yamin confirmed.

**Build:**
- `jobs.sequence` (from V4 P1) already exists. Replace integer input on day view with a drag handle on each row. Save new sequence on drop.
- Uses existing realtime publication; truck shell sees new order immediately.
- Library: probably `@dnd-kit/sortable` if not already in use; keep dependency footprint small.

---

### V5 Phase 9 — Job cost reconciliation (next-week batch)

**Source:** Sumanyu proactive, Yamin confirmed.

**Goal:** stop underbilling on hourly jobs.

**Build:**
- On job dialog when `billing_basis = 'hourly'` (or job-level service is hourly): compute clocked hours from `job_history` (en-route timestamp → complete timestamp). Display next to billed-hours input.
- If clocked > billed by > 30 min: yellow callout "Boys clocked X.Xh, you billed Y.Yh. Confirm?"
- No auto-write — Yamin always confirms.

---

### V5 Phase 10 — Editable service catalog (deferred)

**Source:** 2026-05-15 — Yamin asked, Sumanyu flagged as scope-expander.

**Build (when revisited):**
- New `services` table (or extend if one already exists in DB types).
- Full CRUD UI in Settings.
- Each service: name, default rate, GST stance, default duration estimate.
- New job dialog reads services from DB instead of hard-coded list.
- Migration: existing string-based service references on jobs/customers (V5 P3 `default_service` TEXT) migrate to FK on this catalog.

**Why deferred:** Touches the entire pricing flow (likely enum → FK). Worth doing for Yamin self-serve, not in same sprint as V5 1–9.

---

## Migrations

All applied to Yamin's Supabase project on 2026-05-04 via Supabase MCP — no manual SQL runs needed.

| Block | Migration | What it does |
|---|---|---|
| 7 | `20260504000001_v4_phase1_run_sequence.sql` | `jobs.sequence` column + index for run-order |
| 8 | `20260504000002_v4_phase3_sms_inbound.sql` | `sms_log` + direction/provider_message_id/parent_message_sid/customer_id (TEXT)/read_at + widened type/direction CHECKs + 4 indexes |
| 9 | `20260504000003_v4_phase5_tasks.sql` | `tasks` table + RLS + realtime publication |

V5 migration blocks 10+ will land as the phases ship.

Verified post-apply: every column + index exists. Note on `customer_id` type: original migration used `UUID` but `customers.id` is `TEXT` in Yamin's project — fixed to `TEXT` and re-applied.

**Security advisor findings on the migrated project:** 14 warnings flagged post-migration. **All pre-existing**, not caused by V4 (RLS permissiveness on `job_history`/`truck_shifts`/`sms_templates`; SECURITY DEFINER functions exposed to anon/authenticated; missing RLS policy on `quote_number_counter`; leaked-password protection disabled). Listed in *Deferred* above for a future hardening pass.
