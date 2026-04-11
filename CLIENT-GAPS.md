# Rebel Logistics — Client Gap Analysis & Phased Build Plan

This document catalogs what is missing from the current app, grounded in
Yemen's own feedback from the 2026-04-03 call transcript. For each item I
note (a) what Yemen asked for in his own words, (b) what I am adding on top
based on what he should have asked for but did not, and (c) why it matters
for his specific business.

Companion to ROADMAP.md. ROADMAP covers what the business needs to start
making money in 60 days. This document covers what it needs to be usable
and valuable to Yemen specifically, based on his real workflow.

---

## Signal from the call

The transcript is auto-generated and noisy. Despite the garbled text,
several things are unambiguous and matter enormously for what we build
next.

### What Yemen actually said

**His business shape.** Small operation, 1-2 jobs on quiet days, 10-20 on
busy days. Primarily a distribution center — items arrive, then get
delivered. Some products from Italy and Spain (furniture, appliances) via
retail partners. Storage is rare and only for house moves. Some interstate
work across seven other states. **Most of his work is repeat customers and
referrals** — one-off jobs from Google are rare. He has B2B clients too,
where one company books and a different end client receives.

**His top pain point: phone calls for quotes.** He said it explicitly —
customers ringing him constantly to ask for quotes, and he wants them to
be able to fill out a form themselves. "I want a customer to make a quote
and then it involves me only when they commit." This is the single
loudest signal in the entire transcript. He hates phone quotes.

**His second pain: mobile access.** "My phone is my office." He manages
everything from a phone, so the app must work on a phone. Not mobile
responsive as a nice-to-have — mobile-first or it fails.

**His third pain: repeat customer friction.** Most of his work is repeat
or referral, but the current app treats every quote as brand new. He
wants the repeat flow to be essentially one-click.

**Xero is not optional.** He already uses Xero and expects this system to
talk to it. He said something like "what about Xero" while clicking
around. The current app does nothing with Xero.

**Digital signatures matter.** He brought up liability directly. He wants
customers to sign the job as delivered for legal protection. Mentioned
"Google initial" and signed documents. The current stopgap (paste text
into a signature field) is exactly what he does not want.

**B2B workflow is underserved.** "When a company books it, my end client
is the person you buy from" — he has cases where the invoicer is
different from the receiver. The current app has one `customer_name`
field and one phone number. It cannot model "company A books the move,
Sarah at address X receives the items."

**Notes are load-bearing.** He said he uses the notes field a lot and
wants it more prominent. Currently it is a single tiny field at the
bottom of the quote dialog.

**Items have real specs.** He talked about needing weights, dimensions,
and unit conversions (US pounds vs AU kilos came up). The current
`item_weight_kg` and `item_dimensions` fields are free-text and not
tied to anything — no picking "fridge" and having the dimensions
auto-fill.

**He doesn't have time to maintain his own website.** This is relevant
because one of the ROADMAP items was a public quote form. Yemen
explicitly said he isn't touching his website. So the self-serve form
has to be hosted by this app, not by him.

### What he didn't say but should have

- **No mention of authentication.** He hasn't thought about it because
  the app is localhost. The moment it is deployed this becomes obvious.
- **No mention of RLS.** Same reason.
- **No mention of SMS cost.** He doesn't yet know real SMS costs money
  and caps need to exist.
- **No mention of data export.** The day he wants last year's numbers
  for his accountant, the app has no export and he will be furious.
- **No mention of photos from the driver phone.** He said signatures
  but not photos, even though he cares about liability. Photos are part
  of the same concern.

---

## Gap analysis — tab by tab

### Dashboard

**Current state.** KPI cards (Jobs Today by truck, Notifications Sent,
Closed with Proof), Day-prior SMS section, four review sections
(Outstanding Quotes, Missing Info, Warehouse Loadup, Needs Proof).

**Gaps against Yemen's feedback.**

- **No notes prominence.** Yemen uses notes heavily. The Dashboard
  shows jobs in several sections but never surfaces the notes. Add a
  notes preview line to Outstanding Quotes and Missing Info rows.
- **No repeat customer indicator.** Since most work is repeat, every
  job card should show "5th booking" or "new customer" as a small
  badge. Trust signal for Yemen, tone setting for whoever is reading.
