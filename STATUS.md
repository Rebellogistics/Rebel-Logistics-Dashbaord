# Rebel Logistics — STATUS

The single living state doc. Every cycle, every phase, what's left. New
cycles append at the bottom of the **Phase index**. Per-phase detail
lives in `docs/archive/phases/<phase>.md`. In-flight phases stay
inline at the bottom of this file until they ship.

_Last refreshed: 2026-09-23 (V7 P7 travel time shipped and applied to production; zone now reads BOTH postcodes; three silent wrongs fixed ahead of the client-profile rework; both job dialogs re-laid-out; the client-profile rework scoped and decided — see the new V8 section at the bottom). Prior: 2026-09-18 (recap pass — two working sessions were deleted from the app sidebar on 2026-09-18; their transcripts survived and what they finished is folded in below: V6 P7 audience pages recorded, V7 real-data verification closed, V6 P6 push closed, item 13 closed). Prior: 2026-09-18 (V7 cycle merged: the rate book the calculator models). Prior: 2026-09-17 (V6 P6: pricing rate-book integrity)._
_Transcripts: [`transcripts/`](docs/archive/transcripts/) — most recent: [`TRANSCRIPT_20260922.md`](docs/archive/transcripts/TRANSCRIPT_20260922.md) (the session that settled the both-ends zone rule, travel time, and the whole V8 client-profile scope)._

---

## 🔴 Open action items (cross-phase)

### Blocking — Sumanyu this week

1. **Tasks driver pre-assignment polish (V5 P6 follow-up).** On the 2026-05-17 call Yamin tried "reassign a task to a specific driver" from the Job detail screen — the create-task-from-job flow isn't wired through end-to-end. Sumanyu committed to fix "before I sleep tonight" (2026-05-17); still not in git as of 2026-05-22, so this is **overdue**. Verify the driver dropdown is wired in the job-context task creator, not just the standalone Tasks tab.

2. **Short-link shortener Settings tab (V5 P4 follow-up).** Build a new tab in Settings where any URL can be pasted and shortened against the existing `short_links` table (currently CRUD is SQL-only). Yamin's framing: "in case I want to customize any message in the future and have a URL there." Sumanyu committed on the 2026-05-17 call.

3. ✅ **RESOLVED 2026-09-16 (V6 P3).** ~~Verify `{{review.url}}` (or equivalent short-link token) resolves in the `job_complete` SMS template.** Yamin pivoted away from a separate review-request SMS — he'll edit the `job_complete` template in Settings to inline the Google review link, so every completion message carries the ask. If the variable engine doesn't expose the token globally today, expose it. Without this, item #7 (Yamin's Settings edit) becomes a hardcoded literal URL.

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

7. ✅ **RESOLVED 2026-09-16 (V6 P3).** ~~Edit the `job_complete` SMS template in Settings~~ to inline the Google review ask. Yamin's plan: copy the body of the seeded `review_request` template into `job_complete`, then drop in the review-URL token once #3 above is verified. (Until #3 lands, a literal short URL works as a stopgap.) This replaces the separate review SMS flow for the default usage; the standalone `review_request` template can stay as an opt-in.

8. **Cancel Anthropic Claude $170/mo subscription.** Sumanyu now has own cloud. Agreed on 2026-05-15 call; data export ZIP already shared. Recurring charge until cancelled. **Not addressed on 2026-05-17 call.**

9. ✅ **RESOLVED 2026-09-16 (V6 P3).** Real URL is live: `https://g.page/r/CST_WS2b9N8sEBM/review`, set on the `rebel` short_links row. ~~Send Sumanyu the Google review URL~~ (or grant edit access to the Rebel Logistics GMB page). The V5 P4 short link `rebel` is seeded with a placeholder Google search URL. When the real review URL arrives → run `UPDATE public.short_links SET target_url='<gmb-url>' WHERE slug='rebel';` via Supabase MCP. Until then any review SMS lands on Google search results instead of the direct review form. **Not addressed on 2026-05-17 call.**

10. **Call accountant Malik → $1,000 Remitly transfer.** Yamin emailed Malik before 2026-05-15 call; no response yet. **Not addressed on 2026-05-17 call** — still following up.

