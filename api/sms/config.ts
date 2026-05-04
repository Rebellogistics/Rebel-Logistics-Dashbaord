// GET /api/sms/config
//
// V4 Phase 7.2 — read-only sender-ID indicator for Settings → Integrations.
// Returns the public bits of the SMS provider config (current sender,
// inbound number, kind) so the UI can show "Currently sending from: REBEL"
// without exposing the auth token.
//
// Auth: requires the user's Supabase JWT. We don't gate on owner role —
// any authenticated user (including dispatchers) sees the same answer.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAuthHeader } from '../_lib/supabase-admin.js';

export interface SmsConfigResponse {
  /** What outbound messages render as on the customer's phone. Either a
   *  phone number ("+61485055666") or an alphanumeric sender ("REBEL"). */
  sender: string;
  /** Whether `sender` is alphanumeric. Drives the "replies route to the
   *  inbound number" warning copy. */
  isAlphanumeric: boolean;
  /** The Twilio number used as the inbound webhook target. Customers see
   *  `sender` on outbound, but text-back lands here. May equal `sender`
   *  when alphanumeric isn't configured yet. */
  inboundNumber: string;
  /** Whether the alphanumeric override is currently active. */
  overrideActive: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromAuthHeader(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const inboundNumber = process.env.TWILIO_FROM?.trim() ?? '';
  const senderOverride = process.env.TWILIO_SENDER_ID?.trim();
  const sender = senderOverride || inboundNumber;
  const isAlphanumeric = !!sender && !sender.startsWith('+') && !/^\d+$/.test(sender);

  const payload: SmsConfigResponse = {
    sender,
    isAlphanumeric,
    inboundNumber,
    overrideActive: !!senderOverride && senderOverride !== inboundNumber,
  };
  return res.status(200).json(payload);
}
