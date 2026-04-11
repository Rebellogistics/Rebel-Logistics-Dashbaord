import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Truck } from '../lib/types';

function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) return obj.map((v) => toCamelCase(v)) as any;
  if (obj !== null && obj !== undefined && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: ['trucks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return toCamelCase<Truck[]>(data || []);
    },
  });
}

interface CreateTruckParams {
  name: string;
  description?: string;
  active?: boolean;
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateTruckParams) => {
      const { data, error } = await supabase
        .from('trucks')
        .insert([
          {
            name: params.name.trim(),
            description: params.description?.trim() || null,
            active: params.active ?? true,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Truck>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });
}

interface UpdateTruckParams {
  id: string;
  name?: string;
  description?: string | null;
  active?: boolean;
}

export function useUpdateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTruckParams) => {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.description !== undefined)
        payload.description = updates.description === null ? null : updates.description.trim() || null;
      if (updates.active !== undefined) payload.active = updates.active;

      const { data, error } = await supabase
        .from('trucks')
        .update(payload as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Truck>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trucks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });
}
