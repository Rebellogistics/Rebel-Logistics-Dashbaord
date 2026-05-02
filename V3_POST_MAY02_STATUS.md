# Rebel Logistics — Post-May 2 Implementation Status

Tracks progress against [`V3_POST_MAY02_PLAN.md`](V3_POST_MAY02_PLAN.md). New entries appended at the top so the most recent work is the first thing you see.

Next sync with Yamin: **Sun 2026-05-10** (moved from Sat May 9).

| Phase | Status | What it does | Verified |
|-------|--------|--------------|----------|
| 9 — Truck Runs bugs + Scheduled column | ✅ Done | Drag duplicate fixed, Scheduled column shows all bookings, past-due strip, dnd-kit (mobile drag works) | tsc, build, live SQL smoke, dev server boot |
| 10 — Job-detail dialog: full edit + GST + type | ✅ Done | All fields editable (incl customer name, type, price, phone, notes); GST line; manual-vs-recompute UX; per-field history rows | tsc, build, live SQL smoke for type-swap + manual override |
| 11 — Trucks have logins, drivers don't | ✅ Done | drivers table + Settings split + WhoDriving picker reads new table | tsc, build, live SQL smoke for driver insert + delete |
| 11B — Truck login provisioning + routing + RLS | ✅ Done | Generate-login UI, role-based shell routing, truck-role RLS, RPC v2, MarkCompleteDialog reads drivers | tsc, build, live SQL smoke, RLS hand-test |
| 12 — Trucks calendar v2 | ✅ Done | Planned + completed chips on same grid; past-due border; side-panel split | tsc, build, live test rows on Apr 29 + May 7 |
| 13a — Maps Places autocomplete | ✅ Done + verified | New `<AddressAutocomplete>` (Places API New) wired into NewQuote, JobDetail edit, public `/quote` | tsc, build, live browser test |
| 13b — Calendar OAuth E2E (new account) | ⏳ Needs Yamin | Env vars updated; existing Phase-5 wiring is intact. Yamin: disconnect old integration → add new redirect URIs to GCP → reconnect | — |
| 14 — Bulk delete + Twilio test + customer phone optional | ✅ Done | Soft-delete + Trash on jobs/customers; bulk-select bars; Twilio test-send card; customer_phone now nullable | tsc, build, live SQL round-trip |
| 15 — Final QA + demo | 🕐 Pending | Mobile + desktop smoke; Sunday demo dry-run | — |

---

## Phase 14 — Bulk delete + Trash + Twilio test send + nullable phone
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 14._

### What's done (✅)
- **Soft-delete columns** — `jobs.deleted_at` and `customers.deleted_at`, with partial indexes for fast Trash queries. Hard delete is reserved for the Trash → "Delete forever" button.
- **Main queries filter active rows.** `useJobs` and `useCustomers` now `WHERE deleted_at IS NULL`; soft-deleted rows immediately disappear from the dashboard (Board, Truck Runs, Trucks calendar, Jobs table, Customers list, KPIs).
- **Per-row mutations softened.** `useDeleteJob` and `useDeleteCustomer` set `deleted_at = NOW()` instead of hard-deleting. The `CustomerDetailDialog`'s "Delete" button reuses the new path.
- **Bulk delete on Jobs.** New `useBulkDeleteJobs` hook + checkbox column on the Jobs tab + sticky bulk-action bar at the top with "Move to Trash" / clear. Selections survive filter switches but drop rows that filter out, so the count stays honest.
- **Bulk delete on Customers.** Same pattern — `useBulkDeleteCustomers`, checkbox column on the Customers table view (grid view is unchanged), bulk-action bar.
- **Trash settings tab** (`Settings → Trash`):
  - Two sub-tabs: Jobs / Customers, each with a count badge.
  - Each row shows the deleted-at relative time + absolute date.
  - **Restore** clears `deleted_at` (per-row).
  - **Delete forever** purges with a confirm. For jobs, the row + linked photos/history/sms_log entries cascade; for customers, linked jobs keep their info but lose the customer link.
  - Rows older than 30 days highlight amber as "ready to purge" (no auto-purge yet — manual button only).
