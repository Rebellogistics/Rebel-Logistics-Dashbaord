import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { useAuth } from './useAuth';

function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v)) as any;
  }
  if (obj !== null && obj !== undefined && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export function useProfile() {
  const { user, isLoading: authLoading } = useAuth();

  return useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    enabled: !authLoading && !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? toCamelCase<Profile>(data) : null;
    },
  });
}
