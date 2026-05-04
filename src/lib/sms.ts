import { Job, Customer, SmsType } from './types';
import { format, parseISO, addHours } from 'date-fns';

// STUB provider. No actual SMS is sent — every call is logged to the sms_log
// table and reported as "sent". Replace the body of `sendSms` with a real
// provider call (Twilio, MessageMedia, ClickSend, etc.) to go live. The
// function signature and return shape must stay the same so the UI and hooks
// keep working unchanged.

const COMPANY_NAME = 'Rebel Logistics';

// V4 hot-fix May 4: defaults for owner-context fields so SMS that fire
// from places without a React profile (auto-fired status SMS, bulk
// day-prior, legacy SMS_TEMPLATES export) still render with Yamin's
// branding and support phone. Read once at module load — VITE_* env
// vars are baked in at build time, so this is a constant per deploy.
const ENV = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const OWNER_BUSINESS_NAME_DEFAULT =
  ENV.VITE_REBEL_BUSINESS_NAME?.trim() || COMPANY_NAME;
const OWNER_PHONE_DEFAULT = ENV.VITE_REBEL_SUPPORT_PHONE?.trim() ?? '';

// ──────────────────────────────────────────────────────────────────
// Template variable schema
// ──────────────────────────────────────────────────────────────────

export interface TemplateContext {
  customer?: Partial<Customer> | null;
  job?: Partial<Job> | null;
  owner?: { name?: string; businessName?: string; phone?: string } | null;
}

/**
 * Tiny Mustache-style renderer. Supports `{{a.b.c}}` paths only — no helpers.
 *
 * V4 hot-fix May 4: when a variable is unresolved (key not in the lookup —
 * usually a typo), we now leave the literal `{{var.name}}` in the output
 * so Yamin sees what's broken instead of getting silent empty-string
 * substitution. Empty resolved values still render as empty (e.g. a
 * customer with no email is fine — the template author chose to include
 * the variable).
 */
export function renderTemplate(body: string, ctx: TemplateContext): string {
  const lookup = buildLookup(ctx);
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    if (!(path in lookup)) return match;
    const value = lookup[path];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * V4 hot-fix May 4: cascading fall-back for variable resolution.
 *
 * For every `{{customer.*}}` field we try:
 *   1. the explicit `customer` arg (passed by SendSmsDialog when Yamin
 *      picks a recipient, or by the bulk day-prior loop)
 *   2. the linked `job` row's denormalised customer fields (so an SMS
 *      fired from useUpdateJob.onSuccess — which knows the job but has
 *      no React access to the customer cache — still renders the name)
 *
 * For every `{{owner.*}}` field we try:
 *   1. the explicit `owner` arg
 *   2. the VITE_REBEL_* env vars (set on Vercel for the inbound auto-
 *      reply too — re-using them keeps both surfaces consistent)
 *   3. a hardcoded "Rebel Logistics" fallback for the business name
 *
 * Result: callers can pass an empty context and templates still render
 * cleanly. Yamin's reproduction "the variables don't work at all" was
 * driven by the auto-fire SMS path passing `{ customer: null, owner: null }`,
 * which used to leave every variable empty.
 */
function buildLookup(ctx: TemplateContext): Record<string, string> {
  const customer = ctx.customer ?? null;
  const job = ctx.job ?? null;
  const owner = ctx.owner ?? null;

  const company =
    customer?.companyName?.trim() || job?.customerCompanyName?.trim() || '';
  const personal = customer?.name?.trim() || job?.customerName?.trim() || '';
  const customerName = company || personal;
  const customerFirstName = customerName.split(/\s+/)[0] ?? '';
  const customerPhone = customer?.phone?.trim() || job?.customerPhone?.trim() || '';
  const customerEmail = customer?.email?.trim() || '';

  const jobDate = job?.date ? safeFormat(job.date, 'EEE d MMM') : '';
  const eta = formatEta(job);

  return {
    'customer.firstName': customerFirstName,
    'customer.fullName': customerName,
    'customer.name': customerName,
    'customer.phone': customerPhone,
    'customer.email': customerEmail,
    'job.id': job?.id ?? '',
    'job.date': jobDate,
    'job.pickup': job?.pickupAddress ?? '',
    'job.delivery': job?.deliveryAddress ?? '',
    'job.fee': job?.fee != null ? `$${(job.fee + (job.fuelLevy ?? 0)).toFixed(2)}` : '',
    'job.truck': job?.assignedTruck ?? '',
    'job.type': job?.type ?? '',
    'job.eta': eta,
    'job.notes': job?.notes ?? '',
    'owner.name': owner?.name?.trim() ?? '',
    'owner.businessName':
      owner?.businessName?.trim() || OWNER_BUSINESS_NAME_DEFAULT,
    'owner.phone': owner?.phone?.trim() || OWNER_PHONE_DEFAULT,
  };
}

