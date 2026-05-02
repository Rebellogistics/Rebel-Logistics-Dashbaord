import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const TRUCK_LOGIN_DOMAIN = 'rebellogistics.com.au';

/**
 * Build a synthetic email for a truck account, e.g.
 *   "XV 98 GC"  →  "truck-xv98gc@rebellogistics.com.au"
 *
 * Slug is alphanumeric only — no hyphens, no dots, no spaces. Yamin asked
 * for "no special characters" so spaces / non-alphanumerics are stripped
 * entirely rather than collapsed to hyphens. The fixed `truck-` prefix
 * keeps a single separator between the role and the rego identifier.
 *
 * Yamin owns rebellogistics.com.au (confirmed May 2). The email isn't
 * expected to receive mail; it's just an identity for Supabase auth. If
 * email confirmation is on in the project, the link won't be deliverable —
 * turn confirmation off or configure a catch-all on the domain.
 */
export function truckLoginEmail(truckName: string): string {
  const slug = truckName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40) || 'unknown';
  return `truck-${slug}@${TRUCK_LOGIN_DOMAIN}`;
}

/**
 * Generate a memorable-ish 14-char password. Truck logins are typed once on
 * a tablet and stored in the device keychain, so memorability isn't critical;
 * uniqueness and entropy are.
 */
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

interface CreateTruckLoginParams {
  truckId: string;
  truckName: string;
}

interface CreateTruckLoginResult {
  email: string;
  password: string;
  userId: string;
}

/**
 * Phase 11B: provision a per-truck tablet login.
 *
 *   1. signUp via a temp client (so the owner's session stays intact)
 *   2. update the auto-created profile row to role='truck'
 *   3. link the truck row via trucks.user_id = newUserId
 *
 * Returns the credentials so the caller can show them once.
 */
export function useCreateTruckLogin() {
  const qc = useQueryClient();
  return useMutation<CreateTruckLoginResult, Error, CreateTruckLoginParams>({
    mutationFn: async ({ truckId, truckName }) => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !anonKey) throw new Error('Supabase environment variables missing');

      const email = truckLoginEmail(truckName);
      const password = generatePassword();

      const tempClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'temp-truck-signup',
        },
      });

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email,
        password,
        options: { data: { truck_id: truckId, truck_name: truckName } },
      });
      if (signUpError) throw signUpError;
      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        throw new Error(
          'Signup returned no user id — check Supabase email-confirmation settings or domain catch-all',
        );
      }

      // Promote the auto-created profile to role='truck'. The profiles table
      // has an INSERT trigger that creates a 'pending' row on auth.users
      // creation; we update it via the owner's main client.
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          role: 'truck' as never,
          full_name: truckName,
          assigned_truck: truckName,
          active: true,
        } as never)
        .eq('user_id', newUserId);
      if (profileErr) {
        throw new Error(
          `Account created but profile update failed: ${profileErr.message}. ` +
            `Manually set the role to 'truck' in Supabase.`,
        );
      }

      // Link the truck → auth.users row.
      const { error: linkErr } = await supabase
        .from('trucks')
        .update({ user_id: newUserId } as never)
        .eq('id', truckId);
      if (linkErr) {
        throw new Error(
          `Login created but linking to truck failed: ${linkErr.message}. ` +
            `Manually set trucks.user_id = ${newUserId} in Supabase.`,
        );
      }

      try {
        await tempClient.auth.signOut();
      } catch {
        /* temp session not persisted */
      }

      return { email, password, userId: newUserId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trucks'] });
      qc.invalidateQueries({ queryKey: ['team'] });
    },
  });
}
