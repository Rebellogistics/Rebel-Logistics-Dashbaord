# Rebel Logistics — V3 phased plan (post April 28 call)

Source of truth for everything Yamin asked for on the **April 28 2026** call. Each phase ships as a discrete, demoable unit so a status report (`V3_STATUS_PHASE_<N>.md`) can be cut after the implementation lands and used directly in the next client conversation.

Every phase has two layers:
- **Core** — exactly what Yamin asked for on the call.
- **+1 enhancements** — one-step-ahead additions that serve the same problem better. Each enhancement is justified in plain English so Yamin can decide to keep, defer, or drop it. Nothing speculative — only items that compound the value of the core ask.

- Source transcript: [`TRANSCRIPT_APR28.md`](TRANSCRIPT_APR28.md)
- Prior call's actionables (now superseded for any overlap): [`ACTIONABLES_POST_CALL_APR13.md`](ACTIONABLES_POST_CALL_APR13.md)
- Next checkpoint: **Wed 29 April 2026, 6:30pm, South Bank** (in person). Optional Tuesday FaceTime for review.

---

## Phase ordering rationale

1. Phases 1–4 are **front-end / data-model only** — no third-party credentials needed. They unblock Yamin's day-to-day operations.
2. Phase 5 wires up the **Google Calendar** OAuth credentials Yamin sent during the call.
3. Phase 6 (**Maps autocomplete**) is blocked on Yamin handing over the Maps API client ID + secret at the next meeting.
4. Phase 7 (**Customer CSV import**) is a bug fix — small but interrupts another Phase if combined.
5. Phase 8 (**Twilio go-live**) is blocked on the Australian bundle approval (2–3 wks after Apr 26 submission).
6. **Marketing website** — paused. Sumanyu is preparing a separate quote and Yamin will sign off in person; tracked outside this plan.

Phases 1–4 + 7 are the realistic targets to land before the **Wed Apr 29** meeting; Phase 5 if there's time.

---

## Phase 1 — Quote-form rebuild + pricing engine

Yamin's biggest functional ask. Today the new-quote form is one-size-fits-all. He wants the form to morph based on **job type**, with an editable rate book in Settings.

### 1.1 Core — Job-type-aware form
- Job types: **Standard Delivery**, **White Glove**, **House Move (Hourly Rate)**.
- For **Standard Delivery** + **White Glove**:
  - Replace the free-text "distance" field with a **Location** toggle: `Metro` / `Regional` (Melbourne).
  - Keep **Dimensions** but relabel to **Cubic metres** (single number; multiplier).
  - **Item weight** stays as an optional field ("in case it's a marble table or something").
  - Notes field stays.
- For **House Move (Hourly Rate)**:
  - Hide: distance, item weight, dimensions.
  - Show: **Hourly rate** (read-only display, sourced from rate book — `$180 +GST`), **Minimum hours** (locked at `3`), **Estimated hours** (number, must be ≥ 3).
  - Show: **Job description** (textarea — replaces the bland "optional notes" with a stronger label and helper text suggesting `stairs, easy access, lift available, fragile…`).
- All prices displayed with `+ GST` suffix and a computed inc-GST total beneath.

### 1.2 Core — Rate book in Settings
A new **Settings → Pricing** panel lets Yamin edit:

| Rate | Default |
|------|---------|
| Standard / White Glove — Metro per cubic metre | `$90` |
| Standard / White Glove — Regional minimum charge | `$480` (flat, **not** per cube) |
| House Move — Hourly rate | `$180` |
| House Move — Minimum hours | `3` |

Persisted in a new `pricing_rates` table. Editing is admin-only.

### 1.3 Core — Total computation
- Standard / White Glove **Metro** → `cubic_metres × metro_per_cube_rate`.
- Standard / White Glove **Regional** → `regional_minimum` (flat).
- House Move → `max(estimated_hours, min_hours) × hourly_rate`.
- Stored on the quote so historical quotes don't shift when the rate book is edited later.