- **No source/channel tag.** Yemen gets jobs from referrals, Google,
  Facebook, B2B repeat. A small tag per job card would make attribution
  visible at a glance long before any analytics.
- **No priority surfacing.** If 14 outstanding quotes sit in the
  review panel, which one should Yemen respond to first? Oldest?
  Highest value? Repeat customer? The list is ordered by creation time
  which is probably wrong.
- **No mobile layout.** The 2x2 grid is unusable on a phone screen.
  Everything stacks vertically but some sections do not adapt well.

**Gaps I want to add on top.**

- **"Next action" prompt** at the top of the Dashboard. Instead of
  forcing Yemen to scan five sections to figure out what to do next,
  one sentence: "Send day-prior SMS to 3 jobs for tomorrow" or
  "2 quotes waiting over 24 hours." This is the growth-hacker move.
- **Revenue-at-risk counter.** Sum of fees on jobs with missing info
  or needing proof. Turns visibility into urgency.
- **Today's fuel levy total** — a tiny card alongside the KPIs that
  shows how much levy is being collected today, because Yemen
  mentioned fuel costs explicitly.

### Truck Runs

**Current state.** Date navigation, two truck columns, job cards with
missing-info chips, en-route button for today's jobs.

**Gaps against Yemen's feedback.**

- **No drag-to-reorder within a truck.** The SOP flow is "mark
  previous job done → notify next customer." Without an explicit job
  sequence, "next" is ambiguous. Drag-to-reorder would fix this in 30
  minutes of UI work.
- **No mobile-optimized layout.** Yemen said his phone is his office
  but the Truck Runs view is a two-column desktop grid. On a phone
  this collapses to stacked columns but the interaction targets are
  too small.
- **No driver assignment.** The app tracks which truck a job is on,
  but not which driver is driving the truck today. For a two-driver
  operation this matters for accountability and for future payroll.
- **No route map.** Even a simple Google Maps link with the day's
  stops plotted would save the driver time when planning the run.
- **No notes on the job card.** Notes never surface here. They are
  critical for "stairs, no lift, needs two people."

**Gaps I want to add on top.**

- **Swipe-to-complete on mobile.** Swipe right on a job card to open
  the complete dialog, swipe left to reveal actions. Native-feeling
  mobile interactions.
- **Expected time per job.** A field for estimated duration and a
  rolling schedule (Job 1: 9am, Job 2: 10:30, etc). Calculated from
  the order and an hourly default.
- **Live job transitions.** When en-route SMS is sent, the job card
  animates to "in delivery" state automatically. Less clicking.

### Jobs

**Current state.** Table view with status, truck, fee, action buttons.
New Quote button in header.

**Gaps against Yemen's feedback.**

- **No search or filter.** A list of 200 historical jobs is
  unusable without search. Yemen said most customers are repeat —
  finding "that job I did for Sarah last month" is a common action.
- **No edit.** This has been flagged repeatedly. Yemen cannot fix a
  mistyped phone number without going to Supabase directly.
- **No bulk actions.** Mark invoiced, mark complete, assign to truck
  — all would benefit from multi-select.
- **No B2B company field.** `customer_name` is one field. For the
  company-books-end-client-receives case, both identities need to
  exist on the job. Two separate fields: "Billed to" and "Delivered
  to."
- **No source/channel field.** Already covered in Dashboard gaps, but
  this is where it gets entered.
- **No tags.** Yemen implied different job types get handled
  differently (interstate, store deliveries, house moves). Free-form
  tags would let him group and filter.

**Gaps I want to add on top.**

- **Duplicate job.** For repeat customers, "duplicate last job" is
  the fastest possible rebook flow. One click, pre-fills everything
  except date.
- **CSV export.** Yemen's accountant will ask. Having an export ready
  is a five-minute build that saves a support conversation.
- **Quick status transition from the row.** Instead of opening a
  dialog, inline keyboard shortcuts or a status dropdown per row.

### Customers

**Current state.** Card grid showing existing customers. No create,
no edit, no delete, no search, no linking to jobs.

**Gaps against Yemen's feedback.**

- **No add customer button.** Yemen cannot create a customer record
  at all. The table exists in Supabase but the UI is read-only.
- **No edit.** Same problem.
- **No link to jobs.** A customer card does not show the jobs that
  customer has booked. This is the single most valuable connection
  in the whole data model.
