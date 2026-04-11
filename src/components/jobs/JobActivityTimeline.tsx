import { Job } from '@/lib/types';
import {
  ClipboardList,
  Calendar,
  Send,
  Truck,
  PackageCheck,
  XCircle,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobActivityTimelineProps {
  job: Job;
}

interface TimelineEvent {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  timestamp: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

const TONE: Record<TimelineEvent['tone'], { dot: string; ring: string; bg: string; fg: string }> = {
  neutral: { dot: 'bg-rebel-text-tertiary', ring: 'ring-rebel-border', bg: 'bg-muted', fg: 'text-rebel-text-secondary' },
  info: { dot: 'bg-rebel-accent', ring: 'ring-rebel-accent/30', bg: 'bg-rebel-accent-surface', fg: 'text-rebel-accent' },
  success: { dot: 'bg-rebel-success', ring: 'ring-rebel-success/30', bg: 'bg-rebel-success-surface', fg: 'text-rebel-success' },
  warning: { dot: 'bg-rebel-warning', ring: 'ring-rebel-warning/30', bg: 'bg-rebel-warning-surface', fg: 'text-rebel-warning' },
  danger: { dot: 'bg-rebel-danger', ring: 'ring-rebel-danger/30', bg: 'bg-rebel-danger-surface', fg: 'text-rebel-danger' },
};

export function JobActivityTimeline({ job }: JobActivityTimelineProps) {
  const events = buildEvents(job);

  if (events.length === 0) {
    return (
      <p className="text-[11px] text-rebel-text-tertiary py-4 text-center">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-3">
      {/* Vertical rail */}
      <div
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-rebel-border"
      />
      {events.map((event) => {
        const tone = TONE[event.tone];
        const Icon = event.icon;
        return (
          <li key={event.id} className="relative flex gap-3 pl-0">
            <div
              className={cn(
                'relative z-10 h-8 w-8 rounded-full flex items-center justify-center ring-2 shrink-0',
                tone.bg,
                tone.ring,
                'ring-offset-2 ring-offset-card',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', tone.fg)} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-[12px] font-semibold text-rebel-text">{event.title}</p>
                <p className="text-[10.5px] text-rebel-text-tertiary font-mono shrink-0">{event.timestamp}</p>
              </div>
              {event.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                  {event.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function buildEvents(job: Job): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (job.createdAt) {
    events.push({
      id: 'created',
      icon: ClipboardList,
      title: 'Quote created',
      description: `${job.type} · ${formatMoney(job.fee + (job.fuelLevy ?? 0))}`,
      timestamp: formatStamp(job.createdAt),
      tone: 'neutral',
    });
  }

  if (job.status === 'Declined') {
    events.push({
      id: 'declined',
      icon: XCircle,
      title: 'Declined',
      description: job.declineReason ?? undefined,
      timestamp: formatStamp(job.createdAt),
      tone: 'danger',
    });
    return events;
  }

  if (job.assignedTruck && job.date) {
    events.push({
      id: 'scheduled',
      icon: Calendar,
      title: `Scheduled · ${job.assignedTruck}`,
      description: formatDateOnly(job.date),
      timestamp: formatStamp(job.createdAt),
      tone: 'info',
    });
  }

  if (job.dayPriorSmsSentAt) {
    events.push({
      id: 'day_prior_sms',
      icon: Send,
      title: 'Day-prior SMS sent',
      timestamp: formatStamp(job.dayPriorSmsSentAt),
      tone: 'info',
    });
  }

  if (job.enRouteSmsSentAt) {
    events.push({
      id: 'en_route_sms',
      icon: Truck,
      title: 'En-route SMS sent',
      timestamp: formatStamp(job.enRouteSmsSentAt),
      tone: 'info',
    });
  }

  if (job.status === 'Notified' || job.status === 'In Delivery') {
    events.push({
      id: 'in_delivery',
      icon: Truck,
      title: job.status === 'In Delivery' ? 'In delivery' : 'Driver notified',
      timestamp: formatStamp(job.enRouteSmsSentAt ?? job.createdAt),
      tone: 'warning',
    });
  }

  if (job.status === 'Completed' || job.status === 'Invoiced') {
    const proofBits: string[] = [];
    if (job.proofPhoto) proofBits.push('photo');
    if (job.signature) proofBits.push('signature');
    events.push({
      id: 'completed',
      icon: PackageCheck,
      title: job.status === 'Invoiced' ? 'Invoiced' : 'Marked complete',
      description: proofBits.length > 0 ? `Proof: ${proofBits.join(' + ')}` : 'No proof captured',
      timestamp: formatStamp(job.createdAt),
      tone: 'success',
    });
  }

  // Surface the latest note line so the timeline shows the freshest update
  const lastNote = lastNoteLine(job.notes);
  if (lastNote) {
    events.push({
      id: `note-${lastNote.timestamp}`,
      icon: StickyNote,
      title: lastNote.author ? `Note from ${lastNote.author}` : 'Note added',
      description: lastNote.body,
      timestamp: lastNote.timestamp,
      tone: 'neutral',
    });
  }

  return events;
}

function formatStamp(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'd MMM · HH:mm');
  } catch {
    return iso.slice(0, 16);
  }
}

function formatDateOnly(iso: string): string {
  try {
    return format(parseISO(iso), 'EEE d MMM yyyy');
  } catch {
    return iso;
  }
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

interface NoteLine {
  timestamp: string;
  author?: string;
  body: string;
}

function lastNoteLine(notes: string | undefined): NoteLine | null {
  if (!notes) return null;
  const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  // Look for the last line that matches our `[YYYY-MM-DD HH:mm · Author] body` shape
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      const tagParts = match[1].split('·').map((s) => s.trim());
      return {
        timestamp: tagParts[0] ?? '',
        author: tagParts[1],
        body: match[2],
      };
    }
  }
  // Untagged note — show as-is, no timestamp
  return { timestamp: '', body: lines[lines.length - 1] };
}
