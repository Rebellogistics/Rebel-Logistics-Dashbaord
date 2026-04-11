import { useMemo } from 'react';
import { Job, Customer, SmsLogEntry } from '@/lib/types';
import { normalizePhone } from '@/hooks/useRepeatCustomer';

export type SearchResultKind = 'job' | 'customer' | 'sms';
export type SearchScope = 'all' | 'jobs' | 'customers' | 'sms' | 'none';

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  meta?: string;
  /** What the consumer should open */
  job?: Job;
  customer?: Customer;
  sms?: SmsLogEntry;
  score: number;
}

interface UseSearchInput {
  query: string;
  jobs: Job[];
  customers: Customer[];
  smsLog: SmsLogEntry[];
  scope: SearchScope;
  limit?: number;
}

interface UseSearchResult {
  results: SearchResult[];
  byKind: Record<SearchResultKind, SearchResult[]>;
  total: number;
}

const KIND_BOOST: Record<SearchResultKind, number> = {
  customer: 1.1,
  job: 1.0,
  sms: 0.9,
};

export function useSearch({
  query,
  jobs,
  customers,
  smsLog,
  scope,
  limit = 18,
}: UseSearchInput): UseSearchResult {
  return useMemo(() => {
    const trimmed = query.trim();
    const lowered = trimmed.toLowerCase();
    const digits = normalizePhone(trimmed);
    const tokens = lowered.split(/\s+/).filter(Boolean);

    const results: SearchResult[] = [];

    if (scope === 'all' || scope === 'customers') {
      for (const c of customers) {
        const score = scoreCustomer(c, lowered, tokens, digits);
        if (score <= 0 && trimmed.length > 0) continue;
        results.push({
          id: `customer-${c.id}`,
          kind: 'customer',
          title: c.companyName ?? c.name,
          subtitle: c.companyName && c.name ? c.name : c.phone ?? c.email ?? 'no contact',
          meta: c.vip ? 'VIP' : c.type,
          customer: c,
          score: score * KIND_BOOST.customer,
        });
      }
    }

    if (scope === 'all' || scope === 'jobs') {
      for (const j of jobs) {
        const score = scoreJob(j, lowered, tokens, digits);
        if (score <= 0 && trimmed.length > 0) continue;
        results.push({
          id: `job-${j.id}`,
          kind: 'job',
          title: j.customerName,
          subtitle: `${truncate(j.pickupAddress, 28)} → ${truncate(j.deliveryAddress, 28)}`,
          meta: `${j.status} · ${j.date}`,
          job: j,
          score: score * KIND_BOOST.job,
        });
      }
    }

    if (scope === 'all' || scope === 'sms') {
      for (const s of smsLog) {
        const score = scoreSms(s, lowered, tokens, digits);
        if (score <= 0 && trimmed.length > 0) continue;
        results.push({
          id: `sms-${s.id}`,
          kind: 'sms',
          title: s.recipientName || s.recipientPhone,
          subtitle: truncate(s.messageBody, 60),
          meta: `${s.status} · ${s.type}`,
          sms: s,
          score: score * KIND_BOOST.sms,
        });
      }
    }

    // For empty query: show recent items per scope (top of list, no score-based filter)
    if (trimmed.length === 0) {
      results.sort(recencySort);
    } else {
      results.sort((a, b) => b.score - a.score);
    }

    const truncated = results.slice(0, limit);

    const byKind: Record<SearchResultKind, SearchResult[]> = {
      job: [],
      customer: [],
      sms: [],
    };
    for (const r of truncated) byKind[r.kind].push(r);

    return { results: truncated, byKind, total: truncated.length };
  }, [query, jobs, customers, smsLog, scope, limit]);
}

// ────────────────────────────────────────────────────────────
// Scorers
// ────────────────────────────────────────────────────────────

function scoreCustomer(c: Customer, lowered: string, tokens: string[], digits: string): number {
  if (!lowered) return c.vip ? 50 : 10; // recency tie-breaker handles it
  let score = 0;
  const hay = [c.name, c.companyName, c.email, c.phone, c.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (c.name?.toLowerCase().startsWith(lowered)) score += 100;
  if (c.companyName?.toLowerCase().startsWith(lowered)) score += 100;
  for (const t of tokens) if (hay.includes(t)) score += 20;
  if (digits.length >= 3 && c.phone && normalizePhone(c.phone).includes(digits)) score += 80;
  return score;
}

function scoreJob(j: Job, lowered: string, tokens: string[], digits: string): number {
  if (!lowered) return Date.parse(j.createdAt || j.date || '0') / 1e10;
  let score = 0;
  const hay = [
    j.customerName,
    j.customerPhone,
    j.pickupAddress,
    j.deliveryAddress,
    j.id,
    j.notes,
    j.assignedTruck,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (j.customerName.toLowerCase().startsWith(lowered)) score += 90;
  for (const t of tokens) if (hay.includes(t)) score += 18;
  if (j.id.toLowerCase().includes(lowered)) score += 60;
  if (digits.length >= 3 && j.customerPhone && normalizePhone(j.customerPhone).includes(digits)) {
    score += 70;
  }
  return score;
}

function scoreSms(s: SmsLogEntry, lowered: string, tokens: string[], digits: string): number {
  if (!lowered) return Date.parse(s.sentAt || s.createdAt || '0') / 1e10;
  let score = 0;
  const hay = [s.recipientName, s.recipientPhone, s.messageBody, s.errorMessage, s.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const t of tokens) if (hay.includes(t)) score += 16;
  if (digits.length >= 3 && s.recipientPhone && normalizePhone(s.recipientPhone).includes(digits)) {
    score += 60;
  }
  return score;
}

function recencySort(a: SearchResult, b: SearchResult): number {
  const aDate = recencyDate(a);
  const bDate = recencyDate(b);
  return bDate - aDate;
}

function recencyDate(r: SearchResult): number {
  if (r.job) return Date.parse(r.job.createdAt || r.job.date || '0');
  if (r.sms) return Date.parse(r.sms.sentAt || r.sms.createdAt || '0');
  if (r.customer) return Date.parse(r.customer.createdAt || '0');
  return 0;
}

function truncate(s: string | undefined | null, n: number): string {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}
