# Rebel Logistics — V3 Status

Rolling status log. New phase sections appended at the top so the most recent work is the first thing you see.

- Plan: [`V3_PHASED_PLAN.md`](V3_PHASED_PLAN.md)
- Source transcript: [`TRANSCRIPT_APR28.md`](TRANSCRIPT_APR28.md)
- **Single SQL guide for Supabase:** [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md) — every migration in one file, in order, with plain-English explanations.

---

## Polish pass 3 — three-dots menu on cards + tap-to-open everywhere
_Implemented: 2026-04-28._

### What's done (✅)
- **Every job card on Board and Truck Runs now has a three-dots menu** in the top-right. Drag-and-drop still works on desktop; on mobile the menu is the primary way to move a job around.
- **One menu, contextual options.** The menu shows what makes sense for that card:
  - *Open job* (always)
  - *Mark complete…* (unless the job is already Completed/Invoiced)
  - **Move to status** — Quote / Accepted / Completed / Invoiced / **Decline** (red)
  - **Move to truck** — every active truck listed (the current truck is shown but disabled with a "currently here" hint)
  - *Back to Accepted pool* — when the job is on a truck
- **Cards are now tap-to-open across the dashboard.** A tap on:
  - A job card on **Board** (the kanban column cards)
  - A pool card on **Truck Runs** (Accepted / Scheduled columns)
  - A truck card on **Truck Runs** (Truck 1, Truck 2 columns)
  - A row in the **Jobs table** (the dashboard table that previously needed the eye button)
  ...now opens the full job dialog. The eye / arrow / explicit Complete + En-route buttons all stay where they are; they `stopPropagation` so they keep working without double-firing.
- **Drag still works on desktop** — `cursor-pointer` on mobile, `sm:cursor-grab` on tablet+. Phone numbers + Maps links + the new 3-dots trigger all stop propagation so they don't accidentally open the dialog.
- **Drag handle (the grip-vertical icon)** is hidden on mobile — pure visual noise on a touch device where you'd tap the menu instead.
- **Mark-complete dialog wired into Board** — Mark complete from the menu opens the same proof + signature flow used by the driver shell.

### What needs Yamin (⏳)
- Nothing — pure UX polish. No SQL, no env changes.

### What's deferred (🕐)
- **Bulk select via long-press on mobile.** Right now bulk selection requires checking the row checkbox on Board; on touch it's a small target. Easy add later if Yamin uses bulk often.
- **Multi-step menu actions** (e.g. "Send SMS — pick template") — the SMS flow lives in its own dialog. The 3-dots menu doesn't expose it directly today since the job dialog has the "Send SMS" button right there.

### How to try it
- Phone or DevTools mobile preview:
  - Board → tap any card → full job dialog opens. Tap the **⋯** in the top-right of a card → action menu.
  - Truck Runs → tap a card in Accepted / Scheduled → dialog. Tap **⋯** on any card → "Move to truck" lists Truck 1 / Truck 2 / Back to Accepted pool.
  - Jobs tab → tap any row → dialog. Eye button still in the row actions.

---

## Polish pass 2 — every-tab mobile audit + Google OAuth bullet-proofing
_Implemented: 2026-04-28._

### What's done (✅)
- **Audited every left-sidebar view** for horizontal overflow on mobile (≤640px) and tablet (641–1024px). Most views were already responsive (KPI tiles, customer grid, reviews, SMS log, dashboard sections all use proper grid breakpoints). The Board and Truck Runs columns scroll horizontally **on purpose** — that's the kanban + day-pipeline UX. The remaining issues fixed below.
- **Settings tab bar overflow fixed.** The 7 tab buttons (Team, Trucks, Pricing, SMS Templates, Import, Export, Integrations) now scroll horizontally as a snap strip on phones and wrap to multiple rows on tablets. Each button is `shrink-0` so labels never get clipped mid-word.
- **Trucks calendar cell chips no longer break out** — added `min-w-0` to the chip wrapper so the truck name truncates instead of pushing the cell wider than its grid track.
- **Job dialog detail rows pre-flight check** — already responsive after Phase 7+ pass; verified no regressions.
- **Google OAuth `redirect_uri_mismatch` is now self-healing.** Two changes:
  1. **Settings → Integrations → Google card** now shows the **exact redirect URI** in a copy-able panel **before** the Connect button, with a one-click "Open Google Cloud Console — Credentials" link. This is the URL Yamin must paste into the OAuth client's Authorised redirect URIs list. No more guessing whether the trailing slash is right or whether the scheme matches.
  2. **The callback page detects `redirect_uri_mismatch`** and shows a tailored error: the exact URL to whitelist, a copy button, a 5-step instruction list, and a deep-link to the Google Cloud Console credentials page. Other Google errors still display generically; only the redirect mismatch gets the full guided fix because that's the one Yamin keeps tripping over.

