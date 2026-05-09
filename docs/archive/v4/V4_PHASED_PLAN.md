# Rebel Logistics — V4 phased plan (post May 4 call)

Source of truth for everything Yamin asked for on the **May 4 2026** call. Each phase ships as a discrete, demoable unit so a status report (`V4_STATUS.md`) can be cut after the implementation lands and used directly in the next client conversation.

Every phase has two layers:
- **Core** — exactly what Yamin asked for on the call.
- **+1 enhancements** — one-step-ahead additions that serve the same problem better. Each enhancement is justified in plain English so Yamin can decide to keep, defer, or drop it. Nothing speculative — only items that compound the value of the core ask.

- Source transcript: [`TRANSCRIPT_MAY04.md`](TRANSCRIPT_MAY04.md)
- Prior cycle: [`V3_PHASED_PLAN.md`](V3_PHASED_PLAN.md), [`V3_STATUS.md`](V3_STATUS.md)
- **Tuesday 2026-05-05** — first real-world driver trial (the "shakedown"). Phase 1 must be live by then.
- **Thursday 2026-05-07, 8:30pm** — next sync meeting. Phases 2–3 ideally demoable.
- **~2026-05-18+** — marketing website work resumes (pushed 2 weeks at Yamin's request).

---

## Phase ordering rationale

1. **Phase 1** is the **Tuesday shakedown** must-haves. Without these, the driver trial fails: the order on the truck shell is wrong, drivers can't read the job, and customers replying to SMS see the Twilio default boilerplate. Sumanyu committed on the call to landing all of these *by end of day Sunday* (call night).
2. **Phase 2** is quote-form correctness — the duplicate-customer pattern that's been chewing through Yamin's customer book for weeks, plus a handful of tiny but compounding annoyances (typed-number fields, search by phone, desktop New Job button, 3-dots-in-edit). Demoable Thursday.
3. **Phase 3** is the **day-prior SMS button** + **inbound SMS handling**. This replaces five years of Yamin manually typing every booking confirmation. It's the highest-leverage win in this whole plan — every other phase saves him minutes; this one saves him *hours per evening*.
4. **Phase 4** rebuilds the Google Calendar push so events separate by truck, render as discrete time-blocks rather than an all-day list, and link the delivery address as a tappable Maps URL.
5. **Phase 5** introduces **Tasks** — the warehouse-load-up checklist Yamin has been wanting all along. New driver-shell tab, new owner UI, new dashboard tile.
6. **Phase 6** reorganises the dashboard around what Yamin actually checks (outstanding quotes, load-ups, today's jobs, missing proof) and tidies a few oversights surfaced on the call (stops counter, clickable tiles).
7. **Phase 7** is the Twilio **alphanumeric sender** flip-over once the AU bundle approval lands.
8. **Marketing website** — paused until ~2026-05-18. Out of scope for this plan; tracked separately.

Phases 1–3 are the realistic targets to land before Thursday's checkpoint; Phases 4–6 land in the following week before the website build resumes.

---

## Phase 1 — Tuesday shakedown blockers

The driver trial on **Tuesday 2026-05-05** depends on every item in this phase. Sumanyu told Yamin on the call: *"I will figure that out by today. End of the day. … It'll be done today."*

### 1.1 Core — Reorderable jobs inside a truck column
Yamin can drag jobs **within** a truck column on Truck Runs to set their on-the-day order. The order persists, and the driver shell renders jobs in exactly that order.

Real-world flow he described: *"I get a phone call. 'I can't make it at this time, can you push it?' Okay, I'll move this job before this one."* Today the assignment goes to the bottom of the column regardless of where he dropped it, and there's no way to move it after-the-fact — making the driver shell's run-order unreliable.

- Same drag affordance also works in the Accepted and Scheduled columns (consistency).
- Order survives reload, status changes, and date changes.
- Driver shell on the truck side reads the same order.
- Add an explicit **`sequence`** integer on `jobs` (per truck-day) so server-side ordering is deterministic and we don't have to derive from drop-time.

### 1.2 Core — Driver shell tap-to-open job detail
The driver currently sees only addresses on the run card. Yamin tested this on the call and found *"I've got the addresses but I don't know what job it is, or who's it from."* Tapping a card on the truck shell must open a detail sheet showing:

- **Company name** (or customer name if no company set) at the top
- Contact person + phone (tappable `tel:`)
- Pickup address + delivery address (both tappable Maps deep-links)
- Job type (Standard / White Glove / House Move) prominently displayed — *"this needs to say white glove, standard glove, 'cause I don't know what I'm doing"*
- Notes / job description in full — *"like notes where all the details for the jobs will be"*
- The truck + driver assignment for the day

**No price.** Yamin called it out explicitly: *"it doesn't need pricing 'cause that's for me."*

### 1.3 Core — Driver shell card shows company name as the primary line
The card on the run list (before tapping) should lead with the **company name** (e.g. *Bayleys Rugs*) when set, with the contact person's name as a secondary line if useful. Yamin: *"the company name is what will show up on there. They don't need to know them personally."*

Fall-back: when no company name is set (a real B2C job), use customer name as primary.

### 1.4 Core — Numeric inputs accept direct keyboard typing
Today the cubic-metres and estimated-hours fields force Yamin to use the up/down arrows — he can't select the existing value and type over it. Reproduced live on the call. The `<input type="number">` step UX is fighting his keyboard pattern. Switch to free-text typing (still numeric-only validated) and keep the arrows as a secondary affordance.

### 1.5 Core — Don't pre-fill per-job contact + pickup fields when picking a B2B customer
When Yamin selects an existing customer from the dropdown:
- **Contact name** stays blank (changes per job — it's the person on the phone *for that booking*, not the company's permanent contact)
- **Contact phone** stays blank (same reason)
- **Pickup address** stays blank (B2B clients dispatch from different warehouses each time; he showed an example on the call where the pre-fill was wrong)

Customer name (the company identity) is the only thing that should auto-fill on customer-pick. The rest is per-job data.

For individual customers (no company name) the existing pre-fill behaviour is fine — most have a stable phone number. The rule applies to B2B-shaped customer records.

### 1.6 Core — Twilio inbound auto-reply replaced
Today, when a customer replies to one of our outbound SMS, they receive Twilio's default boilerplate: *"Thanks for the message. Configure your number's SMS URL to change this message. Reply HELP for help. Reply STOP…"* Yamin saw this live on the call and was rightly horrified — *"this is not something we want the customers to get on Tuesday."*

For Phase 1 we set a branded auto-reply via the Twilio messaging service: *"This number is not monitored. Please call Rebel Logistics on +61… for any booking changes — thank you!"* Phase 3 builds the proper inbound inbox; this is the gap-stop until then.

### 1.7 +1 enhancement — Run-order toast on driver shell
After Yamin reorders, the driver shell shows a small toast next time it loads: *"Run order updated by office at 4:32pm — refresh to see latest."* So a driver who has the page open sees a clean signal rather than the cards silently rearranging mid-shift. *Why:* avoids the failure mode where a driver halfway through a route doesn't realise the office reshuffled the rest.

### 1.8 +1 enhancement — Job dialog on the **owner** side also shows the company-name-as-primary identity
For visual symmetry with the driver shell change in 1.3 — and so Yamin doesn't see one identity convention on his desktop and another on the truck tablet.

---

## Phase 2 — Quote-form correctness + small UX debts

Aim: by **Thursday 2026-05-07** Yamin can add a job from his desktop, search by phone, never see a duplicate Bayleys-Rugs row again, and use the 3-dots menu inside the edit dialog. Demoable on Thursday's sync.

### 2.1 Core — Duplicate customer prevention on quote-create
Today: typing "Bayleys Rugs" in the customer field with a different phone number creates a *new* customer record — which is why his customers list has dozens of duplicate Bayleys-Rugs rows.

Fix:
- The customer dropdown is the **only** way to attach a customer. Free-text "type a name and we'll create one if no match" stays — but the autocomplete must surface fuzzy matches on **company name first** (case-insensitive, ignoring spelling variation like Bayless / Bayleys), not require an exact match.
- When the user does explicitly create a new customer (the *"+ Add new customer"* path), we still create — but the dropdown surface tells him there's a near-match: *"Did you mean Bayleys Rugs (existing)?"* with a one-click switch.
- The phone number on a quote is no longer treated as part of the customer identity. It lives on the **job** (the contact phone for that booking), not on the customer record.

### 2.2 Core — `+ New Job` button on the desktop dashboard
Today it's mobile-only (the floating circle + the hero card). On desktop Yamin asked *"From the dashboard, where can I add new job?"* — there's no clear path without going through Jobs → New Quote. Add a primary `+ New Job` button to the dashboard header on `lg:` and up, opening the same dialog as the mobile version.

### 2.3 Core — Customer search matches phone number
The Customers page search box currently matches name only. On the call Yamin tried searching by phone and got nothing. Extend the search to match against normalised phone (strip spaces, dashes, country code padding). Also surface the matched phone field in the result row so he can tell *why* it matched.

### 2.4 Core — Required-field rules locked in
Per Yamin's explicit confirmation on the call:
- **Customer name** — required (the only hard requirement).
- **Delivery address** — *"always a must"* — required-with-confirm-prompt rather than a hard block (so Yamin can save a placeholder draft if he's mid-call).
- **Pickup address** — explicitly optional. *"Pickup address is optional. Right."*
- **Phone, email, notes, dimensions, hours, anything else** — optional, no warning.

Keep the existing "phone/addresses/etc all optional" behaviour from memory but **add the soft-required confirm on delivery address** as the new clarification.

### 2.5 Core — 3-dots menu inside edit-mode of the job dialog
The 3-dots-on-card menu (move status, move truck, mark complete, decline) shipped in V3 polish-pass-3 — but **not** in the edit-mode pane of the job dialog itself. Yamin asked *"so can there be a drop menu from here as well for, for editing?"* — yes. Mirror the same actions inside the dialog header when Edit mode is active.

### 2.6 Core — Stops counter = number of jobs (not number of unique addresses)
On Truck Runs each truck column has a *"N stops"* chip. Today it's counting unique addresses, so a job with both pickup and delivery in different suburbs registers as 2 stops, while two jobs from the same warehouse count as 1. Yamin: *"instead of stops, it's based on the addresses inside the jobs."*

Switch the count to **number of jobs** assigned to that truck for that day. (We can keep "addresses" as an internal counter for the heavy-day threshold logic — but the user-visible chip says jobs.)

### 2.7 +1 enhancement — Inline match reason in customer dropdown
When the dropdown surfaces a near-match (Bayleys vs Bayless, etc.) it labels *why*: *"matched on company name (~85%)"* or *"matched on phone +61 415 ...".* Closes the loop on 2.1 visually so Yamin trusts the de-dup heuristic. *Why:* trust > magic.

### 2.8 +1 enhancement — Quote dialog shows live identity preview on the right rail
A small card showing what's about to be saved: company → contact → phone → pickup → delivery. Updates live as he types. Helps catch the "I typed the contact person in the customer field" pattern at-a-glance, before save.

---

## Phase 3 — Day-prior SMS + inbound SMS inbox

This is the single highest-leverage win in v4. Yamin has been **manually typing day-prior confirmations to every customer for five years** — *"I finish work at 6, 7. I come home and then I do this."* He has paper printouts and timeframes on his desk. Replacing this with one button hands him back hours per evening.

### 3.1 Core — "Send tomorrow's bookings" button on Truck Runs day view
At the top of Truck Runs (day view), a button: **`Send day-prior SMS to N customers`** where N = jobs scheduled to a truck for that date that haven't yet had a day-prior SMS sent. One click → sends the **`day_prior_reminder`** SMS template (already in Settings → SMS Templates) to each customer, in parallel, server-side.

- Confirm dialog before fire ("Send to 7 customers? [Cancel] [Send]"). Yamin asked for a button-not-automation specifically: *"you can also probably accidentally drag it, so we should probably have a button there."*
- Per-job: a "Send day-prior" action in the 3-dots menu so Yamin can re-send to a single customer if needed.
- Each send is logged to `sms_log` with `kind='day_prior'` and `outbound_message_sid` so 3.4 can match replies.
- After fire, the button greys out (still clickable to send to any new additions) and shows *"Last sent 4:21pm — 6 sent, 1 failed (Yamin retry)."*

### 3.2 Core — Twilio inbound webhook → `sms_log`
Configure the Twilio Australian number's inbound webhook to POST to a new `/api/sms/inbound` endpoint that:
- Verifies the Twilio signature.
- Resolves the sending phone to a customer (by normalised phone match).
- Writes a row to `sms_log` with `direction='inbound'`, `parent_message_sid` (looking up the most recent outbound to that number to thread the conversation).
- Fires a Supabase Realtime broadcast so the dashboard's notification bell pings within ~1s (extending the V3 realtime hook).

### 3.3 Core — Owner SMS inbox in dashboard
Settings → SMS Log already exists. Add an **`Replies (N)`** tab at the top showing the unread inbound SMS, threaded by customer + parent outbound. Click a thread → see the full back-and-forth. The notification bell carries the unread count.

### 3.4 Core — Inbound routing: day-prior → owner; en-route → driver
Replies thread by `parent_message_sid`:
- Reply to a `day_prior_reminder` outbound → routed to the owner's bell + Replies tab. *Yamin: "I have to receive because I'm the one doing the booking."*
- Reply to an `en_route` outbound → routed to the driver shell, surfaced as a notification on the driver's currently-active job. *Yamin: "the driver on the day, if it's a message en route, will receive that message."*
- Reply with no matching outbound (or to a generic outbound) → owner inbox, treated as a general inquiry.

### 3.5 +1 enhancement — One-tap reschedule from a reply
If an inbound reply contains a date or "yes/no", show a quick-action: *"Suggest reschedule? [Mon 12 May] [Tue 13 May] …"* — taps open the job dialog with the date pre-filled. *Why:* most replies to day-prior SMS are *"can we change to Wednesday"*; this saves 30 seconds per booking change.

### 3.6 +1 enhancement — Customer reply preview on the Truck Runs day view
If a customer with a job tomorrow has replied to their day-prior SMS, the card on Truck Runs gets a soft amber dot with a tooltip showing the reply text. *Why:* Yamin can see at a glance which customers acknowledged vs which need a phone follow-up — no need to open the inbox separately.

---

## Phase 4 — Google Calendar overhaul

Yamin spent ~15 minutes on the call working through the calendar. The core problem: with two trucks running, all the day's events stack as a single all-day list and he can't separate Truck 1 from Truck 2 visually. Plus the delivery address isn't tappable as a Maps link on his phone.

### 4.1 Core — Per-truck Google Calendar option
Settings → Integrations → Google card grows a **Calendars** sub-panel. Yamin can choose:
- **Single calendar** (current behaviour) — all jobs go into one calendar.
- **Per-truck calendars** — one Google Calendar per truck. We auto-create them as `Rebel Logistics — Truck 1`, `Rebel Logistics — Truck 2` etc. on first opt-in. Each truck calendar gets a distinct color.

Switching modes triggers a one-time backfill: existing events are moved from the single calendar to the per-truck calendar matching their assignment.

### 4.2 Core — Synthetic time slots so events render as discrete blocks
Today the calendar push uses all-day events because jobs don't have a time-of-day. Result: every job on May 5 stacks as a single "all-day" list. Yamin: *"I can assign them a random time because we never know the time that they will be."*

Implementation: when building the Calendar event, assign a synthetic start time of `08:00 + (sequence_index * 30 minutes)` (using the new `sequence` field from Phase 1.1). Duration = 30 minutes by default. This is **purely a calendar-rendering aid** — no UI in the dashboard pretends to know real times. Document it on the Integration card so Yamin understands the times are placeholders driven by run-order.

### 4.3 Core — Delivery address as a tappable Maps link
Calendar event description now embeds the delivery address as `https://www.google.com/maps/search/?api=1&query=<encoded_address>`. Yamin verified on the call that pickup is currently the only address present and even that isn't clickable on his phone. Both addresses get rendered as Maps URLs.

### 4.4 Core — Richer event description
The event body is rewritten to a structured format:
```
Bayleys Rugs · Standard · Truck 1
Contact: Jane Smith · 0418 ...
Pickup: 12 Hallam Rd, Hallam (Maps link)
Delivery: 24 St Kilda Rd, St Kilda (Maps link)
Notes: Heavy marble table — 2-person lift
```
Color-by-job-type stays (V3 Phase 5). Driver name added when known.

### 4.5 +1 enhancement — Backfill all open jobs
A button in Settings → Integrations: **`Push all open jobs to calendar (N)`** — re-pushes every active job with the new format. Idempotent. Already partially shipped in V3; extend to handle the per-truck-calendar split + new description format.

### 4.6 +1 enhancement — `Open in Truck Runs` deep-link in event
The event description ends with a deep-link back to Truck Runs filtered to that day + truck. *Why:* if Yamin is looking at Google Calendar on his phone and spots something to fix, one tap takes him straight to the dashboard at the right place — no navigation.

---

## Phase 5 — Tasks (warehouse load-up + morning prep)

A new **Tasks** primitive distinct from Jobs. Tasks are unpaid, customer-less, internal-only — the morning prep a driver does before starting the run: load up packages from the warehouse, clean the truck, fuel up.

Yamin's mental model from the call: *"the to-do will be what needs to happen in the morning before the day starts. Whether it's loading up, making sure the truck is clean… And then jobs is when they start, 'okay, where's my first job after I've done all of this?'"*

### 5.1 Core — Data model
New `tasks` table:
```
id, truck_id, scheduled_date, kind ('load_up' | 'clean' | 'fuel' | 'other'),
title, description, sequence, completed_by_driver_id, completed_at, created_by, created_at
```
Tasks are date-scoped per truck. No customer link. No price.

### 5.2 Core — Owner UI on Truck Runs day view
Above the truck columns on Truck Runs, a **Tasks for today** strip per truck shows the day's tasks. Yamin can:
- Add a task (title + optional description).
- Reorder tasks within a truck (drag).
- Delete a task.
- See completion status at a glance (open / completed pill).

### 5.3 Core — Driver shell 3-tab layout
Drivers see three tabs at the top of the truck shell:
- **Tasks** (default on shift start; lists today's open tasks for the assigned truck).
- **Jobs** (the existing run list, now in tab form).
- **Done** (today's completed tasks + delivered jobs, for the day's review).

Tap a task → simple sheet with title, description, **`Mark done`** button. Marking done stamps `completed_by_driver_id` (using the *who's-driving-today* picker from V3 Phase 3) and `completed_at`, then moves it to Done.

### 5.4 Core — Dashboard "Warehouse Load-up" tile
The dashboard tile from Phase 6.1 for "Warehouse load-up" shows today's open task count across all trucks. Click → opens Truck Runs for today with the Tasks strip in focus.

### 5.5 +1 enhancement — Task templates
A Settings → Tasks panel where Yamin defines reusable templates: *"Daily load-up", "Weekly Friday truck wash"*. From Truck Runs he can one-click instantiate a template for a date range across selected trucks. *Why:* most of his task list is the same six items every morning — typing them in fresh each day is the same chore he had with day-prior SMS.

### 5.6 +1 enhancement — Driver-side reorder
Drivers can drag-reorder tasks too — useful when one task depends on another being done first (load fragile last, etc.) and the office's ordering doesn't match reality at the warehouse.

---

## Phase 6 — Dashboard reorganisation + the small things

### 6.1 Core — Top-of-dashboard tile order
Yamin called out which tiles he actually checks vs which he doesn't. New order, top to bottom:
1. **Outstanding Quotes** — quotes pending acceptance (count + clickable list).
2. **Warehouse Load-up** — today's open tasks across all trucks (count + click → Truck Runs today, Tasks strip in focus).
3. **Today's Jobs** — jobs scheduled for today (count + click → Truck Runs today). *Currently the tile does nothing on click* — Yamin: *"if I click on this, nothing happens."* Fix.
4. **Need Proof** — completed jobs without a photo or signature (count + clickable list).

Removed from the top: *Jobs today / Notifications sent / Closed with proof* — Yamin: *"I don't need them to be on the dashboard."* They become a collapsible secondary row below.

### 6.2 Core — Today's Jobs tile is clickable
Pure bug fix from 6.1 — but worth calling out separately because it's the one Yamin specifically tested live.

### 6.3 +1 enhancement — Sticky day-prior SMS pill
When there are jobs scheduled for tomorrow that haven't had a day-prior SMS sent, the dashboard shows a sticky pill: **`Send tomorrow's bookings (N)`**. Click → fires the Phase 3.1 button without leaving the dashboard. *Why:* Yamin's normal flow is "schedule everything → check dashboard → fire SMS." Putting the button on the dashboard saves a tab-switch.

### 6.4 +1 enhancement — Customer card shows job count by status
On the Customers list, each customer row shows `quotes · accepted · completed · invoiced` mini-counts. *Why:* Yamin scrolls the customer list to see who's got open work without having to click into each one. Cheap to add.

---

## Phase 7 — Twilio AU bundle go-live

Blocked on **Twilio's Australian sender-ID bundle approval** (submitted 2026-04-26; ETA 2–3 weeks → roughly 2026-05-10 to 2026-05-17). When approved:

### 7.1 Core — Switch sender from raw E.164 to alphanumeric `REBEL`
SMS today shows up as a phone number. Yamin: *"with Twilio, how it's showing up as a number? I'll, I'll just fix that as well."* Once the bundle is approved, flip every outbound message to use the alphanumeric sender. Customers see *"REBEL"* in their inbox.

Note: alphanumeric senders in AU are **outbound-only** — customers can't reply directly. This is fine because Phase 3.4 routes replies via the Twilio number that we keep alongside as the inbound channel.

### 7.2 +1 enhancement — Per-truck phone numbers
Yamin teased this on the call: *"probably down the line, every truck will have a number. It will all be under Rebel Logistics."* Defer until he asks for it explicitly — adds Twilio cost ($/month per number) and a routing-config layer that's premature today.

---

## Out of scope for v4 (parked)

- **Marketing website.** Pushed by Yamin: *"let's just push the website to a little further in the future. Like, two weeks."* Resumes ~2026-05-18. Tracked separately.
- **Two-way Google Calendar sync** (drag an event in Google → dashboard updates). Same V3 reasoning: low real-world value because Yamin lives in the dashboard for booking.
- **Auto-invite the assigned driver as a calendar attendee.** Needs a driver email on the team page; we don't surface that yet.
- **Backfill driver attribution for historical jobs.** No record exists pre-V3 Phase 3.
- **Bulk delete by import batch.** From V3 Phase 7 deferral; no new request.
- **Maps Places autocomplete on address fields.** From V3 Phase 6; still blocked on Yamin handing over Maps API credentials. Re-raise at the Thursday meeting if it matters.

---

## Invoice + payments (call notes — not dev work)

Not part of the build, but tracked here so neither side loses the thread:

- **$1,500 total** for platform + website (Sumanyu's revised pitch, agreed by Yamin).
- **$1,000 invoice now** (Yamin pays after his accountant signs off, ~next week).
- **$500 invoice separately** — either before website starts or after website lands, Yamin's choice.
- Indian-business invoice is fine — Yamin doesn't need GST on the invoice as long as the business is legit and matchable. *"As long as I've got an invoice with the business details, it doesn't matter where it's from."*
- After the $500 lands, the **$120/month Stripe retainer** kicks in for ongoing maintenance.

---

## Demo schedule

| Date | Event | Phases due |
|------|-------|-----------|
| Mon 2026-05-04 (tonight) | Phase 1 work-out | — |
| Tue 2026-05-05 | First real-world driver trial | **Phase 1** must be live |
| Thu 2026-05-07, 8:30pm | Sync meeting | **Phases 2 + 3** demoable |
| ~Mon 2026-05-11 | Mid-week check-in | **Phase 4** demoable |
| ~Sat 2026-05-16 | Pre-website check-in | **Phases 5 + 6** demoable |
| ~Mon 2026-05-18 | Website work resumes | Phases 1–6 closed |
| When AU bundle clears | Sender-ID flip | **Phase 7** |
