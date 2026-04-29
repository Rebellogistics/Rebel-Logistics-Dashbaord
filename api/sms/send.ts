// POST /api/sms/send
// Body: { to: string, body: string }
//
// Server-side Twilio sender. Holds the auth token in env (never reaches the
// browser), authenticates the caller via their Supabase JWT, then posts to
// Twilio's Messages API. Returns Twilio's message SID on success so the
// caller can persist it for delivery-receipt callbacks later.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAuthHeader } from '../_lib/supabase-admin';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { to, body } = (req.body ?? {}) as { to?: string; body?: string };
  if (!to || !body) {
    return res.status(400).json({ error: 'Missing to or body' });
  }
  if (!/^\+[1-9]\d{6,14}$/.test(to)) {
    return res.status(400).json({ error: 'to must be in E.164 format (e.g. +61412345678)' });
  }

  let accountSid: string;
  let authToken: string;
  let from: string;
  try {
    accountSid = requireEnv('TWILIO_ACCOUNT_SID');
    authToken = requireEnv('TWILIO_AUTH_TOKEN');
    from = requireEnv('TWILIO_FROM');
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Twilio config missing',
    });
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  // Twilio expects application/x-www-form-urlencoded
  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const payload = await r.json().catch(() => ({}));

    if (!r.ok) {
      const message =
        (payload && typeof payload === 'object' && 'message' in payload && (payload as any).message) ||
        `Twilio HTTP ${r.status}`;
      return res.status(r.status).json({ error: message, code: (payload as any)?.code ?? null });
    }

    return res.status(200).json({
      sid: (payload as { sid?: string }).sid,
      status: (payload as { status?: string }).status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Twilio request failed';
    return res.status(502).json({ error: message });
  }
}
