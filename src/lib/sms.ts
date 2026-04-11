import { Job, Customer, SmsType } from './types';
import { format, parseISO, addHours } from 'date-fns';

// STUB provider. No actual SMS is sent — every call is logged to the sms_log
// table and reported as "sent". Replace the body of `sendSms` with a real
// provider call (Twilio, MessageMedia, ClickSend, etc.) to go live. The
// function signature and return shape must stay the same so the UI and hooks
// keep working unchanged.

const COMPANY_NAME = 'Rebel Logistics';

// ──────────────────────────────────────────────────────────────────
// Template variable schema
// ──────────────────────────────────────────────────────────────────

export interface TemplateContext {
  customer?: Partial<Customer> | null;
  job?: Partial<Job> | null;
  owner?: { name?: string; businessName?: string } | null;
}

/** Tiny Mustache-style renderer. Supports `{{a.b.c}}` paths only — no helpers. */
export function renderTemplate(body: string, ctx: TemplateContext): string {
  const lookup = buildLookup(ctx);
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = lookup[path];
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  });
}

function buildLookup(ctx: TemplateContext): Record<string, string> {
  const customer = ctx.customer ?? null;
  const job = ctx.job ?? null;
  const owner = ctx.owner ?? null;

  const customerName =
    (customer?.companyName?.trim() ? customer.companyName : customer?.name)?.trim() ?? '';
  const customerFirstName = customerName.split(/\s+/)[0] ?? '';

  const jobDate = job?.date ? safeFormat(job.date, 'EEE d MMM') : '';
  const eta = formatEta(job);

  return {
    'customer.firstName': customerFirstName,
    'customer.fullName': customerName,
    'customer.name': customerName,
    'customer.phone': customer?.phone ?? '',
    'customer.email': customer?.email ?? '',
    'job.id': job?.id ?? '',
    'job.date': jobDate,
    'job.pickup': job?.pickupAddress ?? '',
    'job.delivery': job?.deliveryAddress ?? '',
    'job.fee': job?.fee != null ? `$${(job.fee + (job.fuelLevy ?? 0)).toFixed(2)}` : '',
    'job.truck': job?.assignedTruck ?? '',
    'job.type': job?.type ?? '',
    'job.eta': eta,
    'job.notes': job?.notes ?? '',
    'owner.name': owner?.name ?? '',
    'owner.businessName': owner?.businessName ?? COMPANY_NAME,
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
// Stub provider
// ──────────────────────────────────────────────────────────────────

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  status: 'sent' | 'failed';
  sentAt: string;
  errorMessage?: string;
}

export async function sendSms(_params: SendSmsParams): Promise<SendSmsResult> {
  return {
    status: 'sent',
    sentAt: new Date().toISOString(),
  };
}
