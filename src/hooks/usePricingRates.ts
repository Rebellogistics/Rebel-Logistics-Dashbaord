import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PricingRates } from '@/lib/types';
import { DEFAULT_RATES } from '@/lib/pricing';

/**
 * Read a column that may not exist yet in this environment's schema.
 *
 * The V7 rate-book columns arrive in a migration; until it is applied the
 * row simply has no such key. That is a schema-version gap, not a failed
 * read, so falling back to the seed default is correct here — unlike the
 * whole-row failure above, which must throw.
 */
function num(row: Record<string, unknown>, key: string, fallback: number): number {
  const v = row[key];
  return v === null || v === undefined ? fallback : Number(v);
}

function bool(row: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = row[key];
  return v === null || v === undefined ? fallback : Boolean(v);
}

/**
 * Read the singleton row from `pricing_rates`.
 *
 * This deliberately does NOT fall back to DEFAULT_RATES. Those defaults are
 * the first-install seed values, not the live rate book, and serving them on
 * a failed read quotes the wrong price with no visible sign anything broke.
 * A caller that gets no rates must show no price — never a guessed one.
 *
 * Note the RLS case: `pricing_rates` is readable `TO authenticated` only, and
 * a denied read comes back as `data: null, error: null` — indistinguishable
 * from an empty table. Since the singleton row is inserted by the same SQL
 * block that creates the table, "no row" means "not permitted to read it",
 * so both are treated as a failure.
 */
export function usePricingRates() {
  return useQuery<PricingRates>({
    queryKey: ['pricing_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_rates')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) {
        throw new Error(`Could not read pricing_rates: ${error.message}`);
      }
      if (!data) {
        throw new Error(
          'pricing_rates returned no row. The singleton row ships with the table, ' +
            'so this means the read was not permitted — pricing_rates is readable ' +
            'by authenticated users only.',
        );
      }

      return {
        metroPerCubeAud: Number(data.metro_per_cube_aud),
        regionalMinimumAud: Number(data.regional_minimum_aud),
        // Phase 15: separate White Glove rates. Falls back to Standard if the
        // backfill hasn't run yet (defensive — the migration sets defaults).
        wgMetroPerCubeAud: Number(
          (data as { wg_metro_per_cube_aud?: number | null }).wg_metro_per_cube_aud ??
            data.metro_per_cube_aud,
        ),
        wgRegionalMinimumAud: Number(
          (data as { wg_regional_minimum_aud?: number | null }).wg_regional_minimum_aud ??
            data.regional_minimum_aud,
        ),
        hourlyRateAud: Number(data.hourly_rate_aud),
        minimumHours: Number(data.minimum_hours),
        gstPercent: Number(data.gst_percent),
        updatedAt: data.updated_at,

        // V7 columns. Read defensively against DEFAULT_RATES, the same way
        // the wg_* columns above are: this file compiles and runs before
        // 20260917000001_v7_phase1_rate_book_v2.sql has been applied, and an
        // environment still on the old schema keeps working.
        hourlyRateLargeAud: num(data, 'hourly_rate_large_aud', DEFAULT_RATES.hourlyRateLargeAud),

        labourPerHourAud: num(data, 'labour_per_hour_aud', DEFAULT_RATES.labourPerHourAud),
        labourMinLabourers: num(data, 'labour_min_labourers', DEFAULT_RATES.labourMinLabourers),
        labourMinHours: num(data, 'labour_min_hours', DEFAULT_RATES.labourMinHours),

        storageStandardAud: num(data, 'storage_standard_aud', DEFAULT_RATES.storageStandardAud),
        storageHighEndAud: num(data, 'storage_high_end_aud', DEFAULT_RATES.storageHighEndAud),
        storageInsuredAud: num(data, 'storage_insured_aud', DEFAULT_RATES.storageInsuredAud),
        shortTermUpliftPct: num(data, 'short_term_uplift_pct', DEFAULT_RATES.shortTermUpliftPct),
        storageGraceDays: num(data, 'storage_grace_days', DEFAULT_RATES.storageGraceDays),

        container20ftAud: num(data, 'container_20ft_aud', DEFAULT_RATES.container20ftAud),
        container40ftAud: num(data, 'container_40ft_aud', DEFAULT_RATES.container40ftAud),
        containerIncludedHours: num(data, 'container_included_hours', DEFAULT_RATES.containerIncludedHours),

        whLabourOutboundAud: num(data, 'wh_labour_outbound_aud', DEFAULT_RATES.whLabourOutboundAud),
        whLabourQcAud: num(data, 'wh_labour_qc_aud', DEFAULT_RATES.whLabourQcAud),
        whLabourUnloadAud: num(data, 'wh_labour_unload_aud', DEFAULT_RATES.whLabourUnloadAud),
        whLabourMinCrew: num(data, 'wh_labour_min_crew', DEFAULT_RATES.whLabourMinCrew),
        whLabourMinHours: num(data, 'wh_labour_min_hours', DEFAULT_RATES.whLabourMinHours),

        disposalVanAud: num(data, 'disposal_van_aud', DEFAULT_RATES.disposalVanAud),
        disposalTrailerAud: num(data, 'disposal_trailer_aud', DEFAULT_RATES.disposalTrailerAud),
        disposalTransportAud: num(data, 'disposal_transport_aud', DEFAULT_RATES.disposalTransportAud),
        disposalTransportLargeAud: num(data, 'disposal_transport_large_aud', DEFAULT_RATES.disposalTransportLargeAud),

        wgDisposalThresholdM3: num(data, 'wg_disposal_threshold_m3', DEFAULT_RATES.wgDisposalThresholdM3),

        fuelLevyPct: num(data, 'fuel_levy_pct', DEFAULT_RATES.fuelLevyPct),
        fuelLevyOn: bool(data, 'fuel_levy_on', DEFAULT_RATES.fuelLevyOn),

        billingIncrementHours: num(data, 'billing_increment_hours', DEFAULT_RATES.billingIncrementHours),
      };
    },
    // A permission failure will not fix itself on retry; surface it instead.
    retry: false,
    staleTime: 60_000,
  });
}

export function useUpdatePricingRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rates: PricingRates) => {
      const { error } = await supabase
        .from('pricing_rates')
        .update({
          metro_per_cube_aud: rates.metroPerCubeAud,
          regional_minimum_aud: rates.regionalMinimumAud,
          wg_metro_per_cube_aud: rates.wgMetroPerCubeAud,
          wg_regional_minimum_aud: rates.wgRegionalMinimumAud,
          hourly_rate_aud: rates.hourlyRateAud,
          minimum_hours: rates.minimumHours,
          gst_percent: rates.gstPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'default');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing_rates'] });
    },
  });
}
