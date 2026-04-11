import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Job, Customer, SmsLogEntry, SmsType } from '../lib/types';
import { renderTemplate, defaultBodyForType, sendSms } from '../lib/sms';

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

      const templateBody = body ?? defaultBodyForType(type);
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

interface SendCustomSmsParams {
  to: string;
  recipientName: string;
  body: string;
  jobId?: string | null;
  type?: SmsType;
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