- **Twilio test send card** in `Settings → Integrations`:
  - Phone + body inputs, Send button.
  - Status badge: "Twilio live" when `VITE_SMS_PROVIDER=twilio` (the current `.env`), "Stub" otherwise — so a successful stub send isn't misread as a real SMS.
  - Surfaces inline error if `/api/sms/send` is unreachable (404 on Vite-only — `vercel dev` is required for the live path).
- **`jobs.customer_phone` widened to nullable.** Yamin's May 2 ask: customer name is the only required field. The new-quote and edit flows can now save with `customer_phone = NULL`.

### What needs Yamin (⏳)
- **Run `vercel dev` to verify Twilio test send end-to-end.** On plain `npm run dev`, the test send returns 404 — the card surfaces that as the error message.
- **Decide auto-purge cadence.** Today, 30+ day rows highlight amber but persist until manually purged. We can add a server cron later (Vercel cron at `/api/cron/purge-deleted` would do it).
- **The Phase-12 calendar test rows are still live** (`Phase12 Future` on May 7, `Phase12 PastDue` on Apr 29). With the new Jobs-tab bulk delete, you can clean them in 3 clicks: select both rows → Move to Trash → done. Or restore later from Settings → Trash.

### What's deferred (🕐)
- **Bulk delete on the Board kanban** — not on Yamin's May 2 ask list (he said "Customers and jobs"). Easy add if needed: the `selected` set already exists on `BoardView` for the bulk Assign-Truck flow.
- **Auto-purge cron** — see above.
- **Soft-deleted-customer label on linked jobs** (e.g. strikethrough customer name in the job dialog when the customer is in Trash). Edge polish; pre-Phase-14 jobs always had snapshot copies of customer_name + customer_phone on the row, so it doesn't break anything.
- **Xero CSV sweep** — manual ops task, separate from this code.

### Edge cases handled
- **Confirmation dialogs are explicit.** Bulk delete: "Move to Trash, restorable for 30 days." Permanent delete: "This cannot be undone."
- **Selection auto-prunes** when the underlying filter changes (so the bulk bar count never lies).
- **Soft-delete of a customer with active jobs** — the jobs keep their denormalised `customer_name` and `customer_phone`, the FK is intact but pointing at a hidden row. Restoring re-exposes the customer; permanent delete leaves the jobs orphaned but readable.
- **Board → Truck Runs → Trucks calendar all auto-sync.** Soft-deleting a job invalidates `['jobs']`, which all three views consume; the chip / row disappears within ~150ms.

### Verified
- `npm run lint` clean, `npm run build` clean.
- Live SQL round-trip: insert a job with `customer_phone = NULL` (proving the NOT NULL widening) → soft-delete → confirm hidden from `WHERE deleted_at IS NULL` queries → restore → permanent purge → cleanup.

---

## Phase 13a — Google Maps Places autocomplete
_Implemented: 2026-05-02. Verified live: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 13._

### What's done (✅)
- **Singleton Maps loader** at `src/lib/googleMaps.ts`. Idempotent — first call injects the `<script>`, subsequent calls await the same Promise. Uses Google's recommended `loading=async` bootstrap; libraries are loaded on demand via `await google.maps.importLibrary('places')` so there's no onload-vs-library race.
- **`<AddressAutocomplete>`** at `src/components/ui/AddressAutocomplete.tsx` — built against the **Places API (New)**:
  - `AutocompleteSuggestion.fetchAutocompleteSuggestions` for predictions (Promise-based).
  - `place.fetchFields({ fields: ['formattedAddress', 'location', 'id'] })` for selection.
  - Lazy-loads on first focus — no script fetch on pages that never touch an address.
  - **One session token per pick session** — Google bills per session, not per keystroke. A fresh token mints after each successful selection.
  - 200ms keystroke debounce; out-of-order request guard (later request wins).
  - AU-only (`includedRegionCodes: ['AU']`).
  - Keyboard navigation (Up/Down/Enter/Escape) + screen-reader combobox semantics.
  - Falls back to a plain `<Input>` if Maps fails to load. Errors are logged to console with the actual cause (was previously silent).
