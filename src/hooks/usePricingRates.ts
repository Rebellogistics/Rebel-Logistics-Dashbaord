import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PricingRates } from '@/lib/types';

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
