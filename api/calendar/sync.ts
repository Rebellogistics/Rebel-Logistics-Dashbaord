// POST /api/calendar/sync
// Body: { jobId: string }
//
// Idempotent push of one job's state into the connected user's Google
// Calendar. Decides create / update / delete based on the job:
//
//   assignedTruck && status NOT in (Completed, Invoiced, Declined)
//        + no event id  → POST  events           (then save id)
//        + has event id → PATCH events/{id}
//
//   no assignedTruck OR status in (Declined, Quote)
//        + has event id → DELETE events/{id}     (then clear id)
//        + no event id  → noop
//
// All Google API calls live behind a fresh access token derived from the
// user's stored refresh_token. The refresh token never leaves the server.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refreshAccessToken } from '../_lib/google-oauth';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

// Local copy of the calendar-event payload shape so this file stays
// dependency-free of /src.
interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  colorId: string;
  start: { date: string };
  end: { date: string };
}

const TYPE_COLOR: Record<string, string> = {
  'White Glove': '9',
  Standard: '10',
  'House Move': '6',
};

function buildPayload(job: any): CalendarEventPayload {
  const date = job.date || new Date().toISOString().slice(0, 10);
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const endDate = next.toISOString().slice(0, 10);

  const summary = `🚚 ${job.customer_name ?? 'Customer'} · ${job.type ?? 'Standard'}${job.assigned_truck ? ' · ' + job.assigned_truck : ''}`;

  const lines: string[] = [];
  if (job.pickup_address?.trim()) lines.push(`Pickup: ${job.pickup_address.trim()}`);
  if (job.delivery_address?.trim()) lines.push(`Delivery: ${job.delivery_address.trim()}`);
  if (job.customer_phone?.trim()) lines.push(`Phone: ${job.customer_phone.trim()}`);
  const total = (Number(job.fee) || 0) + (Number(job.fuel_levy) || 0);
  if (total > 0) lines.push(`Fee: $${total.toFixed(2)}`);
  if (job.notes?.trim()) {
    lines.push('');
    lines.push(job.notes.trim());
  }
  lines.push('');
  lines.push(`Rebel Logistics · ${job.quote_number ?? job.id}`);

  return {
    summary,
    description: lines.join('\n'),
    location: job.delivery_address?.trim() || job.pickup_address?.trim() || '',
    colorId: TYPE_COLOR[job.type] ?? '9',
    start: { date },
    end: { date: endDate },
  };
}

const SYNC_STATUSES = new Set(['Accepted', 'Scheduled', 'Notified', 'In Delivery']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { jobId } = (req.body ?? {}) as { jobId?: string };
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });

  const admin = supabaseAdmin();

  // Fetch the integration row. If the user hasn't connected, treat as a noop.
  const { data: integration, error: intErr } = await admin
    .from('integrations')
    .select('refresh_token, access_token_expires_at, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .maybeSingle();

  if (intErr) return res.status(500).json({ error: intErr.message });
  if (!integration?.refresh_token) {
    return res.status(200).json({ ok: true, skipped: 'not_connected' });
  }

  // Get an access token: reuse the cached one if not yet expired, otherwise refresh.
  const cachedAccessToken = (integration.metadata as any)?.access_token as string | undefined;
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;
  // Refresh 60s early to avoid races on long requests.
  const isFresh = !!cachedAccessToken && expiresAt - 60_000 > Date.now();

  let accessToken = cachedAccessToken ?? '';
  if (!isFresh) {
    try {
      const tok = await refreshAccessToken(integration.refresh_token);
      accessToken = tok.access_token;
      const newExpires = new Date(Date.now() + tok.expires_in * 1000).toISOString();
      const meta = { ...(integration.metadata as object), access_token: tok.access_token };
      await admin
        .from('integrations')
        .update({ access_token_expires_at: newExpires, metadata: meta as any })
        .eq('user_id', user.id)
        .eq('provider', 'google_calendar');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token refresh failed';
      return res.status(502).json({ error: message });
    }
  }

  // Fetch the job
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (jobErr) return res.status(500).json({ error: jobErr.message });
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const calendarId = (integration.metadata as any)?.calendar_id ?? 'primary';
  const eventId = job.google_calendar_event_id as string | null;
  const shouldSync = !!job.assigned_truck && SYNC_STATUSES.has(job.status);

  try {
    if (shouldSync) {
      const payload = buildPayload(job);
      if (eventId) {
        const r = await fetch(
          `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          },
        );
        if (r.status === 404) {
          // Event was deleted server-side — re-create.
          await createEvent(admin, accessToken, calendarId, jobId, payload);
        } else if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`Calendar PATCH failed (${r.status}): ${text}`);
        }
        return res.status(200).json({ ok: true, action: 'updated' });
      } else {
        const newId = await createEvent(admin, accessToken, calendarId, jobId, payload);
        return res.status(200).json({ ok: true, action: 'created', eventId: newId });
      }
    } else {
      if (!eventId) {
        return res.status(200).json({ ok: true, action: 'noop' });
      }
      const r = await fetch(
        `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!r.ok && r.status !== 404 && r.status !== 410) {
        const text = await r.text().catch(() => '');
        throw new Error(`Calendar DELETE failed (${r.status}): ${text}`);
      }
      await admin
        .from('jobs')
        .update({ google_calendar_event_id: null })
        .eq('id', jobId);
      return res.status(200).json({ ok: true, action: 'deleted' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed';
    return res.status(502).json({ error: message });
  }
}

async function createEvent(
  admin: ReturnType<typeof supabaseAdmin>,
  accessToken: string,
  calendarId: string,
  jobId: string,
  payload: CalendarEventPayload,
): Promise<string> {
  const r = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Calendar POST failed (${r.status}): ${text}`);
  }
  const event = (await r.json()) as { id: string };
  await admin
    .from('jobs')
    .update({ google_calendar_event_id: event.id })
    .eq('id', jobId);
  // Bump the integration's last_sync_at so the UI shows freshness.
  await admin
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('provider', 'google_calendar');
  return event.id;
}