- **No search.** 50 customers and you're scrolling. 500 and the page
  is unusable.
- **No company vs individual distinction.** A "business customer" is
  structurally different — has an ABN, a billing contact, multiple
  delivery contacts, a company name. The current table assumes every
  customer is an individual.
- **No secondary contacts.** The B2B case needs "booker contact" and
  "recipient contact" as separate records under one customer.
- **No referral source.** Where did this customer come from?
- **No last contact vs last job.** Two different dates that matter.
- **No notes.** Yemen said notes matter, but customers can't have
  notes attached.
- **No VIP / repeat flag.** A customer with 10 bookings should be
  visually different from one with 1.

**Gaps I want to add on top.**

- **Customer lifetime value.** Sum of all fees from a customer,
  shown on the card. Yemen instantly sees who his biggest customers
  are.
- **Days since last booking.** Makes re-engagement opportunities
  obvious. "Last booked 47 days ago — send a check-in."
- **One-click rebook from customer card.** Creates a new quote
  pre-filled with the customer's default pickup and contact info.
  This alone could double Yemen's quote-to-job speed for repeats.

### Reviews

**Current state.** Weekly and Monthly views with sectioned stats.

**Gaps against Yemen's feedback.**

- **No export.** Yemen will want monthly numbers for his accountant
  and for his own records. No way to get them out of the app.
- **No comparison to prior period.** "Revenue this month vs last
  month" is the first question anyone asks of a review screen. The
  current view only shows the current period.
- **No custom date ranges.** Quarterly view? BAS quarter? End of
  financial year? Impossible right now.
- **No margin analysis.** Yemen mentioned fuel costs. The app tracks
  fuel levy collected but not fuel actually spent. No way to see if
  the levy is covering the actual cost.
- **No channel/source breakdown.** Covered in Dashboard gaps, but
  the Monthly Review is where channel attribution should be most
  visible.

**Gaps I want to add on top.**

- **BAS-quarter preset.** A button that sets the date range to the
  current BAS quarter. AU-specific feature that saves Yemen time.
- **PDF export.** For the monthly review, a one-click PDF with
  Yemen's logo that he can email to his accountant.
- **Year-over-year comparison.** Once the data exists, show this
  month vs same month last year.

### SMS Log

**Current state.** Reverse-chronological list of messages with type
badges and status. Fed by the Phase 4 stub.

**Gaps against Yemen's feedback.**

- **No search.** Finding "what SMS did we send to Sarah last week" is
  impossible without scrolling.
- **No filter by type or date.** Week's day-prior messages? Can't
  isolate them.
- **No resend.** If a message failed (once real SMS is wired up),
  there is no way to retry.
- **No preview before send.** Yemen should be able to see and edit
  the message body before it goes out. The current flow sends a
  hardcoded template with no opportunity to tweak.
- **No delivery receipts.** Once a real provider is wired up, status
  updates from the provider (delivered, undelivered, seen) should
  flow back into the log.

**Gaps I want to add on top.**

- **"Messages sent to this customer" on the customer card.** Closing
  the loop between customer and SMS log.
- **Reply handling.** When a customer replies to a day-prior SMS,
  that reply should land somewhere visible (a message inbox), not
  get lost in Yemen's personal phone.

### Global gaps (not tied to a tab)

- **No authentication.** Blocker.
- **No deployment.** Blocker.
- **No real SMS.** Blocker.
- **No Xero integration.** Yemen explicitly expects this.
- **No self-service quote form.** Yemen's #1 request.
- **No mobile-first layout pass.** Yemen's #2 request.
- **No signature capture.** Paste-text stopgap is not good enough.
- **No photo capture from camera.** URL-paste stopgap is not good
  enough.
- **No rate card management.** Rates are free-form per quote. Yemen
  said he sets rates and wants them applied consistently.
- **No item catalog.** Common items (fridge, piano, couch, washing
  machine) should have standard dimensions and weights that
  auto-fill when selected.
- **No audit log.** Who changed this job's status, when, and from
  what? Will matter for disputes.

---

## Phased plan

Five phases after the existing blocker list in ROADMAP.md. Each phase is
roughly one to two weeks of focused work and delivers a specific
capability. Each phase directly addresses things Yemen said or needs.

### Phase 6 — Mobile-first + Self-serve quotes (Yemen's two loudest requests)

