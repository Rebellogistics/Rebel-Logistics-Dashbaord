import { useMemo, useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StorageDialog } from './StorageDialog';
import {
  useStorageRecords,
  useUpdateStorage,
  useDeleteStorage,
  computeStorageStatus,
  daysInStorage,
} from '@/hooks/useStorage';
import type { StorageRecord, Job } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/useSupabaseData';

interface StorageViewProps {
  /** Wired from OwnerShell — open NewQuoteDialog pre-filled from a
   *  storage record (load-out job). */
  onConvertToJob?: (record: StorageRecord) => void;
}

type StatusFilter = 'all' | 'active' | 'overdue' | 'released';

export function StorageView({ onConvertToJob }: StorageViewProps) {
  const { data: records = [], isLoading } = useStorageRecords();
  const { data: customers = [] } = useCustomers();
  const updateStorage = useUpdateStorage();
  const deleteStorage = useDeleteStorage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StorageRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');

  // Today snapshot used by every status / days-elapsed computation in
  // this render — keeps the table internally consistent even if the
  // clock ticks mid-render.
  const today = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => {
        const status = computeStorageStatus(r, today);
        if (statusFilter !== 'all' && statusFilter !== status) return false;
        if (!q) return true;
        return (
          r.customerName.toLowerCase().includes(q) ||
          r.itemsDescription.toLowerCase().includes(q)
        );
      });
  }, [records, statusFilter, search, today]);

  const stats = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let released = 0;
    let monthlyRevenue = 0;
    for (const r of records) {
      const s = computeStorageStatus(r, today);
      if (s === 'active') active += 1;
      if (s === 'overdue') overdue += 1;
      if (s === 'released') released += 1;
      if (s !== 'released' && r.monthlyRate) monthlyRevenue += r.monthlyRate;
    }
    return { active, overdue, released, monthlyRevenue };
  }, [records, today]);

  const handleEdit = (record: StorageRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleNewClick = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const handleMarkReleased = async (record: StorageRecord) => {
    if (record.actualOutDate) return;
    if (!confirm(`Mark "${record.customerName}" as released today?`)) return;
    try {
      await updateStorage.mutateAsync({
        id: record.id,
        actualOutDate: new Date().toISOString().slice(0, 10),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (record: StorageRecord) => {
    if (!confirm(`Delete the storage record for ${record.customerName}?`)) return;
    try {
      await deleteStorage.mutateAsync(record.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rebel-accent-surface text-rebel-accent inline-flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Storage</h1>
            <p className="text-xs text-muted-foreground">
              Items held at the warehouse. Status auto-flips to overdue past the planned out-date.
            </p>
          </div>
        </div>
        <Button
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1"
          onClick={handleNewClick}
        >
          <Plus className="w-4 h-4" />
          New storage record
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active" value={String(stats.active)} icon={<Clock className="w-4 h-4 text-rebel-accent" />} />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          accent={stats.overdue > 0}
        />
        <StatCard label="Released" value={String(stats.released)} icon={<CheckCircle2 className="w-4 h-4 text-rebel-success" />} />
        <StatCard
          label="Monthly recurring inc. GST"
          value={`$${(stats.monthlyRevenue * 1.1).toFixed(0)}`}
          icon={<Boxes className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['active', 'overdue', 'released', 'all'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'h-7 px-2.5 rounded-full text-[11px] font-semibold capitalize transition-colors border',
              statusFilter === s
                ? 'bg-rebel-accent text-white border-rebel-accent'
                : 'bg-card text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {s}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or items…"
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-8 text-center">Loading storage records…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">
              {records.length === 0
                ? 'No storage records yet. Create one or convert a completed delivery job.'
                : 'No records match this filter.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((r) => (
                <StorageRow
                  key={r.id}
                  record={r}
                  today={today}
                  customerHasPhone={customers.some((c) => c.id === r.customerId && c.phone)}
                  onEdit={() => handleEdit(r)}
                  onMarkReleased={() => handleMarkReleased(r)}
                  onConvertToJob={onConvertToJob ? () => onConvertToJob(r) : undefined}
                  onDelete={() => handleDelete(r)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StorageDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRecord(null);
        }}
        record={editingRecord}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-3 border',
        accent
          ? 'bg-amber-50 border-amber-200'
          : 'bg-card border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {icon}
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function StorageRow({
  record,
  today,
  customerHasPhone,
  onEdit,
  onMarkReleased,
  onConvertToJob,
  onDelete,
}: {
  record: StorageRecord;
  today: Date;
  customerHasPhone: boolean;
  onEdit: () => void;
  onMarkReleased: () => void;
  onConvertToJob?: () => void;
  onDelete: () => void;
}) {
  const status = computeStorageStatus(record, today);
  const days = daysInStorage(record, today);
  const plannedOut = record.plannedOutDate ? format(parseISO(record.plannedOutDate), 'd MMM yyyy') : null;
  const inDateLabel = format(parseISO(record.inDate), 'd MMM yyyy');
  const rateInc = record.monthlyRate != null ? record.monthlyRate * 1.1 : null;

  return (
    <li className="p-3 sm:p-4 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={status} />
            <span className="font-semibold text-sm truncate">{record.customerName}</span>
            {!customerHasPhone && record.customerId && (
              <span className="text-[10px] text-muted-foreground italic">no phone on file</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {record.itemsDescription}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
            <span>In: {inDateLabel}</span>
            {plannedOut && <span>Planned out: {plannedOut}</span>}
            <span>·</span>
            <span>{days} day{days === 1 ? '' : 's'} stored</span>
            {rateInc != null && (
              <>
                <span>·</span>
                <span title="Inc. GST">
                  ${rateInc.toFixed(0)}/mo inc. GST
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status !== 'released' && (
            <Button
              variant="ghost"
              size="xs"
              className="gap-1 h-7 text-rebel-success hover:bg-rebel-success/10"
              onClick={onMarkReleased}
              title="Mark as released today"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Release</span>
            </Button>
          )}
          {onConvertToJob && (
            <Button
              variant="ghost"
              size="xs"
              className="gap-1 h-7 text-rebel-accent hover:bg-rebel-accent-surface"
              onClick={onConvertToJob}
              title="Create a load-out delivery job from this record"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">To job</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="h-7 w-7 p-0"
            onClick={onEdit}
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 w-7 p-0 text-rebel-danger hover:bg-rebel-danger-surface"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: ReturnType<typeof computeStorageStatus> }) {
  if (status === 'active') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-none gap-1">
        <Clock className="w-3 h-3" />
        Active
      </Badge>
    );
  }
  if (status === 'overdue') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-none gap-1">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-none gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Released
    </Badge>
  );
}
