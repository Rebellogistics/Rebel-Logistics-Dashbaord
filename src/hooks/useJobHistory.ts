import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface JobHistoryEntry {
  id: string;
  jobId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string | null;
  changedAt: string;
}

export function useJobHistory(jobId: string | null | undefined) {
  return useQuery<JobHistoryEntry[]>({
    queryKey: ['job_history', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('job_history')
        .select('*')
        .eq('job_id', jobId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        jobId: row.job_id,
        field: row.field,
        oldValue: row.old_value,
        newValue: row.new_value,
        changedBy: row.changed_by,
        changedAt: row.changed_at,
      }));
    },
  });
}

interface AppendHistoryInput {
  jobId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export function useAppendJobHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: AppendHistoryInput[]) => {
      if (entries.length === 0) return;
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      const rows = entries.map((e) => ({
        job_id: e.jobId,
        field: e.field,
        old_value: e.oldValue,
        new_value: e.newValue,
        changed_by: userId,
      }));
      const { error } = await supabase.from('job_history').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      const ids = new Set(vars.map((v) => v.jobId));
      ids.forEach((id) => qc.invalidateQueries({ queryKey: ['job_history', id] }));
    },
  });
}
