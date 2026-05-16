// POST /api/calendar/cleanup-orphans
//
// V5 Phase 7 — scans every calendar Rebel Logistics has ever written to
// (metadata.calendar_id + per-truck calendars) and removes events
// whose ID doesn't match any current `jobs.google_calendar_event_id`.
// Fixes the "I see the same job twice in my Google Calendar" report
// when an earlier sync left an orphan event behind.
//
// Safety:
//   - Auth-gated.
//   - Only touches events whose description includes the brand marker
//     "Rebel Logistics ·" — Yamin's personal appointments are never
//     touched even if they happen to share a calendar.
//   - Treats 404/410 on delete as already-gone (no failure).
//   - Per-calendar listing uses Google's `q=` text search to limit the
//     payload; we still client-side check the brand marker before
//     deleting because Google's q-search is a fuzzy match.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refreshAccessToken } from '../_lib/google-oauth.js';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin.js';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const BRAND_MARKER = 'Rebel Logistics ·';
const MAX_PAGES_PER_CAL = 8; // safety cap (8 × 250 = 2000 events / calendar)

interface PerCalendarResult {
  calendarId: string;
  label: string;
  scanned: number;
  deleted: number;
  failed: number;
  errors: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const admin = supabaseAdmin();
  const { data: integration, error: intErr } = await admin
    .from('integrations')
    .select('refresh_token, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .maybeSingle();

  if (intErr) return res.status(500).json({ error: intErr.message });
  if (!integration?.refresh_token) {
    return res.status(404).json({ error: 'Google Calendar is not connected' });
  }

  // Build the list of calendars to scan. Skip 'primary' — we never write
  // there in the calendar.app.created scope flow, so anything there isn't
  // ours to clean up.
  const meta = (integration.metadata as any) ?? {};
  const calendars: { id: string; label: string }[] = [];
  if (meta.calendar_id && meta.calendar_id !== 'primary') {
    calendars.push({ id: meta.calendar_id, label: 'Single calendar (legacy)' });
  }
  const truckCalendars: Record<string, string> = meta.calendars ?? {};
  for (const [truck, calId] of Object.entries(truckCalendars)) {
    if (calId && calId !== 'primary') calendars.push({ id: calId, label: truck });
  }
  if (calendars.length === 0) {
    return res.status(200).json({ ok: true, scanned: 0, deleted: 0, perCalendar: [] });
  }

  // Snapshot every live (non-deleted) job's google_calendar_event_id so
  // we know which events are still authoritative.
  const { data: jobsRows, error: jobsErr } = await admin
    .from('jobs')
    .select('google_calendar_event_id')
    .is('deleted_at', null)
    .not('google_calendar_event_id', 'is', null);
  if (jobsErr) return res.status(500).json({ error: jobsErr.message });
  const liveEventIds = new Set<string>(
    (jobsRows ?? [])
      .map((r) => r.google_calendar_event_id as string | null)
      .filter((id): id is string => !!id),
  );

  // One fresh token for the whole scan.
  let accessToken: string;
  try {
    const tok = await refreshAccessToken(integration.refresh_token);
    accessToken = tok.access_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return res.status(502).json({ error: message });
  }

  const perCalendar: PerCalendarResult[] = [];

  for (const cal of calendars) {
    const result: PerCalendarResult = {
      calendarId: cal.id,
      label: cal.label,
      scanned: 0,
      deleted: 0,
      failed: 0,
      errors: [],
    };
    let pageToken: string | null = null;
    let pageCount = 0;

    try {
      do {
        const url = new URL(`${GCAL_BASE}/calendars/${encodeURIComponent(cal.id)}/events`);
        url.searchParams.set('q', 'Rebel Logistics');
        url.searchParams.set('maxResults', '250');
        if (pageToken) url.searchParams.set('pageToken', pageToken);

        const r = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          result.errors.push(`List failed (${r.status}): ${text.slice(0, 200)}`);
          break;
        }
        const payload = (await r.json()) as {
          items?: { id: string; description?: string }[];
          nextPageToken?: string;
        };
        const items = payload.items ?? [];
        result.scanned += items.length;

        for (const ev of items) {
          // Client-side brand-marker check — Google's q= is fuzzy.
          if (!ev.description?.includes(BRAND_MARKER)) continue;
          if (liveEventIds.has(ev.id)) continue;
          const delResp = await fetch(
            `${GCAL_BASE}/calendars/${encodeURIComponent(cal.id)}/events/${encodeURIComponent(ev.id)}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (delResp.ok || delResp.status === 404 || delResp.status === 410) {
            result.deleted += 1;
          } else {
            result.failed += 1;
            const text = await delResp.text().catch(() => '');
            result.errors.push(`Delete ${ev.id} → ${delResp.status} ${text.slice(0, 120)}`);
          }
        }

        pageToken = payload.nextPageToken ?? null;
        pageCount += 1;
      } while (pageToken && pageCount < MAX_PAGES_PER_CAL);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan threw';
      result.errors.push(message);
    }

    perCalendar.push(result);
  }

  const totalScanned = perCalendar.reduce((sum, r) => sum + r.scanned, 0);
  const totalDeleted = perCalendar.reduce((sum, r) => sum + r.deleted, 0);
  const totalFailed = perCalendar.reduce((sum, r) => sum + r.failed, 0);

  return res.status(200).json({
    ok: true,
    scanned: totalScanned,
    deleted: totalDeleted,
    failed: totalFailed,
    perCalendar,
  });
}
