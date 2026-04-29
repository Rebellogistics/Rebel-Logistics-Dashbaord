import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_RATES } from '@/lib/pricing';
import { PricingRates } from '@/lib/types';

/**
 * Read the singleton row from `pricing_rates`. Falls back to DEFAULT_RATES
 * if the table is empty (first install) or unreachable.
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
        console.warn('pricing_rates read failed, using defaults', error);
        return DEFAULT_RATES;
      }
      if (!data) return DEFAULT_RATES;

      return {
        metroPerCubeAud: Number(data.metro_per_cube_aud),
        regionalMinimumAud: Number(data.regional_minimum_aud),
        hourlyRateAud: Number(data.hourly_rate_aud),
        minimumHours: Number(data.minimum_hours),
        gstPercent: Number(data.gst_percent),
        updatedAt: data.updated_at,
      };
    },
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