- **Wired into three forms:**
  - `NewQuoteDialog` — pickup + delivery.
  - `JobDetailDialog` (edit mode) — pickup + delivery.
  - `PublicQuoteForm` (`/quote`) — pickup + delivery.
- **Env wiring:** `VITE_GOOGLE_MAPS_API_KEY` added to `.env` and `.env.example`.

### History — what tripped us up before working
- First cut used the legacy Places API (`AutocompleteService` + `PlacesService`). The Cloud project only had **Places API (New)** enabled; the legacy one is a separate billed service. Fix: switched the component to the new API entirely.
- Initial loader used `&loading=async` with `&libraries=places` and called `new AutocompleteService()` immediately on `script.onload` — but `loading=async` makes libraries decorate the namespace asynchronously *after* onload. Fix: drop `&libraries=places` from the URL and use `await maps.importLibrary('places')` instead.

### What needs Yamin (⏳)
- **Add the Maps key to Vercel** if there isn't one yet: Settings → Environment Variables → `VITE_GOOGLE_MAPS_API_KEY` (scope: Production + Preview + Development) → Redeploy.
- **Confirm HTTP referrer restriction in Google Cloud Console** lists every URL the dashboard will run on:
  - `http://localhost:3000/*`
  - `https://<vercel-prod-domain>/*`
  - `https://*.vercel.app/*` (preview deploys)
  - Any custom domain.
- **Confirm API restriction is scoped** to `Maps JavaScript API` + `Places API` only.
- **Set a $5/day budget alert** on the Maps Platform SKUs as a backstop.

### What's deferred (🕐)
- **Persisting `place_id` / `lat` / `lng` columns on jobs** — autocomplete fills the formatted address only for now. Adding the columns later is additive (Phase 6.2 / route optimisation will need them).
- **Distance + ETA preview in the quote dialog** — Phase 6.2.
- **Metro/Regional auto-detect by polygon** — Phase 6.3.

### How to try it
- Restart the dev server so it picks up the new env vars.
- New Quote → start typing in Pickup. Suggestions populate after 3 chars. Pick one → field auto-fills with the formatted address.
- Job dialog → Edit → same behaviour on both address fields.
- `/quote` (logged out) → same.
- DevTools → Network → `places` requests fire only when typing in an address field.

---

## Phase 13b — Google Calendar OAuth E2E (needs Yamin's hands)
_Env vars swapped: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 13._

### What's done (✅)
- **OAuth client ID + secret** for the new Google account swapped into `.env`. The Phase-5 calendar wiring in `api/auth/google/*` and `api/calendar/sync.ts` works against the new credentials with no code change.
- **Existing token-refresh + revoke + per-job sync** code is intact from Phase 5; only the credentials changed.

### What needs Yamin (⏳)
- **Add the new credentials to Vercel:** `VITE_GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` → Redeploy.
- **Update Authorised redirect URIs in Google Cloud Console** for the new OAuth Client:
  - `http://localhost:3000/integrations/google/callback`
  - `https://<vercel-prod-domain>/integrations/google/callback`
  - Plus any preview / staging domains.
