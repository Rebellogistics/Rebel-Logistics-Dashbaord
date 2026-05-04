import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Job } from '@/lib/types';
import { customerDisplay } from '@/lib/jobDisplay';
import { useJobs, useUpdateJob, useCustomers } from '@/hooks/useSupabaseData';
import { useSmsLog, useMarkSmsRead } from '@/hooks/useSms';
import {
  MapPin,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  StickyNote,
  Calendar,
  Play,
  Star,
  Navigation,
  ArrowDown,
  X,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { MarkDeliveredSheet } from './MarkDeliveredSheet';
import { DriverJobDetailSheet } from './DriverJobDetailSheet';
import { StatusPill } from '@/components/ui/status-pill';
import { toast } from 'sonner';

const ACTIVE_STATUSES: Job['status'][] = ['Accepted', 'Scheduled', 'Notified', 'In Delivery'];

type Filter = 'all' | 'todo' | 'done';

export function MyRunToday() {
  const { data: jobs = [], isLoading, error } = useJobs();
  const { data: customers = [] } = useCustomers();
  const { data: smsLog = [] } = useSmsLog();
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [detailTarget, setDetailTarget] = useState<Job | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [startingId, setStartingId] = useState<string | null>(null);
  const updateJob = useUpdateJob();
  const markRead = useMarkSmsRead();

  const vipCustomerIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of customers) if (c.vip) s.add(c.id);
    return s;
  }, [customers]);

  const handleStartRun = async (job: Job) => {
    setStartingId(job.id);
    try {
      // V4 hot-fix May 4 — the SMS is now fired exclusively by
      // maybeAutoFireStatusSms inside useUpdateJob.onSuccess. Previously
      // we ALSO called sendSms.mutateAsync explicitly here, which double-
      // fired the en-route SMS (visible in sms_log as two rows ~0.5s
      // apart for the same job). The auto-fire path covers dedup + DB
      // template lookup; this handler just owns the status flip + toast.
      await updateJob.mutateAsync({ id: job.id, status: 'In Delivery' });
      const willSend = job.customerPhone?.trim() && !job.enRouteSmsSentAt;
      toast.success(
        willSend
          ? `Started run · en-route SMS sent to ${job.customerName}`
          : 'Started run',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start run';
      toast.error(message);
    } finally {
      setStartingId(null);
    }
  };

  const { todaysJobs } = useMemo(() => {
    const today: Job[] = [];
    for (const job of jobs) {
      if (!job.date) continue;
      try {
        const d = parseISO(job.date);
        if (isToday(d)) {
          today.push(job);
        }
      } catch {
        // bad date — ignore
      }
    }
    // V4 1.1: drivers see jobs in the run-order Yamin set on Truck Runs.
    // Falls back to createdAt for any rows that pre-date the sequence column.
    today.sort((a, b) => {
      const seqA = a.sequence ?? Number.MAX_SAFE_INTEGER;
      const seqB = b.sequence ?? Number.MAX_SAFE_INTEGER;
      if (seqA !== seqB) return seqA - seqB;
      return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
    });
    return { todaysJobs: today };
  }, [jobs]);

  const todayStats = useMemo(() => {
    const active = todaysJobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
    const done = todaysJobs.filter((j) => j.status === 'Completed' || j.status === 'Invoiced').length;
    return { active, done, total: todaysJobs.length };
  }, [todaysJobs]);

  // V4 3.4: surface inbound SMS replies linked to today's jobs on this
  // truck. The owner inbox handles day-prior threads; the driver banner
  // handles en-route threads (so a customer texting "we're home" reaches
  // whoever's actually driving). Filter by job_id linkage and unread.
  const todayJobIds = useMemo(() => new Set(todaysJobs.map((j) => j.id)), [todaysJobs]);
  const inboundForToday = useMemo(
    () =>
      smsLog
        .filter(
          (e) =>
            e.direction === 'inbound' &&
            !e.readAt &&
            e.jobId &&
            todayJobIds.has(e.jobId),
        )
        .slice(0, 5),
    [smsLog, todayJobIds],
  );

  // V4 1.7: nudge the driver when the office reorders/reassigns mid-shift.
  // Compares an order signature across renders; first paint is silent.
  const lastOrderSig = useRef<string | null>(null);
  useEffect(() => {
    const sig = todaysJobs.map((j) => `${j.id}:${j.sequence ?? '_'}:${j.assignedTruck ?? '_'}`).join('|');
    const prev = lastOrderSig.current;
    lastOrderSig.current = sig;
    if (prev === null || prev === sig) return;
    if (todaysJobs.length === 0) return;
    toast.message('Run updated by office', {
      description: `Today's order changed at ${format(new Date(), 'HH:mm')}.`,
    });
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
        {/* V4 3.4: customer-reply banner. Only renders when the customer
            has texted back (auto-reply tagged or otherwise) for one of
            today's jobs on this truck. Tap a row → mark read + open the
            job detail sheet so the driver can call back if needed. */}
        {inboundForToday.length > 0 && (
          <section className="rounded-2xl border border-rebel-accent/40 bg-rebel-accent-surface/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg bg-rebel-accent text-white items-center justify-center">
                <ArrowDown className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-rebel-text">
                  {inboundForToday.length} customer repl{inboundForToday.length === 1 ? 'y' : 'ies'}
                </p>
                <p className="text-[10px] text-muted-foreground">Tap a message to open the job</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {inboundForToday.map((entry) => {
                const job = entry.jobId ? todaysJobs.find((j) => j.id === entry.jobId) : null;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      if (job) setDetailTarget(job);
                      // Mark this single reply read so the banner clears.
                      markRead.mutate([entry.id]);
                    }}
                    className="w-full text-left rounded-lg bg-card border border-rebel-border p-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold truncate">
                        {entry.recipientName || entry.recipientPhone}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate([entry.id]);
                        }}
                        aria-label="Dismiss"
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-muted hover:text-rebel-text"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {entry.messageBody}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

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
                      onOpenDetail={setDetailTarget}
                      starting={startingId === job.id}
                      isVip={!!(job.customerId && vipCustomerIds.has(job.customerId))}
                    />
                  ))}
              </div>
            </>
          )}
        </section>

      </div>

      <MarkDeliveredSheet job={completeTarget} onClose={() => setCompleteTarget(null)} />
      <DriverJobDetailSheet
        job={detailTarget}
        onClose={() => setDetailTarget(null)}
        onStartRun={(j) => {
          setDetailTarget(null);
          handleStartRun(j);
        }}
        onMarkDelivered={(j) => {
          setDetailTarget(null);
          setCompleteTarget(j);
        }}
        starting={!!detailTarget && startingId === detailTarget.id}
        isVip={
          !!(detailTarget?.customerId && vipCustomerIds.has(detailTarget.customerId))
        }
      />
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
  /** Tap the card surface (away from action buttons / links) to open the
   *  full-detail sheet — V4 Phase 1.2. Drivers couldn't see notes / type
   *  / contact-person from the run-list card alone before this. */
  onOpenDetail?: (job: Job) => void;
  starting?: boolean;
  compact?: boolean;
  isVip?: boolean;
}

