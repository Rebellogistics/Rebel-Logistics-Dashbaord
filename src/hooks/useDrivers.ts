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
      // Phase 17: filter out soft-deleted rows. Trash view uses
      // useTrashedDrivers below.
      let q = supabase
        .from('drivers')
        .select('*')
        .is('deleted_at', null)
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
        deletedAt: row.deleted_at,
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
      // Phase 17: always soft-delete. The previous logic conditionally
      // hard-deleted drivers with no shift history; that loophole is gone
      // now that Trash is the universal recovery path. Restore from
      // Settings → Trash.
      const { error } = await supabase
        .from('drivers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { mode: 'soft-deleted' as const };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['trashed_drivers'] });
    },
  });
}

export function useTrashedDrivers() {
  return useQuery<Driver[]>({
    queryKey: ['trashed_drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row): Driver => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        active: row.active,
        createdAt: row.created_at,
        createdBy: row.created_by,
        deletedAt: row.deleted_at,
      }));
    },
  });
}

export function useRestoreDrivers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('drivers')
        .update({ deleted_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['trashed_drivers'] });
    },
  });
}

export function usePurgeDrivers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('drivers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trashed_drivers'] });
    },
  });
}
