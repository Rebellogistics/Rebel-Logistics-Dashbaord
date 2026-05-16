import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Job, Customer, SmsLogEntry, SmsType } from '../lib/types';
import { renderTemplate, sendSms, DEFAULT_TEMPLATES } from '../lib/sms';

/**
 * V4 hot-fix May 4 (round 2) — single source of truth for "what's the
 * body for template <key>?" Every SMS send path goes through this so
 * Yamin's edits in Settings → SMS Templates take effect everywhere
 * (auto-fired status SMS, day-prior bulk, per-job re-send, ad-hoc).
 *
 *   1. SELECT body FROM sms_templates WHERE key = <key> AND active.
 *   2. On miss / error, fall back to the matching DEFAULT_TEMPLATES row.
 *   3. Last-ditch: first hardcoded template (so we never throw).
 *
 * Async — adds one DB roundtrip per send. The roundtrip is cheap and
 * reliable; we explicitly do NOT cache here because Yamin needs his
 * edits to take effect on the very next send, not after a TTL.
 */
export async function resolveTemplateBody(key: string): Promise<string> {
  try {
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => {
              maybeSingle: () => Promise<{ data: { body?: string } | null; error: unknown }>;
            };
          };
        };
      };
    };
    const { data, error } = await client
      .from('sms_templates')
      .select('body')
      .eq('key', key)
      .eq('active', true)
      .maybeSingle();
    if (!error && data?.body && typeof data.body === 'string') {
      return data.body;
    }
  } catch (err) {
    console.warn(`[sms] template lookup for "${key}" threw — using default`, err);
  }
  const fallback = DEFAULT_TEMPLATES.find((t) => t.key === key);
  if (fallback) return fallback.body;
  return DEFAULT_TEMPLATES[0]?.body ?? '';
}

// Map an SmsType (used for sms_log categorisation + the auto-fire
// trigger) to the template KEY a caller would expect by default. The
// completed-SMS auto-fire uses key='completed' but logs as type='other'
// because SmsType doesn't include 'completed'; that mapping is handled
// at the call site below.
function templateKeyForType(type: SmsType): string {
  if (type === 'day_prior') return 'day_prior';
  if (type === 'en_route') return 'en_route';
  if (type === 'auto_reply') return 'auto_reply';
  return 'other';
}

function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v)) as any;
  } else if (obj !== null && obj?.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export function useSmsLog() {
  return useQuery<SmsLogEntry[]>({
    queryKey: ['sms_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return toCamelCase<SmsLogEntry[]>(data || []);
    },
  });
}

interface SendSmsForJobParams {
  job: Job;
  type: SmsType;
  /** Optional explicit body — if provided, skips template resolution */
  body?: string;
  /** Optional customer for richer template rendering */
  customer?: Customer | null;
  /** Optional owner context (name/business) */
  owner?: { name?: string; businessName?: string } | null;
}

export function useSendSmsForJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ job, type, body, customer, owner }: SendSmsForJobParams) => {
      if (!job.customerPhone?.trim()) {
        throw new Error('Job has no phone number');
      }

      // V4 hot-fix May 4 (round 2): always source the template body from
      // the DB row first so Yamin's Settings edits actually fire. The
      // explicit `body` arg still wins (used by SendSmsDialog when the
      // operator typed a custom message).
      const templateBody = body ?? (await resolveTemplateBody(templateKeyForType(type)));
      const messageBody = renderTemplate(templateBody, { job, customer, owner });
      const result = await sendSms({ to: job.customerPhone, body: messageBody });

      const { error: logError } = await supabase.from('sms_log').insert([
        {
          job_id: job.id,
          type,
          recipient_name: job.customerName,
          recipient_phone: job.customerPhone,
          message_body: messageBody,
          status: result.status,
          sent_at: result.sentAt,
          error_message: result.errorMessage ?? null,
          // V4 3.2: capture the Twilio SID so inbound replies can be
          // threaded back to the outbound that prompted them.
          direction: 'outbound',
          provider_message_id: result.providerMessageId ?? null,
        } as any,
      ]);
      if (logError) throw logError;

      if (result.status === 'sent') {
        const column =
          type === 'day_prior'
            ? 'day_prior_sms_sent_at'
            : type === 'en_route'
              ? 'en_route_sms_sent_at'
              : null;
        if (column) {
          const { error: jobError } = await supabase
            .from('jobs')
            .update({ [column]: result.sentAt } as any)
            .eq('id', job.id);
          if (jobError) console.warn('Failed to update job timestamp', jobError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['sms_log'] });
    },
  });
}