function DriverJobCard({ job, onMarkDelivered, onStartRun, onOpenDetail, starting, compact, isVip }: DriverJobCardProps) {
  const isDone = job.status === 'Completed' || job.status === 'Invoiced';
  const isInDelivery = job.status === 'In Delivery';
  const canStart = job.status === 'Scheduled' || job.status === 'Accepted' || job.status === 'Notified';
  const hasPhone = !!job.customerPhone?.trim();
  const display = customerDisplay(job);
  const mapsUrl = (addr: string) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;

  const cardClickable = !!onOpenDetail && !compact;
  return (
    <Card
      className={cn(
        'border shadow-none transition-shadow',
        isDone ? 'bg-green-50/40 border-green-200' : 'bg-card',
        cardClickable && 'cursor-pointer hover:ring-1 hover:ring-rebel-accent/30',
      )}
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onClick={cardClickable ? () => onOpenDetail!(job) : undefined}
      onKeyDown={
        cardClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail!(job);
              }
            }
          : undefined
      }
    >
      <CardContent className={cn('space-y-3', compact ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn('font-bold truncate', compact ? 'text-sm' : 'text-base')}>
                {display.primary}
              </p>
              {isVip && (
                <span
                  className="shrink-0 inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full bg-amber-400 text-white text-[9px] font-bold uppercase tracking-wider"
                  title="VIP customer — handle with care"
                >
                  <Star className="w-2.5 h-2.5 fill-white" />
                  VIP
                </span>
              )}
            </div>
            {display.secondary && (
              <p className={cn('text-muted-foreground truncate', compact ? 'text-[10px]' : 'text-xs')}>
                Contact: {display.secondary}
              </p>
            )}
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
            <div className="min-w-0 flex-1 space-y-1">
              {job.pickupAddress && (
                <div className="flex items-center gap-1.5">
                  <p className="truncate flex-1">
                    <span className="text-muted-foreground">From: </span>
                    {job.pickupAddress}
                  </p>
                  <a
                    href={mapsUrl(job.pickupAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open pickup in Google Maps"
                    title="Open pickup in Google Maps"
                    className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md text-rebel-accent hover:bg-rebel-accent-surface"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {job.deliveryAddress && (
                <div className="flex items-center gap-1.5">
                  <p className="truncate flex-1">
                    <span className="text-muted-foreground">To: </span>
                    {job.deliveryAddress}
                  </p>
                  <a
                    href={mapsUrl(job.deliveryAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open delivery in Google Maps"
                    title="Open delivery in Google Maps"
                    className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md text-rebel-accent hover:bg-rebel-accent-surface"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {!job.pickupAddress && !job.deliveryAddress && (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {hasPhone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a
                href={`tel:${job.customerPhone}`}
                onClick={(e) => e.stopPropagation()}
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
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {canStart && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRun(job);
                }}
                disabled={starting}
                className="w-full h-12 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-2 text-[14px] font-bold"
              >
                <Play className="w-4 h-4" />
                {starting ? 'Starting…' : 'Start run'}
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onMarkDelivered(job);
              }}
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
