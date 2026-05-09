# Rebel Logistics — STATUS

The single living state doc. Every cycle, every phase, what's left. New
cycles append at the bottom of the **Phase index**. Per-phase detail
lives in `docs/archive/phases/<phase>.md`. In-flight phases stay
inline at the bottom of this file until they ship.

_Last refreshed: 2026-05-09._

---

## 🔴 Open action items (cross-phase)

### Blocking — needs Yamin this week

1. **Set `TWILIO_SENDER_ID` to empty (or delete)** on Vercel — until AU sender registration approves, alphanumeric sends fail with "combination of 'To' and 'From'" error. Empty value falls back to `+61485055666` (works on every AU carrier today).
   _Vercel → project → Settings → Environment Variables → `TWILIO_SENDER_ID` → ⋯ → Delete (or save empty)._

2. **Register `Rebel LGTCS` (try `RebelLGTCS` no-space first) with Twilio AU carriers.** AU carriers (Telstra/Optus/Vodafone) started filtering unregistered alphanumeric senders late 2024. Pay-as-you-go is fine; what's missing is the carrier registration.
   _Twilio Console → **Regulatory Compliance → Messaging Compliance → Sender ID Registration**. Submit: business name, ABN, ABN cert (PDF from ABN Lookup), business address, sample message body, use case = "Transactional booking confirmations and delivery updates." Approval: 1–2 weeks. When approval email arrives → re-add `TWILIO_SENDER_ID` with the approved string._

3. **Set the SMS owner-context env vars on Vercel** (Production scope, no redeploy needed):
   - `VITE_REBEL_SUPPORT_PHONE="+61 420 411 168"` — fills `{{owner.phone}}` in en-route, day-prior, delivered templates.
   - `VITE_REBEL_BUSINESS_NAME="Rebel Logistics"` — defaults to that anyway, optional.
   - `REBEL_SUPPORT_PHONE="+61 420 411 168"` — server-side equivalent for the inbound TwiML auto-reply.
   - `REBEL_BUSINESS_NAME="Rebel Logistics"` — server-side equivalent.

4. **Confirm Twilio inbound webhook URL** on the AU number → `https://<vercel-domain>/api/sms/inbound` (POST). Without this, customer replies vanish into Twilio's default boilerplate instead of landing in the dashboard Replies tab.

### Open thread (workaround in place)

5. **Calendar cleanup-legacy "every push failed"** during per-truck migration testing. Symptom: cleanup deleted the legacy calendar but `metadata.calendar_id` stayed set + every per-truck event create failed. Likely token refresh issue or per-truck calendar create rejected by Google.
   _**Workaround:** stay on **Single calendar** mode (Settings → Integrations → Google card → Calendar layout toggle). Single mode works fine. Re-attempt with the Vite api-handler plugin now lets you reproduce locally on `npm run dev` — send the browser Network tab payload from `/api/calendar/sync` if it fails again._

### Recommended

6. **Marketing website** resumes ~Mon 2026-05-18 after platform changes settle. Yamin's choice; same Sumanyu, separate engagement.

### Deferred (not blocking)

- Per-truck phone numbers (V4 7.2 +1) — every truck = its own Twilio number.
- Smart date extraction on inbound replies (V4 3.5 +1) — auto-suggest `[Mon 12 May] [Tue 13 May]` buttons.
- Driver SMS composer.
- Auto-clean orphan events on legacy calendar after per-truck switch.
- Pre-existing security advisor warnings (RLS-policy permissiveness, SECURITY DEFINER functions exposed to anon, leaked-password protection disabled).

### Money + meeting state

- $1,500 total (platform + website). $1,000 invoice sent — Yamin pays after accountant signs off (~week of 2026-05-11).
- $500 invoice separately, before/after website at Yamin's discretion.
- AUD $120/month retainer kicks in once $500 clears.
- Indian-business invoice fine (no AU GST needed) provided business is matchable.

---

## Phase index

### V4 cycle (current)