/**
 * Phase 21: fire SMS automatically on a status transition.
 *
 * Two events covered today:
 *   - status flips to "In Delivery" → en-route SMS (template: en_route)
 *   - status flips to "Completed"   → delivery confirmation (template: completed)
 *
 * Each is deduped against the relevant timestamp column so a re-mark
 * (e.g. driver hits Complete twice, owner re-completes after rework)
 * never re-spams the customer. No-ops cleanly when:
 *   - the customer phone is missing
 *   - VITE_SMS_PROVIDER isn't 'twilio' (stub provider returns "sent" but
 *     no real SMS leaves; we still log it for parity)
 *   - the dedup column is already populated
 *
 * Called from useUpdateJob.onSuccess where we know the new status.
 */
export async function maybeAutoFireStatusSms(job: Job): Promise<void> {
  if (!job.customerPhone?.trim()) return;
  const newStatus = job.status;
  if (newStatus !== 'In Delivery' && newStatus !== 'Completed') return;

  const isEnRoute = newStatus === 'In Delivery';
  // V5 Phase 1: customer text is gated independently of the status flip.
  // The status update has already landed by the time we get here (this
  // runs inside useUpdateJob.onSuccess) — opting out just skips the SMS.
  const optedOut = isEnRoute ? job.sendEnRoute === false : job.sendComplete === false;
  if (optedOut) return;
  const alreadySent = isEnRoute ? !!job.enRouteSmsSentAt : !!job.completionSmsSentAt;
  if (alreadySent) return;

  // Pick the right template. The DEFAULT_TEMPLATES list has dedicated
  // 'en_route' and 'completed' bodies; the SmsType union doesn't have
  // 'completed' so we tag it as 'other' in sms_log.
  const templateKey = isEnRoute ? 'en_route' : 'completed';
  const body = await resolveTemplateBody(templateKey);
  const messageBody = renderTemplate(body, { job, customer: null, owner: null });
  const smsType: SmsType = isEnRoute ? 'en_route' : 'other';

  let result;
  try {
    result = await sendSms({ to: job.customerPhone, body: messageBody });
  } catch (err) {
    console.warn('[auto-sms] send threw', err);
    return;
  }

  // Log every attempt (sent or failed) so the SMS log has a paper trail.
  try {
    await supabase.from('sms_log').insert([
      {
        job_id: job.id,
        type: smsType,
        recipient_name: job.customerName,
        recipient_phone: job.customerPhone,
        message_body: messageBody,
        status: result.status,
        sent_at: result.sentAt,
        error_message: result.errorMessage ?? null,
        direction: 'outbound',
        provider_message_id: result.providerMessageId ?? null,
      } as never,
    ]);
  } catch (err) {
    console.warn('[auto-sms] log insert failed', err);
  }

  // Stamp the dedup column on success only — a transient failure should
  // be allowed to retry on the next status mutation.
  if (result.status === 'sent') {
    const column = isEnRoute ? 'en_route_sms_sent_at' : 'completion_sms_sent_at';
    try {
      await supabase
        .from('jobs')
        .update({ [column]: result.sentAt } as never)
        .eq('id', job.id);
    } catch (err) {
      console.warn('[auto-sms] dedup column update failed', err);
    }
  }
}

/**
 * V4 Phase 3.1 — fire day-prior reminders to a batch of jobs in one click.
 *
 * Used by the "Send tomorrow's bookings" button on Truck Runs. Accepts the
 * jobs list pre-filtered by the caller (truck-assigned for the picker day,
 * day_prior_sms_sent_at NULL). Issues SMS in parallel, logs each, stamps
 * `day_prior_sms_sent_at` on success, returns aggregate counts so the UI
 * can show "6 sent · 1 failed."
 *
 * Yamin's call quote: "I finish work at 6, 7. I come home and then I do
 * this." He's been typing day-prior reminders by hand for five years.
 * This is the highest-leverage change in the v4 cycle.
 */
export interface BulkDayPriorResult {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  failures: { jobId: string; customerName: string; reason: string }[];
}

