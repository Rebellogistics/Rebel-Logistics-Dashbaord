# Rebel Logistics — Post-May 2 Implementation Plan

Source of truth for everything that lands before the **Sat 2026-05-09 09:00** sync with Yamin. Supersedes any open items from `V3_PHASED_PLAN.md`. Generated from the May 2 walkthrough transcript and a code-level audit of the current state.

- Source transcript: pasted into the May 2 working session (not committed).
- Prior plan: [`V3_PHASED_PLAN.md`](V3_PHASED_PLAN.md) (phases 1–8, mostly shipped per `V3_STATUS.md`).
- Rolling status log: [`V3_STATUS.md`](V3_STATUS.md). Append a new section per phase as it ships.
- Database migrations: `supabase/migrations/` plus the consolidated guide [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md).

Every phase below has the same skeleton: **Scope** (what's in / out) → **System changes** (schema, auth, env, RLS, realtime) → **Implementation** (concrete files + behaviour) → **Edge cases** → **Acceptance / demo path**. Phases are ordered so the riskiest item (Phase 11 — auth reshape) lands on a Supabase branch, not on top of fresh feature work.

---

## Sequencing rationale

The May 2 punch list is 19 items across bugs, dialog gaps, an architectural reshape, integrations, and research. Order is not arbitrary:

1. **Phases 9 + 10 first** — these are the bugs and dialog gaps that block Yamin from loading his ~20-job backlog tonight. They unblock his day-to-day.
2. **Phase 11 next** — the trucks-have-logins reshape touches auth, RLS, the driver portal, and the team UI. It's the highest-risk change and benefits from being landed on a Supabase branch with the rest of the work mid-flight.
3. **Phase 12 (calendar v2)** depends on Phase 11 only loosely — schedule-aware rendering can ship before or after, but reading driver attribution from the new model is cleaner if Phase 11 is in first.
4. **Phase 13 (Maps + Calendar)** unblocks once Yamin's new Google account is active. Independent of the database work.
5. **Phase 14 (Twilio test, customer import)** is wiring + manual ops; pushes to last.
6. **Phase 15** is the buffer day — final QA across mobile, desktop, the OAuth flow, and a dry-run of the Saturday demo.

Day budget (today is Sat May 2, deadline is Sat May 9 09:00):

| Day                 | Phases                                         |
|---------------------|------------------------------------------------|
| Sat 02 May (today)  | Customer import (run manually, **G/14.4**), set up Supabase branch |
| Sun 03 May          | Phase 9 (bugs) + Phase 10 (dialog completeness)|
| Mon 04 May          | Phase 10 carry-over + start Phase 11 (schema + RLS) |
| Tue 05 May          | Phase 11 continued (UI + migration cutover)    |
| Wed 06 May          | Phase 12 (calendar v2)                         |
| Thu 07 May          | Phase 13 (Maps + Calendar E2E)                 |
| Fri 08 May          | Phase 14 (Twilio + bulk delete) + Phase 15 QA  |
| Sat 09 May AM       | Final smoke + demo                             |

Buffer is mid-week — anything that slips moves to Friday before QA, not into Saturday morning.

---

## Phase 9 — Truck Runs bugs + Scheduled column completeness

The two regressions Yamin hit live on the call: a card duplicating when dragged off a truck, and the Scheduled column not surfacing all scheduled jobs.

### 9.1 Scope
- **In:** drag-end duplicate fix on Truck Runs; Scheduled column shows every `Scheduled` / `Notified` job regardless of the day-picker selection; orphan-strip handling for "scheduled in the past, no truck."
- **Out:** redesigning the column layout, virtualising long lists (deferred to Phase 12 if needed).

### 9.2 System changes
- None at the database level. This is pure client-state work.
- Verify `supabase/migrations/20260410000004_phase8c_*` and the Realtime publication block (Block 6 in `SUPABASE-RUN-THIS.md`) are applied — without those, the duplicate on drag is unreproducible/masked, since invalidation never fires and we'd be debugging a stale render instead of a real race.

### 9.3 Implementation

**Files:** `src/components/truck-runs/TruckRunsView.tsx`, `src/hooks/useSupabaseData.ts` (where `updateJob` is defined), `src/hooks/useRealtimeJobs.ts`.

**Duplicate-on-drag root cause (suspected — confirm with a console log first):**
The drag handler calls `updateJob.mutateAsync({ id, assignedTruck, date, status })`. If `updateJob` does an optimistic update via `queryClient.setQueryData(['jobs'], ...)`, and at the same time the Realtime channel fires a `postgres_changes` UPDATE event that causes `invalidateQueries(['jobs'])` (per `useRealtimeJobs.ts:29-37`), there's a window where:
1. The optimistic patch lands → React re-renders → row appears in the destination column.
2. The Realtime event invalidates → React Query refetches → during the in-flight refetch, the cache may briefly hold stale + new state.
3. If the optimistic patch did not also clear the source-column membership (e.g., it set `assignedTruck` but a stale cached query keyed differently still has the old row), the row renders in both places.

**Fix:**
- Move all column derivation into a single `useMemo` that buckets `jobs` exactly once (we already do this — `acceptedJobs`, `scheduledJobs`, `byTruck`). Confirm no derived array is built off a different cache key.
- In `updateJob` — drop the optimistic patch on this specific mutation (drag is fast, Realtime echo is sub-second). Trade a tiny perceived latency for correctness. If perceived lag is a problem, add a temporary "moving…" overlay on the dragged card keyed by `busyId`, which already exists in component state.
- Add a defensive de-dup at render: `Array.from(new Map(jobs.map(j => [j.id, j])).values())` upstream of the bucketing memos. Belt-and-braces — protects against any race that recurs.
- Add a debounced safety refetch: if the same job id appears in two columns within the same render frame, log a warning and call `qc.invalidateQueries({ queryKey: ['jobs'] })` once. This is a tripwire, not a band-aid — the fix above should make this unreachable.

**Scheduled column behaviour change** (`TruckRunsView.tsx:77-83`):
Current filter is `(status === 'Scheduled' || 'Notified') && date !== dateStr` — i.e., "scheduled for any day other than the picker day." Change to `(status === 'Scheduled' || 'Notified')` outright. Sort by `date` ascending. Group label by week if the count exceeds ~30 (rare for now; ship the simple version first).

**Orphan strip** — extend the existing `unassignedToday` band. New rule: if a job's `date` is in the past (before today's local date) and `status` is still `Scheduled`/`Notified`, surface it in the same amber strip with a "Past-due, no truck" label. Yamin can drag it onto a truck or back to Accepted to clear.

