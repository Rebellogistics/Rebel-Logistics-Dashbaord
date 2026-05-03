import { useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Job, JobStatus } from '@/lib/types';
import {
  Plus,
  Check,
  X,
  PackageCheck,
  Copy,
  Eye,
  Star,
  Truck as TruckIcon,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { NewQuoteDialog } from '@/components/jobs/NewQuoteDialog';
import { useCan } from '@/hooks/useCan';
import { useCustomers, useBulkDeleteJobs } from '@/hooks/useSupabaseData';
import { customerDisplay } from '@/lib/jobDisplay';
import { jobTotalIncGst } from '@/lib/pricing';
import { toast } from 'sonner';
import { AcceptDialog } from '@/components/jobs/AcceptDialog';
import { AssignTruckDialog } from '@/components/jobs/AssignTruckDialog';
import { DeclineDialog } from '@/components/jobs/DeclineDialog';
import { MarkCompleteDialog } from '@/components/jobs/MarkCompleteDialog';
import { JobDetailDialog } from '@/components/jobs/JobDetailDialog';
import { cn } from '@/lib/utils';

interface JobsTableProps {
  jobs: Job[];
  title?: string;
  showNewQuoteButton?: boolean;
  showStatusFilters?: boolean;
}

type StatusFilter = 'all' | 'open' | JobStatus;

const FILTER_LABELS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'Quote', label: 'Quotes' },
  { id: 'Accepted', label: 'Accepted' },
  { id: 'Scheduled', label: 'Scheduled' },
  { id: 'In Delivery', label: 'In Delivery' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Invoiced', label: 'Invoiced' },
];

const OPEN_STATUSES: JobStatus[] = ['Quote', 'Accepted', 'Scheduled', 'Notified', 'In Delivery'];

