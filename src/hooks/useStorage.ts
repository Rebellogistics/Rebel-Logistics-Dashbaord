// V5 Phase 5 — storage records hooks. CRUD + realtime for the
// owner-side storage tab. RLS handles role-scoping (owner-only) so the
// hooks here are straight Supabase calls with React Query cache
// invalidation, mirroring useTasks.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { StorageRecord, StorageStatus } from '../lib/types';

function toCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((v) => toCamelCase(v)) as T;
  if (typeof obj === 'object' && (obj as object).constructor === Object) {
    return Object.keys(obj as object).reduce((result, key) => {
      const camel = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camel] = toCamelCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj as T;
}

const QUERY_KEY = ['storage_records'] as const;

export function useStorageRecords() {
  return useQuery<StorageRecord[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_records')
        .select('*')
        .is('deleted_at', null)
        .order('in_date', { ascending: false });
      if (error) throw error;
      return toCamelCase<StorageRecord[]>(data ?? []);
    },
  });
}

export function useRealtimeStorage() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    const channel = supabase
      .channel('rebel-realtime-storage')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'storage_records' },
        () => {
          if (cancelled) return;
          qc.invalidateQueries({ queryKey: QUERY_KEY });
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

export interface CreateStorageInput {
  customerId?: string | null;
  customerName: string;
  itemsDescription: string;
  inDate: string;
  plannedOutDate?: string | null;
  actualOutDate?: string | null;
  monthlyRate?: number | null;
  notes?: string | null;
}

export function useCreateStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStorageInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? null;
      const payload = {
        customer_id: input.customerId ?? null,
        customer_name: input.customerName,
        items_description: input.itemsDescription,
        in_date: input.inDate,
        planned_out_date: input.plannedOutDate ?? null,
        actual_out_date: input.actualOutDate ?? null,
        monthly_rate: input.monthlyRate ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      };
      const { data, error } = await supabase
        .from('storage_records')
        .insert([payload as never])
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<StorageRecord>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<StorageRecord> & { id: string }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.customerId !== undefined) updates.customer_id = patch.customerId;
      if (patch.customerName !== undefined) updates.customer_name = patch.customerName;
      if (patch.itemsDescription !== undefined) updates.items_description = patch.itemsDescription;
      if (patch.inDate !== undefined) updates.in_date = patch.inDate;
      if (patch.plannedOutDate !== undefined) updates.planned_out_date = patch.plannedOutDate;
      if (patch.actualOutDate !== undefined) updates.actual_out_date = patch.actualOutDate;
      if (patch.monthlyRate !== undefined) updates.monthly_rate = patch.monthlyRate;
      if (patch.notes !== undefined) updates.notes = patch.notes;
      const { data, error } = await supabase
        .from('storage_records')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<StorageRecord>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('storage_records')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Compute the rolling status from the date columns. Pure function so the
 * Storage view, customer history, and dashboard badges all agree.
 */
export function computeStorageStatus(
  record: Pick<StorageRecord, 'plannedOutDate' | 'actualOutDate'>,
  today: Date = new Date(),
): StorageStatus {
  if (record.actualOutDate) return 'released';
  if (!record.plannedOutDate) return 'active';
  // Compare as YYYY-MM-DD strings to dodge timezone issues.
  const todayStr = today.toISOString().slice(0, 10);
  return record.plannedOutDate < todayStr ? 'overdue' : 'active';
}

/** Days the record has been in storage. Released records: in→out span;
 *  active/overdue: in→today. */
export function daysInStorage(
  record: Pick<StorageRecord, 'inDate' | 'actualOutDate'>,
  today: Date = new Date(),
): number {
  const start = new Date(record.inDate + 'T00:00:00');
  const end = record.actualOutDate
    ? new Date(record.actualOutDate + 'T00:00:00')
    : today;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