function safeFormat(iso: string, pattern: string): string {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

function formatEta(job: Partial<Job> | null | undefined): string {
  if (!job) return '';
  if (job.hoursEstimated && job.hoursEstimated > 0) {
    const eta = addHours(new Date(), job.hoursEstimated);
    return format(eta, 'h:mma').toLowerCase();
  }
  return job.date ? safeFormat(job.date, 'EEE d MMM') : '';
}

// ──────────────────────────────────────────────────────────────────
// Default templates (used when DB has none)
// ──────────────────────────────────────────────────────────────────

export interface SmsTemplateDefinition {
  key: string;
  type: SmsType;
  label: string;
  body: string;
}

export const DEFAULT_TEMPLATES: SmsTemplateDefinition[] = [
  {
    key: 'day_prior',
    type: 'day_prior',
    label: 'Day-prior reminder',
    body: `Hi {{customer.firstName}}, {{owner.businessName}} here. Your {{job.type}} booking is scheduled for {{job.date}}. Pickup: {{job.pickup}}. Delivery: {{job.delivery}}. Reply if you need to change anything.`,
  },
  {
    key: 'en_route',
    type: 'en_route',
    label: 'En route',
    body: `Hi {{customer.firstName}}, {{owner.businessName}}. Your driver is en route to {{job.pickup}} now and should arrive around {{job.eta}}. See you shortly.`,
  },
  {
    key: 'arrival',
    type: 'other',
    label: 'Arrived on site',
    body: `Hi {{customer.firstName}}, {{owner.businessName}}. We've arrived at {{job.pickup}}.`,
  },
  {
    key: 'completed',
    type: 'other',
    label: 'Job complete',
    body: `Hi {{customer.firstName}}, {{owner.businessName}}. Your delivery to {{job.delivery}} is complete. Thanks for choosing us — invoice to follow.`,
  },
  {
    key: 'follow_up',
    type: 'other',
    label: 'Follow-up',
    body: `Hi {{customer.firstName}}, {{owner.businessName}} here following up on your booking. Let us know if there's anything we can help with.`,
  },
  // V4 May 4 hot-fix: branded reply that goes back to anyone who texts the
  // Twilio number. Editable from Settings → SMS Templates so Yamin can
  // change the wording without redeploying. The /api/sms/inbound webhook
  // reads this row at request time. {{owner.businessName}} renders as
  // 'Rebel Logistics' by default; the support phone variable is injected
  // server-side from the REBEL_SUPPORT_PHONE env var.
  {
    key: 'auto_reply',
    type: 'other',
    label: 'Auto-reply (when customer texts back)',
    body: `Hi! This number isn't monitored. For booking changes, please call {{owner.businessName}} on {{owner.phone}}. Thanks!`,
  },
];

/** Get the default body for a builtin SMS type — used by useSendSmsForJob. */
export function defaultBodyForType(type: SmsType): string {
  return DEFAULT_TEMPLATES.find((t) => t.type === type)?.body ?? DEFAULT_TEMPLATES[0].body;
}

// Backwards-compatible export so existing imports keep working until we migrate them.
// Each function takes a job and returns a fully-rendered string using the default body.
export const SMS_TEMPLATES: Record<SmsType, (job: Job) => string> = {
  day_prior: (job) => renderTemplate(defaultBodyForType('day_prior'), { job, customer: jobToCustomer(job) }),
  en_route: (job) => renderTemplate(defaultBodyForType('en_route'), { job, customer: jobToCustomer(job) }),
  auto_reply: (job) => renderTemplate(defaultBodyForType('auto_reply'), { job, customer: jobToCustomer(job) }),
  other: (job) => renderTemplate(defaultBodyForType('other'), { job, customer: jobToCustomer(job) }),
};

function jobToCustomer(job: Job): Partial<Customer> {
  return {
    name: job.customerName,
    phone: job.customerPhone,
  };
}

// ──────────────────────────────────────────────────────────────────
// Segment counter (GSM-7 vs UCS-2)
// ──────────────────────────────────────────────────────────────────

const GSM7_BASE = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'.split(''),
);
const GSM7_EXT = new Set('^{}\\[~]|€'.split(''));

export interface SmsSegmentInfo {
  /** Number of characters as the user sees them. */
  chars: number;
  /** Number of SMS segments (1 segment = up to 160 GSM-7 / 70 UCS-2). */
  segments: number;
  /** "GSM-7" — cheaper, ASCII-ish; "UCS-2" — supports emoji + non-Latin. */
  encoding: 'GSM-7' | 'UCS-2';
  /** Characters left in the current segment. */
  remaining: number;
}