export function JobsTable({
  jobs,
  title = 'Jobs',
  showNewQuoteButton = true,
  showStatusFilters = true,
}: JobsTableProps) {
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Job | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<Job | null>(null);
  const [assignTarget, setAssignTarget] = useState<Job | null>(null);
  const [declineTarget, setDeclineTarget] = useState<Job | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [viewTarget, setViewTarget] = useState<Job | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const canSeeRevenue = useCan('view_revenue');
  const bulkDelete = useBulkDeleteJobs();
  const { data: customers = [] } = useCustomers();
  const vipCustomerIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) if (c.vip) set.add(c.id);
    return set;
  }, [customers]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length, open: 0 };
    for (const job of jobs) {
      c[job.status] = (c[job.status] ?? 0) + 1;
      if (OPEN_STATUSES.includes(job.status)) c.open += 1;
    }
    return c;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    if (filter === 'all') return jobs;
    if (filter === 'open') return jobs.filter((j) => OPEN_STATUSES.includes(j.status));
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  // Drop selections that aren't visible anymore (e.g. after a filter change
  // or a bulk delete that succeeded). Keeps the bulk-action bar honest.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(visibleJobs.map((j) => j.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [visibleJobs]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected =
    visibleJobs.length > 0 && visibleJobs.every((j) => selected.has(j.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelected(new Set());
    else setSelected(new Set(visibleJobs.map((j) => j.id)));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Move ${ids.length} job${ids.length === 1 ? '' : 's'} to Trash?\n\nRestore from Settings → Trash within 30 days.`,
      )
    ) {
      return;
    }
    try {
      await bulkDelete.mutateAsync(ids);
      toast.success(`${ids.length} moved to Trash`);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error('Bulk delete failed');
    }
  };

  const unassignedAcceptedCount = useMemo(
    () => jobs.filter((j) => j.status === 'Accepted' && !j.assignedTruck).length,
    [jobs],
  );

  const openNewQuote = () => {
    setDuplicateSource(null);
    setNewQuoteOpen(true);
  };

  const openDuplicate = (job: Job) => {
    setDuplicateSource(job);
    setNewQuoteOpen(true);
  };

  const closeNewQuote = (open: boolean) => {
    setNewQuoteOpen(open);
    if (!open) setDuplicateSource(null);
  };

  return (
    <>
      {unassignedAcceptedCount > 0 && filter !== 'Accepted' && (
        <button
          type="button"
          onClick={() => setFilter('Accepted')}
          className="w-full mb-3 flex items-center gap-3 rounded-2xl bg-rebel-warning-surface border border-rebel-warning/30 px-4 py-3 text-left hover:bg-rebel-warning-surface/80 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-rebel-warning/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rebel-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-bold text-rebel-warning">
              {unassignedAcceptedCount} accepted {unassignedAcceptedCount === 1 ? 'job' : 'jobs'} waiting for a truck
            </p>
            <p className="text-[10.5px] text-rebel-warning/80 mt-0.5">
              Tap to filter and assign trucks to them.
            </p>
          </div>
          <span className="text-[11px] font-bold text-rebel-warning">View →</span>
        </button>
      )}
      <div className="bg-rebel-surface rounded-2xl border border-rebel-border overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-rebel-border flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-[13px] text-rebel-text leading-none">{title}</h3>
            <p className="mt-1.5 text-[11px] text-rebel-text-tertiary">
              {filter === 'all' ? `${jobs.length} total` : `${visibleJobs.length} of ${jobs.length}`}
            </p>
          </div>
          {showNewQuoteButton && (
            <Button
              size="sm"
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 shrink-0 h-9 px-3 rounded-xl text-[12px] font-semibold shadow-[0_8px_20px_-10px_rgba(45,91,255,0.6)]"
              onClick={openNewQuote}
            >
              <Plus className="w-3.5 h-3.5" />
              New Quote
            </Button>
          )}
        </div>
        {showStatusFilters && (
          <div className="px-5 py-2.5 border-b border-rebel-border flex items-center gap-1.5 overflow-x-auto">
            {FILTER_LABELS.map((opt) => {
              const active = filter === opt.id;
              const count = counts[opt.id] ?? 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors',
                    active
                      ? 'bg-rebel-accent text-white'
                      : 'bg-muted text-rebel-text-secondary hover:bg-rebel-accent-surface hover:text-rebel-accent',
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-md text-[9px] tabular-nums font-bold',
                      active
                        ? 'bg-white/25 text-white'
                        : 'bg-card text-rebel-text-tertiary',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {selected.size > 0 && (
          <div className="sticky top-16 z-20 flex items-center justify-between gap-2 rounded-xl bg-rebel-accent px-4 py-2.5 text-white shadow-glow mb-3">
            <span className="text-[12px] font-bold">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 gap-1.5"
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {bulkDelete.isPending ? 'Deleting…' : 'Move to Trash'}
              </Button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-white/20"
                aria-label="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-rebel-border hover:bg-transparent">
              <TableHead className="w-8 py-3 pl-5 pr-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-rebel-text-tertiary hover:text-rebel-accent"
                  aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
                  title={allVisibleSelected ? 'Deselect all' : 'Select all'}
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-rebel-accent" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] py-3">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em]">Customer</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">Truck</TableHead>
              {canSeeRevenue && (
                <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em]" title="Includes fuel levy + GST">Total inc-GST</TableHead>
              )}
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] text-right pr-5">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={canSeeRevenue ? 7 : 6} className="text-center text-[12px] text-rebel-text-tertiary py-12">
                  {jobs.length === 0
                    ? 'No jobs yet. Click New Quote to add one.'
                    : `No jobs match the "${FILTER_LABELS.find((f) => f.id === filter)?.label ?? filter}" filter.`}
                </TableCell>
              </TableRow>
            )}
            {visibleJobs.map((job) => {
              const total = jobTotalIncGst(job);
              const isSelected = selected.has(job.id);
              return (
                <TableRow
                  key={job.id}
                  onClick={() => setViewTarget(job)}
                  className={cn(
                    'border-b border-rebel-border last:border-0 hover:bg-rebel-surface-sunken transition-colors h-[60px] cursor-pointer',
                    isSelected && 'bg-rebel-accent-surface/40',
                  )}
                >
                  <TableCell className="pl-5 pr-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(job.id)}
                      className="text-rebel-text-tertiary hover:text-rebel-accent"
                      aria-label={isSelected ? 'Deselect job' : 'Select job'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-rebel-accent" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={job.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const display = customerDisplay(job);
                      return (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12.5px] font-semibold text-rebel-text truncate">{display.primary}</p>
                            {job.customerId && vipCustomerIds.has(job.customerId) && (
                              <span
                                className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-amber-400"
                                aria-label="VIP"
                                title="VIP customer"
                              >
                                <Star className="w-2.5 h-2.5 text-white fill-white" />
                              </span>
                            )}
                          </div>
                          {display.secondary && (
                            <p className="text-[10.5px] text-rebel-text-tertiary mt-0.5 truncate">
                              Contact: {display.secondary}
                            </p>
                          )}
                          {job.customerPhone ? (
                            <a
                              href={`tel:${job.customerPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block text-[10.5px] font-mono text-rebel-text-tertiary mt-0.5 hover:text-rebel-accent"
                            >
                              {job.customerPhone}
                            </a>
                          ) : null}
                          <p className="text-[10px] text-rebel-text-tertiary md:hidden mt-0.5">
                            {job.type}
                            {job.assignedTruck ? ` · ${job.assignedTruck}` : ''}
                          </p>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-[12px] text-rebel-text-secondary hidden md:table-cell">{job.type}</TableCell>
                  <TableCell className="text-[12px] text-rebel-text-secondary hidden md:table-cell">
                    {job.assignedTruck ?? '—'}
                  </TableCell>
                  {canSeeRevenue && (
                    <TableCell className="text-[12.5px] font-mono font-bold text-rebel-text tabular-nums">${total.toFixed(2)}</TableCell>
                  )}
                  <TableCell
                    className="text-right pr-5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      job={job}
                      onView={() => setViewTarget(job)}
                      onAccept={() => setAcceptTarget(job)}
                      onAssign={() => setAssignTarget(job)}
                      onDecline={() => setDeclineTarget(job)}
                      onComplete={() => setCompleteTarget(job)}
                      onDuplicate={() => openDuplicate(job)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      <NewQuoteDialog
        open={newQuoteOpen}
        onOpenChange={closeNewQuote}
        prefillJob={duplicateSource}
      />
      <JobDetailDialog job={viewTarget} onClose={() => setViewTarget(null)} />
      <AcceptDialog job={acceptTarget} onClose={() => setAcceptTarget(null)} />
      <AssignTruckDialog job={assignTarget} onClose={() => setAssignTarget(null)} />
      <DeclineDialog job={declineTarget} onClose={() => setDeclineTarget(null)} />
      <MarkCompleteDialog job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </>
  );
}

