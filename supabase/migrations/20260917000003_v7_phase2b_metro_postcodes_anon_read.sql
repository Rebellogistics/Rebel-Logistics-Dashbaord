-- V7 Phase 2b: let the public quote form read the metro postcode list.
--
-- The form classifies a delivery postcode as it is typed, and it runs
-- unauthenticated. The list carries no dollar figures — it says which
-- postcodes Rebel calls metro, not what metro costs — and the marketing site
-- already publishes 121 suburb service pages, so the service area is largely
-- inferable already. Reading it is therefore safe to open; writing stays
-- owner/admin.
--
-- Deliberately NOT a precedent for pricing_rates, which holds the rates
-- themselves and stays readable TO authenticated only.

DROP POLICY IF EXISTS "metro_postcodes readable by anyone" ON public.metro_postcodes;
CREATE POLICY "metro_postcodes readable by anyone"
  ON public.metro_postcodes FOR SELECT TO anon USING (true);
