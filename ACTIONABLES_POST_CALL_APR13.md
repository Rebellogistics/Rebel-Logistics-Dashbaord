# Rebel Logistics — Actionables after April 13 call with Yamen

Everything Yamen flagged on the call, plus one-step-better enhancements layered in. Organised into phases that ascend from quickest wins to heaviest integrations. Every item has a **source** line (direct from Yamen's words or a proposed enhancement) so nothing gets lost.

---

## Phase 7 — Yamen's testing notes (quick wins, 1–2 days)

Small fixes he called out live. Almost all cosmetic or one-screen changes. No data-model shifts.

### 7.1 Time-range switcher on "Closed with proof"
- **Source**: "this completion rate is for a month but I'll give you an option to change it to a day to a week and a month all of that"
- Add a Day / Week / Month toggle on the Dashboard KPI card.
- **+1 step**: remember Yamen's last selection in `localStorage` so the dashboard opens where he left it.

### 7.2 Remove the revenue insight chip from the Dashboard
- **Source**: "on time deliveries revenue um that's last week… this does not need to have that… it can be something accessible but I do not need it here"
- Drop the Revenue card from `InsightChips`. Keep Jobs-vs-last-week and On-time deliveries.
- **+1 step**: build a new **Revenue** tab under Reviews (or a new "Insights" tab) that holds revenue, proof rate, truck utilisation, and customer spend. Accessible, not front-and-centre.

### 7.3 VIP visible on the job card itself
- **Source**: "does it change anything in the job card if I was to do it for them?"
- Currently VIP only shows on the customer list. Surface a gold VIP badge on:
  - Jobs table row (next to customer name)
  - Live Truck Runs card
  - Job detail dialog title
  - Driver's job card (so the driver knows to handle with care)
- **+1 step**: when creating a new quote/job for a VIP, auto-pin their preferred SMS template and show a "VIP · usual: White Glove · usual address" context strip at the top of the dialog.

### 7.4 Date visible on Truck Runs cards
- **Source**: "over here it tells me on which truck it's assigned to. But not the date"
- Add the job date as a meta line on every Truck Runs card (not just inside the detail dialog).
- **+1 step**: relative dates ("Today", "Tomorrow", "Thu 17") + date column in the table view.

### 7.5 Tooltips for unclear fields
- **Source**: Yamen paused on "VIP" and "Notes" — wasn't sure what they meant.
- Add hover tooltips / inline help on: VIP toggle (explains what it does), Notes field (explains driver visibility), Source dropdown, Type pill, Fuel levy.
- **+1 step**: a `?` icon in the top-right of every dialog that expands a short "How this works" panel.

### 7.6 Fix the Start-run → Dashboard notification
- **Source**: Yamen pressed Start Run on the driver side; nothing appeared in his bell. We already have `delivery_completed` alerts, but the Start-run moment wasn't firing a distinct alert.
- Add a new `run_started` alert kind to `useAlerts`: triggered for jobs that are `In Delivery` but have no completion yet. Surfaces as "Steve started Truck 1 run · Sarah Chen + 3 stops".
- **+1 step**: real-time subscription via Supabase Realtime so the bell updates without a page refresh when a driver flips status.

### 7.7 Google Maps deep-link + tel: on driver job card
- **Source**: "click the address and then boom Google maps. Click the phone. Boom. Call button"
- Confirm `tel:` is wired (looks like it already is). Add a Google Maps icon button next to each address on the driver's job card that opens `https://www.google.com/maps/dir/?api=1&destination={address}` in a new tab / default maps app.
- **+1 step**: add the same to the owner-side Job Detail dialog too, so Yamen can pre-check a route from his desk.

### 7.8 Driver shell — strip Week tab + Earlier section
- **Source**: "the earlier this week, what's that?… They do not need to see any of that" / "it'll be just the list of jobs that they have on the day"
- Remove the **Week** tab entirely from `DriverShell`.
- Remove "Earlier this week" section from Today tab.
- Keep Today + Profile only. Move the truck number badge up top so the driver knows which truck they're logged into.
- **+1 step**: at the top of Today, show a one-line summary: "Truck 1 · 4 stops · first pickup 9:30 AM · ~5h route" (ETA sum).

### 7.9 Google Places address autofill on quote form + new-job dialog
- **Source**: "you know how when you type an address um… it finds it in Google Map and it sort of autofills"
- Wire `@react-google-maps/api` (or simple Places Autocomplete input) on:
  - Public `/quote` form (pickup + delivery)
  - `NewQuoteDialog` (same two fields)
- **+1 step**: once both addresses are filled, compute distance + estimated drive time via the Routes API and show it inline ("Crows Nest → Manly · 22 km · 34 min"). Helps pricing too.
- Requires a Google Maps API key — Yamen needs to create one in Google Cloud Console, add to Vercel env as `VITE_GOOGLE_MAPS_API_KEY`, restrict by HTTP referrer.

### 7.10 Storage usage meter
- **Source**: I flagged during the call — 500 MB free tier = ~125 jobs at 10 photos each.
- Add a small usage ring in Settings → Import ("Storage used: 312 / 500 MB"). Warns at 80%.
- **+1 step**: auto-suggest the backup export flow (from Phase 13) when crossing 80%.

---

## Phase 8 — Workflow overhaul: split accept from assign (biggest Yamen ask)

This is the key workflow insight from the call. Accept ≠ assign. Yamen often accepts on Monday, assigns on Thursday once he can see the whole week's shape.

### 8.1 New job status `Accepted` (separate from `Scheduled`)
- **Source**: "instead of accepting and assigning trucks straight away, can I have accepted jobs for example?… And then from so like I'll accept the job and then these are the jobs that are accepted, ready to be done… And assign the truck at a later stage"
- Current flow: Quote → (accept opens assign dialog) → Scheduled with truck.
- New flow: Quote → **Accept** (opens a simple "accept + price + date" dialog, **no truck**) → `Accepted` status. Then separately, truck assignment moves it to `Scheduled`.
- Update the `StatusPill` + `useAlerts` to treat `Accepted` as its own state (amber-ish).

### 8.2 "Accepted" filter chip + dedicated section on Jobs tab
- Add an "Accepted" chip to the existing status filter chips on JobsTable (already supports this after Phase 6.1).
- On the Jobs tab, surface an "Unassigned — waiting for a truck" callout card when the accepted-but-unassigned count > 0. One click filters to them.

### 8.3 Pricing on accept
- **Source**: "at this point see because there is no price if I accept"
- The Accept dialog gets Fee + Fuel Levy + Pricing Type (fixed / hourly) + Hours-estimated fields. Currently those only show on NewQuoteDialog.
- **+1 step**: **Smart pricing suggestions**. Look back at this customer's last 3 jobs of the same type, and the average fee across all jobs of the same type in the last 60 days. Show as ghost text in the fee field: "Suggested: $280 (last White Glove for Sarah Chen)".

### 8.4 Assign-to-truck dialog (new, separate)
- A dedicated "Assign to truck" action on Accepted jobs. Picks truck, confirms date, and flips status to `Scheduled`.
- Keeps the old flow working (accept-and-assign-in-one) as an option for owners who don't want the two-step.

### 8.5 Reassign / edit truck anytime
- **Source**: "even though I'm accepting the jobs I haven't assigned them just yet because I'm obviously trying to build a run on that day" + "I could have a job that's full day, then okay, I can assign it to that truck. But if I've got five deliveries and I've got a couple pickups and then okay, that only takes me to half a day"
- On any `Scheduled` or `Accepted` job, allow changing the assigned truck from the detail dialog (not just at accept time).
- **+1 step**: if you move a job to a truck that already has an overlap, show a warning ("Truck 1 already has 6h booked on Thu — consider Truck 2").

### 8.6 Drag-drop jobs between trucks
- **Source**: "I like drag across and put it into track one"
- Truck Runs view becomes a two-column Kanban on desktop (Truck 1 | Truck 2 | …). Drag a job card between columns to reassign.
- **+1 step**: drop zones also include an "Unassigned" pool, and a date selector above so you can move jobs across days by dragging onto a calendar strip.

### 8.7 Date picker / calendar view on Truck Runs
- **Source**: "I'm having to manually scroll through the days… if I can select a date so then I can see what's on that day"
- Add a date nav: Today / Tomorrow / pick-a-date above the Truck Runs view.
- **+1 step**: a compact calendar heatmap showing job density per day for the next 30 days, so Yamen can see which days are light and stack new jobs into the gaps.

---

## Phase 9 — Login model: per-truck, not per-driver

### 9.1 Trucks as login identities
- **Source**: "the login accounts are… whoever has truck one will log to the details of truck one… It's not by the name of the driver because the drivers will change trucks"
- Rework auth / profiles: each truck gets its own login (e.g. `truck1@rebellogistics.au`, `truck2@…`). Profile role becomes `truck` (replaces individual `driver` entries).
- Driver shell shows: logged-in truck's ID + today's jobs assigned to that truck.
- Migration path: keep existing driver accounts working; add new truck accounts alongside; offer a Settings tool to convert an existing driver account into a truck account.

### 9.2 "Who's driving today?" picker (optional, for accountability)
- **Source**: "I've got four drivers" and trucks rotate between them.
- On first load each day, the iPad asks "Who's driving today?" (dropdown of drivers). Choice persists until end of day.
- Timestamps on `job.notes` from completions will use that driver's name, preserving the audit trail Phase 2 established.
- **+1 step**: Settings → Drivers becomes a roster of humans, independent of the truck logins. Dispatchers can see "Driver Steve drove Truck 1 on Apr 13 · 4 deliveries completed" in reports later.

### 9.3 Driver shell → Truck shell terminology
- Rename "Driver" to "Truck" everywhere on the operator side.
- Profile tab shows truck stats (lifetime deliveries for Truck 1, uptime, etc.) and the current driver (if picked).

---

## Phase 10 — Google Calendar integration

### 10.1 Connect Google Calendar
- **Source**: "have it integrated through my calendar cuz then I don't have to be in front of my computer"
- Add a "Connect Google Calendar" button in Settings. OAuth flow — user authorises once, we store the refresh token in a new `integrations` table.
- **+1 step**: Yamen's call included a concern about sharing credentials. The OAuth flow means he never shares his password — he clicks "Authorise Rebel Logistics" in Google's own UI.

### 10.2 One-way sync (app → calendar)
- When a job is Accepted (has a date) or Scheduled, create a calendar event.
- Event title: "🚚 Sarah Chen · White Glove · Truck 1"
- Event description: pickup, delivery, phone, fee, driver notes.
- Event location: delivery address (so Google Maps opens on tap).
- Event colour: by truck (Truck 1 = blue, Truck 2 = green, etc).
- Update event on any job field change. Delete event on Decline.

### 10.3 Two-way sync (stretch)
- **+1 step**: if Yamen drags a calendar event to a different day on his phone, we detect the change via Calendar push notifications and update the job date in our DB. Confirms back with a toast in the dashboard.

### 10.4 Fallback: dedicated calendar account
- If OAuth for his primary account is awkward (org policy, shared credentials), Yamen creates `calendar@rebellogistics.com.au` and connects that instead. Same code path.

---

## Phase 11 — Twilio go-live + SMS polish

### 11.1 Switch the SMS provider from stub to Twilio
- Twilio account is created. Need to:
  - Buy a number in AU with the business name as the sender ID (or use Alphanumeric Sender ID since AU supports it).
  - Store `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` as Vercel env vars.
  - Replace the stub body of `sendSms()` in `src/lib/sms.ts` with a Twilio REST call.
- **+1 step**: tunnel the send through a thin serverless function (Vercel Edge Function) so the auth token is never exposed to the browser. The current stub is client-side; the real Twilio call shouldn't be.

### 11.2 Delivery receipts
- Subscribe to Twilio status callbacks (delivered / failed / undelivered) via a webhook → update `sms_log.status` in real time.
- Bell alerts already surface failed SMS; this makes them actually accurate.

### 11.3 VIP messaging priority
- When sending a day-prior or en-route SMS to a VIP customer, pin their preferred template if set (Phase 2 groundwork), and add a small "VIP" marker in the composed body preview in the dialog.
- **+1 step**: opt-in auto-send rules — "always send en-route SMS to VIPs the moment the driver taps Start Run" (others stay manual).

---

## Phase 12 — Xero invoicing integration

The biggest business integration. Split across two subphases so it can land incrementally.

### 12.1 OAuth connection + per-job invoice send
- **Source**: "Zero. Correct"
- Settings → Integrations → Connect Xero (OAuth 2.0). Store refresh token.
- Per-completed-job "Send to Xero" button in `JobDetailDialog`. Sends a draft invoice with:
  - Contact = customer (upsert by email/phone if not already in Xero)
  - Description per Yamen's spec:
    - White Glove / Standard: "{type} delivery from {pickup} to {delivery}" + items list
    - Hourly (house move): "Hourly move — {hours}h × ${rate}" + items list
  - Account code: `200` (Sales)
  - Tax type: GST on Income (`OUTPUT`)
  - Line items with quantity + unit amount
- **+1 step**: before sending, show an inline preview modal (the exact Xero payload rendered like an invoice) so Yamen confirms, no surprises.

### 12.2 Batch invoice: one invoice for multiple jobs per customer
- **Source**: "one client multiple jobs… on the system that will be individual. Now when they get exported over they will probably be individual as well. So then that means I'll have to copy paste them so they're in one invoice because then it becomes like a spam of invoices"
- New "Batch invoice" action on the Customers tab: select any customer with ≥2 completed un-invoiced jobs → preview a combined invoice → send as a single Xero draft with all jobs as line items.
- Track invoiced state per job (`status = 'Invoiced'` flows through already; add a `xero_invoice_id` column on jobs to prevent double-send).
- **+1 step**: weekly digest — every Friday, pop a "You have 8 un-invoiced jobs across 3 customers" reminder in the bell.

### 12.3 Sync invoice status back to the dashboard
- Poll or webhook (if Xero supports for the free plan) invoice status back: `Draft / Awaiting Payment / Paid / Overdue`.
- Surface on the job detail dialog next to the StatusPill. "Paid · $284 · Apr 18".
- **+1 step**: add an "Overdue invoices" alert to the bell.

---

## Phase 13 — Photo storage, export, and NAS backup

### 13.1 Naming convention for downloaded photos
- **Source**: "client, address, date… at least I've got three points of reference"
- Every photo exported from the app is renamed on the fly to: `{customer-name} - {delivery-address-short} - {YYYY-MM-DD} - {n}.jpg`
- Signature: `{customer-name} - {delivery-address-short} - {YYYY-MM-DD} - signature.png`

### 13.2 Per-job export button
- "Export proof" button on `JobDetailDialog` footer. Downloads a zip containing the photos, signature, and a printable receipt PDF — all named per 13.1.

### 13.3 Bulk backup + auto-cleanup
- **Source**: "a button that says export and that will export the pictures and signatures and the job cards for all the jobs that have been done since the last backup"
- Settings → Export → "Back up photos since last export". Generates a single zip.
- After successful download, optionally **auto-delete** Supabase Storage originals for jobs older than N days (configurable). Photos + signature URLs on `jobs` rows get nullified; the job + metadata stays so history is preserved.
- **+1 step**: instead of manual zip export, offer direct-to-NAS via WebDAV, and/or Dropbox / Google Drive sync as lower-friction backup targets. User picks once in Settings, the app auto-uploads completed jobs' proofs every N hours.

### 13.4 Storage usage dashboard
- Already flagged in Phase 7.10 as the warning meter. Here it gets a full page: per-customer photo counts, oldest photos, projected runway at current pace. Encourages the right backup cadence.

---

## Phase 14 — Kanban jobs board (enhancement beyond any single ask)

Not directly requested, but it's the natural answer to Yamen's mental model. Today he has to jump between **Jobs** (list) and **Truck Runs** (cards per truck) to do one workflow. A Kanban unifies them.

### 14.1 Unified board view
- New top-level tab: **Board**. Columns: Quote · Accepted · Scheduled · In Delivery · Completed · Invoiced.
- Each column shows jobs as compact cards with customer, date, truck, and fee.
- Drag between columns = status change (confirm dialogs for destructive moves like Decline).

### 14.2 Switchable groupings
- Group by: Status (default), Truck, Date, Customer. Same cards, rearranged.
- **+1 step**: "Week view" groups by date across the next 14 days; cards tinted by truck. Combines Phase 8.6 drag-drop with a calendar feel.

### 14.3 Bulk actions
- Select multiple cards → bulk send day-prior SMS, bulk assign truck, bulk invoice to Xero.

---

## Phase 15 — Website embed + public funnel

### 15.1 Embed quote form on rebellogistics.com.au
- **Source**: "this form is going to be on your website"
- Publish `/quote` with a wordpress/iframe embed snippet, and host it as a standalone responsive page that works inside an iframe.
- Consistent branding + Rebel logo header confirmed per Phase 6.5 + logo swap.

### 15.2 Public job status page (optional)
- **+1 step**: unique tokenised URL per job that the customer can open to see live status ("Driver started run · ETA 10:45"). Read-only. Replaces the text-only SMS updates with a tracked page.

---

## Phases at a glance

```
7   Quick wins                  — 1–2 days    (testing notes, tooltips, remove revenue, date shown, etc.)
8   Accept ↔ assign split        — 3–5 days    (biggest workflow ask; changes data flow + UI)
9   Per-truck login model        — 3–4 days    (auth rework; migration aware)
10  Google Calendar              — 2–3 days    (OAuth + event sync)
11  Twilio go-live               — 1–2 days    (provider swap + webhook for receipts)
12  Xero invoicing               — 5–7 days    (heaviest — OAuth, per-job + batch send, status sync)
13  Photo backup + NAS           — 2–3 days    (naming + zip + cleanup)
14  Kanban board (enhancement)   — 3–4 days    (unifies Jobs + Truck Runs mental model)
15  Website embed                — 1 day       (plus optional tracked-status page)
```

Recommended execution order for Monday's call and beyond:

1. **Phase 7 first** — ship every quick win before Monday so Yamen's Thursday test drive uses the corrected app.
2. **Phase 11 (Twilio)** on the same call — plug in the credentials, flip the switch, test a live SMS.
3. **Phase 8** next — biggest productivity unlock for Yamen's week.
4. **Phase 10 (Calendar)** — gives him mobile access he explicitly asked for.
5. **Phase 9** at the same time as 10 if bandwidth allows; otherwise right after.
6. **Phase 13** — pragmatic before storage actually runs out.
7. **Phase 12 (Xero)** — needs Yamen's scoped API access; plan it during the call where he sets that up.
8. **Phase 14 / 15** — enhancements that can follow the core integrations.

## Open items to confirm with Yamen on Monday's call

- Google Maps API key (he'll create it in Google Cloud for Phase 7.9).
- Twilio number purchase (AU number or Alphanumeric Sender ID "Rebel Logistics"?).
- Xero API scope — he mentioned creating restricted access with per-person credentials.
- Does he want the Week view restored on the driver shell for the owner role (in case he wants to preview a truck's week from the dispatch desk)?
- Per-truck login plan: does he want a clean break (all trucks are new accounts) or convert existing driver accounts in place?
