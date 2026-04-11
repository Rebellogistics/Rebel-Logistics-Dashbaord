import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { addDays, format, subDays, isToday, parseISO } from 'date-fns';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { useSendSmsForJob } from '@/hooks/useSms';
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
}

interface JobCardProps {
  job: Job;
  onComplete: (job: Job) => void;
  showEnRouteAction: boolean;
  busy: boolean;
  onSendEnRoute: (job: Job) => void;
}

export function TruckRunsView({ jobs }: TruckRunsViewProps) {
  const { data: trucks = [] } = useTrucks();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const sendSms = useSendSmsForJob();

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
              />
            ))
          )}
        </div>

        {unassigned.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40 border shadow-none">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-sm text-amber-900">
                  Unassigned ({unassigned.length})
                </h3>
                <p className="text-[11px] text-amber-800">
                  These jobs have no truck assigned. Accept them from the Jobs list to schedule.
                </p>
              </div>
              <div className="space-y-2">
                {unassigned.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onComplete={setCompleteTarget}
                    showEnRouteAction={false}
                    busy={false}
                    onSendEnRoute={handleSendEnRoute}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
}: TruckColumnProps) {
  return (
    <Card className="border shadow-none">
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
          <p className="text-center text-xs text-muted-foreground py-6">No jobs scheduled.</p>
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
}: JobCardProps) {
  const missing = detectMissingInfo(job);
  const isClosed = job.status === 'Completed' || job.status === 'Invoiced';
  const enRouteSent = !!job.enRouteSmsSentAt;
  const hasPhone = !!job.customerPhone?.trim();
  const enRouteTimeLabel = enRouteSent
    ? format(parseISO(job.enRouteSmsSentAt!), 'HH:mm')
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        isClosed ? 'bg-green-50/40 border-green-200' : 'bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{job.customerName}</p>
          <p className="text-[10px] text-muted-foreground">{job.customerPhone || '—'}</p>
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
