// POST /api/auth/google/disconnect
// Revokes the user's Google refresh token at Google and clears the row in
// `integrations`. Idempotent.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { revokeToken } from '../../_lib/google-oauth';
import { supabaseAdmin, getUserFromAuthHeader } from '../../_lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('integrations')
    .select('refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  if (data?.refresh_token) {
    await revokeToken(data.refresh_token);
  }

  const { error: updateErr } = await admin
    .from('integrations')
    .update({
      refresh_token: null,
      access_token_expires_at: null,
      revoked_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar');

  if (updateErr) return res.status(500).json({ error: updateErr.message });
  return res.status(200).json({ ok: true });
}
