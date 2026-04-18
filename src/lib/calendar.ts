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
 * Google Calendar colorId palette (11 slots). We map trucks onto distinct
 * colors so Yamen's week on his phone is a glance-readable heatmap. Unknown
 * trucks fall back to the brand-blue "Blueberry" (9).
 */
const TRUCK_COLOR_MAP: Record<string, string> = {
  'Truck 1': '9', // Blueberry — brand blue
  'Truck 2': '10', // Basil — green
  'Truck 3': '6', // Tangerine — orange
  'Truck 4': '5', // Banana — yellow
  'Truck 5': '3', // Grape — purple
  'Truck 6': '11', // Tomato — red
};

export function colorIdForTruck(truck: string | undefined): string {
  if (!truck) return '8'; // Graphite — neutral gray for unassigned
  return TRUCK_COLOR_MAP[truck] ?? '9';
}

export function buildCalendarEventFromJob(
  job: Job,
  options: BuildCalendarEventOptions = {},
): CalendarEventPayload {
  const summary = formatSummary(job);
  const description = formatDescription(job);
  const location = job.deliveryAddress?.trim() || job.pickupAddress?.trim() || '';
  const colorId = colorIdForTruck(job.assignedTruck);
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
