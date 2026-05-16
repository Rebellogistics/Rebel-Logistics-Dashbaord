# V5 Phase 10 — Editable service catalog (MVP)
**Status:** ✅ shipped 2026-05-16 · **Commit:** `f07fa4d`

## Source
2026-05-15 call. Yamin: "can there be more flexibility where I can edit a new service or remove a new service myself?" Sumanyu flagged scope-expander on the call; MVP respects that flag.

## What's done
- **Schema:** new `public.services` (name UNIQUE, default_rate, default_duration_minutes, description, active, sort_order, builtin, RLS owner-only). Seeded the 3 builtin types (Standard / White Glove / House Move) with `builtin=true` so a future enum-to-FK migration on `jobs.type` doesn't orphan history.
- **`useServices` hooks** — CRUD + activeOnly filter.
- **New `ServiceCatalogSection`** mounts beside `PricingPanel` under Settings → Pricing. List + add + edit + delete. Builtins render locked (name disabled, no delete button) since the pricing calculator + `JobType` union still hardcode their names + behaviour.
- **Service dialog** handles create + edit, with description / default rate (ex GST) / default duration / active fields.
- **CustomerDialog default-service input** swapped from free text to a `ServicePicker` dropdown populated from `useServices({ activeOnly: true })`. Legacy free-text values from V5 P3 are preserved as one-off options so they aren't silently wiped.

## What's left
- **Full job-type picker integration** — custom services don't yet appear on the NewQuoteDialog / JobDetailDialog job-type picker. Picking a custom service on a customer pricing preset is the only path today; `job.type` stays one of the 3 builtins. Future work: migrate `jobs.type` from string-union to FK on `services` + extend the pricing calculator to handle "manual price" services.

## Files touched
- `supabase/migrations/20260516000006_v5_phase10_service_catalog.sql` (new)
- `src/hooks/useServices.ts` (new)
- `src/components/settings/ServiceCatalogSection.tsx` (new)
- `src/components/settings/SettingsView.tsx`
- `src/components/customers/CustomerDialog.tsx`
- `src/lib/types.ts`, `src/lib/database.types.ts`
