import { Job } from './types';

/**
 * Pure helpers for building Google Calendar event payloads from Job rows.
 *
 * The OAuth flow and the actual API call live behind Yamen's Google Cloud
 * credentials (see DEFERRED.md). Keeping the payload construction separate
 * means when creds land the only new surface is the HTTP call — everything
 * else is already tested.
 *
 * Event shape follows Phase 10.2 in ACTIONABLES_POST_CALL_APR13.md:
 *   - Title:   "🚚 {customer} · {type} · {truck}"
 *   - Desc:    pickup, delivery, phone, fee, notes
 *   - Loc:     delivery address (so Maps opens on tap)
 *   - Color:   by truck — Google Calendar colorId 1–11
 */

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  colorId: string;
  /** ISO date (YYYY-MM-DD) — all-day event; we don't know pickup time yet. */
  start: { date: string };
  end: { date: string };
}

export interface BuildCalendarEventOptions {
  /** Override today's date for snapshot tests. */
  fallbackDate?: string;
}

/**
 * Google Calendar colorId palette (11 slots). We map *job types* onto
 * distinct colours so Yamin's week on his phone reads at a glance:
 *   White Glove → Blueberry (9, brand blue) — premium, careful work
 *   Standard    → Basil (10, green)         — bread-and-butter delivery
 *   House Move  → Tangerine (6, orange)     — full-day hourly work
 * Trucks share colour because the truck name is already in the title.
 */
const TYPE_COLOR_MAP: Record<string, string> = {
  'White Glove': '9',
  Standard: '10',
  'House Move': '6',
};

export function colorIdForJobType(type: string | undefined): string {
  if (!type) return '8';
  return TYPE_COLOR_MAP[type] ?? '9';
}

// Backwards-compat re-export for any callers that still reference the old name.
export const colorIdForTruck = colorIdForJobType;

export function buildCalendarEventFromJob(
  job: Job,
  options: BuildCalendarEventOptions = {},
): CalendarEventPayload {
  const summary = formatSummary(job);
  const description = formatDescription(job);
  const location = job.deliveryAddress?.trim() || job.pickupAddress?.trim() || '';
  const colorId = colorIdForJobType(job.type);
  const date = job.date || options.fallbackDate || new Date().toISOString().slice(0, 10);

  return {
    summary,
    description,
    location,
    colorId,
    start: { date },
    end: { date: addOneDay(date) },
  };
}

export function formatSummary(job: Job): string {
  const parts = ['🚚', job.customerName?.trim() || 'Customer', '·', job.type];
  if (job.assignedTruck) parts.push('·', job.assignedTruck);
  return parts.join(' ');
}

export function formatDescription(job: Job): string {
  const lines: string[] = [];
  if (job.pickupAddress?.trim()) lines.push(`Pickup: ${job.pickupAddress.trim()}`);
  if (job.deliveryAddress?.trim()) lines.push(`Delivery: ${job.deliveryAddress.trim()}`);
  if (job.customerPhone?.trim()) lines.push(`Phone: ${job.customerPhone.trim()}`);
  const total = (job.fee ?? 0) + (job.fuelLevy ?? 0);
  if (total > 0) {
    const pricing =
      job.pricingType === 'hourly' && job.hourlyRate && job.hoursEstimated
        ? ` (${job.hoursEstimated}h × $${job.hourlyRate})`
        : '';
    lines.push(`Fee: $${total.toFixed(2)}${pricing}`);
  }
  if (job.notes?.trim()) {
    lines.push('');
    lines.push(job.notes.trim());
  }
  lines.push('');
  lines.push(`Rebel Logistics · ${job.id}`);
  return lines.join('\n');
}

/** Returns true when a job's state should be reflected in calendar. */
export function isCalendarSyncable(job: Job): boolean {
  return (
    job.status === 'Accepted' ||
    job.status === 'Scheduled' ||
    job.status === 'Notified' ||
    job.status === 'In Delivery'
  );
}

/** Returns true when a prior calendar event should be removed. */
export function isCalendarDeletable(job: Job): boolean {
  return job.status === 'Declined';
}

function addOneDay(isoDate: string): string {
  // All-day events on Google Calendar use an exclusive end date (next day).
  try {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  } catch {
    return isoDate;
  }
}
