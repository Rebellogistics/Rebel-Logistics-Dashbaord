// POST /api/sms/inbound
//
// Twilio webhook target for incoming SMS replies. V4 Phase 1.6 gap-stop:
// without this configured, Twilio sends customers its default boilerplate
// ("Thanks for the message. Configure your number's SMS URL …"). Yamin saw
// it on the May 4 call and we cannot ship it on Tuesday's driver trial.
//
// We respond with TwiML — a Rebel-branded auto-reply. The body is read
// from the `sms_templates` table (key='auto_reply') so Yamin can edit it
// from Settings → SMS Templates without redeploying. Falls back to a
// hardcoded default when the row is missing or the table errors.
//
// Configure the webhook on the Twilio number (or messaging service) to
// POST here. The endpoint is intentionally unauthenticated — Twilio fires
// it without a JWT — but Twilio's signature header is verified below so a
// random caller can't trigger arbitrary auto-replies.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'node:crypto';
import { supabaseAdmin } from '../_lib/supabase-admin.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Twilio's signed-request format: HMAC-SHA1 of (URL + sorted form params),
// base64-encoded. Reference: twilio.com/docs/usage/security
function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const expected = createHmac('sha1', authToken).update(data).digest('base64');
  // Constant-time compare to avoid leaking on length differences.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    // We refuse to reply if we can't verify the request — that way an
    // attacker can't trigger us to send TwiML auto-replies on their behalf.
    return res.status(500).send('TWILIO_AUTH_TOKEN not configured');
  }

  // Twilio posts application/x-www-form-urlencoded. Vercel parses this into
  // req.body for us when the content-type matches.
  const params = (req.body ?? {}) as Record<string, string>;

  // The signature is HMAC over the public URL Twilio hit. Behind a custom
  // domain or Vercel preview, the host header can disagree with what's
  // configured in Twilio. The optional override lets Yamin lock in the
  // exact URL Twilio uses (e.g. https://app.rebellogistics.com.au/api/sms/inbound).
  const explicitUrl = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim();
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? '';
  const url = explicitUrl || `${proto}://${host}${req.url ?? '/api/sms/inbound'}`;
  const signature = (req.headers['x-twilio-signature'] as string) ?? '';

  if (!signature || !verifyTwilioSignature(authToken, signature, url, params)) {
    return res.status(403).send('Invalid Twilio signature');
  }

  // Read the editable body from `sms_templates` so Yamin can change the
  // wording from Settings → SMS Templates (key = "auto_reply") without
  // redeploying. The supabase admin call uses the service-role key, so
  // RLS doesn't block reads here.
  const supportPhone = process.env.REBEL_SUPPORT_PHONE?.trim() ?? '';
  const businessName = process.env.REBEL_BUSINESS_NAME?.trim() || 'Rebel Logistics';
  const FALLBACK_BODY = supportPhone
    ? `Hi! This number isn't monitored. For booking changes, please call ${businessName} on ${supportPhone}. Thanks!`
    : `Hi! This number isn't monitored — please call ${businessName} for any booking changes. Thanks!`;

  let templateBody: string | null = null;
  try {
    const { data: row, error: tplErr } = await supabaseAdmin()
      .from('sms_templates')
      .select('body')
      .eq('key', 'auto_reply')
      .eq('active', true)
      .maybeSingle();
    if (!tplErr && row && typeof (row as { body?: unknown }).body === 'string') {
      templateBody = (row as { body: string }).body;
    }
  } catch (err) {
    console.warn('[inbound-sms] template lookup threw, using fallback', err);
  }

  // Resolve {{owner.*}} placeholders. We deliberately keep this scoped to
  // owner fields — customer/job context isn't meaningful for an inbound
  // auto-reply (we don't always know who's texting).
  const replyBody = renderOwnerVars(templateBody ?? FALLBACK_BODY, {
    businessName,
    phone: supportPhone,
  });

  // V4 Phase 3.2 — log the inbound to sms_log so Yamin sees it on the
  // dashboard Replies tab and the bell pings. Done in parallel with the
  // TwiML response: even if the DB insert fails the customer still gets
  // the auto-reply. We swallow errors with a warn so the webhook stays
  // a 200 (Twilio retries on non-2xx).
  void logInbound(params).catch((err) =>
    console.warn('[inbound-sms] log insert threw', err),
  );

  // Minimal valid TwiML: <Response><Message>...</Message></Response>
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escapeXml(replyBody)}</Message></Response>`;
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  return res.status(200).send(twiml);
}

// Inbound SMS → sms_log row, with best-effort customer + thread resolution.
async function logInbound(params: Record<string, string>) {
  const fromPhone = (params.From ?? '').trim();
  const messageBody = params.Body ?? '';
  const inboundSid = params.MessageSid ?? null;
  if (!fromPhone) return;

  const fromDigits = fromPhone.replace(/\D/g, '');
  const admin = supabaseAdmin();

  // 1. Find the most recent OUTBOUND row to this phone in the last 7 days.
  //    Phone strings on outbound rows are however the front-end stored them
  //    (e.g. "+61415123456" or "0415 123 456"), so we'd have to scan-and-
  //    match in JS. Cheaper: pull the last 25 outbounds per number and let
  //    JS pick. For typical Rebel volumes that's a tiny query.
  let parentSid: string | null = null;
  let parentType: string = 'other';
  let parentJobId: string | null = null;
  try {
    const { data: outbounds } = await admin
      .from('sms_log')
      .select('provider_message_id, type, job_id, recipient_phone, sent_at')
      .eq('direction', 'outbound')
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('sent_at', { ascending: false })
      .limit(50);
    if (outbounds) {
      for (const row of outbounds as any[]) {
        const rowDigits = String(row.recipient_phone ?? '').replace(/\D/g, '');
        if (!rowDigits) continue;
        // Compare on the last 9 digits to be tolerant of `+61` vs `0` prefixes.
        const tail = (s: string) => s.slice(-9);
        if (tail(rowDigits) === tail(fromDigits)) {
          parentSid = row.provider_message_id ?? null;
          parentType = row.type ?? 'other';
          parentJobId = row.job_id ?? null;
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[inbound-sms] parent lookup failed', err);
  }

  // 2. Best-effort customer match by phone digits. RLS doesn't apply since
  //    we're using the service role.
  let customerId: string | null = null;
  let customerName: string | null = null;
  try {
    const { data: customers } = await admin
      .from('customers')
      .select('id, name, company_name, phone')
      .not('phone', 'is', null)
      .limit(500); // Rebel's customer book is small enough that this is fine.
    if (customers) {
      for (const c of customers as any[]) {
        const cDigits = String(c.phone ?? '').replace(/\D/g, '');
        if (!cDigits) continue;
        if (cDigits.slice(-9) === fromDigits.slice(-9)) {
          customerId = c.id ?? null;
          customerName = (c.company_name as string | null) ?? (c.name as string | null) ?? null;
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[inbound-sms] customer lookup failed', err);
  }

  // 3. Insert the inbound row. type mirrors the parent so a reply to the
  //    day_prior thread is filed as day_prior in the inbox; auto_reply is
  //    excluded (replies to our own auto-reply are not threadable).
  const inferredType = parentType === 'auto_reply' ? 'other' : parentType;
  try {
    const { error } = await admin.from('sms_log').insert([
      {
        job_id: parentJobId,
        type: inferredType as any,
        recipient_name: customerName ?? fromPhone,
        recipient_phone: fromPhone,
        message_body: messageBody,
        status: 'sent',
        sent_at: new Date().toISOString(),
        error_message: null,
        direction: 'inbound',
        provider_message_id: inboundSid,
        parent_message_sid: parentSid,
        customer_id: customerId,
      } as any,
    ]);
    if (error) console.warn('[inbound-sms] insert error', error);
  } catch (err) {
    console.warn('[inbound-sms] insert threw', err);
  }
}

// Tiny mustache-style renderer for the auto-reply body. We only support
// `{{owner.businessName}}` and `{{owner.phone}}` here — the only
// placeholders that make sense for a one-shot inbound reply.
function renderOwnerVars(body: string, owner: { businessName: string; phone: string }): string {
  return body.replace(/\{\{\s*owner\.(businessName|phone)\s*\}\}/g, (_match, key) => {
    if (key === 'businessName') return owner.businessName;
    if (key === 'phone') return owner.phone;
    return '';
  });
}
