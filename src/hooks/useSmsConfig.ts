import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiClient';

export interface SmsConfigResponse {
  sender: string;
  isAlphanumeric: boolean;
  inboundNumber: string;
  overrideActive: boolean;
}

/**
 * V4 Phase 7.2 — read the active SMS sender (and inbound number) from
 * the server. Read-only; just powers the Settings indicator that tells
 * Yamin whether outbound is currently going from "REBEL" or the AU
 * phone number.
 */
export function useSmsConfig() {
  return useQuery<SmsConfigResponse | null>({
    queryKey: ['sms_config'],
    // Sender config rarely changes — cache for a minute, refetch on focus
    // so a Vercel env-var flip is reflected when Yamin returns to the tab.
    staleTime: 60_000,
    queryFn: async () => {
      const res = await apiFetch('/api/sms/config', { method: 'GET' });
      if (!res.ok) {
        // 404 in plain Vite (no /api), 401 if logged out — surface as
        // "not configured" rather than throwing.
        return null;
      }
      try {
        return (await res.json()) as SmsConfigResponse;
      } catch {
        return null;
      }
    },
  });
}
