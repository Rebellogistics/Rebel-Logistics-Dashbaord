# Rebel Logistics — STATUS

The single living state doc. Every cycle, every phase, what's left. New
cycles append at the bottom of the **Phase index**. Per-phase detail
lives in `docs/archive/phases/<phase>.md`. In-flight phases stay
inline at the bottom of this file until they ship.

_Last refreshed: 2026-05-22 (folding in 2026-05-17 call)._
_Transcripts: [`transcripts/`](docs/archive/transcripts/) — most recent: [`TRANSCRIPT_20260517.md`](docs/archive/transcripts/TRANSCRIPT_20260517.md)._

---

## 🔴 Open action items (cross-phase)

### Blocking — Sumanyu this week

1. **Tasks driver pre-assignment polish (V5 P6 follow-up).** On the 2026-05-17 call Yamin tried "reassign a task to a specific driver" from the Job detail screen — the create-task-from-job flow isn't wired through end-to-end. Sumanyu committed to fix "before I sleep tonight" (2026-05-17); still not in git as of 2026-05-22, so this is **overdue**. Verify the driver dropdown is wired in the job-context task creator, not just the standalone Tasks tab.

2. **Short-link shortener Settings tab (V5 P4 follow-up).** Build a new tab in Settings where any URL can be pasted and shortened against the existing `short_links` table (currently CRUD is SQL-only). Yamin's framing: "in case I want to customize any message in the future and have a URL there." Sumanyu committed on the 2026-05-17 call.

3. **Verify `{{review.url}}` (or equivalent short-link token) resolves in the `job_complete` SMS template.** Yamin pivoted away from a separate review-request SMS — he'll edit the `job_complete` template in Settings to inline the Google review link, so every completion message carries the ask. If the variable engine doesn't expose the token globally today, expose it. Without this, item #7 (Yamin's Settings edit) becomes a hardcoded literal URL.

4. **Inbound webhook URL** on the AU Twilio number → `https://<vercel-domain>/api/sms/inbound` (POST). Without this, customer replies vanish into Twilio's default boilerplate instead of landing in the dashboard Replies tab.

5. **Owner-context env vars on Vercel** (Production scope, no redeploy needed):
   - `VITE_REBEL_SUPPORT_PHONE="+61 420 411 168"` — fills `{{owner.phone}}` in en-route, day-prior, delivered, review-request templates.
   - `VITE_REBEL_BUSINESS_NAME="Rebel Logistics"` — defaults to that anyway, optional.
   - `REBEL_SUPPORT_PHONE="+61 420 411 168"` — server-side equivalent for the inbound TwiML auto-reply.
   - `REBEL_BUSINESS_NAME="Rebel Logistics"` — server-side equivalent.

### Blocking — Yamin

6. **Asset pack for the marketing website** — Yamin committed to deliver "by tomorrow max" on the 2026-05-17 call (i.e. by 2026-05-18); **currently overdue**. Bundle everything in one folder/message:
   - Logos (Rebel + the customer logos that were on the old site).
   - Photos (the originals from the archive snapshot + any extras Yamin thinks belong on the site).
   - Raw video files (the two Instagram clips — Sumanyu will cut them to 9:16 vertical reels, target three of them).
   - List of services (Yamin has the file from when the original site went up).
   - ABN (also on the old site, easy lookup, but include it explicitly).
   - Email: `info@rebellogistics` (note: Yamin spoke "reble" twice; confirm exact domain spelling).
   - Phone: same business number Sumanyu already has.
   - Instagram handle for the footer link.

7. **Edit the `job_complete` SMS template in Settings** to inline the Google review ask. Yamin's plan: copy the body of the seeded `review_request` template into `job_complete`, then drop in the review-URL token once #3 above is verified. (Until #3 lands, a literal short URL works as a stopgap.) This replaces the separate review SMS flow for the default usage; the standalone `review_request` template can stay as an opt-in.

8. **Cancel Anthropic Claude $170/mo subscription.** Sumanyu now has own cloud. Agreed on 2026-05-15 call; data export ZIP already shared. Recurring charge until cancelled. **Not addressed on 2026-05-17 call.**

