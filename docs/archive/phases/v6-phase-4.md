# V6 Phase 4 — Rename the House Move job type to Hourly rate
**Status:** ✅ shipped 2026-09-16 · **Commits:** `d976780`, `aee3501`

## Source
2026-09-16, Yamin: the type is defined by how it is charged, not by what is being moved. It was already the hourly-priced type — `pricing.ts` branches on it for `max(estimatedHours, minHours) × hourlyRate`, and the customer prefill selects it whenever a customer's billing basis is hourly — so only the name still described a house.

## Scope decision
Full rename of the **stored value**, not a display alias. A label-only change would leave code and screen disagreeing permanently. `jobs.type` is plain text, so the union, the `Record<JobType>` key maps (calendar colour, review totals) and every comparison moved together — 53 references across 21 files. `tsc` catching a missed reference is what made this safe.

## Data migration
`20260916000001_rename_house_move_to_hourly_rate.sql` — 27 rows: 25 `jobs.type`, one `customers.default_service`, one `services.name`.

**`jobs` carried a `jobs_type_check` CHECK constraint** pinning the three allowed values. The first attempt missed it and Postgres rejected the whole batch, changing nothing. The migration widens the constraint, moves the rows, then narrows it again.

Verified after: 25 jobs `Hourly rate`, zero stale anywhere, distinct types `Hourly rate | Standard | White Glove`.

## Public wording deliberately unchanged
Customers still see **"House / office relocation"** on the live quote form. That option submits `jobType: 'Hourly rate'`, so the data is consistent; only the customer-facing words differ. Naming a service "Hourly rate" to a customer reads as a price list. This was changed and then reverted at Yamin's direction — the label-change commit was dropped rather than reverted, so history shows no change-and-undo pair.

## Ordering
Code deployed first, data migrated immediately after, to keep the new-code/old-data window to seconds. Deploy was confirmed by checking the live bundle for the new string before migrating.
