import { useMutation } from '@tanstack/react-query';
import { apiPostJson } from '@/lib/apiClient';

/**
 * Fire-and-forget push of one job's state into Google Calendar.
 *
 * The endpoint decides itself whether to create / update / delete based on
 * the job's current row — we just call it after every meaningful job update
 * (truck assignment, date change, status flip).
 *
 * Errors are swallowed at the caller level: if Google is unreachable or the
 * user hasn't connected, the rest of the dashboard keeps working. Any real
 * sync failure surfaces as a console warning so we can debug without
 * derailing the operator.
 */
export function useSyncJobToCalendar() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      try {
        await apiPostJson('/api/calendar/sync', { jobId });
      } catch (err) {
        console.warn('Calendar sync failed', err);
      }
    },
  });
}