export function useSendDayPriorBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobs: Job[]): Promise<BulkDayPriorResult> => {
      const result: BulkDayPriorResult = {
        attempted: jobs.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        failures: [],
      };
      if (jobs.length === 0) return result;
      // V5 Phase 1: respect the per-job send_day_prior toggle. Opt-out
      // rows count as skipped (not failed) and surface in the failure
      // list with an explicit reason so Yamin can see why a job was
      // excluded from the batch.
      const eligible: Job[] = [];
      for (const j of jobs) {
        if (j.sendDayPrior === false) {
          result.skipped += 1;
          result.failures.push({
            jobId: j.id,
            customerName: j.customerName,
            reason: 'Day-prior SMS off',
          });
          continue;
        }
        eligible.push(j);
      }
      if (eligible.length === 0) return result;
      // V4 hot-fix May 4 (round 2): pull the live day-prior body from
      // sms_templates, not the hardcoded default. One DB roundtrip per
      // bulk fire — cheap, but ensures Yamin's edits reach customers.
      const messageBody = await resolveTemplateBody('day_prior');

      // Run in parallel — Twilio handles per-account concurrency fine and
      // typical Rebel batches are <30 jobs/day.
      await Promise.all(
        eligible.map(async (job) => {
          if (!job.customerPhone?.trim()) {
            result.skipped += 1;
            result.failures.push({
              jobId: job.id,
              customerName: job.customerName,
              reason: 'No phone number',
            });
            return;
          }
          const rendered = renderTemplate(messageBody, {
            job,
            customer: { name: job.customerName, phone: job.customerPhone },
            owner: null,
          });
          let send: Awaited<ReturnType<typeof sendSms>>;
          try {
            send = await sendSms({ to: job.customerPhone, body: rendered });
          } catch (err) {
            result.failed += 1;
            result.failures.push({
              jobId: job.id,
              customerName: job.customerName,
              reason: err instanceof Error ? err.message : 'Send threw',
            });
            return;
          }

          // Always log, win or lose, so the SMS log has a paper trail.
          try {
            await supabase.from('sms_log').insert([
              {
                job_id: job.id,
                type: 'day_prior',
                recipient_name: job.customerName,
                recipient_phone: job.customerPhone,
                message_body: rendered,
                status: send.status,
                sent_at: send.sentAt,
                error_message: send.errorMessage ?? null,
                direction: 'outbound',
                provider_message_id: send.providerMessageId ?? null,
              } as any,
            ]);
          } catch (logErr) {
            console.warn('[bulk-day-prior] log insert failed', logErr);
          }

          if (send.status === 'sent') {
            result.sent += 1;
            // Stamp the dedup column so a re-fire skips this job.
            try {
              await supabase
                .from('jobs')
                .update({ day_prior_sms_sent_at: send.sentAt } as any)
                .eq('id', job.id);
            } catch (jobErr) {
              console.warn('[bulk-day-prior] dedup stamp failed', jobErr);
            }
          } else {
            result.failed += 1;
            result.failures.push({
              jobId: job.id,
              customerName: job.customerName,
              reason: send.errorMessage ?? `Provider ${send.status}`,
            });
          }
        }),
      );
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['sms_log'] });
    },
  });
}

interface SendCustomSmsParams {
  to: string;
  recipientName: string;
  body: string;
  jobId?: string | null;
  type?: SmsType;
}

/**
 * V4 Phase 3.3 — mark inbound SMS rows as read so the bell badge clears.
 *
 * Pass an array of sms_log row IDs (assumed all inbound). We stamp read_at
 * server-side; the realtime broadcast picks up the change and the
 * notification bell recomputes its count automatically.
 */
export function useMarkSmsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sms_log')
        .update({ read_at: now } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_log'] });
    },
  });
}

export function useSendCustomSms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ to, recipientName, body, jobId, type = 'other' }: SendCustomSmsParams) => {
      if (!to.trim()) throw new Error('No phone number');
      if (!body.trim()) throw new Error('Message body is empty');

      const result = await sendSms({ to, body });

      const { error: logError } = await supabase.from('sms_log').insert([
        {
          job_id: jobId ?? null,
          type,
          recipient_name: recipientName,
          recipient_phone: to,
          message_body: body,
          status: result.status,
          sent_at: result.sentAt,
          error_message: result.errorMessage ?? null,
          direction: 'outbound',
          provider_message_id: result.providerMessageId ?? null,
        } as any,
      ]);
      if (logError) throw logError;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms_log'] });
    },
  });
}