| Phase | Name | Status | What's left | Detail |
|---|---|---|---|---|
| 1 | Tuesday shakedown blockers | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-1.md`](docs/archive/phases/v4-phase-1.md) |
| 2 | Quote-form correctness + UX | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-2.md`](docs/archive/phases/v4-phase-2.md) |
| 3 | Day-prior bulk + inbound inbox | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-3.md`](docs/archive/phases/v4-phase-3.md) |
| 4 | Google Calendar overhaul | ✅ shipped 2026-05-04 | 🟡 cleanup-legacy fails (workaround: stay single mode) | [`phases/v4-phase-4.md`](docs/archive/phases/v4-phase-4.md) |
| 5 | Tasks (warehouse load-up) | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-5.md`](docs/archive/phases/v4-phase-5.md) |
| 6 | Dashboard reorg + small things | ✅ shipped 2026-05-04 | nothing | [`phases/v4-phase-6.md`](docs/archive/phases/v4-phase-6.md) |
| 7 | Twilio AU alphanumeric | ⏳ in flight | 🔴 AU sender registration (action items 1–3 above) | [`phases/v4-phase-7.md`](docs/archive/phases/v4-phase-7.md) |

### Hot-fixes (bug reports during the V4 cycle)

| Hot-fix | Status | Detail |
|---|---|---|
| SMS templates not updating | ✅ shipped 2026-05-04 | [`phases/hot-fix-sms-templates.md`](docs/archive/phases/hot-fix-sms-templates.md) |
| En-route button missing on dashboard | ✅ shipped 2026-05-04 | commit `364d0a3` |
| Driver-shell en-route double-fire | ✅ shipped 2026-05-04 | commit `364d0a3` |
| `/api/sms/send` returning 404 on plain Vite | ✅ shipped 2026-05-05 | commit `651e70f` (vite-api-handlers-plugin) |

### V3 cycle (archived)

Fully shipped 2026-04 to 2026-05. Per-phase detail lives in [`docs/archive/v3/`](docs/archive/v3/) — V3_PHASED_PLAN.md, V3_STATUS.md, V3_POST_MAY02_PLAN.md, V3_POST_MAY02_STATUS.md. Read only if a question references V3 specifically.

---

## In-flight phase detail

The full content of any in-flight phase stays inline below until it ships, then collapses into the phase index above and moves to `docs/archive/phases/<phase>.md`.

### V4 Phase 7 — Twilio AU alphanumeric sender (in flight)

**Goal:** customer SMS shows up as `Rebel LGTCS` (or whatever AU carriers approve) instead of `+61485055666`.

**Status:** infra shipped, blocked on AU carrier-level sender ID registration.

See [`docs/archive/phases/v4-phase-7.md`](docs/archive/phases/v4-phase-7.md) for the full entry — what's wired, what we learned about AU carrier filtering, the 5-step cutover when approval lands. Open action items 1–3 at the top of this file are the literal next moves.

---

## Migrations

All applied to Yamin's Supabase project on 2026-05-04 via the Supabase MCP — no manual SQL runs needed.

| Block | Migration | What it does |
|---|---|---|
| 7 | `20260504000001_v4_phase1_run_sequence.sql` | `jobs.sequence` column + index for run-order |
| 8 | `20260504000002_v4_phase3_sms_inbound.sql` | `sms_log` + direction/provider_message_id/parent_message_sid/customer_id (TEXT)/read_at + widened type/direction CHECKs + 4 indexes |
| 9 | `20260504000003_v4_phase5_tasks.sql` | `tasks` table + RLS + realtime publication |

Verified post-apply: every column + index exists. Note on `customer_id` type: original migration used `UUID` but `customers.id` is `TEXT` in Yamin's project — fixed to `TEXT` and re-applied. Local migration file + `SUPABASE-RUN-THIS.md` updated to match.

**Security advisor findings on the migrated project:** 14 warnings flagged post-migration. **All pre-existing**, not caused by V4 (RLS-policy permissiveness on `job_history`/`truck_shifts`/`sms_templates`; SECURITY DEFINER functions exposed to anon/authenticated; missing RLS policy on `quote_number_counter`; leaked-password protection disabled). Listed in *Deferred* above for a future hardening pass.