### 9.4 Edge cases
- **Realtime channel disconnects** mid-drag (Wi-Fi blip on Yamin's laptop): the optimistic patch wouldn't render if we drop it per the fix above, so the user sees the card snap back, then forward when the mutation returns. Acceptable. We could mitigate further with `useQuery({ refetchOnWindowFocus: true })` if not already on.
- **Two browser tabs open** (laptop + iPhone): both subscribe to Realtime, both refetch on the same UPDATE. No duplication risk because the source of truth is the server row, not local optimistic state.
- **Drag rapidly across multiple targets**: the dragend handler resets `draggingId`, but the in-flight mutation can lose a race. Lock the dragged card with `busyId` and `pointer-events: none` until the previous mutation resolves — already half-implemented; just make it strict.
- **Drop on the same truck on the same day** is already early-returned (`noChange`). Good — keep.
- **Card visible in the Scheduled column AND on a truck for today** under the new "show all scheduled" rule: currently impossible because a job with `assignedTruck = X` is filtered into `byTruck`, not `scheduledJobs`. After the change, do not also include those in `scheduledJobs` (a job is *either* truck-assigned for today or in the pool — never both). Add an explicit `&& !(assignedTruck && date === dateStr)` exclusion to the new filter.

### 9.5 Acceptance / demo path
- Drag a job off Truck 1 → it lands in Accepted, no copy left on Truck 1, no copy in Scheduled. Refresh: same state. Open a second tab: same state, in real time.
- Schedule a job for May 12 from the Accepted pool. With the day-picker on May 2, the job appears in the Scheduled column with the date label `Mon 12 May`.
- Schedule a job for an already-passed date (force via SQL). It appears in the orphan amber strip. Drag it onto a truck → strip clears.

---

## Phase 10 — Job-detail dialog: full edit + GST + type visibility

Phase 2 added editable date and addresses; Yamin needs the rest of the form.

### 10.1 Scope
- **In:** show job type + location + cubic metres / hours in the dialog header; edit type, cubic metres / hours, price (with rate-book recompute and a manual-override path), phone, notes; show GST breakdown (Subtotal / GST / Total). Audit-log every change to `job_history`.
- **Out:** changing the audit-log UI; backfilling GST onto pre-Phase-1 jobs.

### 10.2 System changes
- No new tables. Existing `jobs` already has `location`, `cubic_metres`, `gst_amount`, `valid_until`, `is_draft`, `quote_number` (per Block 1 in `SUPABASE-RUN-THIS.md`).
- Add a **price-override flag** on `jobs`: `price_is_manual BOOLEAN NOT NULL DEFAULT FALSE`. Set to `true` whenever the user edits the price field directly; reset to `false` whenever a type/cubic-metres/hours change drives a recompute the user accepts.
- Add a column to `job_history` if it isn't already there: ensure the `(field, before, after, changed_by, changed_at)` shape — verify the existing schema in migration `20260410000004_*` and only ALTER if needed (idempotent, `ADD COLUMN IF NOT EXISTS`).

### 10.3 Implementation

**Files:** `src/components/jobs/JobDetailDialog.tsx`, `src/components/jobs/NewQuoteDialog.tsx` (for shared price-engine logic — extract a hook), new `src/lib/pricing.ts` if not already extracted.

**Header surface** — under the customer name and quote number, render:
- Type badge (`Standard` / `White Glove` / `House Move`).
- Location chip (`Metro` / `Regional`) for Standard / White Glove.
- Quantity chip (`2.0 m³` for Standard / White Glove; `4 hrs` for House Move).
- "Custom price" badge if `price_is_manual === true`; otherwise an "Auto-priced" tooltip on hover.

**Edit mode** — extends the existing edit toggle:
- Type: `<Select>` with the 3 options. Switching type swaps the dependent fields visible:
  - Standard / White Glove → Location toggle + cubic metres input.
  - House Move → estimated hours input (3-hour minimum auto-bumps, mirroring NewQuoteDialog).
- Cubic metres / hours: number inputs with the same validation as NewQuoteDialog.
- Price: number input. Editing it sets `price_is_manual = true` on save.
- Phone, notes: plain text inputs.
- Truck (already editable): retained.

**Price recompute UX** — when type / location / cubic metres / hours change, compute a new price using the live rate book (`pricing_rates` row + customer overrides). Show two values inline:
- "Recalculated: $X (GST $Y, total $Z)"
- "Current: $A (GST $B, total $C) — manual override" if `price_is_manual` was already set.
A toggle button: **Apply rate-book price** (clears the manual flag) or **Keep current price**. Default is "apply" if no manual override existed; default is "keep" if `price_is_manual` was already true. This avoids silently overwriting a custom price.

**GST display (read mode)** — at the bottom of the dialog, replace the current "fee + fuel levy" line with:
```
Subtotal $X · GST $Y · Total $Z
```
For pre-Phase-1 jobs (`gst_amount IS NULL`), show only the legacy `Total $X` line with a small grey "(legacy quote)" tag. Don't fabricate a GST split.

**Audit log** — every saved change writes a row to `job_history` per field. Already-implemented for date and addresses; extend to type, location, cubic metres / hours, price, phone, notes. Helper: `recordHistory(jobId, field, before, after)` reused from existing code path.

**Lock when Completed/Invoiced** — the Edit button is already hidden in those states (`V3_STATUS.md` Phase 2). Verify that condition in `JobDetailDialog.tsx` covers the new fields too.

### 10.4 Edge cases
- **Type change leaves stale fields:** switching `Standard → House Move` should null `cubic_metres` and `location`, and require `estimated_hours` before save. Reverse swap: null `estimated_hours`. Handle on the client; the server tolerates nulls.
- **Manual price + type change:** described above. Don't auto-clear the manual flag on type change unless the user explicitly clicks **Apply rate-book price**.
- **Price below 0 or non-numeric:** validate ≥ 0; reject in the form.
- **GST percent changes globally** while a job is in flight: the job stores its own `gst_amount` at create / save time, so a rate-book edit doesn't retroactively shift saved jobs (per Phase 1 design).
- **Customer override rate exists** (`override_metro_rate` / `override_hourly_rate` set on the customer): the recompute uses the override automatically. Surface a small "Custom rate applies" badge near the recalculated price so Yamin can tell why it's not the default.
- **Editing notes alone** does not trigger a recompute. Recompute should only fire on type / location / cubic metres / hours.
- **Concurrent edit** (Yamin on laptop, second tab open): Realtime echoes the saved row, the dialog re-reads from cache, edit-mode form values may diverge from the latest server state. On save, compare `updated_at` and warn "this job changed in another window — refresh and re-edit." Cheap optimistic-concurrency check.

### 10.5 Acceptance / demo path
- Open any active job → header shows type, location, cubes/hours, custom-price badge if applicable.
- Click Edit → change type Standard → House Move. Cubic metres input disappears, hours input appears. Price recomputes; "Apply" toggle defaults to apply.
- Manually type a new price → on save, badge flips to "Custom price."
- Open History tab → new rows for Type, Hours, Price changes.
- Close the dialog as Completed/Invoiced → Edit button is gone, all fields read-only.
- Bottom of the dialog shows `Subtotal · GST · Total` for any post-Phase-1 quote.

---

## Phase 11 — Trucks have logins, drivers don't (architectural reshape)

This is the load-bearing change. Today, `profiles` rows are owners + drivers, drivers have email + auth. Yamin's mental model is the inverse: the truck is the unit with auth (because the tablet on the dash is what gets fingerprints and stays logged in), and the driver is a label picked at the start of a shift.

This change touches: schema, auth flow, RLS, the driver portal (`DriverShell.tsx`, `WhoDrivingDialog.tsx`), the Settings → Team panel (`SettingsView.tsx` + `EditTeamMemberDialog.tsx` + `AddDriverDialog.tsx`), and the `record_job_completion` RPC.

### 11.1 Scope
- **In:** new auth role `truck` with one `auth.users` account per truck; new `drivers` table (or repurpose `profiles`) with name + phone, no email; truck-side picker reads from `drivers`; Settings → Team panel splits into "Trucks (logins)" + "Drivers"; migration of existing rows; RLS policies for the new role.
- **Out:** any change to the owner login; auto-provisioning trucks (Yamin clicks "Generate login" per truck); SMS to drivers on shift start.

### 11.2 System changes — schema

New migration: `supabase/migrations/20260502000000_phase11_truck_auth.sql`. Idempotent.

```sql
-- 1. Add a user_id column to trucks for the per-truck login.
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS trucks_user_id_uniq ON trucks(user_id) WHERE user_id IS NOT NULL;

-- 2. New drivers table (separate from profiles to keep auth out of the equation).
CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID
);
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- 3. Migrate existing 'driver' profiles into drivers.
INSERT INTO drivers (id, name, phone, active, created_at)
SELECT id, full_name, phone, COALESCE(active, TRUE), created_at
FROM profiles
WHERE role = 'driver'
ON CONFLICT (id) DO NOTHING;

-- 4. truck_shifts.driver_id already references profile ids; the migration kept the same UUID
--    space, so the FK stays valid. If profiles → drivers id mapping ever drifts, switch to
--    a non-FK BIGINT and resolve names via a join (acceptable; we already denormalise driver_name
--    onto the shift on completion).
ALTER TABLE truck_shifts ADD COLUMN IF NOT EXISTS driver_name TEXT;  -- denormalise for display
UPDATE truck_shifts s SET driver_name = d.name FROM drivers d WHERE s.driver_id = d.id AND s.driver_name IS NULL;

-- 5. profiles role enum: keep 'driver' for backwards compat, add 'truck'.
DO $$ BEGIN
  ALTER TYPE profile_role ADD VALUE IF NOT EXISTS 'truck';
EXCEPTION
  WHEN undefined_object THEN
    -- profile_role wasn't defined as an enum; the role column is plain text. No-op.
    NULL;
END $$;
```

Note: `gen_random_uuid()` requires the `pgcrypto` extension; it's already enabled in this project.

### 11.3 System changes — RLS

Extend the existing RLS policy framework (defined in `20260410000003_phase8a_auth.sql` + `20260410000004_phase8b_rls.sql`):

- `jobs`: a user with `profile.role = 'truck'` can `SELECT` rows where `assigned_truck = trucks.name` (lookup via `trucks.user_id = auth.uid()`). They can `UPDATE` only `status`, `completed_at`, `driver_id` on those rows. They cannot `INSERT` or `DELETE`.
- `truck_shifts`: a `truck` role can `INSERT` and `SELECT` rows for their own truck. The `record_job_completion` RPC keeps using `SECURITY DEFINER` so the RLS doesn't block legitimate completions.
- `drivers`: any authenticated user can `SELECT` (so the truck portal's picker works); only owner can `INSERT` / `UPDATE` / `DELETE`.
- `trucks`: owner has all; `truck` role can `SELECT` only their own truck row.
- `customers`, `sms_log`, `pricing_rates`, etc.: trucks should not have read access to anything other than what's needed to render their assigned jobs. Default-deny; explicitly allow `SELECT customers` joined to a truck-visible job (read via the existing job→customer foreign key path; if customers RLS is row-level, add a policy `EXISTS (SELECT 1 FROM jobs j WHERE j.customer_id = customers.id AND j.assigned_truck IN (SELECT name FROM trucks WHERE user_id = auth.uid()))`).

### 11.4 System changes — `record_job_completion` RPC

Currently takes `(job_id, driver_id, truck_id)`. Rework so the RPC reads the calling truck from `auth.uid()` (lookup `trucks` by `user_id`) and accepts only `(job_id, driver_id)`. The owner-side path can also call with an explicit `truck_id` arg via an overload.

Both paths upsert `truck_shifts (truck, driver_id, day)`, denormalise `driver_name`, and stamp `jobs.driver_id` + `jobs.driver_name` (frozen-at-completion per Phase 3 design).

### 11.5 Implementation — UI

**Settings → Team panel split** (`src/components/settings/SettingsView.tsx`):
- Tab name **Team** → split into two sub-cards on the same tab: "Trucks (logins)" + "Drivers."
- "Trucks (logins)" card: list trucks. Each row shows the truck name, login email (the auth.users email), last sign-in time, "Reset password" + "Regenerate login" buttons. Add Truck → prompts for name + display colour, then generates a login (email of the form `truck-1@rebellogistics.local` or whatever Yamin prefers; default to a deterministic synthetic email so Yamin doesn't need a real inbox per truck) and a random password shown once with a copy button.
- "Drivers" card: name + phone, no email. Add / edit / delete via a simpler dialog. Reuse `EditTeamMemberDialog.tsx` but strip the email field for `kind = 'driver'`.
- Mobile: same split, vertical stack.

**Login page** (`src/components/auth/LoginPage.tsx`):
- Detect post-login: if `profile.role = 'owner'` → owner shell. If `'truck'` → truck shell (`DriverShell.tsx` rebrands to `TruckShell.tsx`). If `'driver'` (legacy) → migrate on first login: surface a "Yamin has moved logins to per-truck. Please ask Yamin for the truck login." screen, then sign out.

**Truck portal** (`src/components/driver/DriverShell.tsx` → rename `TruckShell.tsx`):
- On mount, check for a "today's driver" selection in localStorage scoped to the truck user id. If absent or stale (different day), open `WhoDrivingDialog.tsx` populated from the `drivers` table.
- Selected driver id is held in localStorage **and** posted to the server as soon as the first completion happens (so it lands in `truck_shifts` even if the tablet later goes offline).
- "End shift" button surfaces if `useTruckShifts.ts` shows an open shift for today — single click stamps `ended_at` and clears localStorage.

### 11.6 Migration / cutover plan

This is the part that benefits from a Supabase branch. Steps:

1. **Create a Supabase branch** via `mcp__supabase__create_branch` named `phase11-truck-auth`. All migrations + tests run on the branch.
2. **Apply the migration** on the branch. Verify: existing 2 profiles map to (1 owner + 1 driver-now-in-drivers); `truck_shifts` `driver_name` is backfilled for the 1 existing shift row.
3. **Generate truck logins** for Truck XV and Truck Y (Yamin's actual names): create `auth.users` accounts via the admin API, link via `trucks.user_id`. Hand the credentials to Yamin to enter on the tablets.
4. **Deploy the UI** behind a feature flag (env var `VITE_TRUCK_AUTH_V2 = 'true'`). When `true`, the new Team panel + truck-shell logic runs; when `false`, the old driver-shell path. Default `true` on the branch deployment, `false` on prod until the merge.
5. **Smoke** on the branch: owner login works, truck login works (on a new browser profile), driver picker populates, completing a job records a shift correctly, Realtime updates land on the owner dashboard.
6. **Merge the branch** via `mcp__supabase__merge_branch` once the smoke passes. Drop the feature flag in prod (delete the env var; the code paths fold to the new behaviour).
7. **Document the new login model** in `V3_STATUS.md` and update `SUPABASE-RUN-THIS.md` with the new block.

### 11.7 Edge cases
- **Yamin is logged in as owner when the migration runs:** his row is `profile.role = 'owner'`. Untouched. No regression.
- **The legacy driver row has unfinished shifts** (none today, but defensively): denormalise `driver_name` first, then run the migration. If a shift is open, leave it open; the new model accepts it.
- **A driver was already tied to a job via `jobs.driver_id`:** UUID stays; the new `drivers` table reuses the same ids. FK constraints stay valid.
- **A truck row is deleted** with active jobs assigned: ON DELETE SET NULL on `trucks.user_id`. The `assigned_truck` field on jobs is the truck *name* (text), not a FK — historic jobs stay readable. Re-creating the truck with the same name re-binds.
- **Yamin generates a new login for a truck while the tablet is logged in:** existing session keeps working until the next refresh; on refresh, the old credentials fail and the tablet shows a sign-in screen. Document this behaviour in the "Reset password" tooltip.
- **Two drivers try to start a shift on the same truck simultaneously** (rare; happens at handover): the second pick simply replaces the localStorage value. The first shift row stays open until `ended_at` is stamped — this is already how Phase 3 handles the upsert.
- **A truck logs in from two tablets at once** (e.g., Yamin tests on his laptop): both sessions share the same `auth.uid()`. Each can pick a different driver locally. This is acceptable; the last completion wins for the shift driver. If it becomes a real problem, lock the picker to one device per truck via a Supabase Realtime presence channel — defer.
- **Owner accidentally signs into a truck account:** the post-login role check routes to the truck shell. Yamin can navigate back via "Sign out → sign in as owner." Friendly error if confused: "This account is a truck login. Sign out to switch to owner."
- **RLS regression on customers**: the truck-role policy I sketched relies on a join through `jobs`. Verify it doesn't expose customers a truck has never seen. Test with `select * from customers` while authed as a truck — should return only customers that have a job assigned to that truck.

### 11.8 Acceptance / demo path
- On Saturday, sign into the dashboard as Yamin → Settings → Team → see two cards: Trucks (Truck XV, Truck Y, each with a login + last-seen) and Drivers (1 row currently).
- Sign into a second browser profile with Truck XV's credentials → land on the truck shell → "Who's driving today?" dialog opens → pick a driver → land on the day's run.
- Complete a job → owner laptop bell pings → "Driver A · Truck XV completed delivery to Brunswick · proof captured."
- Sign back in as owner → Trucks calendar shows the shift on today's cell with the driver chip.
- Add a new driver from Settings → no email field, just name + phone.

---

## Phase 12 — Trucks calendar v2: planned + completed

Yamin scheduled a job for May 1 and the Trucks calendar showed nothing because the calendar reads `truck_shifts`, which is populated only on completion.

### 12.1 Scope
- **In:** the calendar renders both completed shifts (existing) and scheduled jobs (new) on the same grid; visually distinct (solid vs outlined chips); side panel groups them as "Completed" and "Planned"; heat-map intensity counts both sources; past-dated planned-but-not-completed jobs render with an amber border.
- **Out:** drag-to-reschedule from inside the calendar; per-driver filtering.

### 12.2 System changes
None at the schema level. New rendering combines `truck_shifts` and `jobs` (filtered by `scheduled_date` and `truck_id`).

### 12.3 Implementation

**Files:** `src/components/trucks/TrucksView.tsx`, `src/hooks/useTruckShifts.ts`, possibly a new `src/hooks/useScheduledByDay.ts`.

- Add a query that pulls all jobs with `assigned_truck IS NOT NULL AND date >= now() - 30d AND status NOT IN ('Completed','Invoiced','Declined')`. Group by `(date, assigned_truck)`.
- Render the grouped scheduled chips alongside the existing shift chips in the same cell. Sort: completed first (it happened), then planned.
- Heat-map intensity: weighted sum of completed + planned counts. Cell tooltip surfaces "X completed · Y planned."
- Side panel for a clicked day: two sub-headings — `Completed (3)` (existing render) and `Planned (2)` (new). Each planned row links to the job dialog.

### 12.4 Edge cases
- **A scheduled job that is completed on the same day**: it appears in `truck_shifts` (completed) AND in the scheduled-jobs query if status is still rendering as `Scheduled` momentarily. Avoid double-count: if a job is in both, keep only the completed entry. Easy filter: exclude scheduled rows where the same `job_id` is referenced by a same-day completion in `truck_shifts.completed_jobs` (existing JSON column on `truck_shifts`).
- **A job rescheduled after being assigned to a calendar day**: the chip moves; Realtime invalidation ensures the calendar re-renders. Test: drag a job from May 5 → May 7 in Truck Runs → calendar updates without reload.
- **Past-dated "ghost" planned jobs** (booked for May 1, never executed by May 9): amber border. The cell tooltip says "Planned, not completed." Yamin can fix by completing or rescheduling.
- **Many jobs on one day** (e.g., 12+): collapse the cell to "+ N more" after 4 chips; the side panel shows all.
- **Heat-map miscount when completed = 0 and planned = 8**: should still tint dark — that's a busy day, even if not yet executed.

### 12.5 Acceptance / demo path
- Schedule a job for next Friday → Trucks tab → next Friday's cell tints + shows an outlined chip with the truck name. Click the day → side panel under "Planned (1)" lists the job.
- Complete a job today → cell shows a solid chip + intensity bumps. Outlined chip for the same job (if it had been planned for today) collapses into the completed entry.
- Toggle months — chips persist for both past and future months.

---

## Phase 13 — Maps Places + Calendar OAuth E2E

Yamin shared a fresh Google account on the call (Hotmail-with-a-dot @ gmail.com). Use it for both Maps and Calendar.

### 13.1 Scope
- **In:** Google Maps Places autocomplete on owner new-quote, public `/quote`, and the Phase-10 editable job dialog; persist `place_id` alongside the address string; Google Calendar OAuth tested end-to-end on the new account; per-truck calendar deferred (see Phase 5 +1, deferred); rotation of any leaked OAuth client secret as a hard prerequisite.
- **Out:** distance/ETA preview in the quote dialog (Phase 6.2 — defer); Metro/Regional auto-detect by polygon (Phase 6.3 — defer); two-way Calendar sync (Phase 5.6 — defer).

### 13.2 System changes
- **Env vars** (local + Vercel):
  - `VITE_GOOGLE_MAPS_API_KEY` — restricted to the dashboard's HTTP referrer + localhost.
  - `VITE_GOOGLE_OAUTH_CLIENT_ID` — already present (rotate if previously leaked).
  - `GOOGLE_OAUTH_CLIENT_SECRET` — server-only. **Rotate** before this phase ships per Phase 5 polish note in `V3_STATUS.md`.
  - `SUPABASE_SERVICE_ROLE_KEY` — already present.
- **Google Cloud Console** (under the new Google account):
  - Enable **Places API** and **Maps JavaScript API**.
  - Create the API key, restrict to HTTP referrers (`http://localhost:3000/*`, `https://<vercel-prod>/*`, plus the canonical preview domain).
  - Authorise redirect URIs for the OAuth client (per Phase 5.1 polish): localhost, prod, the canonical preview domain. Add the new Google account email under "Test users" since the OAuth consent screen is in Testing mode.

### 13.3 Implementation

**Maps** — new component `src/components/ui/AddressAutocomplete.tsx`:
- Loads the Maps JS API once, lazily, on first focus of any address input.
- Uses Places `AutocompleteService` with a per-input `sessionToken` (Google billing rule: same token across keystrokes for one address pick).
- `componentRestrictions: { country: 'au' }` to bias to Australia.
- On select: emits `{ formatted_address, place_id, lat, lng }`. Persist all four; the existing column for the human-readable string holds `formatted_address`. Add nullable `pickup_place_id`, `delivery_place_id`, `pickup_lat`, `pickup_lng`, `delivery_lat`, `delivery_lng` columns to `jobs` in a tiny migration (`ADD COLUMN IF NOT EXISTS`).
- Falls back to plain text input if the API fails to load.

Integrate at:
- `src/components/jobs/NewQuoteDialog.tsx` (pickup + delivery)
- `src/components/jobs/JobDetailDialog.tsx` (Phase 10 edit mode)
- `src/components/public/PublicQuoteForm.tsx` or wherever `/quote` lives (find via `grep -r '/quote'`)

**Calendar** — already wired in `api/calendar/sync.ts` etc. (per Phase 5). What's needed:
- Verify the redirect URI flow with the new Google account.
- Walk through Connect → assign a job to a truck → event lands → edit date → event moves → unassign → event deletes.
- Confirm the "Sync open jobs (N)" backfill button works (Phase 5 polish).
- Per-truck calendar (Phase 5.4): defer.

### 13.4 Edge cases
- **API key leaks**: HTTP referrer restrictions are weak (anyone can spoof a referrer); the real protection is rate limits + spend caps. Set a daily spend cap of ~$5 in Google Cloud Console as a backstop.
- **Quota exhausted** (Places autocomplete is ~$2.83/1000 sessions): for a 2-truck operator booking ~10 jobs/day, monthly cost is ≈$1. Negligible. But put the cap in anyway.
- **The Maps API doesn't return a session token** if not invoked correctly → billed per keystroke. Verify the implementation creates a `new google.maps.places.AutocompleteSessionToken()` once per address pick.
- **OAuth token expires while a job is being saved** → `/api/calendar/sync` returns 502 → log to console, surface a soft toast "Calendar sync failed — reconnect in Settings." Don't block the job save (per Phase 5 design).
- **Yamin disconnects mid-flight**: the integrations row is wiped at Google's `/revoke`; the next save's calendar push fails gracefully.
- **The new Google account isn't a Test user on the OAuth consent screen**: the connect flow returns "access_denied." The fix is in Google Cloud Console — Phase 5 polish already shows the redirect-mismatch error inline; extend that page to also detect `access_denied` and link Yamin to the Test users page in Cloud Console.

### 13.5 Acceptance / demo path
- New quote → start typing "1 Lygon" in Pickup → suggestions populate. Pick one → field auto-fills with the formatted address. Save the quote → SQL shows `pickup_place_id` populated.
- Edit a job → change Pickup via autocomplete → save → place_id updates, history row records the change.
- Connect Google Calendar with the new account → Settings shows "Connected as <new email>." Assign a job to a truck → Google Calendar event lands. Disconnect → revoke confirmed.

---

## Phase 14 — Bulk delete, Twilio test send, customer import sweep

Smaller items grouped together to keep daily PRs cohesive.

### 14.1 Bulk delete on Jobs + Customers

**Approach:** soft delete with a 30-day auto-purge.

- New columns: `jobs.deleted_at TIMESTAMPTZ`, `customers.deleted_at TIMESTAMPTZ`. Add via migration. Default queries filter `deleted_at IS NULL`.
- UI: checkbox column in `JobsTable` and customer grid. Top-bar "Delete N…" button on selection. Confirmation: "This will hide N jobs from the dashboard. Restore from Settings → Trash within 30 days."
- New Settings tab: **Trash** → list of soft-deleted rows with a "Restore" button.
- Auto-purge: nightly Supabase cron (or a `pg_cron` job if available; otherwise a Vercel cron at `/api/cron/purge-deleted`) deletes rows where `deleted_at < now() - interval '30 days'`.

**Edge cases:**
- **Customer with linked jobs**: when bulk-deleting customers, surface the linked-job count in the confirmation. Default behaviour: orphan the jobs (set `customer_id` to NULL — only if the FK allows it; otherwise reject with an error and force per-customer review). The schema today probably has `customer_id` non-null; safer path is to **block** deletion of a customer with active jobs and offer "Delete the customer's jobs first" as the next step.
- **Realtime echoes**: a soft-delete is an UPDATE, so Realtime fires; both tabs hide the row simultaneously. Good.
- **Yamin already deletes via Supabase directly**: those rows hard-delete, bypassing the soft-delete column. Document this; suggest he stop and use the UI from now on.

### 14.2 Twilio test send

- Wire a "Send test SMS" button on Settings → Integrations → Twilio card. POSTs to `/api/sms/send` with a hard-coded "Test from Rebel Logistics — please ignore." body.
- Number picker pre-populated with Yamin + Sumanyu.
- Twilio AU bundle is still under review (per memory, ETA mid-May). Test sends use the trial US number to verified destinations only — verify Yamin's and Sumanyu's numbers in Twilio console first.
- Live customer-facing SMS stays gated until the AU bundle approves.

### 14.3 Customer import sweep — manual run

- Sumanyu pulls Yamin's Xero contacts file (already received).
- Import via the Phase 7 wizard logged in as Yamin (or via direct SQL using the same column-mapping helpers that the wizard uses). Tag every row with `import_batch = 'xero-2026-05-02'`.
- Spot-check ~5 random rows post-import; specifically the ones with weird unicode in names (Xero exports often have curly apostrophes, accented characters).

### 14.4 Edge cases (group)
- **Bulk delete of 200 customers** in one click: chunk the SQL UPDATE into batches of 100 to stay well under any row limit; show progress.
- **A soft-deleted customer is referenced by an active job**: the job dialog should still resolve the customer name (the FK is intact). Render a strikethrough or "(deleted)" label on the customer name in the dialog.
- **Twilio rate limits the trial number**: 1 message/sec on trial. For a single test send, fine.
- **Xero export contains a row with no name AND no company**: the Phase 7 wizard already errors per row with a clear message; Yamin can fix or skip during the manual run.

---

## Phase 15 — Final QA + Saturday demo

The buffer day (Fri May 8) and Saturday morning before the call.

### 15.1 QA checklist
- **Mobile (iPhone Safari + Android Chrome)**: every dialog, the auth flow, the install prompt, voice-to-text, the FAB.
- **Desktop**: end-to-end flow — create quote → assign truck → edit fields → complete → invoice. Verify Realtime updates between two tabs.
- **OAuth**: connect → disconnect → reconnect → assign a job → calendar event lands.
- **Maps autocomplete**: works on owner side, public form, edit dialog. Falls back gracefully if the key is invalid.
- **Truck shell**: pick driver → complete a job → owner bell pings.
- **RLS**: as a truck, can only see own truck's jobs and customers linked to those jobs.
- **Bulk delete + restore**: round-trip a couple of rows.
- **Twilio test send**: arrives on Yamin's + Sumanyu's phones.

### 15.2 Saturday demo agenda (live with Yamin)
1. **Bug walk-through**: drag a card off a truck → no duplicate. Schedule a job for next week → appears in Scheduled column.
2. **Job dialog edit**: change a job from Standard → House Move → see price recompute → manually override → save → History tab shows every field change. GST visible.
3. **Truck logins**: log in on a "Truck XV" tablet (a separate browser profile) → driver picker → pick driver → complete a job → owner bell pings with driver name.
4. **Trucks calendar**: future scheduled jobs render with outlined chips, completed jobs solid. Click a day → side panel shows both.
5. **Maps autocomplete**: type an address on a new quote → suggestions → pick → place_id stored.
6. **Calendar**: assign a job to a truck → event lands on Yamin's Google Calendar.
7. **Twilio test SMS**: tap the button → both phones buzz.
8. **Bulk delete**: select 3 jobs → soft delete → check Trash → restore.
9. **Website quote**: confirm the $1,500-incl-platform proposal. If yes, swap to bank-details exchange.
10. **Open questions for next sprint**: email-to-job, multi-stop optimisation, per-truck Calendars, Twilio AU bundle status.

### 15.3 Rollback plan
If anything in Phase 11 (auth reshape) misbehaves on Saturday morning's smoke:
- Keep the Supabase branch live; do not merge until the issue is fixed.
- Roll back the Vercel deployment to the last green commit.
- Re-enable the legacy driver-shell path by flipping `VITE_TRUCK_AUTH_V2 = 'false'` on prod.
- Document the regression in `V3_STATUS.md` and re-cut on Sunday.

For non-auth phases, regular Vercel rollback is fine.

---

## Cross-cutting concerns

### Migrations
- Every schema change ships as an `IF NOT EXISTS` / `IF EXISTS` migration in `supabase/migrations/`. Append a corresponding block to `SUPABASE-RUN-THIS.md` so Yamin can run them in one place if the local CLI hasn't applied them.
- Don't drop columns. Don't rename tables. If a name change is needed, add the new and let the old age out (the codebase is small enough that grep-and-replace is fine, but external integrations may still reference old names).
- Run migrations on a **Supabase branch first** for Phase 11. Smaller migrations (Phase 9 / 10 / 12 / 13 / 14) can apply directly to prod since they're additive only.

### Realtime
- `useRealtimeJobs.ts` already subscribes to `jobs`, `truck_shifts`, `sms_log`. Add `drivers`, `trucks` to that subscription if Phase 11 ships — otherwise editing a driver name doesn't propagate to other tabs.
- Verify Realtime publication is enabled for any new tables (Block 6 in `SUPABASE-RUN-THIS.md`). New tables are not in the publication by default.

### RLS
- Default-deny. Every new table gets `ENABLE ROW LEVEL SECURITY` and explicit policies.
- For Phase 11 specifically, verify the truck-role policies don't expose customers / jobs the truck shouldn't see. Test by signing in as a truck and running each affected query manually.

### Env
- `.env.example` mirrors prod. Update it whenever a new env var lands. Never commit a real key.
- Vercel env vars: keep Server-only secrets unset in the `VITE_` namespace.

### Realtime + optimistic updates
- The drag-duplicate fix in Phase 9 abandons optimistic state on the drag mutation. Apply the same pattern to any other mutation where Realtime is the source of truth. Optimistic is only worth keeping where the latency budget is < 300ms and a flicker is unacceptable (e.g., star-clicking a review).

### Mobile
- Yamin operates from his phone. Every UI change must be tested on a real iPhone, or DevTools mobile emulator at minimum. Especially the autocomplete dropdown (places overlays often misbehave on iOS Safari due to virtual keyboard repositioning).

### Past-call lessons
- **Apr 13** call's actionables had silent skips on import (Phase 7). Lesson: **never silent-skip a row**. Always surface a per-row error.
- **Apr 28** call's CSV import passed because of header normalisation. Lesson: **don't hard-code field names**; always offer a mapping screen. Phase 7 already corrects this; Phase 14.3 reuses it.
- **May 2** call exposed Phase 2's edit-scope being too narrow. Lesson: **when adding "edit" to a dialog, default to all fields editable** unless an explicit reason locks one. Phase 10 corrects this.
- **May 2** call also exposed the trucks-vs-drivers semantic mismatch. Lesson: **mirror Yamin's mental model exactly** — when in doubt, ask "is this what you'd say out loud?" — auth, naming, and grouping should match how he thinks. Phase 11 corrects this.

---

## Deferred (research only, not Saturday)

- **Email-to-job ingestion.** Architecture sketch: forwarder address (`quote@rebellogistics.com.au`) → Vercel webhook (`/api/inbound-email`) → parse with a lightweight LLM call → insert as a draft quote. Half-day to ship. Bring a costed proposal to the next call.
- **Multi-stop route optimisation.** Google Directions API with `waypoints=optimize:true`. UI: per-truck "Optimise" button in Truck Runs that re-orders the day's stops. Half-day to ship. Defer.
- **Per-truck Google Calendars.** One Calendar resource per truck, owned by Yamin's account. Easy data-model change (add `calendar_id` to the per-truck row); UI is "create calendars for your trucks" once. Defer until Yamin signals preference.
- **Two-way Calendar sync.** Calendar push event listener via Pub/Sub → webhook → update job. Heavier lift; rarely the right answer for an ops team that lives in the dashboard.

---

## Risk register

| Risk                                    | Likelihood | Impact | Mitigation                                                                 |
|-----------------------------------------|------------|--------|----------------------------------------------------------------------------|
| Phase 11 auth migration breaks Yamin's login | Low        | High   | Branch + feature flag + smoke before merge.                                |
| RLS policy gap exposes data across trucks   | Med        | High   | Manual check per truck role on every affected table; unit-test with Supabase advisors. |
| Realtime publication missing on new tables  | Med        | Med    | Block 6 of `SUPABASE-RUN-THIS.md`; verify after every migration.           |
| Maps API key leaked in prod bundle          | Low        | Low (cost-capped) | HTTP referrer restriction + $5/day spend cap.                              |
| Twilio AU bundle slips past mid-May         | Med        | Low    | Test send to verified numbers only; full go-live deferred to Phase 8 follow-up. |
| Yamin reschedules the Saturday call        | Med        | Low    | Plan is dated and the buffer is built in for slippage.                     |
| Optimistic-update regressions in other dialogs | Low | Med | Apply the Phase 9.3 pattern uniformly to any drag/drop mutation. |
| OAuth consent screen requires verification once test-user count grows | Low | Low | Stay under 100 test users; submit for verification later if needed. |

---

## What's not in this plan (and why)

- **Twilio AU go-live** — blocked on bundle approval (~mid-May); Phase 14.2 covers test-only.
- **Per-customer rate split for White Glove vs Standard** — the May 2 call didn't confirm a separate rate. Open question for the Saturday meeting.
- **Apply-override audit trail on rate book changes** — Phase 1 deferred; not surfaced as a pain point on May 2.
- **Service worker / offline mode** — Phase 4 deferred; not surfaced.
- **Fine-grained driver permissions** — drivers no longer have logins (Phase 11), so this is moot.

---

## Saturday meeting outcomes to capture

1. **Yes/No on the website quote** ($1,500 incl platform). If yes, exchange bank details same day.
2. **Confirm the new login email format** for trucks (synthetic vs Yamin's-domain alias).
3. **Approve or revise driver-fallback policy** — Phase 3's existing rule was: if neither a picked driver nor an assigned truck driver is found, the current user is recorded. With Phase 11, the rule simplifies: if no driver was picked, the shift is recorded with `driver_id = NULL` and `driver_name = '(unset)'`. Confirm this is acceptable.
4. **Confirm bulk-delete-with-jobs behaviour for customers** (block vs cascade). Default to block.
5. **Twilio AU bundle status** — any update from the AU regulator.
6. **Email-to-job pricing + scope** — present a costed proposal.
