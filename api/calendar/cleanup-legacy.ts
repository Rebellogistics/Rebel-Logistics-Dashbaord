// POST /api/calendar/cleanup-legacy
//
// V4 Phase 4 follow-up — delete the auto-created legacy single calendar
// after Yamin switches to per-truck mode. The legacy calendar contains
// orphan events that aren't tracked by `jobs.google_calendar_event_id`
// any more (those got overwritten on the first per-truck sync), so
// deleting the whole calendar is the cleanest reset.
//
// Guard rails:
//   - Auth-gated: requires the user's Supabase JWT.
//   - Only runs when calendar_mode = 'per_truck' (otherwise the legacy
//     calendar is the user's ONLY calendar — nuking it would break sync).
//   - Won't delete the literal 'primary' calendar (Google rejects it
//     anyway, but we hard-stop in case metadata is malformed).
//   - On Google 404/410, treat as already-gone and just clear metadata.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refreshAccessToken } from '../_lib/google-oauth.js';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin.js';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

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
    .select('id, refresh_token, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .maybeSingle();
  if (intErr) return res.status(500).json({ error: intErr.message });
  if (!integration?.refresh_token) {
    return res.status(404).json({ error: 'Google Calendar is not connected' });
  }

  const meta = (integration.metadata as any) ?? {};
  const mode = meta.calendar_mode === 'per_truck' ? 'per_truck' : 'single';
  if (mode !== 'per_truck') {
    return res.status(409).json({
      error:
        'Refusing to delete the legacy calendar while in single-calendar mode. Switch to per-truck first.',
    });
  }

  const legacyCalendarId = meta.calendar_id as string | undefined;
  if (!legacyCalendarId) {
    return res.status(200).json({ ok: true, action: 'noop', reason: 'no legacy calendar' });
  }
  if (legacyCalendarId === 'primary') {
    return res.status(409).json({ error: 'Refusing to delete the user\'s primary calendar.' });
  }

  // Get a fresh access token. We always refresh here — this endpoint is
  // a one-shot user action, so cache savings don't matter much.
  let accessToken: string;
  try {
    const tok = await refreshAccessToken(integration.refresh_token);
    accessToken = tok.access_token;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return res.status(502).json({ error: message });
  }

  const r = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(legacyCalendarId)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
  );

  // Treat already-gone as success — the metadata clear-out below is what
  // matters, not the actual HTTP roundtrip.
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    const text = await r.text().catch(() => '');
    return res.status(502).json({
      error: `Calendar DELETE failed (${r.status}): ${text || 'unknown'}`,
    });
  }

  // Wipe calendar_id from metadata so /api/calendar/sync no longer
  // routes truckless jobs to a dead calendar id.
  const nextMeta = { ...meta };
  delete nextMeta.calendar_id;
  await admin
    .from('integrations')
    .update({ metadata: nextMeta as any })
    .eq('id', integration.id);

  return res.status(200).json({
    ok: true,
    action: 'deleted',
    deletedCalendarId: legacyCalendarId,
  });
}
