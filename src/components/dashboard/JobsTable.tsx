import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Job, JobStatus } from '@/lib/types';
import { Plus, Check, X, PackageCheck, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { NewQuoteDialog } from '@/components/jobs/NewQuoteDialog';
import { useCan } from '@/hooks/useCan';
import { AcceptAssignDialog } from '@/components/jobs/AcceptAssignDialog';
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
  const [declineTarget, setDeclineTarget] = useState<Job | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [viewTarget, setViewTarget] = useState<Job | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const canSeeRevenue = useCan('view_revenue');

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
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-rebel-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] py-3 px-5">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em]">Customer</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">Truck</TableHead>
              {canSeeRevenue && (
                <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em]">Fee</TableHead>
              )}
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] text-right pr-5">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleJobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={canSeeRevenue ? 6 : 5} className="text-center text-[12px] text-rebel-text-tertiary py-12">
                  {jobs.length === 0
                    ? 'No jobs yet. Click New Quote to add one.'
                    : `No jobs match the "${FILTER_LABELS.find((f) => f.id === filter)?.label ?? filter}" filter.`}
                </TableCell>
              </TableRow>
            )}
            {visibleJobs.map((job) => {
              const total = job.fee + (job.fuelLevy ?? 0);
              return (
                <TableRow
                  key={job.id}
                  className="border-b border-rebel-border last:border-0 hover:bg-rebel-surface-sunken transition-colors h-[60px]"
                >
                  <TableCell className="px-5">
                    <StatusPill status={job.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-[12.5px] font-semibold text-rebel-text">{job.customerName}</p>
                      <p className="text-[10.5px] font-mono text-rebel-text-tertiary mt-0.5">{job.customerPhone}</p>
                      <p className="text-[10px] text-rebel-text-tertiary md:hidden mt-0.5">
                        {job.type}
                        {job.assignedTruck ? ` · ${job.assignedTruck}` : ''}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-rebel-text-secondary hidden md:table-cell">{job.type}</TableCell>
                  <TableCell className="text-[12px] text-rebel-text-secondary hidden md:table-cell">
                    {job.assignedTruck ?? '—'}
                  </TableCell>
                  {canSeeRevenue && (
                    <TableCell className="text-[12.5px] font-mono font-bold text-rebel-text tabular-nums">${total.toFixed(2)}</TableCell>
                  )}
                  <TableCell className="text-right pr-5">
                    <RowActions
                      job={job}
                      onView={() => setViewTarget(job)}
                      onAccept={() => setAcceptTarget(job)}
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
      <AcceptAssignDialog job={acceptTarget} onClose={() => setAcceptTarget(null)} />
      <DeclineDialog job={declineTarget} onClose={() => setDeclineTarget(null)} />
      <MarkCompleteDialog job={completeTarget} onClose={() => setCompleteTarget(null)} />
    </>
  );
}

function RowActions({
  job,
  onView,
  onAccept,
  onDecline,
  onComplete,
  onDuplicate,
}: {
  job: Job;
  onView: () => void;
  onAccept: () => void;
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

  if (job.status === 'Scheduled' || job.status === 'Accepted' || job.status === 'Notified' || job.status === 'In Delivery') {
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