11. **Set `TWILIO_SENDER_ID="RBLogistics"` on Vercel** (Production scope). The AU sender registration **is approved** — confirmed by Yamin 2026-09-14. The approved string is `RBLogistics` — 11 characters, no space. This is **not** the `RBL Logistics` submitted on the 2026-05-15 call, which was 13 characters and over Twilio's hard 11-character limit; nor the `REBEL` / `RebelLGTCS` / `Rebel LGTCS` variants in `docs/archive/v4/V4_STATUS.md`. Set it verbatim — a mismatch fails every outbound send with a silent carrier rejection (the May 2026 test failure). No redeploy needed; Vercel hot-loads env on the next request. Verify on Settings → Integrations (the *Outbound from* tile flips to `RBLogistics` with the alphanumeric chip), then test-send to a handset. Reverting is instant: clear the var and outbound falls back to the AU number.

### Found 2026-09-22 while doing other work

18. ✅ **RESOLVED 2026-09-23 (`f145545`).** ~~The Accept dialog under-quotes
    White Glove jobs that carry rubbish disposal, by $440 on a 14 m³ job.~~
    It runs on `priceJob` now, and `check-parity` gained a fifth file so any
    surface that can write a price is watched. Original report: `AcceptDialog.tsx` builds its
    "Rate book: … — tap to use" suggestion with `calculateQuote` from
    `src/lib/pricing.ts` — the **retired** V6 engine — instead of `priceJob`.
    The old engine has no concept of extras, so the suggested figure drops
    them. Measured against the live rate book: WG 14 m³ + trailer disposal
    quotes $2,960.00, Accept offers $2,520.00. Scope is exactly White Glove
    with disposal ticked (Standard cannot carry extras, Hourly is priced
    separately, Storage returns zero so no suggestion shows, and the levy is
    stored outside `fee`). Deliberately left out of a layout-only change.
    Fix: build the suggestion from `priceJob` fed by the job's stored V7
    fields. See memory `accept-dialog-uses-retired-engine`.

19. 🟡 **`AddressAutocomplete` renders a `<div>` inside `DetailRow`'s `<p>`**
    in `JobDetailDialog` — invalid DOM, and the `absolute` suggestion list is
    clipped by the `truncate`. Pre-existing, raised 2026-09-22, not actioned.

### Open thread (workaround in place)

12. **Calendar cleanup-legacy "every push failed"** during per-truck migration testing (V4 P4 follow-up). Workaround: stay on **Single calendar** mode. V5 P7 shipped a separate orphan-event cleanup endpoint (`/api/calendar/cleanup-orphans`) — Yamin clicked the button live on the 2026-05-17 call; no duplicates were present to verify against, but the call returned cleanly. The per-truck migration failure itself isn't reproducible without Yamin attempting the switch again. Yamin also noticed jobs with no truck assignment render as all-day events on the calendar — not a bug per se, just a "looks like the list view when assigned" observation.

### Recommended / scheduled

13. ✅ **RESOLVED — the marketing site is live.** ~~Marketing website V1 demo slipped to 2026-05-24 call.~~ The site shipped and has since been pre-rendered (V6 P1), canonicalised on www (V6 P2) and extended with four audience pages (V6 P7). 133 routes pre-render; `/`, `/logistics`, `/warehousing`, `/labour`, `/areas/*`, `/work`, `/contact`, `/quote` and all four `/for/*` pages are live and indexed. The work is committed, not the uncommitted WIP this item described. Item #6 (Yamin's asset pack) is a separate thread and **stays open** — the site runs on what was available.