### What needs Yamin (⏳)
- **For OAuth at scale across environments**: every URL where the dashboard is hosted needs its callback URL added to Google Cloud Console. So:
  - Local dev with `vercel dev` → add `http://localhost:3000/integrations/google/callback`
  - Vercel preview deploys → preview URLs change per commit. Either add the canonical preview URL pattern (Google now supports `https://*.vercel.app/...` only via wildcard subdomains for verified domains, which most projects don't qualify for) or use a **fixed staging domain** (recommended).
  - Production → add `https://<your-prod-domain>/integrations/google/callback`
- **Quickest unblock right now:** open Settings → Integrations → Google card, copy the redirect URI it shows, paste into Google Cloud Console → APIs & Services → Credentials → your OAuth Client → Authorised redirect URIs → Add URI → Save → wait 30 seconds → click Connect again.

### What's deferred (🕐)
- **JobsTable row-tap-to-expand on tiny phones.** Currently the table hides Type, Truck, Phone, Last columns at smaller widths and shows a stacked summary in the customer cell. The audit said "borderline OK" and the change would be cosmetic — flag if Yamin sees actual overflow.
- **Customers filter pill wrapping verification at <360px.** They have `flex-wrap` on the parent so they should stack; flag if iPhone SE or similar shows them clipped.
- **Wildcard redirect support** on Google's side — Google doesn't support arbitrary wildcards on standard OAuth clients. The right answer for Vercel preview URLs is to use a **single staging domain** (e.g. `staging.rebellogistics.com.au`) that points at a stable Vercel branch.

### How to try it
- **Mobile** (or DevTools mobile preview): open Settings, swipe through the tab strip — no overflow, no horizontal page scroll.
- **OAuth dry run**: Settings → Integrations → see the redirect URI panel above Connect → tap Copy → paste into Google Cloud Console → save → return → Connect → success. If it fails, the callback page now tells you exactly what to fix.

---

## Polish pass — mobile dialog, live notifications, single SQL guide
_Implemented: 2026-04-28._

### What's done (✅)
- **Job dialog now responsive on mobile.** Header stacks the Edit / Cancel-Save buttons under the title instead of overflowing. Detail rows wrap. Footer action buttons resize and wrap (Print is hidden on the smallest screens — still accessible via desktop). Inputs grow to a 10-tall touch target on mobile. Dialog max height uses `dvh` so it stays fully scrollable on iOS Safari (no more cutoff at the bottom).
- **Live notifications from driver → owner.** Subscribed the owner dashboard to Supabase Realtime on `jobs`, `truck_shifts`, and `sms_log`. The moment a driver hits *Mark delivered* on the truck shell, the owner's notification bell, the dashboard counts, the Board column counts, the Truck Runs page, and the Trucks calendar all refresh — no manual reload. Same flow catches reschedules, address edits, and SMS failures broadcast from any session.
- **Single SQL guide** at `SUPABASE-RUN-THIS.md`. Six numbered blocks covering Phases 1, 2, 3, 5, 7, plus a final block that flips on Realtime publication for the three live-update tables. Every block is idempotent and includes a plain-English description of what it adds. Final "verify" query at the bottom shows a row per migration so Yamin can confirm everything landed.

### What needs Yamin (⏳)
- **Run `SUPABASE-RUN-THIS.md` start to finish** in the Supabase SQL Editor. The Realtime block (Block 6) is **the one that fixes the broken truck → dashboard notification flow** — without it, my new realtime hook subscribes but receives nothing.
- Re-test the driver completion path after Block 6 lands: complete a job from the driver shell on one device, watch the bell light up on a second device.

### What's deferred (🕐)
- **Realtime on the public form / customer table.** Not strictly needed today — the dashboard refetches `customers` on its own polling rhythm, and there's no operator dependency on a customer change being visible the same second.
- **Stale-tab handling.** A user who's been idle for hours might still need a manual refresh if the realtime channel dropped. Browser tabs reconnect on focus by default but the long tail isn't bulletproof. Flag if Yamin sees stale data in practice.

### How to try it
- After running Block 6 in `SUPABASE-RUN-THIS.md`:
- Open the dashboard on your laptop. Open the driver shell on your phone (different login).
- Mark a job *Delivered* on the phone → notification bell on the laptop pings within ~1 second, the job moves to Completed in the Board, and the Trucks calendar shows the shift on today's cell.

---

## Phase 7 — Customer CSV import (proper, end-to-end)
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 7._

### What's done (✅)
- **Bug found and fixed.** The old import looked for hard-coded lowercase headers — `name`, `phone`, etc. Yamin's Xero export uses `Account Name`, `Phone Number`, `First Name`, `Last Name`. Every row failed the "missing name" check silently and the dashboard imported zero customers. The new import lets him map his columns to ours, so any CSV format works.
- **Three-step wizard** in Settings → Import: **Upload → Map → Preview → Done**. Step badge in the header so Yamin knows where he is.
- **Auto-detection of Xero / MYOB / QuickBooks headers.** The mapping screen pre-fills with its best guess: `Account Name → name`, `Phone Number → phone`, `Email Address → email`, `Company → companyName`, etc. Yamin only adjusts if the guess is wrong.
- **First + Last name pair handling.** When a CSV splits the name across two columns (very common Xero export), the mapping screen exposes a dedicated First/Last name picker. They're concatenated into a single name before insert.
- **Live sample value next to every column dropdown** so Yamin can spot a wrong mapping immediately — no more "I think `Phone Number` is the right one… let me re-export and try again."
- **Per-row preview before commit.** A scrollable table shows every row with its computed Customer name, contact details, an inline error if it can't be imported, and a per-row action dropdown.
- **Smart duplicate detection.** Each row is matched against the existing customer book by:
  1. **Phone number** (normalised — strips spaces, dashes, country code padding) — strongest signal.
  2. **Company name** (case-insensitive).
  3. **Customer name** (case-insensitive) — last resort.
  Matching rows are flagged in amber: *"Phone matches existing customer 'Sarah Chen'"*.
- **Per-row Create / Merge / Skip.** Defaults: `Create` for new rows, `Merge` for matched rows, `Skip` for rows with errors. Yamin can override on any row from the preview.
- **Merge updates fields without nuking unrelated data.** When a row is merged, the import only patches the columns the CSV provides — VIP flag, custom rates, and existing notes are preserved.
- **Inline error messages — no more silent skips.** Rows that can't be imported show exactly why: *"No name (and no company name to fall back on)"* / *"No phone or email — at least one is required"*.
- **Import-batch tag** stamped on every imported customer (e.g. `xero-2026-04-28`). The tag is editable on the preview screen so Yamin can label specific imports differently. New `import_batch` column on the customers table; queryable for "everything I brought in from Xero on April 28."
- **Mapping is remembered.** When Yamin re-imports a CSV with the same column shape, the mapping is restored from `localStorage` automatically — second-time imports are 5 seconds, not 2 minutes.
- **Mac-friendly hint** on the upload step: *"On a Mac: open in Numbers → File → Export → CSV"* — referencing the issue Yamin hit on the call.
- **Final summary screen** with counts: created / merged / skipped / failed. One-tap reset to import another file.

### What needs Yamin (⏳)
- **Run the SQL migration once** — `V3-PHASE7-IMPORT.sql` at the repo root. Adds the `import_batch` column on customers. Idempotent.
- **Try the Xero export again.** Should now Just Work — Account Name auto-maps to name, Phone Number to phone, etc. If something is still off, the per-row error messages will say which field failed.

### What's deferred (🕐)
- **Direct Xero API import** (no CSV step) — was suggested as a later ambition. Real value but needs Xero OAuth + the API connector — separate engagement, not this phase.
- **Bulk-delete by import batch.** Right now the tag is queryable in SQL but there's no UI to "remove every customer I imported on April 28." Easy add if Yamin ever fat-fingers an import.
- **Schema change detection.** If the CSV shape changes (a new column, a renamed column), the saved mapping is rebuilt from scratch — Yamin re-maps once. Could be smarter but rare.

### How to try it
- **Settings → Import** → tap *Choose CSV file*.
- **Step 2 (Map):** confirm or adjust the auto-detected mapping. Sample values from row 2 of the file appear next to each column.
- **Step 3 (Preview):** scan the table. Rows that match an existing customer are tagged amber with the match reason. Adjust Create/Merge/Skip per row.
- **Edit the import tag** at the top right (e.g. change `xero` to `b2b-march`).
- **Hit Import** → watch the progress toast → land on the Done screen with the create/merge/skip/fail counts.

---

## Phase 5 — Google Calendar wire-up
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 5._

### What's done (✅)
- **Google Calendar fully wired end-to-end.** Click Connect Google Calendar in Settings → Integrations → Google sign-in popup → bounce back as connected. Yamin picks the account; we never store the password.
- **Refresh token never touches the browser.** A new server-side endpoint (`/api/auth/google/exchange`) holds the client secret in env vars, calls Google's token endpoint, and writes the refresh token directly into Supabase. The browser only ever learns the email of the connected account.
- **Disconnect now revokes the token at Google.** The previous flow only flipped the row to revoked in the database — meaning Google still trusted the token. The new disconnect endpoint hits Google's `/revoke` URL so the token is invalidated remotely first, then the row is cleared.
- **Auto-sync after every job change.** Every time a job is updated, the dashboard fires a sync to the Google Calendar API:
  - **Job assigned to a truck (Accepted → Scheduled)** → event is created with the customer name, type, truck, addresses, phone, fee, notes.
  - **Date or address edited (from Phase 2's editable dialog)** → the existing event is patched in place.
  - **Job unassigned, declined, or deleted** → the calendar event is deleted.
  - **No truck = no event.** Matches Yamin's rule from the call: "it shouldn't show because it hasn't been assigned yet."
- **Colour-coded by job type.** White Glove = blue, Standard = green, House Move = orange. Yamin can scan his calendar on his phone and see the day's mix in one glance. (The +1 from the plan.)
- **Best-effort sync — never blocks the dashboard.** If Google is briefly unreachable, the calendar push fails silently with a console warning. Yamin's job edits still go through.
- **Last-sync timestamp shown on the integration card.** Settings → Integrations now shows when the last successful push happened, so Yamin can spot if sync silently broke.
- **Idempotent server logic.** The sync endpoint reads the job's current state and decides create/update/delete — meaning we can call it as many times as we want without duplicating events. Even if a calendar event was deleted manually in Google Calendar, the next sync re-creates it.

### What needs Yamin (⏳)
- **Run the SQL migration once** — `V3-PHASE5-CALENDAR.sql` at the repo root. Adds the `google_calendar_event_id` column on jobs so we can track which event corresponds to which job. Idempotent.
- **🔐 ROTATE THE CLIENT SECRET.** Yamin pasted the OAuth secret in chat. **Treat it as compromised** — go to Google Cloud Console → APIs & Services → Credentials → the Rebel Logistics Dashboard OAuth 2.0 Client → reset the secret. The new secret needs to land in (a) Sumanyu's local `.env` and (b) Vercel's Environment Variables for production. Until rotation: any party who saw the chat could mint refresh tokens against Yamin's project.
- **Add the Vercel env vars for production:** `VITE_GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` (the last is the new dependency; grab it from Supabase → Project Settings → API → "service_role" secret).
- **Authorised redirect URIs in Google Cloud Console** must include the production URL — `https://<vercel-domain>/integrations/google/callback`. Yamin already added the localhost / preview URI on the call.
- **Local dev needs `vercel dev`.** Plain `npm run dev` runs Vite only — the `/api/*` routes only execute under `vercel dev` (which also reads the `.env` automatically). Run `npx vercel dev --listen 3000` for full local testing of the OAuth flow.

### What's deferred (🕐)
- **Multi-calendar per truck (one Google Calendar per Truck 1, Truck 2, …)** — was in the +1 list. Held back because the call left Yamin's preference ambiguous. Easy to add later: per-integration `metadata.calendar_id_for_truck` map and the sync endpoint picks the right calendar. Flag if Yamin wants to filter trucks visually inside Google Calendar.
- **Auto-invite the assigned driver as an event attendee** — also +1 list. Held back; needs a driver email field on the team management screen, which we don't surface yet.
- **Two-way sync (Yamin drags an event in Google Calendar → dashboard date updates)** — out of scope for this phase. Real-world value is small since Yamin lives in the dashboard for booking; flag if his preference shifts.
- **No backfill of historical jobs.** Existing jobs that already have a truck and date won't be pushed retroactively. Going forward, every change pushes. We can add a one-time "sync all open jobs now" button later if useful.

### How to try it
- **Setup once on this machine**: `cp .env.example .env`, fill in the values, then `npx vercel dev --listen 3000`.
- **Connect**: Settings → Integrations → Connect Google Calendar → pick the account on Google's screen → bounce back to Settings as Connected.
- **Make a real sync**: Open any Accepted job → assign it to Truck 1 → check your Google Calendar (web or mobile). The event lands on the job's date with the customer name and addresses, coloured by type.
- **Edit the date** from the job dialog → watch the event move on Google Calendar.
- **Drag the job back to the Accepted column** on Truck Runs → event disappears from Google Calendar.
- **Backfill existing open jobs:** the connected-account strip in Settings → Integrations now shows a `Sync open jobs (N)` button — one click pushes every job that has a truck assigned and isn't completed/declined into Google Calendar. Idempotent — running it twice doesn't duplicate events.
- **Disconnect**: Settings → Integrations → Disconnect → confirm → Google's `/revoke` is called server-side. Reconnecting will require the consent screen again (because the token is gone, not just hidden).

### Security notes
- `CLIENT_ID` is shipped to the browser via the `VITE_` prefix (intentional — public IDs are designed to be in client code).
- `CLIENT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are read only by `/api/*` files. Verified that the production bundle does **not** contain the secret string.
- All Google API calls (token exchange, refresh, revoke, calendar CRUD) run on the Vercel serverless side. Each request requires a valid Supabase user JWT from the Authorization header, and the server resolves the user via `supabase.auth.getUser()` before doing any work.
- Refresh token is stored in `integrations.refresh_token`. The Supabase row is gated by RLS so users only see their own integration; the server uses the service-role key to update it on their behalf.
- If a refresh ever fails (token expired beyond the 6-month idle limit, or Yamin revoked the app from his Google account directly), the sync endpoint returns 502 — the user will see the connection card go stale and can reconnect.

---

## Phase 4 — Mobile UX for the owner
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 4._

### What's done (✅)
- **Big New Job button at the top of the mobile dashboard.** When Yamin opens the dashboard on his phone, the first thing he sees is a full-width blue "+ New job" button. KPIs and the rest of the dashboard sit beneath. Desktop is untouched.
- **Floating + button on every mobile screen.** A blue circular button in the bottom-right corner, visible across Dashboard, Board, Truck Runs, Trucks, Jobs, Customers, Reviews, SMS Log. Tap it from anywhere to open the quick-add quote.
- **Quick quote dialog — built for one thumb.** Stripped down to four fields: customer name, phone, job type, notes. No addresses, no pricing, no maths. Saves immediately as a **draft Quote** so Yamin can finish it from his desk later (drafts came in with Phase 1). Big 11-tall inputs and full-width buttons sized for mobile keyboards.
- **Voice-to-text on the notes field.** A "Dictate" button next to Notes — both on the Quick Quote dialog and the full New Quote dialog. Tap, speak the job, the transcript fills in. Hidden on browsers that don't support speech recognition. The mic uses Australian English (`en-AU`).
- **One-tap actions on every job card.** Phone numbers in the Truck Runs columns and the dashboard Jobs table are now `tel:` links — tap to call. Pickup → delivery in the Truck Runs columns is a Google Maps deep-link — tap to start directions.
- **Installable as a PWA.** Adds a `manifest.webmanifest`, the iOS `apple-mobile-web-app-*` meta tags, and a soft "Install Rebel on your phone" card that appears on mobile only. Two paths:
  - Android / Chrome: native Install button (uses `beforeinstallprompt`).
  - iOS Safari: a hint to tap Share → "Add to Home Screen" (since iOS doesn't support the native install API).
  Dismissable. Once dismissed, never shown again on that device.

### What needs Yamin (⏳)
- **Test it on his actual phone.** Open the dashboard on his iPhone, see the install prompt, accept it, then the dashboard appears as a standalone app icon on his home screen.
- **Decide on a real app icon.** Right now the manifest reuses `/favicon.png`. Drop a 512×512 brand icon at `/public/icon-512.png` and we'll point the manifest at it.
- **No microphone permission gate handling.** First time Yamin taps Dictate, iOS will ask for mic permission. He has to accept. If he ever denies it once, the button fails silently — flag it if that surfaces.

### What's deferred (🕐)
- **Service worker / offline mode.** PWA today is "installable but online-only." A real service worker that caches app shell + hands-off API calls is a bigger build — flag for a later phase if Yamin actually loses signal in the field.
- **Camera shortcut on Quick Quote.** The plan flagged a "+ Photo" button next to Notes. Not in this cut — deferred until Yamin says he needs it (most quotes start as a phone call, not a photo).
- **Custom maskable PWA icons.** Using the favicon is fine but not pretty on Android home screens.

### How to try it
- **Open `http://localhost:3000/` in your phone's browser** (or the network address Vite prints — same wifi).
- **Mobile Dashboard** → big "+ New job" hero up top. Tap it → Quick Quote dialog opens.
- **Any mobile screen** → bottom-right blue circle. Tap → same Quick Quote.
- **Quick Quote → Notes** → tap "Dictate" → speak → see the transcript appear.
- **Truck Runs on mobile** → tap a customer phone number → phone dialer opens. Tap a `pickup → delivery` line → Google Maps directions.
- **Install:** Chrome on Android shows "Install Rebel" toast. iOS Safari shows the "Add to Home Screen" hint after a few seconds.

---

## Phase 3 — Driver attribution + Trucks calendar
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 3._

### What's done (✅)
- **Every completed job is now stamped with the driver's name.** The stamp is frozen at completion time, so even if a driver's record is deleted later, the attribution sticks for any fine that arrives weeks afterwards. Both the owner-side "Mark complete" dialog and the driver-side "Mark delivered" sheet write it.
- **Bell notification calls out the driver.** The "delivered" notification body now reads `Driver A · Truck 1 completed delivery to Brunswick · proof captured` instead of just `Truck 1 completed delivery to…`. The driver name appears in the same alert that lands in Yamin's notification bell on the dashboard.
- **Job dialog shows the driver under the truck pill.** Open any completed job → directly under the truck name there's now a `Driver: A. Driver` line. No more "which Stuart was on Truck 2 last Tuesday?" guessing.
- **New Trucks tab in the sidebar** (between Truck Runs and Jobs). Opens a **month calendar** view.
- **Calendar cells show truck-driver chips for the day.** Each day cell renders `Truck 1 · A. Driver` chips for every shift recorded that day. Days with no work are blank — exactly what Yamin asked for ("If nothing is assigned to truck two, it shouldn't show up").
- **Heat-mapped intensity.** Day cells tint darker as the job count climbs (0 jobs = blank, 1–2 light, 3–4 medium, 5–7 heavier, 8+ darkest). One-glance signal of the busy days vs the quiet ones.
- **Day side panel.** Click any day → a panel appears below the calendar listing every truck-driver shift, the start/end clock times, and every completed job under each (click a job → opens the full Job dialog).
- **"Find a fine" search bar at the top of Trucks.** Yamin enters the date a fine happened, optionally picks a truck, hits Find — the calendar jumps to that month and highlights the day with an amber border. The side panel filters to just that truck. From `fine arrives → "who was driving Truck 1 on April 22?"` is now two clicks.
- **Shift state tracked behind the scenes.** Every completion upserts a `(truck, driver, day)` shift row: `started_at` is fixed to the first completion of the day, `ended_at` ratchets forward with each subsequent completion. Coarse but reliable.

### What needs Yamin (⏳)
- **Run the SQL migration once** — `V3-PHASE3-DRIVERS.sql` at the repo root. Adds the `truck_shifts` table, the new driver columns on jobs, and the `record_job_completion` RPC. Idempotent.
- **No backfill of historical jobs.** Anything closed before today won't have a driver attribution and won't show on the Trucks calendar — there's no record to pull from. Going forward, every new completion is captured.
- **Confirm the driver fallback policy.** Right now: driver-side completions use the picked driver from the "Who's driving today?" dialog; owner-side completions look up the driver assigned to the truck on this job. If neither exists, the current user (Yamin) is recorded. Worth confirming with him that this matches reality.

### What's deferred (🕐)
- **Driver self-checkout button** — was on the +1 list. Not strictly needed since `ended_at` advances on every completion. Easy add later if Yamin wants an explicit "End of shift" button on the driver portal.
- **Mid-day driver swap** (driver B logs in on a truck currently driven by A → A's shift auto-closes). Same — current upserts already let the second driver create a parallel shift row for the same day, so it's mostly just polish.
- **Export to CSV** for an accountant or for a fine response — easy follow-up.
- **Truck rego field on the Truck record.** Right now we use the truck *name* (e.g. `Truck 1`) as the identity for shifts. If Yamin wants to record the actual rego (number plate) we add a column on `trucks` and surface it on the calendar chips.

### How to try it
- **Complete a job** as a driver (or as the owner) → open the job dialog. Under the truck name you'll see the driver line.
- **Open the bell** on the dashboard → the most recent completed-delivery notification names the driver.
- **Click `Trucks` in the sidebar** → calendar of the current month. Days with completions are tinted; today's date wears a small accent dot.
- **Click any day** → side panel below opens with the shifts on that day, clock times, and a list of jobs completed.
- **Try the fine search**: enter a date, optionally pick a truck → Find. The calendar navigates to that month and highlights the cell.

---

## Phase 2 — Board / Truck Runs split + editable jobs
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 2._

### What's done (✅)
- **Board is now the office view**, with only the four states that matter to administration: **Quote · Accepted · Completed · Invoiced**. Anything in operations (Scheduled / Notified / In Delivery) folds back under "Accepted" so the count stays honest, but the dispatch noise is gone from this screen.
- **Truck Runs is now the operations view.** When Yamin opens it for a given day he sees:
  - **Accepted** column on the far left — the pool of accepted jobs waiting to be scheduled.
  - **Scheduled** column — jobs already booked for **other** days, sorted by date, so he can scan what's coming.
  - **Truck columns** — jobs assigned to each truck **on the selected day**.
  Drag any card from Accepted onto Truck 1 → assigns the truck, sets the date to the current view, and bumps status to Scheduled. Drag a card back into Accepted → unassigns the truck and returns it to the pool.
- **Today / Tomorrow shortcuts** at the top of Truck Runs land Yamin on the most-used views in one tap. The current selection is highlighted.
- **Per-truck day strip** — every truck column now shows `N stops` plus the suburb of the first pickup, so Yamin can see at a glance how loaded the day is.
- **Heavy-day warning.** When a single truck has 5 or more stops in a day, the column flashes a yellow `Heavy` chip — soft warning only, doesn't block the assignment.
- **Lighter-truck hint.** While dragging a card *out of the Accepted pool*, the truck with fewer stops gets a soft "Lighter" highlight. It's a hint, not a rule — Yamin can drop wherever he wants.
- **"Booked for today, no truck" warning** — if there are jobs scheduled for the current view with no truck attached (rare, but it happens), they appear in an amber strip above the columns so they don't get lost.
- **Job dialog now lets Yamin edit the date and both addresses inline.** Click Edit → the Pickup, Delivery and Date fields turn into inputs → Save writes the change, with one extra step:
- **Every edit is logged.** A new History tab inside the job dialog lists every change in plain English (e.g. *"Pickup address · 2 hours ago — old → new"*), so liability is traceable. The existing Activity timeline still lives next door under its own tab.
- **Quote number visible in the dialog header** — the `RL-2026-NNNN` reference from Phase 1 is now shown next to the internal job ID for fast reference on phone calls.
- **Editing is locked once a job is Completed or Invoiced** — the Edit button hides and the audit trail freezes.

### What needs Yamin (⏳)
- **Run the SQL migration once** — `V3-PHASE2-AUDIT.sql` at the repo root. Adds the `job_history` table behind the History tab. Idempotent.
- **Confirm the heavy-day threshold of 5 stops/truck** suits the operation. If 4 is the realistic cap, we can lower it.

### What's deferred (🕐)
- **Per-truck time strip ("first 9:30 am · last 4:15 pm")** — jobs don't yet capture a time-of-day, only a date. The strip shows stops + first pickup suburb instead. Once Phase 4 (mobile quick-add) lands we can add a time-window field and surface real start/end times.
- **Conflict detection on overlapping windows** — same blocker. Right now the warning is purely "too many stops on one truck."
- **Bulk drag** of multiple Accepted cards onto a truck at once — flagged as a follow-up if Yamin finds the one-at-a-time flow slow.

### How to try it
- **Look at the Board**: only Quote / Accepted / Completed / Invoiced columns now. Old "Scheduled" and "In Delivery" jobs roll up under Accepted.
- **Open Truck Runs**: see the new Accepted + Scheduled columns to the left of Truck 1 / Truck 2.
- **Tap Tomorrow** at the top — the day jumps forward. Tap Today to go back.
- **Drag a card out of Accepted** → notice the lighter truck softly highlights. Drop on any truck → the date is set and the job is now scheduled.
- **Pile 5+ jobs on one truck** → the column flashes a yellow `Heavy` chip.
- **Open any job → click Edit (top-right of the dialog)** → change a pickup address → Save. Now click the **History** tab in the same dialog and see the change recorded.
- **Try editing a Completed job** — the Edit button is gone, dialog is locked.

---

## Phase 1 — Quote-form rebuild + pricing engine
_Implemented: 2026-04-28. Source: V3_PHASED_PLAN.md §Phase 1._

### What's done (✅)
- **Quote form now morphs based on job type.** Pick Standard or White Glove and you get a Metro / Regional toggle plus a single "cubic metres" field. Pick House Move and you get an estimated-hours field with the hourly rate shown read-only — no more cubic metres or distance prompts.
- **Editable rate book in Settings → Pricing.** Yamin can edit Metro per m³, Regional minimum, hourly rate, minimum hours, and GST percent in one screen. Every new quote uses the live values; saved quotes keep their original price.
- **Defaults match Apr 28 call**: $90/m³ metro · $480 regional flat · $180/hr hourly · 3-hour minimum · 10% GST.
- **GST shown clearly on every quote.** Subtotal, GST, and total inc-GST appear as a live bar at the bottom of the new-quote dialog and as an "Indicative price" card on the public form.
- **Per-customer rate overrides.** Each customer record now has optional Metro per-m³ and Hourly rate fields. When set, they override the defaults whenever Yamin (or the customer) starts a quote — and the dialog flags this with a "Custom rate applies" badge under the repeat-customer banner.
- **Three-hour minimum is enforced, not just labelled.** Type 2 hours and the field auto-bumps back to 3 with a small toast — both on the owner dialog and the public form. Customers can't underpay accidentally.
- **Public `/quote` form mirrors the same logic.** Customers see an indicative price update live as they pick options.
- **Auto-numbered quotes.** Every new job now gets a `RL-YYYY-NNNN` reference (e.g. `RL-2026-0042`). The sequence resets each calendar year. Existing jobs were back-filled.
- **Save-as-draft.** A new "Save as draft" button lets Yamin half-fill a quote and finish it later — important for the mobile quick-add flow coming in Phase 4.
- **Quote valid-until date.** Defaults to 30 days; adjustable per quote.

### What needs Yamin (⏳)
- **Run the SQL migration once** in Supabase. The file is `V3-PHASE1-PRICING.sql` at the repo root. It's idempotent — safe to re-run if anything goes sideways.
- **Confirm the rate defaults** at the next meeting. The defaults match what was said on the call but the Settings panel is editable so Yamin can tune them on the fly.
- **Optional: decide Standard vs White Glove pricing parity.** Right now both job types share the same Metro/Regional rates (per the call). If White Glove should cost more, we can split the rate book into two rows in a follow-up.
- **Optional: pre-fill custom rates for any repeat customers** who already have a special deal. Open the customer record → Custom rates section.

### What's deferred (🕐)
- **Fuel levy.** The old auto-add-$25-if-distance>40km behaviour stops applying on new quotes (Yamin didn't mention it on the call and the new metro/regional model handles location pricing). Existing quotes keep their levies. If we want a separate after-hours / long-distance levy, flag it for Phase 2.
- **Job-detail dialog GST display.** The detail view still shows the old "fee + fuel levy" line for existing jobs. New quotes have the GST value stored alongside but the detail UI hasn't been updated yet — that lands in Phase 2 alongside the Board/Truck Runs work where we touch that dialog anyway.
- **Apply-override audit trail.** When an override fires we don't log it. Easy add later if Yamin wants traceability.

### How to try it
- **Set the rates**: log in as owner → Settings → Pricing → tweak any value → Save changes.
- **Try a House Move quote**: Jobs → New Quote → choose House Move. Watch the form swap fields. Type `2` in estimated hours → it bumps to `3` on blur.
- **Try a Standard Metro quote**: choose Standard → Metro → enter `2` cubic metres → bottom bar shows `$180 · GST $18 · Total $198`.
- **Try a Standard Regional quote**: switch the toggle to Regional → bar shows the flat $480 + GST.
- **Try a custom rate**: Customers → open a customer → set "Hourly rate" to `200` → save → start a new House Move quote for them → "Custom rate applies" badge shows.
- **Try the public form**: visit `/quote` (logged out) → pick House Move → see the live "Indicative price" card update.
- **Try save-as-draft**: half-fill a quote → "Save as draft" → it appears in the Jobs list with a draft flag.