### 1.4 Core — Public `/quote` form parity
Customer-facing embed needs the same morphing logic so a customer requesting a house move sees an honest hourly estimate, not a fake per-cube quote.

### 1.5 +1 — Live total bar that updates as you type
Sticky bar at the bottom of the quote dialog: `Subtotal $270 · GST $27 · Total $297`. Updates instantly on every cube/hour change. Why: removes the mental math when Yamin is on a phone call and a customer asks "so what's that come to?"

### 1.6 +1 — Per-customer rate override
On the customer record, optional fields: "Override metro rate", "Override hourly rate". When set, those override the rate book for that customer's quotes. Why: Yamin almost certainly has 1–2 repeat clients on a special rate. Without this he has to remember to manually adjust every quote.

### 1.7 +1 — Quote number + status badge on every quote
Auto-generated `RL-2026-0042` style reference. Why: when a customer rings back with "I got a quote last week," Yamin asks for the number and pulls it up in one search instead of scrolling.

### 1.8 +1 — Save-as-draft and quote expiry
Drafts persist mid-creation (essential for the mobile quick-add in Phase 4). Add a `Valid until` date defaulted to 30 days. Why: standard quoting practice; protects Yamin if rates change between the quote and the booking.

### 1.9 +1 — Three-hour minimum is enforced, not just labelled
If the customer enters `2` for estimated hours, the form auto-corrects to `3` with a small inline note: `Minimum 3 hours applies`. Why: prevents a customer from underpaying on the public form because they typed `1`.

---

## Phase 2 — Board / Truck Runs split

Yamin wants the two pages to play different roles:

> "The board will be the administration side, and then truck runs will be like the operation side of the booking system."

### 2.1 Core — Board page = administration
- **Columns kept**: `Quoted`, `Accepted`, `Completed`, `Invoiced`.
- **Columns removed**: `Scheduled`, `In Delivery` (those move to Truck Runs).
- Clicking a card on Board opens the **job dialog** with full edit powers (see 2.3) — no need to switch pages to assign a truck or change the date.

### 2.2 Core — Truck Runs page = operations
- **New columns** alongside the existing `Truck 1` / `Truck 2`:
  - **Accepted jobs** (not yet scheduled) — sorted by recency.
  - **Scheduled jobs** (date set, no truck) — sorted by date.
- Drag a card from `Accepted` → `Truck 1` to assign the truck (and prompt for a date if missing).
- Day picker at the top — switching dates filters which jobs render in Truck 1 / Truck 2. Defaults to today.

### 2.3 Core — Editable schedule + addresses on existing jobs
The job dialog now lets Yamin edit:
- Date / schedule (currently impossible)
- Pickup + delivery addresses (currently impossible)

Available for any status other than `Completed` / `Invoiced`. Every change writes to a per-job audit log (who, when, before → after) — surfaced in a "History" tab inside the dialog. Why an audit log: liability. The same logic that drives the Trucks calendar (Phase 3).

### 2.4 +1 — Today / Tomorrow / pick-a-date shortcut on Truck Runs
Three buttons above the day picker so Yamin lands on the most-used view in one tap. Why: 90% of his use will be "what's today" and "what's tomorrow."

### 2.5 +1 — Per-truck daily summary strip
Tiny header above each truck's column: `Truck 1 · 4 stops · first 9:30am · last 4:15pm`. Why: at a glance Yamin can tell whether a truck has room for one more before he assigns it.

### 2.6 +1 — Conflict / overload warning
If two jobs on the same truck have overlapping windows (or 5+ jobs stack on one truck), the column gets a yellow chip. Why: catches double-booking before the driver does.

### 2.7 +1 — Suggest a truck on first assignment
When dragging from `Accepted` for the first time, the system pre-highlights the truck with the lighter day. Yamin can override; it's just a hint. Why: removes a thinking step on the dispatch decision.

