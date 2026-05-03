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

    // Phase 20: auto-backfill. Push every currently-syncable job (truck
    // assigned, status in Accepted/Scheduled/Notified/In Delivery, not
    // soft-deleted) to the new calendar in one shot. Replaces the manual
    // "Sync open jobs (N)" button so Yamin gets a populated calendar
    // without an extra click. Failures here are best-effort — the connect
    // succeeds either way.
    const backfilledCount = await backfillOpenJobs({
      admin,
      accessToken: tokens.access_token,
      calendarId,
    }).catch((err) => {
      console.warn('Auto-backfill failed', err);
      return 0;
    });

    return res.status(200).json({
      email: userInfo.email,
      calendarId,
      backfilledCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}

const SYNCABLE_STATUSES = new Set(['Accepted', 'Scheduled', 'Notified', 'In Delivery']);
const TYPE_COLOR: Record<string, string> = {
  'White Glove': '9',
  Standard: '10',
  'House Move': '6',
};

/**
 * Auto-backfill: push every currently-syncable job to the freshly-created
 * Rebel Logistics calendar. Best-effort per job — a single Google 4xx
 * doesn't abort the loop, and the integration row is already saved by
 * the time this runs so the user is "connected" even if backfill 0/N.
 */
async function backfillOpenJobs({
  admin,
  accessToken,
  calendarId,
}: {
  admin: ReturnType<typeof supabaseAdmin>;
  accessToken: string;
  calendarId: string;
}): Promise<number> {
  const { data: jobs, error } = await admin
    .from('jobs')
    .select('*')
    .is('deleted_at', null)
    .not('assigned_truck', 'is', null)
    .in('status', Array.from(SYNCABLE_STATUSES));
  if (error || !jobs) return 0;

  let synced = 0;
  for (const job of jobs) {
    if (job.google_calendar_event_id) continue; // already on the calendar
    const date = job.date || new Date().toISOString().slice(0, 10);
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const endDate = next.toISOString().slice(0, 10);

    const summary = `🚚 ${job.customer_company_name ?? job.customer_name ?? 'Customer'} · ${job.type ?? 'Standard'}${job.assigned_truck ? ' · ' + job.assigned_truck : ''}`;
    const lines: string[] = [];
    if (job.customer_company_name && job.customer_name && job.customer_company_name !== job.customer_name) {
      lines.push(`Contact: ${job.customer_name}`);
    }
    if (job.pickup_address?.trim()) lines.push(`Pickup: ${job.pickup_address.trim()}`);
    if (job.delivery_address?.trim()) lines.push(`Delivery: ${job.delivery_address.trim()}`);
    if (job.customer_phone?.trim()) lines.push(`Phone: ${job.customer_phone.trim()}`);
    const total = (Number(job.fee) || 0) + (Number(job.fuel_levy) || 0) + (Number(job.gst_amount) || 0);
    if (total > 0) lines.push(`Total inc-GST: $${total.toFixed(2)}`);
    if (job.notes?.trim()) {
      lines.push('');
      lines.push(job.notes.trim());
    }
    lines.push('');
    lines.push(`Rebel Logistics · ${job.quote_number ?? job.id}`);

    try {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary,
            description: lines.join('\n'),
            location: job.delivery_address?.trim() || job.pickup_address?.trim() || '',
            colorId: TYPE_COLOR[job.type as string] ?? '9',
            start: { date },
            end: { date: endDate },
          }),
        },
      );
      if (!r.ok) continue;
      const event = (await r.json()) as { id: string };
      await admin
        .from('jobs')
        .update({ google_calendar_event_id: event.id })
        .eq('id', job.id);
      synced++;
    } catch {
      // Skip and continue — backfill is best-effort.
    }
  }

  if (synced > 0) {
    await admin
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('provider', 'google_calendar');
  }
  return synced;
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
