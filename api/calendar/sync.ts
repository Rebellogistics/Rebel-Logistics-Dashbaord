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
import { refreshAccessToken } from '../_lib/google-oauth.js';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin.js';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

// V4 4.2: synthetic time slots so events render as discrete blocks rather
// than stacking as a list of all-day items. The dashboard remains the
// source of truth for run order; calendar times are visualisation only.
const TIME_ZONE = 'Australia/Melbourne';
const RUN_START_HOUR = 8; // 08:00am
const SLOT_MINUTES = 30; // each stop occupies 30min
const DEFAULT_DURATION_MINUTES = 30;

// V4 4.6: deep-link back to Truck Runs filtered to the job's day. Yamin
// taps the calendar event on his phone → lands on the right day in the
// dashboard. Computed per-request so we pick up the actual host/origin
// that hit the sync endpoint.
function buildDeepLink(host: string, jobDate: string, truck: string | null): string {
  const params = new URLSearchParams({ date: jobDate });
  if (truck) params.set('truck', truck);
  return `https://${host}/?tab=Truck%20Runs&${params.toString()}`;
}

interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  colorId: string;
  // V4 4.2: timed events when we have a sequence; falls back to all-day
  // for legacy jobs that never went through the V4 1.1 reorder.
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
}

const TYPE_COLOR: Record<string, string> = {
  'White Glove': '9',
  Standard: '10',
  'House Move': '6',
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Compute the synthetic timeslot for a job. Uses the V4 1.1 sequence
// when available so the calendar order matches the run order.
function buildTimeSlot(jobDate: string, sequenceIndex: number | null) {
  if (sequenceIndex == null || sequenceIndex < 0) return null;
  const totalStartMinutes = RUN_START_HOUR * 60 + sequenceIndex * SLOT_MINUTES;
  const totalEndMinutes = totalStartMinutes + DEFAULT_DURATION_MINUTES;
  // Cap at 23:59 so an absurd run (>30 stops) doesn't overflow midnight.
  const startMinutes = Math.min(totalStartMinutes, 23 * 60 + 59 - DEFAULT_DURATION_MINUTES);
  const endMinutes = Math.min(totalEndMinutes, 23 * 60 + 59);
  const startHH = Math.floor(startMinutes / 60);
  const startMM = startMinutes % 60;
  const endHH = Math.floor(endMinutes / 60);
  const endMM = endMinutes % 60;
  return {
    startDateTime: `${jobDate}T${pad2(startHH)}:${pad2(startMM)}:00`,
    endDateTime: `${jobDate}T${pad2(endHH)}:${pad2(endMM)}:00`,
  };
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function buildPayload(job: any, deepLinkHost: string | null): CalendarEventPayload {
  const date = job.date || new Date().toISOString().slice(0, 10);

  // V4 4.4: lead with company name (Yamin's "the company name is what will
  // show up on there" rule from the May 4 call), fall back to customer
  // name. Mirrors src/lib/jobDisplay.ts customerDisplay() logic, kept
  // duplicated here so this file stays dependency-free of /src.
  const company = (job.customer_company_name ?? '').trim();
  const contact = (job.customer_name ?? '').trim();
  const primaryName = company || contact || 'Customer';

  const summary = `🚚 ${primaryName} · ${job.type ?? 'Standard'}${job.assigned_truck ? ' · ' + job.assigned_truck : ''}`;

  const lines: string[] = [];

  // V4 4.4: structured layout. Each labelled line is its own block.
  if (company && contact && contact !== company) {
    lines.push(`Contact: ${contact}`);
  }
  if (job.customer_phone?.trim()) {
    lines.push(`Phone: ${job.customer_phone.trim()}`);
  }

  // V4 4.3: pickup + delivery rendered as Maps URLs so iOS Calendar treats
  // them as tappable links. The plain address stays in the location field
  // (Google Calendar uses that for the inline map preview).
  const pickup = job.pickup_address?.trim();
  const delivery = job.delivery_address?.trim();
  if (pickup) {
    lines.push(`Pickup: ${pickup}`);
    lines.push(`  ${mapsUrl(pickup)}`);
  }
  if (delivery) {
    lines.push(`Delivery: ${delivery}`);
    lines.push(`  ${mapsUrl(delivery)}`);
  }

  // Location/volume/weight chips — useful at a glance, optional fields.
  const chips: string[] = [];
  if (job.location) chips.push(job.location);
  if (job.cubic_metres != null) chips.push(`${job.cubic_metres} m³`);
  if (job.item_weight_kg != null) chips.push(`${job.item_weight_kg} kg`);
  if (chips.length) lines.push(chips.join(' · '));

  if (job.notes?.trim()) {
    lines.push('');
    lines.push(`Notes: ${job.notes.trim()}`);
  }

  // V4 4.4: driver attribution if completed (or assigned mid-shift).
  if (job.completed_by_driver_name?.trim()) {
    lines.push('');
    lines.push(`Driver: ${job.completed_by_driver_name.trim()}`);
  }

  // V4 4.6: deep-link to the dashboard's Truck Runs view.
  if (deepLinkHost) {
    lines.push('');
    lines.push(`Open on dashboard: ${buildDeepLink(deepLinkHost, date, job.assigned_truck ?? null)}`);
  }

  lines.push('');
  lines.push(`Rebel Logistics · ${job.quote_number ?? job.id}`);

  // V4 4.2: timed events when we have a sequence position.
  const sequenceIndex = job.sequence != null ? Number(job.sequence) : null;
  const slot = buildTimeSlot(date, sequenceIndex);
  let start: CalendarEventPayload['start'];
  let end: CalendarEventPayload['end'];
  if (slot) {
    start = { dateTime: slot.startDateTime, timeZone: TIME_ZONE };
    end = { dateTime: slot.endDateTime, timeZone: TIME_ZONE };
  } else {
    // Legacy fallback: all-day event for jobs without a sequence yet.
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const endDate = next.toISOString().slice(0, 10);
    start = { date };
    end = { date: endDate };
  }

  return {
    summary,
    description: lines.join('\n'),
    location: delivery || pickup || '',
    colorId: TYPE_COLOR[job.type] ?? '9',
    start,
    end,
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

  // V4 4.1: per-truck calendar mode. metadata layout:
  //   metadata.calendar_id     — the original single calendar ID
  //   metadata.calendar_mode   — 'single' (default) or 'per_truck'
  //   metadata.calendars       — { [truckName]: calendarId } in per-truck
  // We pick the right calendar at sync time. When per_truck is on but the
  // truck doesn't have a calendar yet, lazy-create one.
  const meta = (integration.metadata as any) ?? {};
  const calendarMode: 'single' | 'per_truck' =
    meta.calendar_mode === 'per_truck' ? 'per_truck' : 'single';
  const truckCalendars: Record<string, string> = meta.calendars ?? {};
  const truckKey: string | null = job.assigned_truck ?? null;
  let calendarId: string;
  let metadataChanged = false;

  if (calendarMode === 'per_truck' && truckKey) {
    if (truckCalendars[truckKey]) {
      calendarId = truckCalendars[truckKey];
    } else {
      try {
        calendarId = await createCalendarForTruck(accessToken, truckKey);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create truck calendar';
        return res.status(502).json({ error: message });
      }
      truckCalendars[truckKey] = calendarId;
      metadataChanged = true;
    }
  } else {
    calendarId = meta.calendar_id ?? 'primary';
  }
  if (metadataChanged) {
    const nextMeta = { ...meta, calendars: truckCalendars };
    await admin
      .from('integrations')
      .update({ metadata: nextMeta as any })
      .eq('user_id', user.id)
      .eq('provider', 'google_calendar');
  }

  // V4 4.6: derive a public host for the deep-link from request headers.
  // Prefer x-forwarded-host (Vercel) over the bare host.
  const deepLinkHost =
    (req.headers['x-forwarded-host'] as string) ??
    (req.headers.host as string) ??
    null;

  const eventId = job.google_calendar_event_id as string | null;
  const shouldSync = !!job.assigned_truck && SYNC_STATUSES.has(job.status);

  try {
    if (shouldSync) {
      const payload = buildPayload(job, deepLinkHost);
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

// V4 4.1 — create a fresh per-truck calendar under the connected user's
// account. Uses the same calendar.app.created scope already granted at
// connect time. Returns the new calendar's id which the caller stores in
// integrations.metadata.calendars.
async function createCalendarForTruck(
  accessToken: string,
  truckName: string,
): Promise<string> {
  const r = await fetch(`${GCAL_BASE}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Rebel Logistics — ${truckName}`,
      description: `Auto-created by Rebel Logistics for ${truckName}'s run schedule.`,
      timeZone: TIME_ZONE,
    }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Calendar create failed (${r.status}): ${text}`);
  }
  const created = (await r.json()) as { id: string };
  return created.id;
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