---

## Phase 3 — Driver attribution + Trucks calendar

Driver of record on every completed job, plus a calendar view of which truck/driver was on duty on a given day. Motivation Yamin gave: "fines come two, three weeks later" — he needs to look up after the fact who was driving truck X on date Y.

### 3.1 Core — Persist driver-on-shift
- When a driver logs into a truck and starts a run, write `(truck_id, driver_id, started_at, ended_at)` to a new `truck_shifts` table.
- Stamp `driver_id` on every `job` record at completion time so the value survives even if shifts get edited later.

### 3.2 Core — Surface driver name on completed-job notification + dialog
- Bell-notification body: `"Driver A · Truck 1 · 4 stops completed"` (currently shows truck only).
- Job-detail dialog header: a line under the truck pill that names the driver.

### 3.3 Core — New `Trucks` sidebar tab — calendar view
- Sidebar entry alongside `Truck Runs`.
- Calendar grid (month view, default current month).
- A day cell shows a small chip per **truck that ran that day** (truck rego). Days with zero runs are blank.
- Clicking a day opens a side-panel listing each truck on duty that day with the driver's name and the jobs completed.

### 3.4 +1 — "Find a fine" search bar
Top of the Trucks page: a single search input — type a date and rego, jump straight to the matching shift. Why: this is the literal scenario Yamin described. Don't make him scroll to find it.

### 3.5 +1 — Heat-mapped calendar
Day cells tinted by activity intensity (1–2 jobs = light, 5+ = dark). Why: Yamin can spot under-utilised days at a glance — useful for marketing pushes.

### 3.6 +1 — Driver self-checkout
A "End shift" button on the driver's portal that stamps `ended_at`. Until they tap it, the shift is open. Why: avoids needing Yamin to manually close shifts; also captures actual hours worked for payroll disputes later.

### 3.7 +1 — Mid-day driver swap
If driver B logs into a truck currently held by driver A, A's shift is auto-closed and B's opens. Both shifts persist with their own time windows. Why: real-world scenario when one driver hands a truck off mid-day.

---

## Phase 4 — Mobile UX for the owner

Yamin will increasingly book jobs from his phone. The current mobile view dumps the desktop dashboard onto a small screen.

### 4.1 Core — Mobile dashboard reorder
- Top of the dashboard on mobile: a single prominent **`+ New Job`** button.
- KPI tiles + recent activity move below the fold.

### 4.2 Core — Quick-add quote flow (mobile-first)
- A trimmed-down create-quote form: customer name, phone, basic notes, job type. Saves as `Quoted` immediately.
- Yamin can finish the rest (addresses, cubes, pricing) from desktop later — depends on Phase 1.8 (drafts).
- Designed for the "I'm driving and a customer just called" scenario.

### 4.3 +1 — Floating "+" action button across the whole app
Not just on the dashboard — every page on mobile carries the FAB. Why: the moment Yamin wants to add a job is unpredictable; he shouldn't have to navigate first.

### 4.4 +1 — One-tap actions on customer / job cards
Phone numbers become `tel:` links; addresses become Google Maps deep links. Why: zero-friction calling and routing while on the move.

### 4.5 +1 — PWA install prompt
The dashboard can be installed to the home screen like a native app — no App Store needed. Adds an icon, removes the browser chrome, opens full-screen. Why: makes the dashboard feel like Yamin's actual operations app, not a website.

### 4.6 +1 — Voice-to-text on the job description field
Tap the mic icon, speak the job description. Uses the browser's native speech recognition. Why: lets Yamin capture detail while driving without typing.

---

## Phase 5 — Google Calendar wire-up

Credentials received in-call (client ID + client secret for the `Rebel Logistics Dashboard` OAuth client).

