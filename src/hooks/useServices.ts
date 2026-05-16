// V5 Phase 10 — service catalog hooks.
//
// CRUD over public.services. Builtins (Standard / White Glove / House
// Move) are seeded with builtin=true; the UI guards against renaming
// or deleting them since the pricing calculator + JobType union still
// hardcode their names.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/lib/types';

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

const QUERY_KEY = ['services'] as const;

export function useServices(opts?: { activeOnly?: boolean }) {
  const activeOnly = !!opts?.activeOnly;
  return useQuery<Service[]>({
    queryKey: ['services', { activeOnly }],
    queryFn: async () => {
      let q = supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (activeOnly) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return toCamelCase<Service[]>(data ?? []);
    },
  });
}

export interface CreateServiceInput {
  name: string;
  defaultRate?: number | null;
  defaultDurationMinutes?: number | null;
  description?: string | null;
  sortOrder?: number;
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const payload = {
        name: input.name.trim(),
        default_rate: input.defaultRate ?? null,
        default_duration_minutes: input.defaultDurationMinutes ?? null,
        description: input.description ?? null,
        sort_order: input.sortOrder ?? 100,
        builtin: false,
      };
      const { data, error } = await supabase
        .from('services')
        .insert([payload as never])
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Service>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Service> & { id: string }) => {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.name !== undefined) updates.name = patch.name;
      if (patch.defaultRate !== undefined) updates.default_rate = patch.defaultRate;
      if (patch.defaultDurationMinutes !== undefined)
        updates.default_duration_minutes = patch.defaultDurationMinutes;
      if (patch.description !== undefined) updates.description = patch.description;
      if (patch.active !== undefined) updates.active = patch.active;
      if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;
      const { data, error } = await supabase
        .from('services')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Service>(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Hard delete — services without history are cheap. Builtins are
      // guarded in the UI so we never reach this for them.
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
