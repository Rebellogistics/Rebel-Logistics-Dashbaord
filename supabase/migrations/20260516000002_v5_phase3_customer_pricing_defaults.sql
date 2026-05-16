-- V5 Phase 3: per-customer default pricing presets.
--
-- Stores the negotiated/contracted rate for a regular customer so the
-- new-job dialog can offer a "Pre-fill from {Customer}" one-click that
-- populates service + fee + notes from the customer record.
--
--   billing_basis  — how the customer is normally charged.
--                    'hourly'   = default_rate is per hour
--                    'flat'     = default_rate is the full job fee
--                    'per_item' = default_rate is per item / per m³
--                    'none'     = no preset (existing default; UI hides
--                                 the pre-fill button)
--   default_service — text label for now ('Standard', 'House Move',
--                     custom string). When the editable service catalog
--                     ships (V5 P10), this becomes an FK.
--   default_rate    — NUMERIC (dollars, matches jobs.fee). NULL when
--                     basis is 'none'.
--   default_notes   — anything Yamin wants pre-filled into the job
--                     notes: "always uses tail-lift", "invoice to head
--                     office", etc.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS default_service TEXT,
  ADD COLUMN IF NOT EXISTS default_rate    NUMERIC,
  ADD COLUMN IF NOT EXISTS billing_basis   TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS default_notes   TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_billing_basis_check'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_billing_basis_check
        CHECK (billing_basis IN ('hourly','flat','per_item','none'));
  END IF;
END $$;