export function computeSmsSegments(body: string): SmsSegmentInfo {
  let isGsm = true;
  let units = 0;
  for (const ch of body) {
    if (GSM7_BASE.has(ch)) {
      units += 1;
    } else if (GSM7_EXT.has(ch)) {
      units += 2;
    } else {
      isGsm = false;
      break;
    }
  }

  if (isGsm) {
    const perSegment = units <= 160 ? 160 : 153; // concatenated SMS use 153 per segment
    const segments = units <= 160 ? 1 : Math.ceil(units / 153);
    const remaining = perSegment * segments - units;
    return { chars: units, segments, encoding: 'GSM-7', remaining };
  }

  const charCount = [...body].length;
  const perSegment = charCount <= 70 ? 70 : 67;
  const segments = charCount <= 70 ? 1 : Math.ceil(charCount / 67);
  const remaining = perSegment * segments - charCount;
  return { chars: charCount, segments, encoding: 'UCS-2', remaining };
}

// ──────────────────────────────────────────────────────────────────
// Provider abstraction
// ──────────────────────────────────────────────────────────────────
// Today the stub is the default. When Yamen drops Twilio credentials into
// Vercel env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM) and we
// stand up the /api/sms/send Edge Function, `resolveProvider()` flips over
// automatically. Nothing calling `sendSms()` needs to change.
//
// The Twilio provider intentionally fails loudly when invoked without the
// server-side fetch endpoint — we never want the browser to hit Twilio
// directly with the auth token in-flight. See DEFERRED.md §2.

import { normalizeToE164 } from './phone';
import { apiFetch } from './apiClient';

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  status: 'sent' | 'failed';
  sentAt: string;
  errorMessage?: string;
  /** Provider-specific message id when available — used for delivery receipts. */
  providerMessageId?: string;
}

export interface SmsProvider {
  name: 'stub' | 'twilio';
  send(params: SendSmsParams): Promise<SendSmsResult>;
}

const stubProvider: SmsProvider = {
  name: 'stub',
  async send(_params) {
    return { status: 'sent', sentAt: new Date().toISOString() };
  },
};

/**
 * Talks to our own /api/sms/send endpoint (NOT Twilio directly) so the auth
 * token lives server-side only. The endpoint lands the moment creds arrive —
 * see DEFERRED.md §2.
 */
const twilioProvider: SmsProvider = {
  name: 'twilio',
  async send(params) {
    const normalized = normalizeToE164(params.to);
    if (!normalized) {
      return {
        status: 'failed',
        sentAt: new Date().toISOString(),
        errorMessage: `Invalid phone number: ${params.to}`,
      };
    }
    try {
      // Phase 21 fix: must use apiFetch (not raw fetch) so the user's
      // Supabase JWT lands in the Authorization header. The /api/sms/send
      // endpoint guards on getUserFromAuthHeader and returns 401 without
      // a token — which is exactly the "Not authenticated" error the test
      // send card was surfacing.
      const res = await apiFetch('/api/sms/send', {
        method: 'POST',
        body: JSON.stringify({ to: normalized, body: params.body }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const contentType = res.headers.get('content-type') ?? '';
        // V4 hot-fix May 4: when /api/* isn't being served (plain `vite`
        // serves nothing for POST /api/sms/send → 404 with empty body, or
        // 200 + index.html when SPA fallback is on), surface a directly-
        // actionable message so Yamin knows to switch to `vercel dev`.
        const looksLikeMissingDevApi =
          (res.status === 404 && !text) ||
          (res.status === 405 && !text) ||
          contentType.includes('text/html') ||
          text.trim().startsWith('<');
        if (looksLikeMissingDevApi) {
          return {
            status: 'failed',
            sentAt: new Date().toISOString(),
            errorMessage:
              "SMS endpoint isn't running. Restart the dev server with `npx vercel dev --listen 3000` (plain `vite` doesn't serve /api/*).",
          };
        }
        // Try to parse a JSON error body — /api/sms/send returns
        // { error: "..." } on auth + Twilio failures.
        let parsed: { error?: string } | null = null;
        try {
          parsed = JSON.parse(text) as { error?: string };
        } catch {
          /* leave parsed null */
        }
        return {
          status: 'failed',
          sentAt: new Date().toISOString(),
          errorMessage:
            parsed?.error || text || `Provider HTTP ${res.status}`,
        };
      }
      const payload = (await res.json()) as { sid?: string };
      return {
        status: 'sent',
        sentAt: new Date().toISOString(),
        providerMessageId: payload.sid,
      };
    } catch (err) {
      return {
        status: 'failed',
        sentAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Network error',
      };
    }
  },
};

function resolveProvider(): SmsProvider {
  // The browser can't read server env vars; we signal live-Twilio via a
  // public-safe VITE_SMS_PROVIDER=twilio flag. When unset we stay on the stub.
  const flag = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SMS_PROVIDER;
  return flag === 'twilio' ? twilioProvider : stubProvider;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  return resolveProvider().send(params);
}

export function currentSmsProviderName(): SmsProvider['name'] {
  return resolveProvider().name;
}
