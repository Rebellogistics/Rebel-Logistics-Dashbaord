// POST /api/auth/google/exchange
// Body: { code: string, redirectUri: string }
//
// Server-only OAuth code exchange. Reads CLIENT_SECRET from env (never sent
// to the browser), trades the authorization code for refresh + access tokens
// at Google, then upserts the result into `integrations`. Returns only the
// connected account's email — the refresh token is never serialised back to
// the client.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeAuthCode, fetchGoogleUserInfo } from '../../_lib/google-oauth';
import { supabaseAdmin, getUserFromAuthHeader } from '../../_lib/supabase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { code, redirectUri } = (req.body ?? {}) as { code?: string; redirectUri?: string };
  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  try {
    const tokens = await exchangeAuthCode(code, redirectUri);
    if (!tokens.refresh_token) {
      // Google only issues a refresh_token on first consent. If the user
      // already authorised before, we asked for prompt=consent — but if
      // something else suppressed it, surface the issue.
      return res.status(400).json({
        error: 'No refresh token returned. Disconnect at https://myaccount.google.com/permissions and reconnect.',
      });
    }

    const userInfo = await fetchGoogleUserInfo(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = supabaseAdmin();
    const { error } = await admin.from('integrations').upsert(
      {
        user_id: user.id,
        provider: 'google_calendar',
        account_label: userInfo.email,
        refresh_token: tokens.refresh_token,
        access_token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        revoked_at: null,
        metadata: {
          calendar_id: 'primary',
          access_token: tokens.access_token,
          scope: tokens.scope,
        },
      },
      { onConflict: 'user_id,provider' },
    );

    if (error) {
      return res.status(500).json({ error: `Supabase upsert failed: ${error.message}` });
    }

    return res.status(200).json({ email: userInfo.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