function RowActions({
  job,
  onView,
  onAccept,
  onAssign,
  onDecline,
  onComplete,
  onDuplicate,
}: {
  job: Job;
  onView: () => void;
  onAccept: () => void;
  onAssign: () => void;
  onDecline: () => void;
  onComplete: () => void;
  onDuplicate: () => void;
}) {
  const viewButton = (
    <Button
      size="xs"
      variant="ghost"
      onClick={onView}
      aria-label="View details"
      title="View details"
    >
      <Eye className="w-3 h-3" />
    </Button>
  );

  if (job.status === 'Quote') {
    return (
      <div className="flex items-center justify-end gap-1">
        {viewButton}
        <Button size="xs" variant="outline" onClick={onAccept} className="gap-1">
          <Check className="w-3 h-3" />
          Accept
        </Button>
        <Button size="xs" variant="ghost" onClick={onDecline} className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
          <X className="w-3 h-3" />
          Decline
        </Button>
      </div>
    );
  }

  if (job.status === 'Accepted') {
    return (
      <div className="flex items-center justify-end gap-1">
        {viewButton}
        <Button size="xs" variant="outline" onClick={onAssign} className="gap-1">
          <TruckIcon className="w-3 h-3" />
          {job.assignedTruck ? 'Change truck' : 'Assign truck'}
        </Button>
        <Button size="xs" variant="outline" onClick={onComplete} className="gap-1">
          <PackageCheck className="w-3 h-3" />
          Complete
        </Button>
      </div>
    );
  }

  if (job.status === 'Scheduled' || job.status === 'Notified' || job.status === 'In Delivery') {
    return (
      <div className="flex items-center justify-end gap-1">
        {viewButton}
        <Button size="xs" variant="outline" onClick={onComplete} className="gap-1">
          <PackageCheck className="w-3 h-3" />
          Mark complete
        </Button>
      </div>
    );
  }

  if (job.status === 'Completed' || job.status === 'Invoiced') {
    return (
      <div className="flex items-center justify-end gap-1">
        {viewButton}
        <Button size="xs" variant="outline" onClick={onDuplicate} className="gap-1">
          <Copy className="w-3 h-3" />
          Rebook
        </Button>
      </div>
    );
  }

  return <div className="flex items-center justify-end gap-1">{viewButton}</div>;
}
