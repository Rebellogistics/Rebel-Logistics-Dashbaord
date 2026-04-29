import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe to live changes on the jobs / truck_shifts / sms_log tables and
 * invalidate the matching React Query caches so the owner dashboard updates
 * the moment a driver — or anyone else with access — flips a row.
 *
 * Without this, an owner viewing the dashboard wouldn't see a driver's
 * "Completed" until the next page refresh: each user has their own session
 * and React Query has no idea the underlying row changed.
 *
 * Drop in once at the OwnerShell level (mounted only when an owner is
 * signed in). The driver shell does its own refetching when it triggers a
 * mutation, so it doesn't need this — but mounting it doesn't hurt.
 */
export function useRealtimeJobs() {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const channel = supabase
      .channel('rebel-realtime-jobs')
      // Any change to a row in `jobs` → refresh the owner's job list, the
      // alerts (which derive from jobs), and any per-job history queries.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          if (cancelled) return;
          qc.invalidateQueries({ queryKey: ['jobs'] });
          // job_history is keyed per job id — invalidate the specific one
          // when we know it; otherwise the next dialog open will refetch.
          const id = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id;
          if (id) qc.invalidateQueries({ queryKey: ['job_history', id] });
        },
      )
      // Driver attribution lands in truck_shifts on completion. Refresh the
      // Trucks calendar and the alerts when a new shift row is upserted.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'truck_shifts' },
        () => {
          if (cancelled) return;
          qc.invalidateQueries({ queryKey: ['truck_shifts'] });
        },
      )
      // SMS logs feed the bell's "SMS failed" alerts.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sms_log' },
        () => {
          if (cancelled) return;
          qc.invalidateQueries({ queryKey: ['sms_log'] });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [qc]);
}
