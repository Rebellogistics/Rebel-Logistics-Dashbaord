import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@/lib/types';

/**
 * Phase 11: drivers list, sourced from the new `drivers` table. Kept separate
 * from `useTeam` (profiles) on purpose — drivers don't log in, so they don't
 * belong in the auth-flavoured Team query that drives the Settings panel.
 */
export function useDrivers(opts?: { activeOnly?: boolean }) {
  return useQuery<Driver[]>({
    queryKey: ['drivers', { activeOnly: !!opts?.activeOnly }],
    queryFn: async () => {
      let q = supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });
      if (opts?.activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row): Driver => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        active: row.active,
        createdAt: row.created_at,
        createdBy: row.created_by,
      }));
    },
  });
}

interface CreateDriverParams {
  name: string;
  phone?: string;
}

export function useCreateDriverV2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: CreateDriverParams) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Driver name is required');
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          name: trimmed,
          phone: phone?.trim() || null,
          created_by: userRes.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

interface UpdateDriverParams {
  id: string;
  name?: string;
  phone?: string | null;
  active?: boolean;
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateDriverParams) => {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone?.trim() || null;
      if (updates.active !== undefined) payload.active = updates.active;
      const { error } = await supabase.from('drivers').update(payload as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}

export function useDeleteDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-deactivate first if any shifts reference this driver. Hard delete
      // would orphan `truck_shifts.driver_user_id` and `jobs.completed_by_driver_id`,
      // which we want to preserve for fine lookups (Phase 3 use case).
      const { count, error: countErr } = await supabase
        .from('truck_shifts')
        .select('id', { head: true, count: 'exact' })
        .eq('driver_user_id', id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        const { error } = await supabase.from('drivers').update({ active: false }).eq('id', id);
        if (error) throw error;
        return { mode: 'deactivated' as const };
      }
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
      return { mode: 'deleted' as const };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
}
