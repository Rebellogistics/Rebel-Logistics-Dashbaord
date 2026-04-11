import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../lib/types';

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

export function useTeam() {
  return useQuery<Profile[]>({
    queryKey: ['team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return toCamelCase<Profile[]>(data || []);
    },
  });
}

interface CreateDriverParams {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  assignedTruck?: string;
}

// Creates a driver account by signing up via a temporary Supabase client
// (so the owner's session stays intact), then updates the auto-created
// profile row via the owner's main client to set role='driver' and the
// rest of the driver fields.
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateDriverParams) => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        throw new Error('Supabase environment variables missing');
      }

      // Isolated client so signUp doesn't hijack the owner's session.
      const tempClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'temp-driver-signup',
        },
      });

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: { full_name: params.fullName.trim() },
        },
      });

      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        throw new Error('Signup returned no user id — check email confirmation settings');
      }

      // Promote the pending profile to driver using the owner's main client.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'driver' as any,
          full_name: params.fullName.trim(),
          phone: params.phone?.trim() || null,
          assigned_truck: params.assignedTruck?.trim() || null,
          active: true,
        })
        .eq('user_id', newUserId);

      if (updateError) {
        throw new Error(
          `Account created but profile update failed: ${updateError.message}. ` +
          `You may need to set the driver role manually in Supabase.`
        );
      }

      try {
        await tempClient.auth.signOut();
      } catch {
        // ignore — temp session isn't persisted anyway
      }

      return { userId: newUserId, email: params.email };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}

interface UpdateProfileParams {
  userId: string;
  role?: UserRole;
  fullName?: string;
  phone?: string;
  assignedTruck?: string | null;
  active?: boolean;
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: UpdateProfileParams) => {
      const payload: Record<string, unknown> = {};
      if (updates.role !== undefined) payload.role = updates.role;
      if (updates.fullName !== undefined) payload.full_name = updates.fullName.trim();
      if (updates.phone !== undefined) payload.phone = updates.phone?.trim() || null;
      if (updates.assignedTruck !== undefined)
        payload.assigned_truck = updates.assignedTruck?.trim() || null;
      if (updates.active !== undefined) payload.active = updates.active;

      const { data, error } = await supabase
        .from('profiles')
        .update(payload as any)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase<Profile>(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
}
