// V4 Phase 5 — tasks hooks. CRUD + mark-done for the per-truck-day
// checklist primitive. RLS handles role-scoping (owner CRUD, truck +
// driver SELECT/UPDATE on their own truck), so the hooks here are
// straight Supabase calls with React Query cache invalidation.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Task, TaskKind } from '../lib/types';
import { useEffect } from 'react';

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

const QUERY_KEY = ['tasks'] as const;

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true })
        .order('sequence', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return toCamelCase<Task[]>(data ?? []);
    },
  });
}

/**
 * Live updates on the tasks table — mounted in OwnerShell + DriverShell so
 * a task added or marked done from either side propagates within ~1s.
 */
export function useRealtimeTasks() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    const channel = supabase
      .channel('rebel-realtime-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        if (cancelled) return;
        qc.invalidateQueries({ queryKey: QUERY_KEY });
      })
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

export interface CreateTaskInput {
  truckName: string;
  scheduledDate: string;
  kind: TaskKind;
  title: string;
  description?: string;
  sequence?: number;
  /** V5 P6: optional driver pre-assignment. Pass both id + name; the
   *  name is denormalised so deletes don't blank the chip. */
  assignedToDriverId?: string | null;
  assignedToDriverName?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? null;
      // Default sequence: append to the end of the truck-day list.
      let sequence = input.sequence;
      if (sequence === undefined) {
        const { data: existing } = await supabase
          .from('tasks')
          .select('sequence')
          .eq('truck_name', input.truckName)
          .eq('scheduled_date', input.scheduledDate)
          .is('deleted_at', null);
        const max = (existing ?? []).reduce(
          (acc: number, row: { sequence: number | null }) =>
            row.sequence != null && row.sequence > acc ? row.sequence : acc,
          -1,
        );
        sequence = max + 1;
      }
      const payload = {
        truck_name: input.truckName,
        scheduled_date: input.scheduledDate,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        sequence,
        created_by: userId,
        assigned_to_driver_id: input.assignedToDriverId ?? null,
        assigned_to_driver_name: input.assignedToDriverName ?? null,
      };
      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Task>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (patch.title !== undefined) updates.title = patch.title;
      if (patch.description !== undefined) updates.description = patch.description;
      if (patch.kind !== undefined) updates.kind = patch.kind;
      if (patch.sequence !== undefined) updates.sequence = patch.sequence;
      if (patch.scheduledDate !== undefined) updates.scheduled_date = patch.scheduledDate;
      if (patch.truckName !== undefined) updates.truck_name = patch.truckName;
      if (patch.assignedToDriverId !== undefined) updates.assigned_to_driver_id = patch.assignedToDriverId;
      if (patch.assignedToDriverName !== undefined) updates.assigned_to_driver_name = patch.assignedToDriverName;
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Task>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Driver-side "tap to complete" mutation. Stamps both the driver id and
 * the driver name (frozen — V3 Phase 3 pattern) plus the timestamp. The
 * caller passes the driver chosen via the WhoDriving picker.
 */
export interface MarkTaskDoneInput {
  id: string;
  driverId?: string | null;
  driverName?: string | null;
}

export function useMarkTaskDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, driverId, driverName }: MarkTaskDoneInput) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tasks')
        .update({
          completed_at: now,
          completed_by_driver_id: driverId ?? null,
          completed_by_driver_name: driverName ?? null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/** Re-undo a completion (owner-side, in case Yamin needs to flip a task
 *  back to open after a driver mis-tap). */
export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          completed_at: null,
          completed_by_driver_id: null,
          completed_by_driver_name: null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
