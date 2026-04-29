import { useMemo, useState } from 'react';
import { Job, JobStatus, Customer } from '@/lib/types';
import { useUpdateJob } from '@/hooks/useSupabaseData';
import { useTrucks } from '@/hooks/useTrucks';
import { useSendSmsForJob } from '@/hooks/useSms';
import { StatusPill, statusGradient } from '@/components/ui/status-pill';
import { AssignTruckDialog } from '@/components/jobs/AssignTruckDialog';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { JobActionMenu, type JobMenuAction } from '@/components/jobs/JobActionMenu';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Truck as TruckIcon,
  Calendar,
  DollarSign,
  KanbanSquare,
  ChevronDown,
  Send,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { format, parseISO, addDays, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export type GroupBy = 'status' | 'truck' | 'date' | 'customer';

interface BoardViewProps {
  jobs: Job[];
  customers?: Customer[];
  /** Optional — when supplied, tapping a card (or choosing "Open job" from the
   *  action menu) opens the full Job dialog at the shell level. */
  onViewJob?: (job: Job) => void;
}

// Board is the *administration* surface. Operations columns (Scheduled,
// Notified, In Delivery) live on the Truck Runs page now — Board only shows
// the four states that matter to the office: Quote → Accepted → Completed → Invoiced.
const STATUS_ORDER: JobStatus[] = [
  'Quote',
  'Accepted',
  'Completed',
  'Invoiced',
];

// Statuses that have moved to Truck Runs. We still surface jobs in these
// states under the Board so the count is honest, but they fold under
// "Accepted" so the office view stays simple.
const OPERATIONS_STATUSES: JobStatus[] = ['Scheduled', 'Notified', 'In Delivery'];

// ──────────────────────────────────────────────────────────────────
// Root
// ──────────────────────────────────────────────────────────────────

export function BoardView({ jobs, customers = [], onViewJob }: BoardViewProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('status');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignTarget, setAssignTarget] = useState<Job | null>(null);
  const [markCompleteTarget, setMarkCompleteTarget] = useState<Job | null>(null);
  const updateJob = useUpdateJob();
  const { data: trucks = [] } = useTrucks();
  const sendSms = useSendSmsForJob();

  const handleMenuAction = async (job: Job, action: JobMenuAction) => {
    if (action.type === 'view') {
      onViewJob?.(job);
      return;
    }
    if (action.type === 'mark_complete') {
      setMarkCompleteTarget(job);
      return;
    }
    if (action.type === 'set_status') {
      if (action.status === 'Declined') {
        if (!confirm(`Decline ${job.customerName}?`)) return;
      }
      try {
        await updateJob.mutateAsync({ id: job.id, status: action.status });
        toast.success(`${job.customerName} → ${action.status}`);
      } catch {
        toast.error('Failed to move job');
      }
      return;
    }
    if (action.type === 'assign_truck') {
      try {
        const nextStatus = job.status === 'Accepted' ? 'Scheduled' : job.status;
        await updateJob.mutateAsync({ id: job.id, assignedTruck: action.truck, status: nextStatus });
        toast.success(`${job.customerName} → ${action.truck}`);
      } catch {
        toast.error('Failed to assign truck');
      }
      return;
    }
    if (action.type === 'unassign_truck') {
      try {
        const nextStatus = job.status === 'Scheduled' || job.status === 'Notified' ? 'Accepted' : job.status;
        await updateJob.mutateAsync({ id: job.id, assignedTruck: undefined, status: nextStatus });
        toast.success(`${job.customerName} → Accepted pool`);
      } catch {
        toast.error('Failed to unassign');
      }
      return;
    }
  };

  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status !== 'Declined'),
    [jobs],
  );

  const columns = useMemo(
    () => buildColumns(activeJobs, groupBy, trucks.filter((t) => t.active).map((t) => t.name), customers),
    [activeJobs, groupBy, trucks, customers],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const handleDrop = async (jobId: string, targetColumnKey: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    if (groupBy === 'status') {
      const newStatus = targetColumnKey as JobStatus;
      if (newStatus === job.status) return;
      if (newStatus === 'Declined') {
        if (!confirm(`Decline ${job.customerName}?`)) return;
      }
      try {
        await updateJob.mutateAsync({ id: jobId, status: newStatus });
        toast.success(`${job.customerName} → ${newStatus}`);
      } catch {
        toast.error('Failed to move job');
      }
    } else if (groupBy === 'truck') {
      const newTruck = targetColumnKey === '__unassigned__' ? undefined : targetColumnKey;
      if ((job.assignedTruck ?? '__unassigned__') === (newTruck ?? '__unassigned__')) return;
      try {
        const nextStatus =
          !newTruck && (job.status === 'Scheduled' || job.status === 'Notified')
            ? 'Accepted'
            : newTruck && job.status === 'Accepted'
              ? 'Scheduled'
              : job.status;
        await updateJob.mutateAsync({
          id: jobId,
          assignedTruck: newTruck,
          status: nextStatus,
        });
        toast.success(`Moved to ${newTruck ?? 'Unassigned'}`);
      } catch {
        toast.error('Failed to reassign');
      }
    }
  };

  // Bulk actions
  const selectedJobs = useMemo(
    () => jobs.filter((j) => selected.has(j.id)),
    [jobs, selected],
  );

  const handleBulkAssign = () => {
    if (selectedJobs.length === 0) return;
    setAssignTarget(selectedJobs[0]);
  };

  const handleBulkSms = async () => {
    if (selectedJobs.length === 0) return;
    const eligible = selectedJobs.filter((j) => j.customerPhone?.trim() && !j.dayPriorSmsSentAt);
    if (eligible.length === 0) {
      toast.info('No eligible jobs for day-prior SMS');
      return;
    }
    if (!confirm(`Send day-prior SMS to ${eligible.length} customer${eligible.length === 1 ? '' : 's'}?`)) return;
    let sent = 0;
    for (const job of eligible) {
      try {
        await sendSms.mutateAsync({ job, type: 'day_prior' });
        sent++;
      } catch {
        // best effort
      }
    }
    toast.success(`Sent ${sent} SMS`);
    clearSelection();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-5 h-5 text-rebel-accent" />
          <h2 className="text-[16px] font-bold tracking-tight text-rebel-text">Board</h2>
          <span className="text-[12px] text-rebel-text-tertiary">
            {activeJobs.length} job{activeJobs.length === 1 ? '' : 's'}
          </span>
        </div>
        <GroupByPicker value={groupBy} onChange={setGroupBy} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center gap-2 rounded-xl bg-rebel-accent px-4 py-2.5 text-white shadow-glow">
          <span className="text-[12px] font-bold">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-1.5"
            onClick={handleBulkAssign}
          >
            <TruckIcon className="w-3.5 h-3.5" />
            Assign truck
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 gap-1.5"
            onClick={handleBulkSms}
          >
            <Send className="w-3.5 h-3.5" />
            Day-prior SMS
          </Button>
          <button
            type="button"
            onClick={clearSelection}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-white/20"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-1 px-1">
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            column={col}
            onDrop={handleDrop}
            selected={selected}
            onToggleSelect={toggleSelect}
            draggable={groupBy === 'status' || groupBy === 'truck'}
            onCardClick={(job) => onViewJob?.(job)}
            onMenuAction={handleMenuAction}
            trucks={trucks}
          />
        ))}
      </div>

      <AssignTruckDialog
        job={assignTarget}
        onClose={() => {
          setAssignTarget(null);
          clearSelection();
        }}
      />
      <MarkCompleteDialog
        job={markCompleteTarget}
        onClose={() => setMarkCompleteTarget(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Column
// ──────────────────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  jobs: Job[];
}

function KanbanColumn({
  column,
  onDrop,
  selected,
  onToggleSelect,
  draggable,
  onCardClick,
  onMenuAction,
  trucks,
}: {
  column: ColumnDef;
  onDrop: (jobId: string, columnKey: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  draggable: boolean;
  onCardClick: (job: Job) => void;
  onMenuAction: (job: Job, action: JobMenuAction) => void;
  trucks: import('@/lib/types').Truck[];
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col w-[240px] min-w-[240px] shrink-0 rounded-2xl border bg-card snap-start transition-colors',
        isOver
          ? 'border-rebel-accent bg-rebel-accent-surface/30'
          : 'border-rebel-border',
      )}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const jobId = e.dataTransfer.getData('text/plain');
        if (jobId) onDrop(jobId, column.key);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-rebel-text-tertiary truncate">
          {column.label}
        </h3>
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md bg-muted text-[10px] font-bold tabular-nums text-rebel-text-tertiary">
          {column.jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-1.5 overflow-y-auto max-h-[60vh]">
        {column.jobs.length === 0 && (
          <p className="text-center text-[10.5px] text-muted-foreground py-6">
            {draggable ? 'Drop here' : 'Empty'}
          </p>
        )}
        {column.jobs.map((job) => (
          <CompactJobCard
            key={job.id}
            job={job}
            isSelected={selected.has(job.id)}
            onToggle={() => onToggleSelect(job.id)}
            draggable={draggable}
            onClick={() => onCardClick(job)}
            onMenuAction={(action) => onMenuAction(job, action)}
            trucks={trucks}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Compact card
// ──────────────────────────────────────────────────────────────────

function CompactJobCard({
  job,
  isSelected,
  onToggle,
  draggable,
  onClick,
  onMenuAction,
  trucks,
}: {
  job: Job;
  isSelected: boolean;
  onToggle: () => void;
  draggable: boolean;
  onClick: () => void;
  onMenuAction: (action: JobMenuAction) => void;
  trucks: import('@/lib/types').Truck[];
}) {
  const total = (job.fee ?? 0) + (job.fuelLevy ?? 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group rounded-xl border p-2.5 space-y-1.5 transition-all text-left cursor-pointer',
        isSelected
          ? 'border-rebel-accent bg-rebel-accent-surface/40 ring-1 ring-rebel-accent/30'
          : 'border-rebel-border bg-rebel-surface hover:border-rebel-accent/30',
        draggable && 'sm:cursor-grab sm:active:cursor-grabbing',
      )}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', job.id);
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="shrink-0 mt-0.5 text-rebel-text-tertiary hover:text-rebel-accent"
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-rebel-accent" />
          ) : (
            <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        {draggable && (
          <GripVertical className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground/40 hidden sm:block" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-semibold text-rebel-text truncate">
            {job.customerName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusPill status={job.status} size="xs" />
            {job.assignedTruck && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rebel-text-tertiary">
                <TruckIcon className="w-2.5 h-2.5" />
                {job.assignedTruck}
              </span>
            )}
          </div>
        </div>
        <JobActionMenu
          job={job}
          trucks={trucks}
          size="icon-xs"
          onAction={onMenuAction}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-rebel-text-tertiary">
        <span className="flex items-center gap-1 truncate">
          <Calendar className="w-2.5 h-2.5" />
          {formatCompactDate(job.date)}
        </span>
        {total > 0 && (
          <span className="flex items-center gap-0.5 font-mono font-bold tabular-nums shrink-0">
            <DollarSign className="w-2.5 h-2.5" />
            {total.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Group-by picker
// ──────────────────────────────────────────────────────────────────

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'truck', label: 'Truck' },
  { id: 'date', label: 'Date' },
  { id: 'customer', label: 'Customer' },
];

function GroupByPicker({
  value,
  onChange,
}: {
  value: GroupBy;
  onChange: (v: GroupBy) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
        Group
      </span>
      {GROUP_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors',
            value === opt.id
              ? 'bg-rebel-accent text-white'
              : 'bg-card border border-rebel-border text-rebel-text-secondary hover:bg-rebel-accent-surface hover:text-rebel-accent',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function buildColumns(
  jobs: Job[],
  groupBy: GroupBy,
  truckNames: string[],
  customers: Customer[],
): ColumnDef[] {
  switch (groupBy) {
    case 'status':
      return STATUS_ORDER.map((s) => ({
        key: s,
        label: s,
        // Operations-state jobs (Scheduled/Notified/In Delivery) bucket under
        // Accepted in the Board view — Yamin tracks those on Truck Runs.
        jobs: jobs.filter((j) =>
          j.status === s || (s === 'Accepted' && OPERATIONS_STATUSES.includes(j.status)),
        ),
      }));

    case 'truck': {
      const cols: ColumnDef[] = truckNames.map((t) => ({
        key: t,
        label: t,
        jobs: jobs.filter((j) => j.assignedTruck === t),
      }));
      const unassigned = jobs.filter((j) => !j.assignedTruck);
      cols.push({ key: '__unassigned__', label: 'Unassigned', jobs: unassigned });
      return cols;
    }

    case 'date': {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cols: ColumnDef[] = [];
      for (let i = 0; i < 14; i++) {
        const d = addDays(today, i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE d');
        cols.push({
          key: dateStr,
          label,
          jobs: jobs.filter((j) => j.date === dateStr),
        });
      }
      return cols;
    }

    case 'customer': {
      const map = new Map<string, { name: string; jobs: Job[] }>();
      for (const j of jobs) {
        const key = j.customerId ?? j.customerName;
        const existing = map.get(key);
        if (existing) {
          existing.jobs.push(j);
        } else {
          const name =
            customers.find((c) => c.id === j.customerId)?.name ?? j.customerName;
          map.set(key, { name, jobs: [j] });
        }
      }
      return [...map.entries()]
        .sort((a, b) => b[1].jobs.length - a[1].jobs.length)
        .map(([key, val]) => ({
          key,
          label: val.name,
          jobs: val.jobs,
        }));
    }
  }
}

function formatCompactDate(date: string | undefined): string {
  if (!date) return '—';
  try {
    const d = parseISO(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE d');
  } catch {
    return date;
  }
}
