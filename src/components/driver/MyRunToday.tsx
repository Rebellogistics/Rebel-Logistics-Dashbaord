import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/lib/types';
import { useJobs, useUpdateJob } from '@/hooks/useSupabaseData';
import { useSendSmsForJob } from '@/hooks/useSms';
import {
  MapPin,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  StickyNote,
  Calendar,
  Play,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { MarkDeliveredSheet } from './MarkDeliveredSheet';
import { StatusPill } from '@/components/ui/status-pill';
import { toast } from 'sonner';

const ACTIVE_STATUSES: Job['status'][] = ['Accepted', 'Scheduled', 'Notified', 'In Delivery'];

type Filter = 'all' | 'todo' | 'done';

export function MyRunToday() {
  const { data: jobs = [], isLoading, error } = useJobs();
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [startingId, setStartingId] = useState<string | null>(null);
  const updateJob = useUpdateJob();
  const sendSms = useSendSmsForJob();

  const handleStartRun = async (job: Job) => {
    setStartingId(job.id);
    try {
      await updateJob.mutateAsync({ id: job.id, status: 'In Delivery' });
      // Best-effort en-route SMS — don't block the status change if SMS fails
      if (job.customerPhone?.trim() && !job.enRouteSmsSentAt) {
        try {
          await sendSms.mutateAsync({ job, type: 'en_route' });
          toast.success(`Started run · en-route SMS sent to ${job.customerName}`);
        } catch (smsErr) {
          console.warn('en-route SMS failed', smsErr);
          toast.success('Started run · SMS will retry later');
        }
      } else {
        toast.success('Started run');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start run';
      toast.error(message);
    } finally {
      setStartingId(null);
    }
  };

  const { todaysJobs, recentJobs } = useMemo(() => {
    const today: Job[] = [];
    const recent: Job[] = [];
    for (const job of jobs) {
      if (!job.date) continue;
      try {
        const d = parseISO(job.date);
        if (isToday(d)) {
          today.push(job);
        } else {
          recent.push(job);
        }
      } catch {
        // bad date — ignore
      }
    }
    // Sort today's jobs by creation time (earlier first)
    today.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    // Sort recent jobs by date desc (most recent first)
    recent.sort((a, b) => b.date.localeCompare(a.date));
    return { todaysJobs: today, recentJobs: recent };
  }, [jobs]);

  const todayStats = useMemo(() => {
    const active = todaysJobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
    const done = todaysJobs.filter((j) => j.status === 'Completed' || j.status === 'Invoiced').length;
    return { active, done, total: todaysJobs.length };
  }, [todaysJobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rebel-accent mx-auto mb-3"></div>
          <p className="text-xs text-muted-foreground">Loading your run…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/40 shadow-none">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-900">Couldn't load your jobs</p>
          <p className="text-xs text-red-800">
            Check your connection and try again. If the problem persists, message Yemen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section className="space-y-3">
          <SectionHeader
            title="Today"
            subtitle={format(new Date(), 'EEEE d MMM')}
            count={todayStats.total}
          />

          {todayStats.total === 0 ? (
            <EmptyState message="No jobs scheduled for today. Enjoy the break." />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <FilterPill
                  label="All"
                  value={todayStats.total}
                  active={filter === 'all'}
                  onClick={() => setFilter('all')}
                />
                <FilterPill
                  label="To do"
                  value={todayStats.active}
                  accent="orange"
                  active={filter === 'todo'}
                  onClick={() => setFilter('todo')}
                />
                <FilterPill
                  label="Done"
                  value={todayStats.done}
                  accent="green"
                  active={filter === 'done'}
                  onClick={() => setFilter('done')}
                />
              </div>
              <div className="space-y-3">
                {todaysJobs
                  .filter((j) => {
                    if (filter === 'todo') return ACTIVE_STATUSES.includes(j.status);
                    if (filter === 'done') return j.status === 'Completed' || j.status === 'Invoiced';
                    return true;
                  })
                  .map((job) => (
                    <DriverJobCard
                      key={job.id}
                      job={job}
                      onMarkDelivered={setCompleteTarget}
                      onStartRun={handleStartRun}
                      starting={startingId === job.id}
                    />
                  ))}
              </div>
            </>
          )}
        </section>

        {recentJobs.length > 0 && (
          <section className="space-y-3">
            <SectionHeader title="Earlier this week" count={recentJobs.length} />
            <div className="space-y-2">
              {recentJobs.slice(0, 5).map((job) => (
                <DriverJobCard
                  key={job.id}
                  job={job}
                  onMarkDelivered={setCompleteTarget}
                  onStartRun={handleStartRun}
                  starting={startingId === job.id}
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <MarkDeliveredSheet job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count: number;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
        {count}
      </Badge>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-8 text-center space-y-2">
        <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

interface FilterPillProps {
  label: string;
  value: number;
  accent?: 'default' | 'orange' | 'green';
  active: boolean;
  onClick: () => void;
}

function FilterPill({ label, value, accent = 'default', active, onClick }: FilterPillProps) {
  const styles: Record<NonNullable<FilterPillProps['accent']>, string> = {
    default: active
      ? 'bg-rebel-accent text-white'
      : 'bg-card border border-rebel-border text-rebel-text-secondary',
    orange: active
      ? 'bg-rebel-warning text-white'
      : 'bg-rebel-warning-surface text-rebel-warning border border-rebel-warning/30',
    green: active
      ? 'bg-rebel-success text-white'
      : 'bg-rebel-success-surface text-rebel-success border border-rebel-success/30',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl px-3 py-2 transition-all active:scale-[0.98]',
        styles[accent],
      )}
    >
      <p className="text-[9px] uppercase tracking-wider font-bold opacity-90">{label}</p>
      <p className="text-[18px] font-bold leading-tight tabular-nums">{value}</p>
    </button>
  );
}

interface DriverJobCardProps {
  job: Job;
  onMarkDelivered: (job: Job) => void;
  onStartRun: (job: Job) => void;
  starting?: boolean;
  compact?: boolean;
}

function DriverJobCard({ job, onMarkDelivered, onStartRun, starting, compact }: DriverJobCardProps) {
  const isDone = job.status === 'Completed' || job.status === 'Invoiced';
  const isInDelivery = job.status === 'In Delivery';
  const canStart = job.status === 'Scheduled' || job.status === 'Accepted' || job.status === 'Notified';
  const hasPhone = !!job.customerPhone?.trim();

  return (
    <Card
      className={cn(
        'border shadow-none',
        isDone ? 'bg-green-50/40 border-green-200' : 'bg-card'
      )}
    >
      <CardContent className={cn('space-y-3', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn('font-bold truncate', compact ? 'text-sm' : 'text-base')}>
              {job.customerName}
            </p>
            {job.date && !compact && (
              <p className="text-[10px] text-muted-foreground">
                {format(parseISO(job.date), 'EEE d MMM')}
              </p>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="text-muted-foreground">From: </span>
                {job.pickupAddress || '—'}
              </p>
              <p className="truncate">
                <span className="text-muted-foreground">To: </span>
                {job.deliveryAddress || '—'}
              </p>
            </div>
          </div>

          {hasPhone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a
                href={`tel:${job.customerPhone}`}
                className="text-rebel-accent font-medium hover:underline"
              >
                {job.customerPhone}
              </a>
            </div>
          )}

          {job.notes && !compact && (
            <div className="flex items-start gap-2 text-xs bg-amber-50/50 border border-amber-200 rounded-lg p-2">
              <StickyNote className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap text-amber-900">{job.notes}</p>
            </div>
          )}
        </div>

        {!isDone && !compact && (
          <div className="flex flex-col gap-2">
            {canStart && (
              <Button
                onClick={() => onStartRun(job)}
                disabled={starting}
                className="w-full h-12 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-2 text-[14px] font-bold"
              >
                <Play className="w-4 h-4" />
                {starting ? 'Starting…' : 'Start run'}
              </Button>
            )}
            <Button
              onClick={() => onMarkDelivered(job)}
              variant={canStart ? 'outline' : 'default'}
              className={cn(
                'w-full h-12 gap-2 text-[14px] font-bold',
                !canStart && 'bg-rebel-accent hover:bg-rebel-accent-hover text-white',
              )}
            >
              <PackageCheck className="w-4 h-4" />
              Mark delivered
            </Button>
          </div>
        )}

        {isInDelivery && !compact && (
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rebel-accent bg-rebel-accent-surface rounded-lg py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rebel-accent opacity-75 animate-rebel-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rebel-accent" />
            </span>
            On the road
          </div>
        )}

        {isDone && !compact && (
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rebel-success bg-rebel-success-surface rounded-lg py-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Delivered
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Job['status'] }) {
  return <StatusPill status={status} size="sm" />;
}
