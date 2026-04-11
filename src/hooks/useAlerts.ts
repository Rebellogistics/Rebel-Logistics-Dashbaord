import { useMemo } from 'react';
import { Job, SmsLogEntry } from '@/lib/types';
import { format, addDays, parseISO, isAfter, startOfDay } from 'date-fns';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertKind =
  | 'sms_failed'
  | 'eta_overdue'
  | 'missing_proof'
  | 'unassigned_scheduled'
  | 'day_prior_unsent';

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  description: string;
  jobId?: string;
  smsId?: string;
  /** What the action button should open */
  action?: 'view_job' | 'mark_complete' | 'assign_truck' | 'view_sms';
  actionLabel?: string;
  /** Sort key — newer/more urgent first */
  weight: number;
}

interface UseAlertsResult {
  alerts: Alert[];
  byKind: Record<AlertKind, Alert[]>;
  total: number;
  highestSeverity: AlertSeverity | null;
}

export function useAlerts(jobs: Job[], smsLog: SmsLogEntry[]): UseAlertsResult {
  return useMemo(() => {
    const alerts: Alert[] = [];
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');

    // 1. Failed SMS — critical
    for (const entry of smsLog) {
      if (entry.status !== 'failed') continue;
      alerts.push({
        id: `sms-failed-${entry.id}`,
        kind: 'sms_failed',
        severity: 'critical',
        title: `SMS failed to ${entry.recipientName || entry.recipientPhone}`,
        description: entry.errorMessage || 'Carrier rejected the message — check the number and retry.',
        smsId: entry.id,
        jobId: entry.jobId ?? undefined,
        action: entry.jobId ? 'view_job' : 'view_sms',
        actionLabel: entry.jobId ? 'Open job' : 'View log',
        weight: 1000 + Date.parse(entry.sentAt || entry.createdAt || '0'),
      });
    }

    // 2. Overdue ETAs — critical
    for (const job of jobs) {
      if (job.status !== 'In Delivery') continue;
      try {
        const jobDate = parseISO(job.date);
        if (isAfter(today, jobDate)) {
          alerts.push({
            id: `eta-overdue-${job.id}`,
            kind: 'eta_overdue',
            severity: 'critical',
            title: `${job.customerName} — overdue`,
            description: `In Delivery since ${format(jobDate, 'MMM d')}. Check in with ${job.assignedTruck ?? 'the driver'}.`,
            jobId: job.id,
            action: 'mark_complete',
            actionLabel: 'Mark complete',
            weight: 900 + Date.parse(job.date),
          });
        }
      } catch {
        // ignore unparseable
      }
    }

    // 3. Missing proof — warning
    for (const job of jobs) {
      if (job.status !== 'Completed' && job.status !== 'Invoiced') continue;
      if (job.proofPhoto && job.signature) continue;
      const missing: string[] = [];
      if (!job.proofPhoto) missing.push('photo');
      if (!job.signature) missing.push('signature');
      alerts.push({
        id: `missing-proof-${job.id}`,
        kind: 'missing_proof',
        severity: 'warning',
        title: `${job.customerName} — missing ${missing.join(' & ')}`,
        description: `Closed ${job.date} but no ${missing.join(' or ')} on file.`,
        jobId: job.id,
        action: 'mark_complete',
        actionLabel: 'Backfill',
        weight: 600 + Date.parse(job.date || '0'),
      });
    }

    // 4. Unassigned scheduled jobs — warning
    for (const job of jobs) {
      if (job.status !== 'Scheduled') continue;
      if (job.assignedTruck) continue;
      alerts.push({
        id: `unassigned-${job.id}`,
        kind: 'unassigned_scheduled',
        severity: 'warning',
        title: `${job.customerName} — no truck assigned`,
        description: `Scheduled for ${job.date} but no truck picked yet.`,
        jobId: job.id,
        action: 'view_job',
        actionLabel: 'Assign',
        weight: 700,
      });
    }

    // 5. Day-prior SMS not sent — info (only for tomorrow's runs)
    for (const job of jobs) {
      if (job.date !== tomorrowStr) continue;
      if (job.status === 'Quote' || job.status === 'Declined') continue;
      if (job.dayPriorSmsSentAt) continue;
      alerts.push({
        id: `day-prior-${job.id}`,
        kind: 'day_prior_unsent',
        severity: 'info',
        title: `${job.customerName} — day-prior SMS not sent`,
        description: `Heads-up scheduled for tomorrow (${tomorrowStr}). Send the day-prior reminder.`,
        jobId: job.id,
        action: 'view_job',
        actionLabel: 'Open job',
        weight: 400,
      });
    }

    // Sort by weight desc, then severity rank
    const severityRank: Record<AlertSeverity, number> = { critical: 3, warning: 2, info: 1 };
    alerts.sort((a, b) => {
      const sev = severityRank[b.severity] - severityRank[a.severity];
      if (sev !== 0) return sev;
      return b.weight - a.weight;
    });

    const byKind: Record<AlertKind, Alert[]> = {
      sms_failed: [],
      eta_overdue: [],
      missing_proof: [],
      unassigned_scheduled: [],
      day_prior_unsent: [],
    };
    for (const a of alerts) byKind[a.kind].push(a);

    let highest: AlertSeverity | null = null;
    if (alerts.some((a) => a.severity === 'critical')) highest = 'critical';
    else if (alerts.some((a) => a.severity === 'warning')) highest = 'warning';
    else if (alerts.some((a) => a.severity === 'info')) highest = 'info';

    // Suppress unused-var warning when today is referenced via todayStr only above
    void todayStr;

    return { alerts, byKind, total: alerts.length, highestSeverity: highest };
  }, [jobs, smsLog]);
}

export function alertKindLabel(kind: AlertKind): string {
  switch (kind) {
    case 'sms_failed':
      return 'Failed SMS';
    case 'eta_overdue':
      return 'Overdue deliveries';
    case 'missing_proof':
      return 'Missing proof';
    case 'unassigned_scheduled':
      return 'Unassigned';
    case 'day_prior_unsent':
      return 'Day-prior reminders';
  }
}