14. **Yamin actively uses the platform this week** (Yamin's own commitment on 2026-05-17): transfer storage records over, set per-customer default pricing on the rest of the customer list, add remaining customers, book more jobs through the dashboard. Goal: surface bugs we haven't hit yet — Sumanyu's framing was "the more you use, the more errors we'll hit and the more we can optimize."

15. **Cousin lead (referral).** Yamin gave his marketing-business cousin Sumanyu's portfolio + contact. Cousin lost customers for not bundling websites. **Not addressed on 2026-05-17 call** — carrying forward.

16. ✅ **RESOLVED 2026-09-18 — Google leftovers closed.**
    - **Stale WordPress URLs: gone.** `?p=1` and `?cat=1` now show *Temporarily removed* in Search Console. `?author=1` could not be submitted — Google rejects removal requests for URLs it no longer indexes, and a `site:` search confirms all three are out of the index entirely, with no "Welcome to WordPress" text anywhere. Done by outcome rather than by action.
    - **Kennards "Located in": not fixable from the profile.** The Location tab holds only Business location, the map and Service area — there is no "Located in" field, and the overflow menu offers only Help and support / Send feedback. It is a Google inference from the address coordinates. The only route left is a Google Business Profile support request. **Not raised** — contacting support on Yamin's behalf needs his say-so.

17. **Kennards "Located in" — pinned to October 2026.** The Business Profile shows *Located in: Kennards Self Storage Flemington*. It is a Google inference from the address coordinates, not a profile field: the Location tab has only Business location, map and Service area, and the overflow menu offers only Help and support / Send feedback. The only route is a Google Business Profile support request, which Yamin asked to defer to next month (decided 2026-09-18). Claude to draft it when picked up; Yamin sends it. Cosmetic — no ranking impact, and the label is arguably accurate.

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

### V6 cycle (shipped 2026-09-16)

Triggered by Yamin asking how the site compared to hcotransport.com.au and inboxaustralia.com.au. Measuring all three as Googlebot found the site serving 3,041 bytes of empty `<div id="root">` against Inbox's 5,078 characters of finished HTML — so the SEO work came first, then the SMS and naming items raised in the same session.

| Phase | Name | Status | Commit | Detail |
|---|---|---|---|---|
| 1 | Pre-render the public marketing site | ✅ shipped 2026-09-16 | `47e316c` | [`phases/v6-phase-1.md`](docs/archive/phases/v6-phase-1.md) |
| 2 | Canonicalise on www | ✅ shipped 2026-09-16 | `61528f5` | [`phases/v6-phase-2.md`](docs/archive/phases/v6-phase-2.md) |
| 3 | Review link + completion SMS + Job complete default | ✅ shipped 2026-09-16 | `ab6eae6`, `269bce8` | [`phases/v6-phase-3.md`](docs/archive/phases/v6-phase-3.md) |
| 4 | Rename House Move → Hourly rate | ✅ shipped 2026-09-16 | `d976780`, `aee3501` | [`phases/v6-phase-4.md`](docs/archive/phases/v6-phase-4.md) |
| 5 | Public form services → internal job types (+ Storage type) | ✅ shipped 2026-09-16 | — | [`phases/v6-phase-5.md`](docs/archive/phases/v6-phase-5.md) |
| 6 | Pricing rate-book integrity | ✅ shipped 2026-09-18 | `7e0fbd8` | inline below |
| 7 | Audience pages (`/for/*`) | ✅ shipped 2026-09-17 | `af215c4`, `af026c8`, `205bebb` | [`phases/v6-phase-7.md`](docs/archive/phases/v6-phase-7.md) |

**Search Console:** property `sc-domain:rebellogistics.com.au` verified; sitemap submitted (Success, 129 pages discovered); indexing requested on `/`, `/logistics`, `/warehousing`, `/labour`, `/areas`. Check **Indexing → Pages** around 2026-09-23 to see how many have moved across.

**Competitive read (2026-09-16):** Inbox runs 29 pages + 16 keyword-targeted blog posts, segments by audience (`/designers`, `/retailers`, `/showroom`, `/residential`), publishes pricing guidelines and markets a client portal. Hunter & Co. is 2 pages, Sydney/Brisbane, competing on prestige not search. Rebel's structured data and 121 suburb pages already beat both — the gap is audience pages, reviews and published content.

### V7 — the corrected rate book (merged 2026-09-18)

Yamin's read: the live rate structure was wrong, which is why he built a
calculator first. The **Rebel Rate Sandbox**
(https://claude.ai/code/artifact/ca1fe366-85dd-41af-84b3-139040caa57a, private)
is where the model was settled; this cycle is that model in the dashboard.
`docs/rate-sandbox.html` is a snapshot of it — the artifact is the live copy.

| Phase | Name | Status | Commit | Detail |
|---|---|---|---|---|
| 1 | Rate book schema + types (25 rate columns, 16 job columns, `Labour` type) | ✅ applied 2026-09-17 | `cc31bb3`, `1ac6351` | inline |
| 2a | Metro postcode list becomes editable data | ✅ applied 2026-09-17 | `84744b7` | inline |
| 2b | Public quote form classifies its own postcode | ✅ applied 2026-09-17 | `9cab886` | inline |
| 2c | Pricing engine `priceJob()` | ✅ 2026-09-17 | `2355abe` | `src/lib/jobPricing.ts` |
| 3 | Settings → Pricing rebuilt for all 30 figures | ✅ 2026-09-17 | `33847af`, `4b9584c` | inline |
| 4 | Quote dialog: types, services, extras, levy override | ✅ 2026-09-17 | `12850b5`, `6e364d5`, `d2db418` | inline |
| 5 | Job dialog: prices and edits the model, without repricing history | ✅ 2026-09-17 | `270854a`, `2e8d60b` | inline |
| 6 | Container multi-invoice | ✅ applied 2026-09-18 | `32ce96b`, `d715b08` | inline |
| 7 | Travel time on Hourly and Labour jobs | ✅ applied 2026-09-22 | `6739e4e` | inline |
| 8 | Zone reads BOTH postcodes, not just the delivery | ✅ 2026-09-22 | `c7bbe88` | inline |

**The model.** Standard $120/m³ metro · $480 regional. White Glove $180/m³ ·
$480 regional. Hourly $180 standard truck / $200 large, 3 h minimum. Labour
$60/labourer/hour, 2 pax and 3 h minimums. Warehousing splits into three
services: storage ($25 / $40 / $50 per m³/month by tier, +20% short term, 5-day
grace), container unload ($550 / $800 flat, covering 2 h), and labour work (no
crew or hours floor). Rubbish disposal and packaging are **extras on the job
that created them, never job types**. Fuel levy 10%, **currently off**,
transport only.

**Travel time** (P7, 2026-09-22): charged on Hourly and Labour jobs, 30-minute
increments rounded up, **no minimum**. Hourly bills it at the same truck rate
and the levy applies; Labour bills it as the whole crew's time at the labour
rate and the levy never touches it. Not a distance calculation — typed in per
job, because per-km mechanics were removed by decision on 2026-09-16.

**Two rules that are easy to undo by accident:**
- **The postcodes are binding — BOTH of them** (updated 2026-09-22). A run is
  regional if EITHER end is regional: Geelong → the CBD is regional, and so is
  Heidelberg → Geelong. A **blank pickup means our own warehouse**, which is
  metro and always will be, so the delivery address decides alone. A pickup
  TYPED without a postcode ("Hallam", "Geelong") gets no vote, and the quote
  box says so — that is the one real exposure, since only 2 of 31 delivery
  jobs have a postcode in the pickup address. It sets a job's zone with no
  override, so
  `public.metro_postcodes` (Settings → Pricing) is the only lever for service
  area. It is anon-readable so the public form classifies identically;
  `pricing_rates` stays authenticated-only.
- **A quote captures its levy.** `jobs.fuel_levy_pct_applied` is frozen at
  quote time and never re-read, so switching the rate book's levy later cannot
  restate what a customer was already quoted. Opening an old job does not
  reprice it — the recompute waits until a pricing input is actually edited.

**Guards.** `npx tsx scripts/check-pricing.ts` — 23 cases against the
calculator's own figures. `npx tsx scripts/check-parity.ts` — 17 controls, each
asserting it exists in the engine, the rate book and both dialogs. The parity
check exists because two controls shipped missing and only Yamin's screenshots
caught them; it has since caught a third before he did.

**What's left**
- **Pinned, and now the only open V7 item:** the New Quote dialog has grown
  tall enough that the breakdown sits below the fold — on a Storage quote the
  total needs scrolling to. It has since gained the container section, the
  extras, the levy control and the zone readout, so it sits further below the
  fold than when Yamin first flagged it. The model has stopped moving, which
  makes this the right time to take it.
- ✅ **RESOLVED 2026-09-17 — verified against real data.** ~~there are no
  container unloads in the database~~ Yamin created two 20 ft container unloads
  and four linked deliveries through **both** creation paths (inline `-0`/`-1`
  ids from the quote form, and created-then-linked), with mixed
  Accepted/Completed statuses. Every stored fee, levy and GST matches what
  `priceJob()` produces from the live rate book, and the invoice splits total
  **$737.00** and **$1,067.00** — the second being a genuine mix of one White
  Glove at $180/m³ and two Standard at $120/m³ grouped onto one invoice, which
  is the thing the feature exists for. Three further results: the id collision
  that the row-index suffix guards against didn't occur (the inline jobs got
  different timestamp prefixes anyway, so the suffix was belt and braces);
  status doesn't disturb the grouping; and the levy captured 0% on every job
  because the rate book has it off, so switching it on later leaves these six
  untouched. **The six jobs are deliberate fixtures — do not delete them**
  (see the memory note; `RL-2026-0126`–`0131`, customers `yamin` and `test22`,
  ~$1,804 inc GST counting toward production revenue until Yamin clears them).
- **Open pricing decision:** metro stays $120. The calculator proposes $100
  under the corrected structure; Yamin has not applied it.

**Containers filter rule (decided 2026-09-17).** The filter shows containers
from **Accepted onward — Quote and Declined excluded**. Yamin's instruction was
"stick to accepted or complete if it's only quoted don't include"; the states
between and after (Scheduled, Notified, In Delivery, Invoiced) were included on
the reading that a container mid-run is just as real and excluding it would hide
live work. Its count badge previously always read 0 and now counts confirmed
containers.

#### V6 P6 — Pricing rate-book integrity (in-flight, detail inline until pushed)

**Standing decision: pricing stays internal.** `pricing_rates` is readable
`TO authenticated` only — anonymous visitors cannot read it, and that is
deliberate. The public site does not quote prices: `/quote` renders
`LeadForm`, which captures a lead and prices nothing. **Do not add an `anon`
read policy to `pricing_rates`**, and do not reintroduce customer-facing
indicative pricing without Yamin deciding to. If public pricing is ever
wanted, the agreed shape is a server-side `/api/*` quote endpoint using the
service role, so rate figures never reach the browser — not opening the table
up.

**What triggered it.** A report claimed the public quote form was showing
stale $90/m³ prices against a live rate book of $120 Standard / $180 White
Glove. Investigated 2026-09-17: the public site was **never affected**.
`PublicQuoteForm.tsx` has zero importers — it is unrouted, and the live
`/quote` page renders `LeadForm`. No customer was ever quoted a wrong price,
and nothing in `jobs` needs correcting. `PublicQuoteForm` was left untouched
by decision: its header records that it is kept deliberately as the only
implementation of instant customer-facing pricing, pending a port into
`LeadForm`.

**The real defects, both fixed:**

1. **Silent fallback in `usePricingRates`.** On any failed read it returned
   `DEFAULT_RATES` (the $90 first-install seed values) behind a `console.warn`.
   It now throws instead. The subtlety worth remembering: an RLS-denied read
   comes back as `data: null, error: null` — *identical* to an empty table —
   so "no row" is now treated as "not permitted" rather than "fresh install",
   since the singleton row ships with the table. `retry: false`, because a
   permission failure will not fix itself.

   The exposure was internal, not public. The four job dialogs already guard
   on `rates` being undefined, so they now show no price instead of a wrong
   one. `PricingPanel` was the hazard: its draft is seeded from
   `DEFAULT_RATES`, so a failed read rendered a pricing editor pre-filled with
   $90/$90 looking like the live rate book — and one Save would have
   overwritten the real $120/$180. It now refuses to render the editor
   without live rates, showing the error and a retry.

2. **`SUPABASE-RUN-THIS.md` Block 1 never created the White Glove columns.**
   `wg_metro_per_cube_aud` / `wg_regional_minimum_aud` exist in production only
   via migration `20260502000004`; the guide had no mention of `wg_` at all.
   Any environment built from Blocks 1–9 would get a `pricing_rates` table
   without them, and **Settings → Pricing would fail on every save**, because
   `useUpdatePricingRates` writes `wg_metro_per_cube_aud` unconditionally.
   Adding the columns to the `CREATE TABLE` alone was not enough — it is
   `IF NOT EXISTS`, a no-op on an existing database — so Block 1 gained an
   explicit `1b` step mirroring the Phase 15 migration: `ADD COLUMN IF NOT
   EXISTS`, backfill from the Standard rate via `COALESCE`, then set defaults
   and `NOT NULL`. Re-running never reprices anyone: existing rows inherit
   their Standard rate rather than the $180 default, and the seed
   `INSERT … ON CONFLICT DO NOTHING` cannot clobber live rates.

   Also corrected there: the stale $90 figures now match the live row
   (verified by query, not by the report — Standard metro $120, White Glove
   metro $180, regional $480 both, hourly $180, 3 hours, 10% GST); the RLS
   decision above is recorded at the policy; and the verification section
   claimed "eight `OK` rows" when there were already 11 (now 12, including a
   check that the WG column landed).

**No database changes were made.** The live table already has the columns —
the work is code plus documentation only, so there is no new migration row
below. `src/lib/pricing.ts` `DEFAULT_RATES` was deliberately left alone rather
than being edited to paper over the fallback.

**What's left:** ~~push the branch~~ — pushed and merged; `7e0fbd8` is in
`main` and live. Optional follow-up remains: port pricing into `LeadForm` and
delete `PublicQuoteForm`, or formally retire it.

### V8 — the client profile (scoped 2026-09-22, not started)

Yamin's three booking scenarios, given verbatim across the 2026-09-22 session,
and the rulings that came out of them. The full spec is in memory as
`client-profile-rules`; this table is the schedule.

**The three scenarios.** (1) **Trade** — the client is Bayliss Rugs; the
Addresses & recipient fields hold the END CLIENT's details. (2) **Direct** — an
individual or business booking for themselves, so no recipient, but possibly
many pickups or many deliveries. (3) **On site** — Labour or container work at
the client's own premises, so no pickup and no delivery at all, just one of
their sites.

**The rulings.** One identity field called **Client name** (merge
`customers.name` and `company_name`; 153 of 154 company rows already hold the
same string in both). **Sites and contacts are two sibling lists** on the
profile — a client may have a showroom, a warehouse, and an office in charge of
deliveries; a contact can exist without a site. **One booking shape per job**
(*for their client* / *for themselves* / *at their own site*) decides which
fields show, rather than per-field toggles. **A job's address follows the
profile until the job hits `Completed`, then freezes** — the invoice and proof
photos are filed against it. **SMS on a trade job goes to the recipient**, not
the account. **Multi-stop is hourly install work only** — deliveries are each
their own job, so ten drops off one Bayliss load are ten jobs. **Container
unload stays a warehouse service**; on-site container work is booked as Labour.

| Phase | Name | Status | What's left |
|---|---|---|---|
| 1 | Guardrails — no schema change | ✅ 2026-09-22 `60287ed` | — |
| 2 | Sites + contacts on the profile, and the Client name merge | ⏳ not started | **NEXT.** Two child tables, a `useClientSites` hook, the Sites/Contacts repeaters on `CustomerDialog`, a read-only card on `CustomerDetailDialog`. Nothing about jobs changes. One company record has a blank company name and needs fixing if the merge blocks on it. |
| 3 | Lift the 40 `Postal: …` addresses out of `customers.notes` | ⏳ not started | One-off reviewed SQL. **COPY, do not clear** — notes are driver-visible and searched. 25 of the 40 are on active clients. Safe to run now that the re-import can no longer null them (`60287ed`). |
| 4 | Booking shape + on-site jobs end to end | ⏳ not started | `jobs.booking_shape` + `client_site_id` + `site_label`; the three-way toggle in BOTH dialogs in the same commit; the site picker with inline "+ add a site" and "save this address to <client>". The truck login currently shows an on-site job with **no location at all** — fix that here. |
| 5 | Hide what doesn't apply | ⏳ not started | *for themselves* drops the Recipient fields. One predicate, no migration. |
| 6 | `job_stops` — hourly install work only | ⏳ not started | Child table, not JSONB (`toSnakeCase` recurses into arrays). Needs a DRIVER select policy scoped through the parent job or multi-stop is a lie on the phone. Per-stop timestamps; collection photos only when the driver answers yes to "is there damage visible?"; final-delivery photos always; **ONE** invoice line listing every pickup and the delivery. |
| 7 | Downstream truth pass | ⏳ not started | Xero line descriptions say "from A to B", false on a multi-stop job; export filenames name every stop's photo after stop 1; the driver's Maps link goes to stop 1 with no sign more exist; `PublicStatusPage` and `useJobPhotos` have hardcoded select lists. |
| 8 | Parity + the freeze rule | ⏳ not started | Widen `check-parity.ts` to the driver and customer files. Then stop `sms.ts`, `xero.ts` and `SendSmsDialog` resolving the client's name from the **live** profile instead of the job snapshot — a rename currently rewrites what every historical job's SMS and invoice say. Build LAST, it is outward-facing. |
| — | Duplicate-client merge tool | ⏳ wanted, unscheduled | None exists; the Bayliss merge was hand-written SQL and `CustomersView` offers only Delete / Move to Trash. Once sites live on the profile, a duplicate means a split address book. |

**Open decisions Yamin has NOT made:** whether an on-site labour job in a
regional suburb carries a travel loading beyond the travel-time charge; and
whether client sites should be searchable (he said no — search is always by
client, never by address, so this is settled unless he reopens it).

### Dialog layout (2026-09-22 → 23)

| What | Commit | Note |
|---|---|---|
| Quote card to two columns, client to one field | `c8b2706` | Four section rules; Company name + Contact person removed as a duplicate identity |
| Job dialog fits the screen; **Labour job type restored** | `3377c28` | The select offered four types where the quote dialog offers five, so a saved Labour job would silently convert on first touch. No Labour job existed in production yet. Parity row for Labour now has a `jobDialog` key, verified to fail when removed. Three columns was **rejected** on arithmetic — at 4xl a third column is 267px, narrower than today's 294px. |
| Quote form gets back the height the price block held | `0cda2d9` | Only the total is pinned now; the charge lines scroll with the rest |

**What's left:** a full Storage quote still scrolls on Yamin's 13-inch (669px
viewport) — 225px of the 635 is fixed chrome. Next levers, if he asks: drop the
`DialogDescription` under the title (~20px) and tighten the row gap. Also: the
job dialog is now the widest surface in the dashboard at `4xl` while every
other dialog is `2xl` — if the asymmetry looks wrong, widen the others to match.

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
| 16 | `20260916000001_rename_house_move_to_hourly_rate.sql` | renames the `House Move` job type to `Hourly rate` across `jobs.type` (25), `customers.default_service` (1), `services.name` (1); widens then narrows `jobs_type_check` |
| 17 | `20260916000002_drop_job_type_rename_backup.sql` | drops `_bak_job_type_rename`, the verified rename scaffolding |
| 18 | `20260916000003_add_storage_job_type.sql` | widens `jobs_type_check` to allow `Storage` as a fourth job type |
| 19 | `20260916000004_storage_service_builtin.sql` | locks the `Storage` services-catalog row as a builtin, mirroring the other three job types |
| 20 | `20260917000001_v7_phase1_rate_book_v2.sql` | 25 rate columns + 16 job columns + `Labour` job type + `fuel_levy_mode` / `warehouse_service` / `truck_size` CHECKs |
| 21 | `20260917000002_v7_phase2a_metro_postcodes_table.sql` | `metro_postcodes` table — the 192-postcode list becomes editable data |
| 22 | `20260917000003_v7_phase2b_metro_postcodes_anon_read.sql` | anon read on `metro_postcodes` only (it says which postcodes are metro, nothing about price); `pricing_rates` stays authenticated-only |
| 23 | `20260917000004_v7_phase3_labour_builtin_service.sql` | locks the `Labour` services-catalog row as a builtin |
| 24 | `20260918000001_v7_phase6_container_link.sql` | `jobs.container_job_id` — a delivery points at the unload it came out of, for the three-way invoice split |
| 25 | `20260922000001_v7_phase7_travel_time.sql` | `jobs.travel_hours` (NUMERIC, nullable). Additive — all 101 existing jobs price exactly as before |

**Security advisor findings on the migrated project:** 14 warnings flagged post-V4 migration. **All pre-existing**, not caused by V4 / V5 (RLS-policy permissiveness on `job_history` / `truck_shifts` / `sms_templates`; SECURITY DEFINER functions exposed to anon / authenticated; missing RLS policy on `quote_number_counter`; leaked-password protection disabled). Listed in *Deferred* above for a future hardening pass.
