-- Phase 15 (post-Phase-14 follow-up): split White Glove pricing from Standard.
-- Yamin's earlier ambiguity ("Standard and White Glove are exactly the same")
-- resolved to "they should be priced separately" — White Glove typically
-- carries a premium for careful handling / inside placement.

ALTER TABLE pricing_rates
  ADD COLUMN IF NOT EXISTS wg_metro_per_cube_aud   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS wg_regional_minimum_aud DECIMAL(10,2);

UPDATE pricing_rates
SET wg_metro_per_cube_aud   = COALESCE(wg_metro_per_cube_aud,   metro_per_cube_aud),
    wg_regional_minimum_aud = COALESCE(wg_regional_minimum_aud, regional_minimum_aud)
WHERE wg_metro_per_cube_aud IS NULL OR wg_regional_minimum_aud IS NULL;

ALTER TABLE pricing_rates
  ALTER COLUMN wg_metro_per_cube_aud   SET DEFAULT 90.00,
  ALTER COLUMN wg_metro_per_cube_aud   SET NOT NULL,
  ALTER COLUMN wg_regional_minimum_aud SET DEFAULT 480.00,
  ALTER COLUMN wg_regional_minimum_aud SET NOT NULL;

COMMENT ON COLUMN pricing_rates.wg_metro_per_cube_aud IS
  'White Glove per-cubic-metre rate for metro jobs. Separate from metro_per_cube_aud (Standard).';
COMMENT ON COLUMN pricing_rates.wg_regional_minimum_aud IS
  'White Glove flat minimum charge for regional jobs. Separate from regional_minimum_aud (Standard).';
