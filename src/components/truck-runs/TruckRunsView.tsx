import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
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
  Inbox,
  CalendarClock,
  Sparkles,
  CalendarX,
} from 'lucide-react';
import { addDays, format, subDays, isToday, isTomorrow, parseISO, compareAsc } from 'date-fns';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { JobActionMenu, type JobMenuAction } from '@/components/jobs/JobActionMenu';
import { useSendSmsForJob } from '@/hooks/useSms';
import { useUpdateJob } from '@/hooks/useSupabaseData';
import { useTrucks } from '@/hooks/useTrucks';
import type { Truck as TruckType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TruckRunsViewProps {
  jobs: Job[];
  /** Tap a card (or pick "Open job") to open the full job dialog at the shell level. */
  onViewJob?: (job: Job) => void;
}

// Soft cap for the per-truck overload warning. Yamin can still drop more
// onto a truck — it's just a yellow flag asking "are you sure?"
const OVERLOAD_THRESHOLD = 5;

// Special drop targets for the Accepted/Scheduled columns
const ACCEPTED_KEY = '__accepted__';
// 5px movement threshold before drag activates — taps still fire onClick
// (open the job dialog) without accidentally starting a drag.
const DRAG_ACTIVATION_DISTANCE = 5;

export function TruckRunsView({ jobs, onViewJob }: TruckRunsViewProps) {
  const { data: trucks = [] } = useTrucks();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFromAccepted, setDraggingFromAccepted] = useState<boolean>(false);
  const sendSms = useSendSmsForJob();
  const updateJob = useUpdateJob();

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isTodaySelected = isToday(selectedDate);
  const isTomorrowSelected = isTomorrow(selectedDate);

  const activeTruckNames = useMemo(
    () => trucks.filter((t) => t.active).map((t) => t.name),
    [trucks],
  );

  const activeJobs = useMemo(() => jobs.filter((j) => j.status !== 'Declined'), [jobs]);

  // Today's actual date string — fixed reference for the past-due check.
  // Computed once per render; cheap and avoids making the memo depend on
  // a Date object that changes identity each tick.
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // ── Column buckets ────────────────────────────────────────────────
  // Accepted = status==='Accepted' (no truck yet). Pool to schedule from.
  const acceptedJobs = useMemo(
    () =>
      activeJobs
        .filter((j) => j.status === 'Accepted')
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [activeJobs],
  );

  // Truck columns + two amber strips:
  //   unassignedToday  — booked for the picker day, no truck (existing alert).
  //   pastDueOrphans   — scheduled in the past, no truck, never executed.
  // Past-due is computed against actual today, not the picker, so the alert
  // stays useful even when Yamin is viewing a future day.
  const { byTruck, unassignedToday, pastDueOrphans } = useMemo(() => {
    const byT: Record<string, Job[]> = {};
    for (const name of activeTruckNames) byT[name] = [];
    const orphan: Job[] = [];
    const pastDue: Job[] = [];
    const isOpenForOps = (j: Job) =>
      j.status === 'Scheduled' || j.status === 'Notified' || j.status === 'In Delivery';
    for (const job of activeJobs) {
      if (job.date === dateStr) {
        if (job.assignedTruck) {
          if (!byT[job.assignedTruck]) byT[job.assignedTruck] = [];
          byT[job.assignedTruck].push(job);
        } else if (isOpenForOps(job)) {
          orphan.push(job);
        }
      } else if (
        !job.assignedTruck &&
        isOpenForOps(job) &&
        job.date &&
        job.date < todayStr
      ) {
        pastDue.push(job);
      }
    }
    pastDue.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    return { byTruck: byT, unassignedToday: orphan, pastDueOrphans: pastDue };
  }, [activeJobs, dateStr, activeTruckNames, todayStr]);

  // Scheduled = master registry of every booked job, regardless of the
  // day-picker. Yamin's mental model from the May 2 call: "anything that's
  // already scheduled should be on this list regardless of the day."
  // We exclude jobs already rendered in another, more-specific bucket on
  // this same screen — the alert strips above and the truck columns for
  // the picker day — so dnd-kit never sees the same job.id mounted twice.
  const scheduledJobs = useMemo(() => {
    const elsewhere = new Set<string>([
      ...unassignedToday.map((j) => j.id),
      ...pastDueOrphans.map((j) => j.id),
    ]);
    return activeJobs
      .filter((j) => {
        if (j.status !== 'Scheduled' && j.status !== 'Notified') return false;
        if (elsewhere.has(j.id)) return false;
        // Truck-assigned for the picker day → already in its truck column.
        if (j.assignedTruck && j.date === dateStr) return false;
        return true;
      })
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
  }, [activeJobs, unassignedToday, pastDueOrphans, dateStr]);

  const truckColumnNames = useMemo(() => Object.keys(byTruck).sort(), [byTruck]);

  // Suggest the lighter-loaded truck while dragging from Accepted
  const suggestedTruck = useMemo(() => {
    if (!draggingFromAccepted || truckColumnNames.length === 0) return null;
    let lightest: string | null = null;
    let lightestCount = Infinity;
    for (const name of truckColumnNames) {
      const count = byTruck[name]?.length ?? 0;
      if (count < lightestCount) {
        lightestCount = count;
        lightest = name;
      }
    }
    return lightest;
  }, [draggingFromAccepted, truckColumnNames, byTruck]);

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

  // dnd-kit sensors: pointer (mouse + touch unified) with a 5px activation
  // distance so taps fire onClick (open job dialog) without starting a drag,
  // plus keyboard for accessibility.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDropOnTruck = async (jobId: string, targetTruck: TruckId) => {
    const job = activeJobs.find((j) => j.id === jobId);
    if (!job) return;

    const noChange = job.assignedTruck === targetTruck && job.date === dateStr;
    if (noChange) return;

    try {
      await updateJob.mutateAsync({
        id: jobId,
        assignedTruck: targetTruck,
        date: dateStr,
        status: 'Scheduled',
      });
      toast.success(`${job.customerName} → ${targetTruck} · ${formatDateLabel(selectedDate)}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to move job');
    }
  };

  const handleDropOnAccepted = async (jobId: string) => {
    const job = activeJobs.find((j) => j.id === jobId);
    if (!job) return;
    if (job.status === 'Accepted' && !job.assignedTruck) return;

    try {
      await updateJob.mutateAsync({
        id: jobId,
        assignedTruck: undefined,
        status: 'Accepted',
      });
      toast.success(`${job.customerName} → back to Accepted`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to move job');
    }
  };

  const handleDndStart = (event: DragStartEvent) => {
    const jobId = String(event.active.id);
    const job = activeJobs.find((j) => j.id === jobId);
    setDraggingId(jobId);
    setDraggingFromAccepted(job?.status === 'Accepted');
  };

  const handleDndEnd = (event: DragEndEvent) => {
    const jobId = String(event.active.id);
    const dropId = event.over ? String(event.over.id) : null;
    setDraggingId(null);
    setDraggingFromAccepted(false);
    if (!dropId) return;
    if (dropId === ACCEPTED_KEY) {
      handleDropOnAccepted(jobId);
      return;
    }
    handleDropOnTruck(jobId, dropId);
  };

  const handleDndCancel = () => {
    setDraggingId(null);
    setDraggingFromAccepted(false);
  };

  const draggingJob = useMemo(
    () => (draggingId ? activeJobs.find((j) => j.id === draggingId) ?? null : null),
    [draggingId, activeJobs],
  );

  // Shared menu handler — covers both pool cards and truck cards.
  const handleMenuAction = async (job: Job, action: JobMenuAction) => {
    if (action.type === 'view') {
      onViewJob?.(job);
      return;
    }
    if (action.type === 'mark_complete') {
      setCompleteTarget(job);
      return;
    }
    if (action.type === 'set_status') {
      if (action.status === 'Declined' && !confirm(`Decline ${job.customerName}?`)) return;
      try {
        await updateJob.mutateAsync({ id: job.id, status: action.status });
        toast.success(`${job.customerName} → ${action.status}`);
      } catch {
        toast.error('Failed to update status');
      }
      return;
    }
    if (action.type === 'assign_truck') {
      try {
        await updateJob.mutateAsync({
          id: job.id,
          assignedTruck: action.truck,
          date: dateStr,
          status: 'Scheduled',
        });
        toast.success(`${job.customerName} → ${action.truck}`);
      } catch {
        toast.error('Failed to assign truck');
      }
      return;
    }
    if (action.type === 'unassign_truck') {
      try {
        await updateJob.mutateAsync({
          id: job.id,
          assignedTruck: undefined,
          status: 'Accepted',
        });
        toast.success(`${job.customerName} → Accepted pool`);
      } catch {
        toast.error('Failed to unassign');
      }
      return;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDndStart}
      onDragEnd={handleDndEnd}
      onDragCancel={handleDndCancel}
    >
      <div className="space-y-4">
        {/* Header / day picker */}
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
                {isTodaySelected ? 'Today' : isTomorrowSelected ? 'Tomorrow' : format(selectedDate, 'EEEE')}
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
            <Button
              size="sm"
              variant={isTodaySelected ? 'default' : 'outline'}
              className={cn(isTodaySelected && 'bg-rebel-accent text-white hover:bg-rebel-accent-hover')}
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant={isTomorrowSelected ? 'default' : 'outline'}
              className={cn(isTomorrowSelected && 'bg-rebel-accent text-white hover:bg-rebel-accent-hover')}
              onClick={() => setSelectedDate(addDays(new Date(), 1))}
            >
              Tomorrow
            </Button>
            <span className="text-xs text-muted-foreground">
              {Object.values(byTruck).reduce((n, arr) => n + arr.length, 0)} on trucks
            </span>
          </div>
        </div>

        {/* Anomaly: jobs on the selectedDate with no truck */}
        {unassignedToday.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40 shadow-none">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-sm text-amber-900">
                  Booked for today but no truck ({unassignedToday.length})
                </h3>
                <p className="text-[11px] text-amber-800">Drag onto a truck below.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {unassignedToday.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    trucks={trucks}
                    onComplete={setCompleteTarget}
                    showEnRouteAction={false}
                    busy={false}
                    onSendEnRoute={handleSendEnRoute}
                    onView={onViewJob}
                    onMenuAction={handleMenuAction}
                    draggable
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Past-due, no truck — scheduled in the past, never executed.
            Computed against today's actual date so the alert stays useful
            regardless of where the day-picker is. */}
        {pastDueOrphans.length > 0 && (
          <Card className="border-rose-200 bg-rose-50/40 shadow-none">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-rose-600" />
                <h3 className="font-semibold text-sm text-rose-900">
                  Past-due, no truck ({pastDueOrphans.length})
                </h3>
                <p className="text-[11px] text-rose-800">
                  Reassign or move back to Accepted.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {pastDueOrphans.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    trucks={trucks}
                    onComplete={setCompleteTarget}
                    showEnRouteAction={false}
                    busy={false}
                    onSendEnRoute={handleSendEnRoute}
                    onView={onViewJob}
                    onMenuAction={handleMenuAction}
                    draggable
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Horizontal scroll of columns: Accepted | Scheduled | Truck 1 | Truck 2 | … */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
          <PoolColumn
            kind="accepted"
            label="Accepted"
            sublabel="Pool to schedule"
            icon={Inbox}
            jobs={acceptedJobs}
            trucks={trucks}
            isDragSource={!!draggingId}
            onViewJob={onViewJob}
            onMenuAction={handleMenuAction}
          />
          <PoolColumn
            kind="scheduled"
            label="Scheduled"
            sublabel="All booked jobs"
            icon={CalendarClock}
            jobs={scheduledJobs}
            trucks={trucks}
            isDragSource={!!draggingId}
            onViewJob={onViewJob}
            onMenuAction={handleMenuAction}
            readOnly
          />

          {truckColumnNames.length === 0 ? (
            <Card className="border-border shadow-none bg-card flex-1 min-w-[260px]">
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                No trucks configured. Add one in Settings → Trucks.
              </CardContent>
            </Card>
          ) : (
            truckColumnNames.map((truck) => (
              <TruckColumn
                key={truck}
                truck={truck}
                trucks={trucks}
                jobs={byTruck[truck]}
                onComplete={setCompleteTarget}
                showEnRouteAction={isTodaySelected}
                busyId={busyId}
                onSendEnRoute={handleSendEnRoute}
                isDropTarget={!!draggingId}
                isSuggested={suggestedTruck === truck}
                onViewJob={onViewJob}
                onMenuAction={handleMenuAction}
              />
            ))
          )}
        </div>
      </div>

      {/* Cursor-following ghost while dragging. Renders in a portal so the
          card visual stays on top of column scroll containers. */}
      <DragOverlay dropAnimation={null}>
        {draggingJob ? <DragGhost job={draggingJob} /> : null}
      </DragOverlay>

      <MarkCompleteDialog job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </DndContext>
  );
}

// Simple, low-fidelity ghost — just the customer name + truck/date hint.
// Rendered above the kanban surface while dnd-kit drives the overlay.
function DragGhost({ job }: { job: Job }) {
  return (
    <div className="rounded-lg border border-rebel-accent bg-card p-2.5 shadow-glow w-[260px] pointer-events-none">
      <p className="text-xs font-semibold truncate">{job.customerName}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {job.assignedTruck ?? 'No truck'} · {job.date || '—'}
      </p>
    </div>
  );
}

function formatDateLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'd MMM');
}

// ────────────────────────────────────────────────────────────────────
// Pool columns — Accepted / Scheduled
// ────────────────────────────────────────────────────────────────────

interface PoolColumnProps {
  kind: 'accepted' | 'scheduled';
  label: string;
  sublabel: string;
  icon: typeof Inbox;
  jobs: Job[];
  trucks: TruckType[];
  isDragSource: boolean;
  onViewJob?: (job: Job) => void;
  onMenuAction: (job: Job, action: JobMenuAction) => void;
  readOnly?: boolean;
}

function PoolColumn({
  kind,
  label,
  sublabel,
  icon: Icon,
  jobs,
  trucks,
  isDragSource,
  onViewJob,
  onMenuAction,
  readOnly,
}: PoolColumnProps) {
  const droppable = !readOnly;
  // The Scheduled column is read-only — it's a master registry, not a drop
  // target. Disabling the droppable means dnd-kit won't surface it as a
  // collision target while the user drags.
  const { setNodeRef, isOver } = useDroppable({
    id: kind === 'accepted' ? ACCEPTED_KEY : 'scheduled-readonly',
    disabled: !droppable,
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[260px] min-w-[260px] shrink-0 shadow-none transition-colors',
        isOver && droppable
          ? 'border-rebel-accent bg-rebel-accent-surface/40'
          : isDragSource && droppable
            ? 'border-dashed border-rebel-accent/40'
            : kind === 'scheduled'
              ? 'border-indigo-100 bg-indigo-50/30'
              : 'border-border bg-card',
      )}
    >
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                kind === 'accepted' ? 'bg-rebel-accent-surface' : 'bg-indigo-100',
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4',
                  kind === 'accepted' ? 'text-rebel-accent' : 'text-indigo-600',
                )}
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm truncate">{label}</h3>
              <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px]">
            {jobs.length}
          </Badge>
        </div>

        {jobs.length === 0 ? (
          <p className="text-center text-[11px] text-muted-foreground py-6">
            {readOnly
              ? 'Nothing scheduled.'
              : isDragSource
                ? 'Drop here to unassign'
                : 'Empty.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
            {jobs.map((job) => (
              <PoolCard
                key={job.id}
                job={job}
                trucks={trucks}
                onView={onViewJob}
                onMenuAction={onMenuAction}
                showDate={kind === 'scheduled'}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PoolCard({
  job,
  trucks,
  onView,
  onMenuAction,
  showDate,
}: {
  job: Job;
  trucks: TruckType[];
  onView?: (job: Job) => void;
  onMenuAction: (job: Job, action: JobMenuAction) => void;
  showDate?: boolean;
}) {
  // dnd-kit: setNodeRef on the whole card (so collision detection sees the
  // full card bounds), but listeners on the GripVertical handle only — that
  // way the card body keeps tap-to-open and the column scrolls naturally on
  // touch. Closed jobs aren't draggable but pool cards are always open.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onView?.(job)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.(job);
        }
      }}
      className={cn(
        'rounded-lg border border-rebel-border bg-card p-2.5 space-y-1.5 hover:ring-1 hover:ring-rebel-accent/30 cursor-pointer',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label="Drag to move"
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 mt-0.5 text-muted-foreground/60 hover:text-rebel-accent"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{job.customerName}</p>
          {job.customerPhone ? (
            <a
              href={`tel:${job.customerPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-muted-foreground truncate hover:text-rebel-accent"
            >
              {job.customerPhone}
            </a>
          ) : (
            <p className="text-[10px] text-muted-foreground truncate">—</p>
          )}
        </div>
        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[9px] shrink-0">
          {job.type}
        </Badge>
        <JobActionMenu
          job={job}
          trucks={trucks}
          size="icon-xs"
          preventDrag
          onAction={(a) => onMenuAction(job, a)}
        />
      </div>
      <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <MapPin className="w-2.5 h-2.5 mt-0.5 shrink-0" />
        <span className="truncate">
          {job.pickupAddress || '—'} → {job.deliveryAddress || '—'}
        </span>
      </div>
      {showDate && job.date && (
        <p className="text-[10px] text-indigo-700 font-semibold">
          {formatDateLabel(parseISO(job.date))} · {job.assignedTruck ?? 'No truck'}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Truck column
// ────────────────────────────────────────────────────────────────────

interface TruckColumnProps {
  truck: TruckId;
  trucks: TruckType[];
  jobs: Job[];
  onComplete: (job: Job) => void;
  showEnRouteAction: boolean;
  busyId: string | null;
  onSendEnRoute: (job: Job) => void;
  isDropTarget: boolean;
  isSuggested: boolean;
  onViewJob?: (job: Job) => void;
  onMenuAction: (job: Job, action: JobMenuAction) => void;
}

function TruckColumn({
  truck,
  trucks,
  jobs,
  onComplete,
  showEnRouteAction,
  busyId,
  onSendEnRoute,
  isDropTarget,
  isSuggested,
  onViewJob,
  onMenuAction,
}: TruckColumnProps) {
  const overload = jobs.length >= OVERLOAD_THRESHOLD;
  const firstPickup = jobs[0]?.pickupAddress?.split(',')[0]?.trim();
  const { setNodeRef, isOver } = useDroppable({ id: truck });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] shrink-0 shadow-none transition-colors',
        isOver
          ? 'border-rebel-accent bg-rebel-accent-surface/40'
          : isSuggested
            ? 'border-rebel-accent/60 bg-rebel-accent-surface/15 ring-1 ring-rebel-accent/30'
            : isDropTarget
              ? 'border-dashed border-rebel-accent/40'
              : '',
      )}
    >
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="border-b pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-rebel-accent-surface flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-rebel-accent" />
              </div>
              <h3 className="font-bold text-sm truncate">{truck}</h3>
              {isSuggested && (
                <span
                  className="inline-flex items-center gap-0.5 h-4 px-1 rounded-md bg-rebel-accent-surface text-rebel-accent text-[9px] font-bold uppercase tracking-wider"
                  title="Lighter day on this truck — easier to add a stop"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  Lighter
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {overload && (
                <span
                  className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold"
                  title={`${jobs.length} stops on this truck — double-check the day's plan.`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Heavy
                </span>
              )}
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px]">
                {jobs.length} stop{jobs.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
          {firstPickup && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              first pickup: {firstPickup}
            </p>
          )}
        </div>

        {jobs.length === 0 ? (
          <p className="text-center text-[11px] text-muted-foreground py-6">
            {isDropTarget ? 'Drop here to schedule' : 'No stops yet.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                trucks={trucks}
                onComplete={onComplete}
                showEnRouteAction={showEnRouteAction}
                busy={busyId === job.id}
                onSendEnRoute={onSendEnRoute}
                onView={onViewJob}
                onMenuAction={onMenuAction}
                draggable
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Job card (used inside truck columns + unassigned banner)
// ────────────────────────────────────────────────────────────────────

interface JobCardProps {
  job: Job;
  trucks: TruckType[];
  onComplete: (job: Job) => void;
  showEnRouteAction: boolean;
  busy: boolean;
  onSendEnRoute: (job: Job) => void;
  onView?: (job: Job) => void;
  onMenuAction: (job: Job, action: JobMenuAction) => void;
  draggable?: boolean;
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
  trucks,
  onComplete,
  showEnRouteAction,
  busy,
  onSendEnRoute,
  onView,
  onMenuAction,
  draggable,
}: JobCardProps) {
  const missing = detectMissingInfo(job);
  const isClosed = job.status === 'Completed' || job.status === 'Invoiced';
  const enRouteSent = !!job.enRouteSmsSentAt;
  const hasPhone = !!job.customerPhone?.trim();
  const enRouteTimeLabel = enRouteSent ? format(parseISO(job.enRouteSmsSentAt!), 'HH:mm') : null;
  const canDrag = !!draggable && !isClosed;
  // Drag is disabled on closed jobs (Completed / Invoiced) — those should
  // not be moved. dnd-kit honours `disabled: true` by skipping listeners.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onView?.(job)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.(job);
        }
      }}
      className={cn(
        'rounded-lg border p-3 space-y-2 cursor-pointer',
        isClosed ? 'bg-green-50/40 border-green-200' : 'bg-card',
        canDrag && 'hover:ring-1 hover:ring-rebel-accent/30',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-1.5">
          {canDrag && (
            <button
              type="button"
              aria-label="Drag to move"
              className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 mt-0.5 text-muted-foreground/60 hover:text-rebel-accent"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3 h-3" />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{job.customerName}</p>
            {job.customerPhone ? (
              <a
                href={`tel:${job.customerPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-muted-foreground hover:text-rebel-accent"
              >
                {job.customerPhone}
              </a>
            ) : (
              <p className="text-[10px] text-muted-foreground">—</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground border-none text-[10px]"
          >
            {job.type}
          </Badge>
          <JobActionMenu
            job={job}
            trucks={trucks}
            size="icon-xs"
            preventDrag
            onAction={(a) => onMenuAction(job, a)}
          />
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
        {job.deliveryAddress ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.deliveryAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="truncate hover:text-rebel-accent"
            title="Open delivery in Google Maps"
          >
            {job.pickupAddress || '—'} → {job.deliveryAddress}
          </a>
        ) : (
          <span className="truncate">
            {job.pickupAddress || '—'} → —
          </span>
        )}
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
              onClick={(e) => { e.stopPropagation(); onSendEnRoute(job); }}
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
              onClick={(e) => { e.stopPropagation(); onComplete(job); }}
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
