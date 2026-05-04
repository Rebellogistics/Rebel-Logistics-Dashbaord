// POST /api/calendar/mode
// Body: { mode: 'single' | 'per_truck' }
//
// V4 Phase 4.1 — flip the connected Google Calendar between a single
// shared calendar (the legacy default) and a per-truck calendar split.
//
// We don't pre-create the per-truck calendars here — `/api/calendar/sync`
// lazy-creates them on first sync to a new truck. So the only thing this
// endpoint does is mutate the integration's metadata. After flipping,
// Yamin should hit the "Sync open jobs" button so existing events re-file
// onto the new per-truck calendars.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, getUserFromAuthHeader } from '../_lib/supabase-admin.js';

const VALID_MODES = new Set(['single', 'per_truck']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { mode } = (req.body ?? {}) as { mode?: string };
  if (!mode || !VALID_MODES.has(mode)) {
    return res.status(400).json({ error: 'mode must be "single" or "per_truck"' });
  }

  const admin = supabaseAdmin();
  const { data: integration, error: intErr } = await admin
    .from('integrations')
    .select('id, metadata')
    .eq('user_id', user.id)
    .eq('provider', 'google_calendar')
    .is('revoked_at', null)
    .maybeSingle();
  if (intErr) return res.status(500).json({ error: intErr.message });
  if (!integration) {
    return res.status(404).json({ error: 'Google Calendar is not connected' });
  }

  const meta = (integration.metadata as any) ?? {};
  const nextMeta = { ...meta, calendar_mode: mode };

  const { error: upErr } = await admin
    .from('integrations')
    .update({ metadata: nextMeta as any })
    .eq('id', integration.id);
  if (upErr) return res.status(500).json({ error: upErr.message });

  return res.status(200).json({ ok: true, mode });
}
