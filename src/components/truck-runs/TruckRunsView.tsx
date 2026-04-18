import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Job, TruckId } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  AlertTriangle,
  PackageCheck,
  MapPin,
  Send,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';
import { addDays, format, subDays, isToday, parseISO } from 'date-fns';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { useSendSmsForJob } from '@/hooks/useSms';
import { useUpdateJob } from '@/hooks/useSupabaseData';
import { useTrucks } from '@/hooks/useTrucks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TruckRunsViewProps {
  jobs: Job[];
}

interface TruckColumnProps {
  truck: TruckId;
  jobs: Job[];
  onComplete: (job: Job) => void;
  showEnRouteAction: boolean;
  busyId: string | null;
  onSendEnRoute: (job: Job) => void;
  onDropJob: (jobId: string, truck: TruckId | null) => void;
  isDropTarget: boolean;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}

interface JobCardProps {
  job: Job;
  onComplete: (job: Job) => void;
  showEnRouteAction: boolean;
  busy: boolean;
  onSendEnRoute: (job: Job) => void;
  draggable?: boolean;
  onDragStart?: (jobId: string) => void;
  onDragEnd?: () => void;
}

export function TruckRunsView({ jobs }: TruckRunsViewProps) {
  const { data: trucks = [] } = useTrucks();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sendSms = useSendSmsForJob();
  const updateJob = useUpdateJob();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isTodaySelected = isToday(selectedDate);

  const activeTruckNames = useMemo(
    () => trucks.filter((t) => t.active).map((t) => t.name),
    [trucks]
  );

  const jobsForDate = useMemo(
    () => jobs.filter((j) => j.date === dateStr && j.status !== 'Declined'),
    [jobs, dateStr]
  );

  const { byTruck, unassigned } = useMemo(() => {
    const result: Record<string, Job[]> = {};
    for (const name of activeTruckNames) result[name] = [];
    const extra: Job[] = [];
    for (const job of jobsForDate) {
      if (job.assignedTruck && result[job.assignedTruck] !== undefined) {
        result[job.assignedTruck].push(job);
      } else if (job.assignedTruck) {
        // Job is assigned to a truck that's no longer active — surface it anyway
        if (!result[job.assignedTruck]) result[job.assignedTruck] = [];
        result[job.assignedTruck].push(job);
      } else {
        extra.push(job);
      }
    }
    return { byTruck: result, unassigned: extra };
  }, [jobsForDate, activeTruckNames]);

  const truckColumnNames = useMemo(() => Object.keys(byTruck).sort(), [byTruck]);

  const handleSendEnRoute = async (job: Job) => {
    setBusyId(job.id);
    try {
      await sendSms.mutateAsync({ job, type: 'en_route' });
      toast.success(`En-route SMS sent to ${job.customerName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send SMS';
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDropJob = async (jobId: string, targetTruck: TruckId | null) => {
    setDraggingId(null);
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    if ((job.assignedTruck ?? null) === targetTruck) return;
    try {
      if (targetTruck) {
        // Moving a job onto a truck — if currently Accepted/unassigned, bump to Scheduled
        const nextStatus =
          job.status === 'Quote' || job.status === 'Declined'
            ? job.status
            : job.status === 'Accepted'
              ? 'Scheduled'
              : job.status;
        await updateJob.mutateAsync({
          id: jobId,
          assignedTruck: targetTruck,
          status: nextStatus,
        });
        toast.success(`Moved to ${targetTruck}`);
      } else {
        // Dropped into Unassigned pool — drop truck, revert Scheduled → Accepted
        const nextStatus =
          job.status === 'Scheduled' || job.status === 'Notified' ? 'Accepted' : job.status;
        await updateJob.mutateAsync({
          id: jobId,
          assignedTruck: undefined,
          status: nextStatus,
        });
        toast.success('Moved to Unassigned');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to move job');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card rounded-xl border p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setSelectedDate((d) => subDays(d, 1))}
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[140px] sm:min-w-[180px] text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                {isTodaySelected ? 'Today' : format(selectedDate, 'EEEE')}
              </p>
              <p className="font-bold text-xs sm:text-sm">{format(selectedDate, 'd MMM yyyy')}</p>
            </div>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              className="h-8 w-[140px] text-xs"
              value={dateStr}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                try {
                  setSelectedDate(parseISO(v));
                } catch {
                  /* ignore */
                }
              }}
              aria-label="Pick a date"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedDate(new Date())}>
              Today
            </Button>
            <div className="text-xs text-muted-foreground">
              {jobsForDate.length} job{jobsForDate.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {truckColumnNames.length === 0 ? (
            <Card className="border-border shadow-none bg-card lg:col-span-2">
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                No trucks configured. Add one in Settings → Trucks.
              </CardContent>
            </Card>
          ) : (
            truckColumnNames.map((truck) => (
              <TruckColumn
                key={truck}
                truck={truck}
                jobs={byTruck[truck]}
                onComplete={setCompleteTarget}
                showEnRouteAction={isTodaySelected}
                busyId={busyId}
                onSendEnRoute={handleSendEnRoute}
                onDropJob={handleDropJob}
                isDropTarget={!!draggingId}
                draggingId={draggingId}
                setDraggingId={setDraggingId}
              />
            ))
          )}
        </div>

        <UnassignedZone
          jobs={unassigned}
          onComplete={setCompleteTarget}
          onSendEnRoute={handleSendEnRoute}
          onDropJob={handleDropJob}
          isDropTarget={!!draggingId}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
        />
      </div>

      <MarkCompleteDialog job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </>
  );
}

function TruckColumn({
  truck,
  jobs,
  onComplete,
  showEnRouteAction,
  busyId,
  onSendEnRoute,
  onDropJob,
  isDropTarget,
  draggingId,
  setDraggingId,
}: TruckColumnProps) {
  const [isOver, setIsOver] = useState(false);
  return (
    <Card
      className={cn(
        'border shadow-none transition-colors',
        isOver
          ? 'border-rebel-accent bg-rebel-accent-surface/40'
          : isDropTarget
            ? 'border-dashed border-rebel-accent/40'
            : '',
      )}
      onDragOver={(e) => {
        if (!draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const jobId = e.dataTransfer.getData('text/plain');
        if (jobId) onDropJob(jobId, truck);
      }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rebel-accent-surface flex items-center justify-center">
              <Truck className="w-4 h-4 text-rebel-accent" />
            </div>
            <h3 className="font-bold text-sm">{truck}</h3>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
            {jobs.length} job{jobs.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {jobs.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            {isDropTarget ? 'Drop here to assign' : 'No jobs scheduled.'}
          </p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onComplete={onComplete}
                showEnRouteAction={showEnRouteAction}
                busy={busyId === job.id}
                onSendEnRoute={onSendEnRoute}
                draggable
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UnassignedZoneProps {
  jobs: Job[];
  onComplete: (job: Job) => void;
  onSendEnRoute: (job: Job) => void;
  onDropJob: (jobId: string, truck: TruckId | null) => void;
  isDropTarget: boolean;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}

function UnassignedZone({
  jobs,
  onComplete,
  onSendEnRoute,
  onDropJob,
  isDropTarget,
  draggingId,
  setDraggingId,
}: UnassignedZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const empty = jobs.length === 0;
  if (empty && !isDropTarget) return null;

  return (
    <Card
      className={cn(
        'border shadow-none transition-colors',
        isOver
          ? 'border-rebel-warning bg-rebel-warning-surface/60'
          : 'border-amber-200 bg-amber-50/40',
      )}
      onDragOver={(e) => {
        if (!draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const jobId = e.dataTransfer.getData('text/plain');
        if (jobId) onDropJob(jobId, null);
      }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm text-amber-900">
            Unassigned ({jobs.length})
          </h3>
          <p className="text-[11px] text-amber-800">
            {empty ? 'Drop a job here to unassign its truck.' : 'Drag a job onto a truck column to schedule.'}
          </p>
        </div>
        {!empty && (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onComplete={onComplete}
                showEnRouteAction={false}
                busy={false}
                onSendEnRoute={onSendEnRoute}
                draggable
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function detectMissingInfo(job: Job): string[] {
  const flags: string[] = [];
  if (!job.customerPhone?.trim()) flags.push('No phone');
  if (!job.pickupAddress?.trim()) flags.push('No pickup');
  if (!job.deliveryAddress?.trim()) flags.push('No delivery');
  if (!job.assignedTruck) flags.push('No truck');
  if (!job.date) flags.push('No date');
  return flags;
}

function JobCard({
  job,
  onComplete,
  showEnRouteAction,
  busy,
  onSendEnRoute,
  draggable,
  onDragStart,
  onDragEnd,
}: JobCardProps) {
  const missing = detectMissingInfo(job);
  const isClosed = job.status === 'Completed' || job.status === 'Invoiced';
  const enRouteSent = !!job.enRouteSmsSentAt;
  const hasPhone = !!job.customerPhone?.trim();
  const enRouteTimeLabel = enRouteSent
    ? format(parseISO(job.enRouteSmsSentAt!), 'HH:mm')
    : null;
  const canDrag = !!draggable && !isClosed;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        isClosed ? 'bg-green-50/40 border-green-200' : 'bg-card',
        canDrag && 'hover:ring-1 hover:ring-rebel-accent/30 cursor-grab active:cursor-grabbing',
      )}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', job.id);
        onDragStart?.(job.id);
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-1.5">
          {canDrag && (
            <GripVertical className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/60" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{job.customerName}</p>
            <p className="text-[10px] text-muted-foreground">{job.customerPhone || '—'}</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground border-none text-[10px] shrink-0"
        >
          {job.type}
        </Badge>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="truncate">
          {job.pickupAddress || '—'} → {job.deliveryAddress || '—'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {missing.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 font-medium"
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              {flag}
            </span>
          ))}
          {isClosed && (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 font-medium">
              <PackageCheck className="w-2.5 h-2.5" />
              {job.status}
            </span>
          )}
          {showEnRouteAction && enRouteSent && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.5 font-medium">
              <CheckCircle2 className="w-2.5 h-2.5" />
              En-route {enRouteTimeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {showEnRouteAction && !enRouteSent && !isClosed && (
            <Button
              size="xs"
              variant="outline"
              className="gap-1"
              onClick={() => onSendEnRoute(job)}
              disabled={!hasPhone || busy}
              title={hasPhone ? undefined : 'No phone number on file'}
            >
              <Send className="w-3 h-3" />
              {busy ? 'Sending…' : 'En-route'}
            </Button>
          )}
          {!isClosed && (
            <Button
              size="xs"
              variant="outline"
              className="gap-1"
              onClick={() => onComplete(job)}
            >
              <PackageCheck className="w-3 h-3" />
              Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
