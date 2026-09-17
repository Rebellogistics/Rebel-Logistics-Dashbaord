import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MELBOURNE_METRO_POSTCODES } from '@/lib/metroPostcodes';

/**
 * The live Melbourne metro postcode list.
 *
 * From V7 the postcode is BINDING: it sets a job's zone outright and there
 * is no manual override on the job. That makes this list the single lever
 * for service area — moving suburbs between metro and regional is rows in
 * this table, not a code change.
 *
 * `src/lib/metroPostcodes.ts` remains the seed and the compiled-in fallback.
 * It is what the public LeadForm uses, since the table is readable by
 * authenticated users only.
 */
export function useMetroPostcodes() {
  return useQuery<ReadonlySet<number>>({
    queryKey: ['metro_postcodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metro_postcodes')
        .select('postcode');

      // Before 20260917000002 is applied the table does not exist. That is a
      // schema-version gap, not a failed read, so the compiled-in list is the
      // right answer. Any other error must surface: silently zoning every
      // job Regional would misprice quietly, which is the exact failure the
      // rate-book fallback was removed for.
      if (error) {
        if (error.code === '42P01') return MELBOURNE_METRO_POSTCODES;
        throw new Error(`Could not read metro_postcodes: ${error.message}`);
      }
      if (!data) {
        throw new Error(
          'metro_postcodes returned no rows. The table is readable by ' +
            'authenticated users only, so this most likely means the read was ' +
            'not permitted.',
        );
      }

      return new Set(data.map((r) => Number(r.postcode)));
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** Add postcodes to metro, or remove them. Owner/admin only, per RLS. */
export function useUpdateMetroPostcodes() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ add = [], remove = [] }: { add?: number[]; remove?: number[] }) => {
      if (add.length) {
        const { error } = await supabase
          .from('metro_postcodes')
          .upsert(add.map((postcode) => ({ postcode })), { onConflict: 'postcode' });
        if (error) throw error;
      }
      if (remove.length) {
        const { error } = await supabase
          .from('metro_postcodes')
          .delete()
          .in('postcode', remove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metro_postcodes'] });
    },
  });
}