9. **Send Sumanyu the Google review URL** (or grant edit access to the Rebel Logistics GMB page). The V5 P4 short link `rebel` is seeded with a placeholder Google search URL. When the real review URL arrives → run `UPDATE public.short_links SET target_url='<gmb-url>' WHERE slug='rebel';` via Supabase MCP. Until then any review SMS lands on Google search results instead of the direct review form. **Not addressed on 2026-05-17 call.**

10. **Call accountant Malik → $1,000 Remitly transfer.** Yamin emailed Malik before 2026-05-15 call; no response yet. **Not addressed on 2026-05-17 call** — still following up.

### Awaiting external

11. **Twilio AU sender registration** — Submitted live on 2026-05-15 call as `RBL Logistics`. Yamin then had to follow up with Twilio support **personally** to upload a business-extract document on top of the initial submission (back-and-forth, AUD ~$10 fee). Resubmitted with the extract; still in manual review as of 2026-05-17. Approval window still anchored to **~2026-06-19** (25 business days from initial submission). When the approval email lands → set `TWILIO_SENDER_ID="RBL Logistics"` on Vercel and outbound flips immediately.

### Open thread (workaround in place)

12. **Calendar cleanup-legacy "every push failed"** during per-truck migration testing (V4 P4 follow-up). Workaround: stay on **Single calendar** mode. V5 P7 shipped a separate orphan-event cleanup endpoint (`/api/calendar/cleanup-orphans`) — Yamin clicked the button live on the 2026-05-17 call; no duplicates were present to verify against, but the call returned cleanly. The per-truck migration failure itself isn't reproducible without Yamin attempting the switch again. Yamin also noticed jobs with no truck assignment render as all-day events on the calendar — not a bug per se, just a "looks like the list view when assigned" observation.

### Recommended / scheduled

