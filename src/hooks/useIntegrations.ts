import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { apiPostJson } from '../lib/apiClient';

export interface Integration {
  id: string;
  userId: string;
  provider: string;
  accountLabel: string | null;
  connectedAt: string;
  revokedAt: string | null;
  lastSyncAt: string | null;
  metadata: Record<string, unknown>;
}

function toCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((v) => toCamelCase(v)) as T;
  if (typeof obj === 'object' && obj !== null && (obj as object).constructor === Object) {
    return Object.keys(obj as object).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
      return result;
    }, {} as Record<string, unknown>) as T;
  }
  return obj as T;
}

// The `integrations` table is created by Phase 10 migration but may not be in
// the generated Supabase types yet. We cast through `any` to avoid TS errors
// until `supabase gen types` is re-run after the migration lands.
const integrationsTable = () => (supabase as any).from('integrations');

export function useIntegrations() {
  return useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await integrationsTable()
        .select('id, user_id, provider, account_label, connected_at, revoked_at, last_sync_at, metadata')
        .is('revoked_at', null)
        .order('connected_at', { ascending: false });

      if (error) throw error;
      return toCamelCase<Integration[]>(data ?? []);
    },
  });
}

export function useIntegration(provider: string) {
  const { data: all = [], ...rest } = useIntegrations();
  const match = all.find((i) => i.provider === provider) ?? null;
  return { data: match, ...rest };
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Look up the provider so we know which server endpoint to call.
      const { data, error: lookupErr } = await integrationsTable()
        .select('provider')
        .eq('id', id)
        .maybeSingle();
      if (lookupErr) throw lookupErr;

      if (data?.provider === 'google_calendar') {
        // Server-side revoke: also calls Google's revoke endpoint so the
        // refresh token is invalidated remotely, not just in our DB.
        await apiPostJson('/api/auth/google/disconnect', {});
      } else {
        const { error } = await integrationsTable()
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      accountLabel,
      metadata,
    }: {
      provider: string;
      accountLabel: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await integrationsTable()
        .upsert(
          {
            user_id: userId,
            provider,
            account_label: accountLabel,
            connected_at: new Date().toISOString(),
            revoked_at: null,
            metadata: metadata ?? {},
          },
          { onConflict: 'user_id,provider' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}
