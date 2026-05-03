// POST /api/trucks/reset-password
// Body: { truckId: string, password?: string }
//
// Owner-only. Resets the truck's tablet password — random alphanumeric
// if `password` is omitted, otherwise the supplied one. Updates Supabase
// auth's stored hash (admin API) AND the plaintext mirror in
// `truck_credentials` so the owner can reveal it later.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin.js';

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generatePassword(): string {
  const bytes = new Uint8Array(14);
  // Node 18+ exposes globalThis.crypto.
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHANUMERIC[b % ALPHANUMERIC.length];
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const admin = supabaseAdmin();

  // Owner-only — the dashboard owner is the only one allowed to manage
  // truck credentials. Drivers / trucks must not hit this.
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('role, active')
    .eq('user_id', user.id)
    .single();
  if (profileErr || !profile || !profile.active || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Owner access required' });
  }

  const { truckId, password } = (req.body ?? {}) as { truckId?: string; password?: string };
  if (!truckId) return res.status(400).json({ error: 'truckId is required' });

  const newPassword = (password ?? '').trim() || generatePassword();
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Resolve the truck's auth user id.
  const { data: truck, error: truckErr } = await admin
    .from('trucks')
    .select('id, name, user_id')
    .eq('id', truckId)
    .single();
  if (truckErr || !truck) return res.status(404).json({ error: 'Truck not found' });
  if (!truck.user_id) {
    return res.status(409).json({
      error: 'Truck has no login yet. Generate one first from Settings → Truck logins.',
    });
  }

  // Update Supabase auth's stored password hash.
  const { error: authErr } = await admin.auth.admin.updateUserById(truck.user_id, {
    password: newPassword,
  });
  if (authErr) {
    return res.status(500).json({ error: `Auth update failed: ${authErr.message}` });
  }

  // Mirror plaintext into truck_credentials so the owner can reveal later.
  const { error: credErr } = await admin
    .from('truck_credentials')
    .upsert(
      { truck_id: truckId, password: newPassword, updated_at: new Date().toISOString() },
      { onConflict: 'truck_id' },
    );
  if (credErr) {
    // Auth was updated but the mirror failed — surface so the owner can retry
    // before the new password is lost. They can re-reset to recover.
    return res.status(500).json({
      error: `Auth password updated but credential mirror failed: ${credErr.message}. Retry to re-sync.`,
    });
  }

  return res.status(200).json({ password: newPassword, truckName: truck.name });
}