- **Add the new Google account email under "Test users"** on the OAuth consent screen if it's still in Testing mode (otherwise consent will fail).
- **Disconnect the existing integration:** Settings → Integrations → Google → Disconnect (if there's a stale token from the old client).
- **Reconnect:** Connect Google Calendar → pick the new account → bounce back to Settings as Connected.
- **🔐 Rotate the client secret** that was shared in chat: GCP → Credentials → the OAuth Client → Reset secret → update `.env` + Vercel → redeploy.

### How to try it
- After the GCP + Vercel updates, Settings → Integrations → Connect Google Calendar.
- Assign any Accepted job to a truck → check the connected Google Calendar (web or mobile). The event lands on the job's date with customer name + addresses, coloured by job type.
- Edit the date in the job dialog → event moves on Google Calendar.
- Drag the job back to the Accepted column → event disappears.

---

## Phase 12 — Trucks calendar v2 (planned + completed)
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 12._

### What's done (✅)
- **Calendar shows future bookings, not just completed shifts.** A new `plannedByDate` derivation pulls every job with `assigned_truck` set, `status` not in (Completed/Invoiced/Declined), and groups by date. These render alongside the existing `truck_shifts` data.
- **Visually distinct chips.** Completed = solid card with truck icon + driver name. Planned = outlined dashed chip with a calendar-clock icon and `Truck (N)` if multiple jobs on the same truck same day.
- **Past-due border.** Planned jobs with a date strictly before today get amber chip border + amber day-cell border. The day cell also shows an amber alert-triangle icon next to the activity count.
- **Heat-map blends both sources.** A day with 8 booked-but-not-yet-done jobs tints as dark as one with 8 completed. `maxActivityInMonth` is computed across the union of completed + planned dates.
- **Day cell tooltip** surfaces "X completed · Y planned" on hover (HTML `title`).
- **Legend updated** with sample chips: Completed (solid), Planned (dashed accent), Past-due (dashed amber).
- **Side panel split into two sections:**
  - "Completed (N)" — existing ShiftRow rendering with start/end times and per-job links.
  - "Planned (N)" — new `PlannedTruckGroup` component, grouped by truck, each row clickable to open the job dialog. The section header turns amber + shows a "Past-due" tag when the selected day is in the past and has unfulfilled bookings.
- **`searchTruck` filter applies to both sections** — picking a specific truck in the find-a-fine bar narrows planned jobs the same way it narrows completed shifts.

### What's deferred (🕐)
- **Drag-to-reschedule from inside the calendar** — out of Phase 12 scope. Yamin can still drag in Truck Runs and the calendar updates via Realtime invalidation.
- **Per-driver filtering** — out of scope; truck-level filter covers the common fine-lookup case.
- **Auto-cancel past-due** — could prompt "auto-decline these stale bookings?" but for now they're left as alerts.

### Edge cases handled
- **Same-day completed + planned overlap.** A job that completes on the same day briefly has status='Completed' which is excluded from `plannedByDate`, so no double-render. The 500ms React Query refetch lag after completion is masked by `useRealtimeJobs` invalidation.
- **A job rescheduled to a different day.** Realtime invalidation refetches `jobs`; the planned chip moves to the new date on the next render.
- **Many jobs on one day.** The cell shows up to 3 chips total (completed first, then planned), then "+N more". Side panel shows everything.
- **Heat-map with planned-only days.** Treated as full activity — that's a busy day, even if not yet executed.

### How to try it
- Trucks tab → today's view should show the existing completed activity unchanged.
- Two test rows live: `Phase12 Future` on `XV 98 GC` for May 7 (future planned), `Phase12 PastDue` on `XV 98 GC` for Apr 29 (past-due).
- Click May 7 → side panel shows "Planned (1)" with `XV 98 GC` group.
- Click Apr 29 → cell has amber border, side panel shows "Planned (1) · Past-due", chip is amber-dashed.
- Schedule any new job from Truck Runs → calendar updates without reload (Realtime).

---

## Phase 11B — Truck login provisioning + role-based routing
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 11 + Yamin's May 2 confirmations._

### What's done (✅)
- **Truck login generation** wired into Settings → Team → Truck logins. Click "Generate login" on a truck → password auto-generated → owner sees the password ONCE in a copy-able panel. Email is the synthetic `truck-<slug>@rebellogistics.com.au` (Yamin's real domain alias, confirmed May 2). Created via the same temp-client signUp pattern as `useCreateDriver` so the owner's session stays intact.
- **Role-based routing** — `App.tsx` now sniffs the profile role on load. `truck` → TruckShell (the existing driver-side UI, repurposed). `driver` (legacy) → same TruckShell, so existing logins keep working. `owner` / `admin` / `dispatcher` → the owner dashboard.
- **`record_job_completion` v2** — added a SECURITY DEFINER overload that reads the calling truck from `auth.uid()` via `trucks.user_id`. Truck-side completions no longer need to pass `truck_name` explicitly; the driver picker still passes name + id. Owner-side completions keep the legacy 3-arg signature.
- **MarkCompleteDialog** — driver lookup now reads the `drivers` table by name (the picker's selection in localStorage matches a `drivers.id`), with a fallback to the current profile if no match. Removes the dead `team.find((m) => m.role === 'driver' && m.assignedTruck === ...)` lookup.
- **Truck-role RLS** — new policies on `jobs`, `trucks`, `truck_shifts`, `customers`, `sms_log`, `pricing_rates`. A truck-role user only sees rows for its own truck (`assigned_truck = (SELECT name FROM trucks WHERE user_id = auth.uid())`). Owner / admin policies unchanged.

### What needs Yamin (⏳)
- **Provision a login per truck** in Settings → Team → Truck logins → Generate login. Save the password somewhere safe — it's shown once.
- **Test the truck portal** on a fresh browser profile (or an actual tablet) using the truck's email + saved password. Pick a driver from the dropdown → run a test job.
- **Confirm email confirmation is OFF** in Supabase → Authentication → Providers → Email. If it's on, the truck login won't activate until someone clicks the confirmation email — and the synthetic addresses won't receive mail unless Yamin has set up a catch-all on the rebellogistics.com.au domain.

### What's deferred (🕐)
- **Cosmetic rename** of `AddDriverDialog` → `InviteAdminDialog` to match its new role (admins/dispatchers only). Functional today; just a label drift.
- **Driver self-checkout** — explicit "End shift" button on the truck portal. The shift's `ended_at` already ratchets forward with each completion (Phase 3 design); explicit close is polish.
- **TruckShell rename** — `DriverShell.tsx` is still the component name. Rename pass when nothing else is in flight.

### How to try it
- **Provision**: Settings → Team → Truck logins → click "Generate login" on a truck. Password reveals once with a copy button.
- **Test login**: open a private window → `/login` → use the generated email + password. Land on the truck portal. Pick a driver from the dropdown.
- **Complete a job**: open one assigned to that truck → mark delivered → owner laptop bell pings within ~1s with `Driver X · <truck> completed delivery to <suburb> · proof captured`.
- **RLS check**: as a truck, query `select count(*) from jobs` — only that truck's jobs return.

---

## Phase 11 — Drivers table + Settings → Team split
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 11._

### What's done (✅)
- **New `drivers` table** with name + phone (no email, no auth). RLS: owner can do anything; any signed-in user can SELECT (so the truck portal's picker works).
- **Backfill** migrated `profiles WHERE role='driver'` into `drivers` preserving UUIDs — `truck_shifts.driver_user_id` keeps resolving without changes.
- **`trucks.user_id`** column added (FK to `auth.users`, unique partial index when set).
- **Settings → Team** now has three sub-cards:
  - **Drivers** — primary card. Add / edit / soft-remove with a clean dialog (`AddEditDriverDialog`). No email field.
  - **Truck logins** — one card per active truck with a "Generate login" button. Login flow itself shipped in Phase 11B.
  - **Owners & admins** — the existing team list, filtered to non-driver roles. Email-login flow preserved for admins/dispatchers.
- **WhoDrivingDialog** reads from `useDrivers({ activeOnly: true })`. Backfill UUIDs mean Jacob (the existing driver) still appears.
- **`useDrivers`** hook with `useDrivers`, `useCreateDriverV2`, `useUpdateDriver`, `useDeleteDriver`. Delete falls back to soft-deactivate when shifts reference the driver, preserving the Phase 3 audit trail.
- **Realtime** — `drivers` added to the `supabase_realtime` publication so the owner dashboard live-updates.

### What needs Yamin (⏳)
- See Phase 11B for login provisioning + routing.

### What's deferred (🕐)
- See Phase 11B.

### How to try it
- Settings → Team → Drivers card → "Add driver" → name + phone. Save. Open the truck portal → "Who's driving today?" picker shows the new name.

---

## Phase 10 — Job-detail dialog: full edit + GST + type visibility + customer name
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 10._

### What's done (✅)
- **Header chips** for type (Standard / White Glove / House Move), location (Metro / Regional), quantity (`2 m³` / `4 hrs`), and a "Custom price" amber badge when `priceIsManual === true`.
- **Edit mode** opens up every field that wasn't already editable: customer name, phone, notes, job type, location, cubic metres, estimated hours, price.
- **Pricing inputs section** in edit mode mirrors the New Quote dialog's morphing form. Type swap auto-clears the inapplicable input (Standard→House Move clears cubes, House Move→Standard clears hours). Min-hours auto-default applied on House Move.
- **Manual-vs-recompute UX** — price input auto-tracks the rate-book recompute when `priceIsManual === false`. Typing in the field flips the manual flag and freezes the value; an "Apply rate-book price" button surfaces with the recomputed value as a one-click escape hatch.
- **Pricing breakdown footer** — Subtotal · GST · Total inc. GST line items, computed live in edit mode and from the saved row in read mode. Pre-Phase-1 quotes (no `gst_amount`) show a single Total line with a "(legacy)" tag — no fabricated GST split.
- **Audit trail** — every field-level change writes a row to `job_history`. New labelled fields: `customer_name`, `customer_phone`, `notes`, `type`, `location`, `cubic_metres`, `hours_estimated`, `fee`, `price_is_manual` (mapped to `Pricing source` with `manual`/`auto` values).
- **Migration** — `jobs.price_is_manual BOOLEAN NOT NULL DEFAULT FALSE`. Existing rows are auto-priced; flips to TRUE the moment the user types in the price field.
- **Customer name** — editable in the dialog title in edit mode; rejects empty trims, writes to `job_history`. Updates only the job's stored name, not the linked customer record on the Customers page.

### What needs Yamin (⏳)
- Nothing — pure UX. Works against the existing schema.

### What's deferred (🕐)
- Maps autocomplete on the editable address fields — Phase 13.
- Customer-phone NOT NULL widening (so phone can be null, not empty string) — Phase 14 area.
- Per-customer rate-override badge in the dialog — surface if Yamin uses overrides heavily.

### How to try it
- Open any active job → header chips visible.
- Click Edit → change type Standard → House Move. Cubic-metres input disappears, hours input appears. Price recomputes; toggle defaults to apply.
- Manually type a new price → "Custom price" badge appears.
- Open History tab → new rows for each field changed.

---

## Phase 9 — Truck Runs bugs + Scheduled column completeness + dnd-kit
_Implemented: 2026-05-02. Source: `V3_POST_MAY02_PLAN.md` §Phase 9 (+past-due strip and dnd-kit added by Yamin's request)._

### What's done (✅)
- **Drag-on-truck duplicate fixed.** Root cause: `useUpdateJob`'s `toSnakeCase` stripped `undefined` keys, so `assignedTruck: undefined` was silently dropped from the SQL UPDATE. Fix: new `normaliseUpdates()` helper translates `undefined` → SQL NULL for keys explicitly passed by the caller. Applied to `useUpdateJob` and `useUpdateCustomer` (which had the same latent bug).
- **Scheduled column** — drops the day-picker date filter and shows every booked job. Excludes anything already rendered in an alert strip or in a truck column for the picker day, so dnd-kit never sees the same `job.id` mounted twice.
- **Past-due strip** — rose-coloured card listing jobs scheduled in the past with no truck. Computed against actual today, so the alert stays useful regardless of where the day-picker is.
- **`@dnd-kit/core` swap** — replaces native HTML5 DnD on Truck Runs and Board. HTML5 DnD doesn't fire on touch; dnd-kit does. Drag listeners are attached to the GripVertical handle (always visible, `touch-none`); the card body retains tap-to-open and column scroll. PointerSensor with 5px activation distance + KeyboardSensor for a11y. Drag overlay renders a low-fidelity ghost cursor-following.

### What needs Yamin (⏳)
- Nothing.

### What's deferred (🕐)
- `aria-label` on grip handles is generic; could include the customer name for screen readers.
- Bundle warning at 1.4MB raw — pre-existing, code-splitting deferred.

### How to try it
- Drag a card off Truck 1 → it lands in Accepted, no copy left on Truck 1.
- Schedule a job for next Friday → appears in Scheduled column with the date label.
- Schedule a job for a past date with no truck → appears in the rose Past-due strip; drag onto a truck or back to Accepted to clear.
- Phone or DevTools mobile preview: drag from the grip handle on any card. Column scroll still works on the card body.
