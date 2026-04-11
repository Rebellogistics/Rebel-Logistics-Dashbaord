import { JobStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: JobStatus | string;
  size?: 'xs' | 'sm' | 'md';
  withDot?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; ring: string; dot: string }> = {
  Quote: {
    bg: 'bg-muted',
    fg: 'text-muted-foreground',
    ring: 'ring-border',
    dot: 'bg-muted-foreground',
  },
  Accepted: {
    bg: 'bg-rebel-success-surface',
    fg: 'text-rebel-success',
    ring: 'ring-rebel-success/20',
    dot: 'bg-rebel-success',
  },
  Scheduled: {
    bg: 'bg-rebel-accent-surface',
    fg: 'text-rebel-accent',
    ring: 'ring-rebel-accent/20',
    dot: 'bg-rebel-accent',
  },
  Notified: {
    bg: 'bg-rebel-warning-surface',
    fg: 'text-rebel-warning',
    ring: 'ring-rebel-warning/20',
    dot: 'bg-rebel-warning',
  },
  'In Delivery': {
    bg: 'bg-rebel-accent-surface',
    fg: 'text-rebel-accent',
    ring: 'ring-rebel-accent/30',
    dot: 'bg-rebel-accent',
  },
  Completed: {
    bg: 'bg-rebel-success-surface',
    fg: 'text-rebel-success',
    ring: 'ring-rebel-success/20',
    dot: 'bg-rebel-success',
  },
  Invoiced: {
    bg: 'bg-rebel-success-surface',
    fg: 'text-rebel-success',
    ring: 'ring-rebel-success/30',
    dot: 'bg-rebel-success',
  },
  Declined: {
    bg: 'bg-rebel-danger-surface',
    fg: 'text-rebel-danger',
    ring: 'ring-rebel-danger/20',
    dot: 'bg-rebel-danger',
  },
};

const SIZE_CLASSES = {
  xs: 'h-4 px-1.5 text-[9px] gap-1',
  sm: 'h-5 px-2 text-[10px] gap-1.5',
  md: 'h-6 px-2.5 text-[11px] gap-1.5',
};

const DOT_SIZE = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-1.5 w-1.5',
};

export function StatusPill({
  status,
  size = 'sm',
  withDot = false,
  className,
}: StatusPillProps) {
  const theme = STATUS_STYLES[status] ?? STATUS_STYLES.Quote;
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider rounded-md ring-1',
        theme.bg,
        theme.fg,
        theme.ring,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {withDot && <span className={cn('rounded-full', theme.dot, DOT_SIZE[size])} />}
      {status}
    </span>
  );
}

export function statusGradient(status: JobStatus | string): [string, string] {
  switch (status) {
    case 'Accepted':
    case 'Completed':
    case 'Invoiced':
      return ['#0E9F6E', '#10B981'];
    case 'Notified':
      return ['#E65F1C', '#F59E0B'];
    case 'In Delivery':
    case 'Scheduled':
      return ['#2D5BFF', '#1E47E6'];
    case 'Declined':
      return ['#E11D48', '#F43F5E'];
    default:
      return ['#5B6477', '#9AA1B2'];
  }
}
