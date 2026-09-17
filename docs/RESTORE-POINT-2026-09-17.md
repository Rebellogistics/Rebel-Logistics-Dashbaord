# Restore point — 2026-09-17

Taken before any pricing-model work reached the live system. Everything below
describes the state to return to if a change goes wrong.

## Code

| | |
|---|---|
| Branch | `main` |
| Commit | `56d1aff` — *Add the remaining three audience pages; drop craning from the copy* |
| Git tag | **`restore-2026-09-17`** |
| Pushed? | **No.** `origin/main` is at `9e41427`, two commits behind. |

Local `main` is ahead of the remote by two commits (`5e38715`, `56d1aff`), both
marketing-site work. Nothing is lost — the remote is simply stale.

**To revert the code:**

```bash
git reset --hard restore-2026-09-17
```

**Not covered by the tag:** `docs/rate-sandbox.html` is untracked, so a
`git clean -fd` would delete it. Commit it if you want it protected.

## Database — project `hwqmuiezikvyrmnwxhbf`

`public.pricing_rates`, row `default`, as at this snapshot:

| Column | Value |
|---|---|
| `metro_per_cube_aud` | 120.00 |
| `regional_minimum_aud` | 480.00 |
| `wg_metro_per_cube_aud` | 180.00 |
| `wg_regional_minimum_aud` | 480.00 |
| `hourly_rate_aud` | 180.00 |
| `minimum_hours` | 3 |
| `gst_percent` | 10.00 |
| `updated_at` | 2026-05-03T09:07:16.219+00:00 |

**To restore these rates:**

```sql
update public.pricing_rates set
  metro_per_cube_aud = 120.00, regional_minimum_aud = 480.00,
  wg_metro_per_cube_aud = 180.00, wg_regional_minimum_aud = 480.00,
  hourly_rate_aud = 180.00, minimum_hours = 3, gst_percent = 10.00
where id = 'default';
```

`public.services` — all four rows `builtin = true`, `active = true`:
Standard, White Glove, Hourly rate, Storage.

**RLS on `pricing_rates`** (do not loosen): read `TO authenticated`, write
restricted to owner/admin, no anon policy.

### Migration ledger drift — known, harmless

`supabase/migrations/20260916000004_storage_service_builtin.sql` is **not**
recorded in `supabase_migrations.schema_migrations`, but its effect is applied
(`services.Storage.builtin = true`). It was evidently run as plain SQL rather
than through `apply_migration`. Nothing to fix; just don't be alarmed that the
repo has four September migrations and the ledger shows three.

Applied September migrations: `20260916051748` rename_house_move_job_type_to_hourly_rate,
`20260916052738` drop_job_type_rename_backup, `20260916054020` add_storage_job_type.

## The pricing sandbox

Not part of the app, and not affected by a code revert:

- **Artifact:** https://claude.ai/code/artifact/ca1fe366-85dd-41af-84b3-139040caa57a
  — owner-only, organisation-internal. Its rate figures live in the artifact's
  own store (`config/rates`), versioned independently of this repo. Published
  versions are retained, so an earlier one can be restored from the artifact's
  own version history.
- **Source copy:** `docs/rate-sandbox.html` (untracked — see above).

## What this restore point does NOT cover

- Jobs, customers, quotes and storage records — live operational data, not
  snapshotted here. A pricing migration must not rewrite historical job rows.
- Vercel environment variables.
- Anything the separate "public quote form fallback rates" session changes; it
  runs in its own worktree and branches from this same commit.
