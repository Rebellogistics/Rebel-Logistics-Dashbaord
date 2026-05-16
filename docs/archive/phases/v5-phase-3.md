# V5 Phase 3 — Customer pricing presets + full edit + history view
**Status:** ✅ shipped 2026-05-16 · **Commit:** `eb0a1a1`

## Source
2026-05-15 call. Three asks merged:
1. Per-customer preset pricing (negotiated flat / hourly rates).
2. Full customer-edit dialog (was limited to ~5 fields).
3. Customer history view ("mini-CRM") — proactive, Yamin confirmed.

## What's done
- **Schema:** `customers.billing_basis` (`hourly` / `flat` / `per_item` / `none`, default `none` + CHECK), `default_service` (TEXT), `default_rate` (NUMERIC), `default_notes` (TEXT). Existing rows opt-in (no change).
- **CustomerDialog:** new "Default pricing preset" section under existing Custom rates block. Basis dropdown gates rate / service / notes fields.
- **CustomerDetailDialog:**
  - Grid grew from 3 → 4 stats (added **Last contact**).
  - Revenue stat labelled "Revenue inc. GST" per the GST-everywhere rule.
  - New "Default pricing" card when basis ≠ none.
- **NewQuoteDialog:** when picked customer has a preset, sparkly "Pre-fill from {Customer}" button appears below the combobox. Hourly basis flips type to House Move (so hours field + existing `overrideHourlyRate` auto-calc kicks in). Flat / per-item drop an "Agreed rate: $X" line into notes — Yamin sets fee in JobDetailDialog with `priceIsManual` after creating.

## What's left
- Flat-rate customers still need a 2-step: create with auto-priced fee → open job → manual-override. If Yamin pushes back, ~30 min to add a manual-fee toggle to NewQuoteDialog.

## Files touched
- `supabase/migrations/20260516000002_v5_phase3_customer_pricing_defaults.sql` (new)
- `src/lib/types.ts`, `src/lib/database.types.ts`
- `src/components/customers/CustomerDialog.tsx`
- `src/components/customers/CustomerDetailDialog.tsx`
- `src/components/jobs/NewQuoteDialog.tsx`
