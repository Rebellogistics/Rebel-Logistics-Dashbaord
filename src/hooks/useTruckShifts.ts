import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TruckShift } from '@/lib/types';

interface UseTruckShiftsOptions {
  /** ISO date YYYY-MM-DD lower bound (inclusive). */
  from?: string;
  /** ISO date YYYY-MM-DD upper bound (inclusive). */
  to?: string;
}

/**
 * Fetch truck_shifts within an optional date range. The Trucks calendar uses
 * this to draw the month grid; the find-a-fine search uses the broader range.
 */
export function useTruckShifts(opts: UseTruckShiftsOptions = {}) {
  const { from, to } = opts;
  return useQuery<TruckShift[]>({
    queryKey: ['truck_shifts', from ?? null, to ?? null],
    queryFn: async () => {
      let q = supabase
        .from('truck_shifts')
        .select('*')
        .order('shift_date', { ascending: false })
        .order('started_at', { ascending: true });
      if (from) q = q.gte('shift_date', from);
      if (to) q = q.lte('shift_date', to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        truckName: row.truck_name,
        driverUserId: row.driver_user_id ?? undefined,
        driverName: row.driver_name,
        shiftDate: row.shift_date,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        jobCount: row.job_count,
        createdAt: row.created_at,
      }));
    },
  });
}

interface RecordCompletionInput {
  jobId: string;
  driverId: string | null;
  driverName: string;
}

/**
 * Stamp a job as completed by a specific driver and upsert the matching
 * truck_shifts row. Single transaction in Postgres so partial state can't
 * happen.
 */
export function useRecordJobCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordCompletionInput) => {
      const { error } = await supabase.rpc('record_job_completion', {
        p_job_id: input.jobId,
        p_driver_id: input.driverId,
        p_driver_name: input.driverName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['truck_shifts'] });
    },
  });
}
