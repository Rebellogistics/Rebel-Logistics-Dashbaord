import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertSeverity, useAlerts, alertKindLabel } from '@/hooks/useAlerts';
import { Job, SmsLogEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NotificationsBellProps {
  jobs: Job[];
  smsLog: SmsLogEntry[];
  onAlertAction?: (alert: Alert) => void;
}

const SEVERITY_THEME: Record<
  AlertSeverity,
  { ring: string; bg: string; fg: string; icon: typeof AlertOctagon }
> = {
  critical: {
    ring: 'ring-rebel-danger/30',
    bg: 'bg-rebel-danger-surface',
    fg: 'text-rebel-danger',
    icon: AlertOctagon,
  },
  warning: {
    ring: 'ring-rebel-warning/30',
    bg: 'bg-rebel-warning-surface',
    fg: 'text-rebel-warning',
    icon: AlertTriangle,
  },
  info: {
    ring: 'ring-rebel-accent/30',
    bg: 'bg-rebel-accent-surface',
    fg: 'text-rebel-accent',
    icon: Info,
  },
};

export function NotificationsBell({ jobs, smsLog, onAlertAction }: NotificationsBellProps) {
  const { alerts, byKind, total, highestSeverity } = useAlerts(jobs, smsLog);

  const dotColor =
    highestSeverity === 'critical'
      ? 'bg-rebel-danger'
      : highestSeverity === 'warning'
        ? 'bg-rebel-warning'
        : 'bg-rebel-accent';

  // Render groups in severity order
  const groupOrder: (keyof typeof byKind)[] = [
    'sms_failed',
    'eta_overdue',
    'missing_proof',
    'unassigned_scheduled',
    'day_prior_unsent',
    'run_started',
    'delivery_completed',
  ];

  return (
    <Popover>
      <PopoverTrigger
        aria-label={total > 0 ? `${total} alerts` : 'Notifications'}
        className="relative h-9 w-9 inline-flex items-center justify-center rounded-xl border border-rebel-border bg-card text-rebel-text-secondary hover:text-rebel-text hover:border-rebel-border-strong transition-colors"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <>
            <span className={cn('absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full animate-rebel-ping', dotColor)} />
            <span className={cn('absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full', dotColor)} />
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-[380px] p-0 bg-popover border-0 ring-0 shadow-popover rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-rebel-border">
          <div>
            <p className="text-[13px] font-bold text-rebel-text">Notifications</p>
            <p className="text-[10.5px] text-rebel-text-tertiary mt-0.5">
              {total === 0
                ? 'All clear · everything looks good'
                : `${total} ${total === 1 ? 'item needs' : 'items need'} attention`}
            </p>
          </div>
          {total > 0 && (
            <span
              className={cn(
                'inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md text-[10px] font-bold',
                highestSeverity === 'critical' && 'bg-rebel-danger-surface text-rebel-danger',
                highestSeverity === 'warning' && 'bg-rebel-warning-surface text-rebel-warning',
                highestSeverity === 'info' && 'bg-rebel-accent-surface text-rebel-accent',
              )}
            >
              {total}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[440px] overflow-y-auto">
          {total === 0 ? (
            <EmptyState />
          ) : (
            <div className="p-2">
              {groupOrder.map((kind) => {
                const group = byKind[kind];
                if (group.length === 0) return null;
                return (
                  <div key={kind} className="mb-2 last:mb-0">
                    <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
                      {alertKindLabel(kind)} · {group.length}
                    </p>
                    <div className="space-y-1">
                      {group.map((alert) => (
                        <AlertRow key={alert.id} alert={alert} onAction={onAlertAction} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AlertRow({ alert, onAction }: { alert: Alert; onAction?: (a: Alert) => void }) {
  const theme = SEVERITY_THEME[alert.severity];
  const Icon = theme.icon;
  return (
    <button
      type="button"
      onClick={() => onAction?.(alert)}
      className="group w-full text-left rounded-xl p-2.5 hover:bg-muted transition-colors flex gap-2.5 items-start"
    >
      <div
        className={cn(
          'shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ring-1',
          theme.bg,
          theme.ring,
        )}
      >
        <Icon className={cn('w-3.5 h-3.5', theme.fg)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-rebel-text truncate">{alert.title}</p>
        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{alert.description}</p>
      </div>
      {alert.actionLabel && (
        <span className="shrink-0 inline-flex items-center gap-0.5 h-7 px-2 rounded-lg bg-card border border-rebel-border text-[10.5px] font-semibold text-rebel-text-secondary group-hover:border-rebel-accent/40 group-hover:text-rebel-accent transition-colors">
          {alert.actionLabel}
          <ChevronRight className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-rebel-success-surface flex items-center justify-center">
        <CheckCircle2 className="w-5 h-5 text-rebel-success" />
      </div>
      <p className="mt-3 text-[13px] font-semibold text-rebel-text">All clear</p>
      <p className="mt-1 text-[11px] text-rebel-text-tertiary">
        No alerts right now. We'll ping you when something needs attention.
      </p>
    </div>
  );
}