### 5.1 Core — Server config
- Store both in env / Supabase secrets.
- Authorize redirect URL is the Settings → Integrations URL Yamin pasted into the OAuth client.
- Existing connect/disconnect/switch UI (already shipped per `9b38865`) hooked up to real OAuth.

### 5.2 Core — Calendar push rules
Yamin's rule: an event appears on his calendar **only after the job is assigned to a truck** — not when merely accepted.
- On `truck_id` set → create a Google Calendar event (title: customer name + job type; location: pickup address; description: cubes / hours / notes).
- On reschedule → update the event.
- On unassign / cancel → delete the event.

### 5.3 +1 — Colour-coded events by job type
White Glove = blue, Standard = green, House Move = orange. Why: when Yamin glances at his Google Calendar on his phone he can instantly read the day's mix.

### 5.4 +1 — One Google Calendar per truck
Instead of dumping every job into one calendar, create `Truck 1` and `Truck 2` calendars under his account. Yamin can show/hide trucks in Google Calendar's UI. Why: lets him filter visually without leaving Google Calendar.

### 5.5 +1 — Auto-add the assigned driver as an attendee
When a driver is assigned, Google Calendar invites them. The event lands on their personal calendar with all the job details. Why: drivers don't need to log into the dashboard to see what they've got tomorrow.

### 5.6 +1 — Two-way sync on time changes
If Yamin drags an event in Google Calendar to a new time, the dashboard's job record updates. Why: he already lives in his calendar; let him reschedule from where he is.

---

## Phase 6 — Google Maps Places autocomplete

**Blocked on Yamin sending the Maps API client ID + secret.** To be collected at the Wed Apr 29 meeting.

### 6.1 Core — Replace plain text inputs
- Owner new-quote form
- Public `/quote` form
- Job-edit dialog (Phase 2.3)

Persist both the human-readable address and the Maps `place_id` so deep-linking later is exact.

### 6.2 +1 — Distance + ETA preview in the quote dialog
Once both pickup and delivery resolve, show `28 km · ~38 min via M3`. Why: lets Yamin sanity-check pricing on the spot — if a "metro" job is 60 km away, he sees it before quoting too low.

### 6.3 +1 — Metro/Regional auto-detect
On address resolve, check whether the delivery sits inside Melbourne metro polygon. If the customer picked `Metro` but the address is regional, show a warning chip. Why: prevents under-charging for the most common pricing mistake.

### 6.4 +1 — Save addresses to the customer record
After a quote is created, the addresses are tagged onto that customer's record. Next time Yamin starts a quote for the same customer, the recent addresses appear as one-click options. Why: most repeat customers move from / to the same warehouse or showroom.

### 6.5 +1 — "Open route" deep link
A button on the job dialog that opens Google Maps directions from pickup → delivery in the driver's app. Why: removes the copy-paste step on the driver's portal.

---

## Phase 7 — Customer CSV import fix + bulk-import polish

The import attempt during the call silently swallowed two test rows.

### 7.1 Core — Bug fix
- Reproduce with the sample CSV Yamin sent (his Xero export trimmed to 2 contacts).
- Likely culprits: column header normalisation (Xero uses `Account Name` vs our `company`), missing-required-field validation that fails silently, or RLS blocking the insert.
- Add inline error reporting per row: `Row 3 skipped: missing phone`.

### 7.2 Core — Xero column mapping helper
Yamin will bulk-import his entire Xero contact list over the weekend. Add a mapping screen so he can drag Xero column names onto the system fields once, instead of pre-massaging the CSV.

### 7.3 +1 — Preview before commit
After mapping, show the first 5 rows as they will be imported. Yamin clicks `Confirm import` only after eyeballing them. Why: catches mapping mistakes before they pollute the database.

### 7.4 +1 — Duplicate detection with merge option
Match by phone number first, then by business name. If a match is found, offer `Skip / Merge / Create anyway` per row. Why: Yamin will re-import from Xero more than once over time; without dedup he'd end up with duplicate customers.

