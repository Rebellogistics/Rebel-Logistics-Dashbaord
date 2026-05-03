// POST /api/auth/google/exchange
// Body: { code: string, redirectUri: string }
//
// Server-only OAuth code exchange. Reads CLIENT_SECRET from env (never sent
// to the browser), trades the authorization code for refresh + access tokens
// at Google, then upserts the result into `integrations`. Returns only the
// connected account's email — the refresh token is never serialised back to
// the client.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeAuthCode, fetchGoogleUserInfo } from '../../_lib/google-oauth.js';
import { supabaseAdmin, getUserFromAuthHeader } from '../../_lib/supabase-admin.js';

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

    // Phase 19: with `calendar.app.created` scope, we can only operate on
    // calendars the app itself created. So on first connect we mint a
    // dedicated "Rebel Logistics" secondary calendar and persist its id.
    // On reconnect, we reuse the previously-created calendar id (the
    // metadata survives across reconnects via the upsert below).
    const { data: existing } = await admin
      .from('integrations')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar')
      .maybeSingle();
    const priorCalendarId =
      (existing?.metadata as { calendar_id?: string } | null)?.calendar_id;

    let calendarId: string;
    if (priorCalendarId && priorCalendarId !== 'primary') {
      // Reuse — verify it still exists by GET'ing it. If it 404s (user
      // deleted the calendar in Google Calendar UI), fall through to create.
      const probe = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(priorCalendarId)}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      calendarId = probe.ok ? priorCalendarId : await createRebelCalendar(tokens.access_token);
    } else {
      calendarId = await createRebelCalendar(tokens.access_token);
    }

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
          calendar_id: calendarId,
          access_token: tokens.access_token,
          scope: tokens.scope,
        },
      },
      { onConflict: 'user_id,provider' },
    );

    if (error) {
      return res.status(500).json({ error: `Supabase upsert failed: ${error.message}` });
    }

    return res.status(200).json({ email: userInfo.email, calendarId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

/**
 * Create the dedicated "Rebel Logistics" secondary calendar on the user's
 * Google account. With the `calendar.app.created` scope, this is the only
 * calendar the app can read or write — Yamin's primary calendar stays
 * private from us.
 */
async function createRebelCalendar(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'Rebel Logistics',
      description:
        'Auto-created by the Rebel Logistics dashboard. Job assignments to a truck appear here as events. Disconnect from Settings → Integrations to stop syncing.',
      timeZone: 'Australia/Melbourne',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Could not create the Rebel Logistics calendar: ${res.status} ${text}`);
  }
  const cal = (await res.json()) as { id: string };
  return cal.id;
}
