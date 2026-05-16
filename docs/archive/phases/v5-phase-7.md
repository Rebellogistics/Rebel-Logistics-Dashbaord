# V5 Phase 7 — Calendar orphan-event cleanup
**Status:** ✅ shipped 2026-05-16 · **Commit:** `b95427f`

## Source
2026-05-15 call. Yamin: "I see the same job twice in my Google Calendar." Root cause is a past sync that lost track of an event id (job re-created, calendar mode flipped, etc.) and left a ghost behind.

## What's done
- **New endpoint** `POST /api/calendar/cleanup-orphans`:
  - Scans every calendar Rebel Logistics has ever written to (`metadata.calendar_id` + every `metadata.calendars[truck]`).
  - Uses Google's `q=Rebel Logistics` search to narrow the listing (paginated, 8-page cap = 2000 events max per calendar).
  - Snapshots every live `jobs.google_calendar_event_id` into a Set.
  - For each Rebel-tagged event whose id isn't in the Set: DELETE.
  - Returns `{ scanned, deleted, failed, perCalendar: [...] }`.
- **Safety:**
  - Only touches events whose description includes the brand marker `"Rebel Logistics ·"` — Yamin's personal appointments stay untouched even on a shared calendar.
  - 404 / 410 on delete treated as already-gone (no failure surfaced).
- **UI:** new row on the Google Calendar card in `IntegrationsSection`: "See the same job twice in your calendar? Run a scan…" + "Clean up duplicate events" button. Toast reports `"Removed N orphan events · scanned M"` / `"N failed"` variant.

## What's left
- **Per-truck migration retry** (the original V4 P4 cleanup-legacy "every push failed" report). The workaround "stay on Single mode" remains in place. Adding `integration_log` was deferred — existing sync endpoint already returns structured error text; the actual blocker is reproducing the failure, not observing it.

## Files touched
- `api/calendar/cleanup-orphans.ts` (new)
- `src/hooks/useIntegrations.ts`
- `src/components/settings/IntegrationsSection.tsx`