### 7.5 +1 — "Imported from" tag
Each imported customer gets a `xero-2026-04-28` tag. Yamin can filter by tag in the customers list. Why: if an import goes wrong, he can find and bulk-delete just that batch instead of cleaning by hand.

### 7.6 +1 — Save the column mapping for next time
First import takes 2 minutes of mapping. Subsequent imports auto-apply the saved mapping in 5 seconds. Why: this will become a recurring monthly task.

---

## Phase 8 — Twilio go-live (deferred 1–2 weeks)

**Blocked on Twilio AU bundle approval** (submitted Sat Apr 25; reviewer ETA 2–3 weeks → expect by ~mid-May).

### 8.1 Core — Interim trial number
- Use the trial US number Twilio assigns post-bundle-claim so SMS sending can be wired up and tested end-to-end now.
- Swap to the AU number (sender ID swap, no code changes other than env) once the bundle clears.

### 8.2 +1 — Editable SMS templates in Settings
A `Settings → SMS Templates` panel. Templates use placeholders: `Hi {customer_name}, your {job_type} is scheduled for {date} between {window}. — Rebel Logistics`. Yamin edits the wording without a developer involved. Why: tone of customer SMS matters and changes seasonally; he should own it.

### 8.3 +1 — Auto "On the way" SMS when driver flips to In Delivery
Pre-built template fires automatically when the driver presses Start Run. Why: industry standard; reduces "where are you?" calls; lifts perceived professionalism.

### 8.4 +1 — Inbound reply tracking
Customer replies to a Rebel SMS land in the notification bell. Yamin can reply from the dashboard. Why: customers will reply to confirmation SMS; right now those replies go into a void.

### 8.5 +1 — Delivery proof SMS
After job complete, an SMS goes to the customer with a link to view the signed proof + photos. Why: closes the loop and gives the customer something to forward to their accountant — free brand impression.

---

## Marketing website — paused

Out of scope for this plan. Sumanyu will hand Yamin a price + scope at the Wed Apr 29 meeting and they'll decide together. When greenlit, it'll be tracked separately as `WEBSITE_PLAN.md`.

Inputs already captured for that future plan: hard-drive of past-job photos to be handed over Wed; reference design at `web.archive.org/web/*/rebellogistics.com.au`; domain on Ventra IP (credentials shared); current $18.50/mo Ventra hosting can be cancelled or kept (TBD); ELFsight reviews widget (~$5/mo) optional add-on.

---

## Status reporting protocol

A **single rolling file** — `V3_STATUS.md` at the repo root — holds the live status of every phase. After each phase ships, append a new section to that file using this skeleton:

```markdown
## Phase <N> — <name>
_Implemented: <date>. Source: V3_PHASED_PLAN.md §Phase <N>._

### What's done (✅)
- Concrete capability Yamin will see, in his words where possible.

### What needs Yamin (⏳)
- Blockers requiring credentials, decisions, or content from him.

### What's deferred (🕐)
- Items pulled out of this phase and where they landed (link the new phase).

### How to try it
- Click-path: "Settings → Pricing → edit Metro rate."
```

Plain English. Skip Git SHAs, table names, env vars. Update this file's "Phase ordering rationale" if priorities shift.

---

## Open questions for Wed Apr 29 meeting

- Maps API credentials handover.
- Confirm Phase 1 rate book values (`$90 metro / cube`, `$480 regional flat`, `$180 hourly`, `3h min`).
- Confirm whether **Standard Delivery** and **White Glove** share the same metro/regional rates or need separate ones (call left it ambiguous — Yamin said "exactly the same thing" but the operational difference suggests White Glove should likely cost more).
- Per-customer rate overrides (1.6) — does Yamin already have repeat clients on special rates? If so, he should bring the list.
- Multi-calendar per truck (5.4) vs single calendar — preference.
- Voice-to-text (4.6) — keep or drop?
- Website price + scope sign-off (separate document).