**Duration: 5-7 days.**
**Outcome: Yemen can run the app from his phone. Customers can get
quotes without calling him.**

- Mobile layout audit and fixes across Dashboard, Truck Runs, Jobs,
  Customers, Reviews, SMS Log. Every view must work cleanly on a 375px
  viewport with no horizontal scroll, touch targets 44px minimum, and
  bottom padding for the home bar on iOS.
- Public self-service quote form at `/quote`, hosted by this app (not
  Yemen's website). Simple form, no auth, writes to Supabase as a
  quote. Mobile-friendly. Embeds Yemen's branding.
- Auto-email Yemen when a new quote lands via Supabase database
  trigger → Edge Function → transactional email (Resend, $0/mo free
  tier).
- Repeat customer detection on quote form. If the phone number matches
  an existing customer, autofill known fields and show a "Welcome
  back" banner.
- "Duplicate job" action on the Jobs table. One click rebooks a repeat
  customer with a fresh date. Ties into the repeat-is-most-of-the-work
  reality Yemen described.

### Phase 7 — Customer model overhaul (the B2B and repeat customer story)

**Duration: 6-8 days.**
**Outcome: Customers are first-class. B2B works. Repeat customers are
one-click rebooks.**

- Migrate `jobs.customer_name` to `jobs.customer_id` with a proper FK
  to `customers`. Backfill by matching on name + phone.
- Extend `customers` table: add `type` ('individual' | 'company'),
  `company_name`, `abn`, `source` (referral, google, facebook, b2b,
  website, phone), `notes`, `vip`, `created_at`.
- New `customer_contacts` table for the B2B case. Columns:
  `customer_id` FK, `role` ('booker' | 'recipient' | 'billing' | 'other'),
  `name`, `phone`, `email`, `address`, `notes`. Jobs reference a
  booker contact and an optional recipient contact separately.
- Full Customer CRUD: add, edit, delete, search. Replace the current
  read-only card grid with a proper table + detail view. Each detail
  page shows: identity, contacts, all jobs (with status and value),
  total spend, last job date, notes timeline.
- Customer picker component used in NewQuoteDialog. Searchable
  autocomplete. "Create new customer" inline if not found.
- Quote form gains a "Billed to" vs "Delivered to" toggle when the
  selected customer is a company.
- Auto-create customer from self-service quotes. When a stranger
  submits via `/quote`, a new customer record is created and tagged
  with source `website`.

### Phase 8 — Xero integration + money flow

**Duration: 4-6 days.**
**Outcome: Invoicing stops being manual. Yemen stops forgetting to
bill people.**

- Xero OAuth2 flow. One-time connection from a new Settings page.
  Store tokens in Supabase, refresh as needed.
- Push to Xero on job complete. When a job flips to Completed, a
  button (and optionally an automated trigger) pushes it to Xero as a
  draft invoice with customer mapped to Xero contact, fee + fuel
  levy as line items, and the job ID in the reference field.
- Xero contact sync. When a customer is created or updated in the
  app, mirror the change to Xero. When a contact is created in Xero,
  offer to import it as a customer here.
- Invoice status polling. Show in the app whether a pushed invoice
  has been sent and paid in Xero.
- "Needs Invoicing" section in Weekly Review becomes a button-push
  workflow instead of a proxy list. One click per job sends it to
  Xero.
- Fuel levy audit. Add a Weekly Review check: "Jobs over 40km
  without fuel levy applied." Revenue protection.

### Phase 9 — Liability and capture (signatures, photos, audit)

**Duration: 5-7 days.**
**Outcome: Yemen has defensible evidence for every delivery. Drivers
capture proof on their actual phones.**

- Signature capture canvas on `MarkCompleteDialog`. Touch and mouse
  support. Stored as base64 PNG in Supabase Storage, not as a text
  string. Legally defensible enough for small-claims disputes.
- Photo capture from camera. Replace the URL paste field with a
  proper file upload that goes directly to Supabase Storage. Works
  with the phone's native camera via `<input type="file" capture>`.
  Multiple photos per job, not just one.
- Job photo gallery. View all photos attached to a job, with the
  ability to download or share.
- Driver note on completion. Short text field alongside the photo
  and signature for "customer reported minor scratch" style notes.
- Audit log table. Every status change writes a row with actor, old
  status, new status, timestamp. Minimal — no UI to view it yet, but
  the data is there if a dispute ever happens.
- Weekly review gains "Missing signatures" and "Missing photos"
  sections.

### Phase 10 — Automation and growth (the growth-hacker layer)

**Duration: 6-8 days.**
**Outcome: The app starts running itself. Yemen stops doing busywork.**

- Automated day-prior SMS. Supabase scheduled Edge Function runs
  daily at 10am and sends day-prior messages to every Scheduled job
  for the next day. Removes the manual "Send" button click from
  Yemen's morning routine.
- Automated review-request SMS. Three days after a job flips to
  Completed, an automated SMS goes out asking for a Google review,
  with a link. Configurable interval.
- Rate card management. New Settings page where Yemen defines his
  base rates per job type, hourly rates, distance thresholds, and
  fuel levy formula. The NewQuoteDialog applies these automatically
  instead of asking Yemen to type them.
- Item catalog. A short list of common items (fridge, washing
  machine, couch, piano, king bed, bookshelf, dining table) with
  standard weight and dimension values. NewQuoteDialog gets an "Add
  from catalog" button. Yemen can add to the catalog over time.
- Referral tracking. Optional "Referred by" field on NewQuoteDialog
  that links to another customer. Referring customer gets visible
  credit on their customer card ("has referred 3 customers worth
  $840").
- Channel attribution on Monthly Review. Revenue broken down by
  source (website, referral, phone, Google, Facebook, B2B repeat).
  Yemen sees where his money actually comes from.
- Prior-period comparisons on Weekly and Monthly Reviews. This
  month vs last month. This week vs last week.
- Data export. CSV export buttons on the Jobs table and the Monthly
  Review for the accountant and for Yemen's records.

---

## Phasing logic

Why these five phases in this order:

1. **Phase 6 first** because it hits Yemen's two loudest pains —
   mobile and self-serve — in one ship. Anything else we build is
   less valuable if Yemen can't use it from his phone, and every day
   we delay the quote form is more phone calls he has to answer.

2. **Phase 7 before Phase 8** because Xero integration depends on
   having a clean customer model to map to Xero contacts. Pushing
   jobs to Xero when every customer is a free-text string creates
   duplicates and data mess that is expensive to clean up later.

3. **Phase 8 before Phase 9** because invoicing is a daily revenue
   issue, while liability (signatures, photos) is an insurance-style
   risk — important but only catastrophic occasionally.

4. **Phase 9 before Phase 10** because automation assumes the core
   data model is right. Automating the day-prior SMS when half the
   customers are duplicated in the database just amplifies the mess.

5. **Phase 10 last** because it is the "nice to have" layer. Each of
   its items is individually optional. It should ship only after
   everything underneath it is solid.

**Total duration for Phases 6-10: roughly 5-7 weeks of focused
development.** At the end Yemen has a product that handles his actual
workflow, integrates with his actual tools, runs from his actual device,
and acquires customers without his involvement.

---

## What is still explicitly NOT in this plan

Even with everything Yemen said, these are still out of scope until
there is real business evidence that justifies the investment:

- Native mobile apps. PWA is enough.
- Real-time GPS tracking. Google Maps in the cabin is fine.
- Route optimization. Two trucks do not need it.
- Driver scheduling / shift management. Two drivers who already know
  their schedule do not need a scheduling tool.
- Multi-tenancy.
- Franchise mode.
- Interstate expansion tooling.
- Damage claims workflow — skip until the first real dispute happens.
- Marketing automation beyond the review request SMS.
- Customer portal with login. Self-serve quotes via `/quote` is
  enough; full portal is overkill.
- Stripe / card-on-file. Only relevant if cancellations become a
  real problem.
- Any form of BI or analytics beyond what Weekly/Monthly Review
  surface.

Adding any of these before phases 6-10 are complete is wasted
engineering.

---

## Quick summary

Yemen said four things that matter more than anything else on this
roadmap:

1. **"My phone is my office"** → mobile-first layout pass.
2. **"I want customers to make their own quotes"** → public form.
3. **"Most of my work is repeat customers"** → one-click rebook.
4. **"What about Xero?"** → proper Xero integration.

Phases 6-10 deliver all four. Everything else is supporting
infrastructure to make those four things stick.