13. **Marketing website V1 demo slipped to 2026-05-24 call.** Sumanyu started the build ~3 hours before the 2026-05-17 call (Nano Banana for image gen, layout in flight). Demo originally targeted for 2026-05-17 but pushed because the platform work consumed the week. The Yamin asset pack (#6) is the unblocker — until it arrives, Sumanyu is using placeholder content. Uncommitted work-in-progress lives in `src/components/public/marketing/` plus edits to `LoginPage.tsx`, `index.css`, `main.tsx`.

14. **Yamin actively uses the platform this week** (Yamin's own commitment on 2026-05-17): transfer storage records over, set per-customer default pricing on the rest of the customer list, add remaining customers, book more jobs through the dashboard. Goal: surface bugs we haven't hit yet — Sumanyu's framing was "the more you use, the more errors we'll hit and the more we can optimize."

15. **Cousin lead (referral).** Yamin gave his marketing-business cousin Sumanyu's portfolio + contact. Cousin lost customers for not bundling websites. **Not addressed on 2026-05-17 call** — carrying forward.

### Deferred (not blocking)

**V4-era:**
- Per-truck phone numbers (V4 7.2 +1) — every truck = its own Twilio number.
- Smart date extraction on inbound replies (V4 3.5 +1).
- Driver SMS composer.
- Auto-clean orphan events on legacy calendar after per-truck switch.
- Pre-existing security advisor warnings (RLS permissiveness, SECURITY DEFINER on anon, leaked-password protection off).

**V5 follow-ups (called out in each phase's archive file):**
- **V5 P2:** proper square + maskable PWA icons. Today's wordmark works in the manifest but not at home-screen sizes. (Home-screen install itself verified working on Yamin's phone on 2026-05-17 — earlier install-error symptom gone.)
- **V5 P3:** flat-rate customers need a 2-step (auto-priced create → manual fee in JobDetailDialog). If Yamin pushes back, ~30 min to add a manual-fee toggle to NewQuoteDialog. Preset edit flow verified by Yamin on 2026-05-17 (he'll fill in the rest of the customer list this week).
- **V5 P4:** auto-send review SMS at 6pm + 90-day dedup (today manual button only). _Settings UI for short_links CRUD was previously deferred here — now promoted to active work (#2 above)._
- **V5 P5:** auto-create reminder tasks 7d before `planned_out_date` + monthly billing reminders at storage day 30 / 60 / 90. Needs a daily cron (Vercel cron / pg_cron / daily check at app load). Plus storage record detail dialog with activity timeline.
- **V5 P7:** per-truck cleanup-legacy retry + `integration_log` table for postmortem. Blocker is reproducing the failure, not observing it.
- **V5 P9:** explicit `jobs.en_route_at` column so clocked-time widget works on hourly jobs where en-route SMS opted out.
- **V5 P10:** full job-type picker integration. Custom services don't yet appear on NewQuoteDialog / JobDetailDialog job-type picker — only on the customer pricing preset. Future: `jobs.type` string-union → FK on `services` + pricing calculator extension.

**Future / agreed in principle (from 2026-05-17 call):**
- **Xero integration pilot.** Yamin still wants the platform → Xero handoff so he doesn't double-enter. Sumanyu wary of irreversible Xero writes ("there's no reversal on Xero"); Yamin confirmed Xero records can be deleted and re-pushed manually, and that pushes "still have to be approved by me on that end." Agreed approach: pilot with a single job, validate the format end-to-end, then expand. No date — Yamin will signal once his pricing setup + customer migration is done.
- **Marketing-agency code-loop-in (foresight).** When Yamin engages a marketing agency, they'll need to wire Google Analytics / tag manager into the (custom-coded, not WordPress/Webflow/Framer) site. Agency staff won't have repo access, so Sumanyu has to be looped in for those code changes. Flagged so Yamin can scope the agency budget accordingly.

### Money + meeting state

- $1,500 total (platform + website). $1,000 invoice pending Malik signoff.
- $500 invoice separately, before/after website at Yamin's discretion.
- AUD $120/month retainer kicks in once $500 clears.
- Indian-business invoice fine (no AU GST needed) provided business is matchable.
- **Next call:** Sun 2026-05-24, 8:30 (same slot). Website V1 to be reviewed live; platform updates async via text in between. Saturday is hard for Yamin unless first thing in the morning (which doesn't work for Sumanyu).

---

## Phase index

### V4 cycle (closing out)

| Phase | Name | Status | What's left | Detail |
|---|---|---|---|---|
| 1 | Tuesday shakedown blockers | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-1.md`](docs/archive/phases/v4-phase-1.md) |
| 2 | Quote-form correctness + UX | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-2.md`](docs/archive/phases/v4-phase-2.md) |
| 3 | Day-prior bulk + inbound inbox | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-3.md`](docs/archive/phases/v4-phase-3.md) |
| 4 | Google Calendar overhaul | ✅ shipped 2026-05-04 | 🟡 cleanup-legacy fails; user-visible symptom addressed by V5 P7 | [`phases/v4-phase-4.md`](docs/archive/phases/v4-phase-4.md) |
| 5 | Tasks (warehouse load-up) | ✅ shipped 2026-05-04 | ✅ assignment UI shipped in V5 P6 | [`phases/v4-phase-5.md`](docs/archive/phases/v4-phase-5.md) |
| 6 | Dashboard reorg + small things | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-6.md`](docs/archive/phases/v4-phase-6.md) |
| 7 | Twilio AU alphanumeric | ⏳ submitted 2026-05-15 as `RBL Logistics` | ⏳ awaiting AU carrier approval ~2026-06-19 | [`phases/v4-phase-7.md`](docs/archive/phases/v4-phase-7.md) |

### Hot-fixes (bug reports during V4 cycle)

| Hot-fix | Status | Detail |
|---|---|---|
| SMS templates not updating | ✅ shipped 2026-05-04 | [`phases/hot-fix-sms-templates.md`](docs/archive/phases/hot-fix-sms-templates.md) |
| En-route button missing on dashboard | ✅ shipped 2026-05-04 | commit `364d0a3` |
| Driver-shell en-route double-fire | ✅ shipped 2026-05-04 | commit `364d0a3` |
| `/api/sms/send` returning 404 on plain Vite | ✅ shipped 2026-05-05 | commit `651e70f` |

### V5 cycle (shipped 2026-05-16)

Yamin's 2026-05-15 batch + 4 proactive items he confirmed (customer history view, drag-reorder, cost reconciliation, firstname SMS variable — last one was already implemented). 10 phases shipped in one day.

| Phase | Name | Status | Commit | Detail |
|---|---|---|---|---|
| 1 | Per-job SMS toggles + bulk send guardrails | ✅ shipped 2026-05-16 | `2d4faaa` | [`phases/v5-phase-1.md`](docs/archive/phases/v5-phase-1.md) |
| 2 | PWA safe-area + manifest tweaks | ✅ shipped 2026-05-16 | `5ad2e49` | [`phases/v5-phase-2.md`](docs/archive/phases/v5-phase-2.md) |
| 3 | Customer pricing presets + history view | ✅ shipped 2026-05-16 | `eb0a1a1` | [`phases/v5-phase-3.md`](docs/archive/phases/v5-phase-3.md) |
| 4 | Google review SMS + URL shortener | ✅ shipped 2026-05-16 | `99b1d24` | [`phases/v5-phase-4.md`](docs/archive/phases/v5-phase-4.md) |
| 5 | Storage module (new top-level tab + two-way conversions) | ✅ shipped 2026-05-16 | `73e667e` | [`phases/v5-phase-5.md`](docs/archive/phases/v5-phase-5.md) |
| 6 | Tasks: driver pre-assignment | ✅ shipped 2026-05-16 | `7ab26bf` | [`phases/v5-phase-6.md`](docs/archive/phases/v5-phase-6.md) |
| 7 | Calendar orphan-event cleanup | ✅ shipped 2026-05-16 | `b95427f` | [`phases/v5-phase-7.md`](docs/archive/phases/v5-phase-7.md) |
| 8 | Stop-number badges on run-order cards | ✅ shipped 2026-05-16 | `e8a7d38` | [`phases/v5-phase-8.md`](docs/archive/phases/v5-phase-8.md) |
| 9 | Clocked-time reconciliation on hourly jobs | ✅ shipped 2026-05-16 | `f07ec17` | [`phases/v5-phase-9.md`](docs/archive/phases/v5-phase-9.md) |
| 10 | Editable service catalog (MVP) | ✅ shipped 2026-05-16 | `f07fa4d` | [`phases/v5-phase-10.md`](docs/archive/phases/v5-phase-10.md) |

### V3 cycle (archived)

Fully shipped 2026-04 to 2026-05. Per-phase detail lives in [`docs/archive/v3/`](docs/archive/v3/). Read only if a question references V3 specifically.

---

## Migrations

All applied to Yamin's Supabase project via the Supabase MCP — no manual SQL runs needed. Block numbering continues from V4 P5.

| Block | Migration | What it does |
|---|---|---|
| 7  | `20260504000001_v4_phase1_run_sequence.sql` | `jobs.sequence` + index for run-order |
| 8  | `20260504000002_v4_phase3_sms_inbound.sql` | `sms_log` + direction / provider_message_id / parent_message_sid / customer_id (TEXT) / read_at + widened type / direction CHECKs + 4 indexes |
| 9  | `20260504000003_v4_phase5_tasks.sql` | `tasks` table + RLS + realtime publication |
| 10 | `20260516000001_v5_phase1_sms_opt_out_flags.sql` | `jobs.send_day_prior` / `send_en_route` / `send_complete` (BOOL DEFAULT true) |
| 11 | `20260516000002_v5_phase3_customer_pricing_defaults.sql` | `customers.billing_basis` / `default_service` / `default_rate` / `default_notes` + CHECK |
| 12 | `20260516000003_v5_phase4_short_links_and_review_template.sql` | `short_links` table + seed `rebel` slug + widened `sms_templates` / `sms_log` type CHECKs + seed `review_request` template row |
| 13 | `20260516000004_v5_phase5_storage_records.sql` | `storage_records` table + RLS + realtime + indexes |
| 14 | `20260516000005_v5_phase6_task_driver_assignment.sql` | `tasks.assigned_to_driver_id` + `assigned_to_driver_name` |
| 15 | `20260516000006_v5_phase10_service_catalog.sql` | `services` table + seed 3 builtins (Standard / White Glove / House Move) + RLS |

**Security advisor findings on the migrated project:** 14 warnings flagged post-V4 migration. **All pre-existing**, not caused by V4 / V5 (RLS-policy permissiveness on `job_history` / `truck_shifts` / `sms_templates`; SECURITY DEFINER functions exposed to anon / authenticated; missing RLS policy on `quote_number_counter`; leaked-password protection disabled). Listed in *Deferred* above for a future hardening pass.
