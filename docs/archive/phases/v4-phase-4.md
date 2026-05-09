# V4 Phase 4 — Google Calendar overhaul
**Status:** ✅ shipped 2026-05-04 · **Commits:** `651e70f`, `481a321`

## What's done
- **Per-truck calendar option.** Settings → Integrations → Google card has *Calendar layout* toggle: **Single calendar** (default) or **Per-truck calendars**. `/api/calendar/sync` lazy-creates *Rebel Logistics — Truck N* secondary calendars on first sync (uses `calendar.app.created` scope already granted).
- **Synthetic time slots.** Jobs with V4 1.1 `sequence` get a timed event: `start = 08:00 + sequence_index × 30min`, `end = +30min`, `Australia/Melbourne`. Visualisation only. Jobs without sequence → fall back to all-day.
- **Tappable Maps URLs** for pickup + delivery in description. Plain delivery address kept in `location` for inline map preview.
- **Richer event description.** Layout: company → contact → phone → pickup (Maps) → delivery (Maps) → chips (location · m³ · kg) → notes → driver → deep-link → ref.
- **Deep-link from event back to Truck Runs.** `?tab=Truck Runs&date=YYYY-MM-DD` URL state sync hooks on `App.tsx` and `TruckRunsView.tsx`.
- **Backfill button respects new format.** Existing *Sync open jobs (N)* button loops through `/api/calendar/sync`.
- **`/api/calendar/mode`** (POST) flips `integrations.metadata.calendar_mode` between `single` and `per_truck`. Auth-gated.
- **`/api/calendar/cleanup-legacy`** + UI for orphan calendar deletion. New "Finish per-truck migration" amber banner combines delete + re-sync into one click.

## What's left
- 🟡 **Calendar cleanup-legacy "every push failed"** — Yamin hit this during testing. Symptom: cleanup deleted the legacy calendar but `metadata.calendar_id` stayed set + every per-truck event create failed. Likely cause: token refresh issue or per-truck calendar create rejected by Google. **Workaround:** stay on **Single calendar** mode. Single mode works fine. Re-attempt with the Vite api-handler plugin now lets you reproduce locally on `npm run dev`.

## Deferred
- Two-way sync (drag a calendar event → dashboard date updates).
- Auto-clean orphan events on legacy calendar.
- Driver-as-event-attendee (needs driver email field).
- Multi-day or arrival-window events.

## Files touched
- `api/calendar/sync.ts` — new `buildPayload`, per-truck selection, deep-link, `createCalendarForTruck`
- `api/calendar/mode.ts` (new)
- `api/calendar/cleanup-legacy.ts` (new)
- `src/hooks/useIntegrations.ts`
- `src/components/settings/IntegrationsSection.tsx`
- `src/App.tsx`, `src/components/truck-runs/TruckRunsView.tsx`
