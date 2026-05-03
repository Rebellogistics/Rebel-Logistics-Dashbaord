import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useTrashedJobs,
  useTrashedCustomers,
  useRestoreJobs,
  useRestoreCustomers,
  usePurgeJobs,
  usePurgeCustomers,
} from '@/hooks/useSupabaseData';
import {
  useTrashedTrucks,
  useRestoreTrucks,
  usePurgeTrucks,
} from '@/hooks/useTrucks';
import {
  useTrashedDrivers,
  useRestoreDrivers,
  usePurgeDrivers,
} from '@/hooks/useDrivers';
import {
  Trash2,
  Undo2,
  AlertTriangle,
  Briefcase,
  User as UserIcon,
  Clock,
  Truck as TruckIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'jobs' | 'customers' | 'trucks' | 'drivers';

const PURGE_AFTER_DAYS = 30;

/**
 * Phase 14: Trash for soft-deleted jobs + customers. Two-tab list with
 * Restore (clear deleted_at) and Purge (hard delete). Items past 30 days
 * are highlighted as candidates for purge — eventually a server cron will
 * auto-purge, but we expose the manual button so Yamin can clean now.
 */
export function TrashSection() {
  const [tab, setTab] = useState<Tab>('jobs');
  const { data: trashedJobs = [], isLoading: jobsLoading } = useTrashedJobs();
  const { data: trashedCustomers = [], isLoading: customersLoading } = useTrashedCustomers();
  const { data: trashedTrucks = [], isLoading: trucksLoading } = useTrashedTrucks();
  const { data: trashedDrivers = [], isLoading: driversLoading } = useTrashedDrivers();
  const restoreJobs = useRestoreJobs();
  const restoreCustomers = useRestoreCustomers();
  const restoreTrucks = useRestoreTrucks();
  const restoreDrivers = useRestoreDrivers();
  const purgeJobs = usePurgeJobs();
  const purgeCustomers = usePurgeCustomers();
  const purgeTrucks = usePurgeTrucks();
  const purgeDrivers = usePurgeDrivers();

  const handleRestoreJob = async (id: string, label: string) => {
    try {
      await restoreJobs.mutateAsync([id]);
      toast.success(`Restored ${label}`);
    } catch {
      toast.error('Restore failed');
    }
  };
  const handlePurgeJob = async (id: string, label: string) => {
    if (
      !confirm(
        `Permanently delete ${label}? This cannot be undone — proof photos, history, and SMS log entries will be removed too.`,
      )
    ) {
      return;
    }
    try {
      await purgeJobs.mutateAsync([id]);
      toast.success(`Permanently deleted ${label}`);
    } catch (err) {
      console.error(err);
      toast.error('Permanent delete failed');
    }
  };
  const handleRestoreCustomer = async (id: string, label: string) => {
    try {
      await restoreCustomers.mutateAsync([id]);
      toast.success(`Restored ${label}`);
    } catch {
      toast.error('Restore failed');
    }
  };
  const handlePurgeCustomer = async (id: string, label: string) => {
    if (
      !confirm(
        `Permanently delete ${label}? Linked jobs keep their info but lose the customer link forever.`,
      )
    ) {
      return;
    }
    try {
      await purgeCustomers.mutateAsync([id]);
      toast.success(`Permanently deleted ${label}`);
    } catch (err) {
      console.error(err);
      toast.error('Permanent delete failed');
    }
  };

  const handleRestoreTruck = async (id: string, label: string) => {
    try {
      await restoreTrucks.mutateAsync([id]);
      toast.success(`Restored ${label}`);
    } catch {
      toast.error('Restore failed');
    }
  };
  const handlePurgeTruck = async (id: string, label: string) => {
    if (
      !confirm(
        `Permanently delete ${label}? Jobs assigned to this truck keep the assignment by name; the linkage is lost forever.`,
      )
    )
      return;
    try {
      await purgeTrucks.mutateAsync([id]);
      toast.success(`Permanently deleted ${label}`);
    } catch (err) {
      console.error(err);
      toast.error('Permanent delete failed');
    }
  };
  const handleRestoreDriver = async (id: string, label: string) => {
    try {
      await restoreDrivers.mutateAsync([id]);
      toast.success(`Restored ${label}`);
    } catch {
      toast.error('Restore failed');
    }
  };
  const handlePurgeDriver = async (id: string, label: string) => {
    if (
      !confirm(
        `Permanently delete ${label}? Past job attributions keep the driver name (denormalised on truck_shifts), but the driver row is lost forever.`,
      )
    )
      return;
    try {
      await purgeDrivers.mutateAsync([id]);
      toast.success(`Permanently deleted ${label}`);
    } catch (err) {
      console.error(err);
      toast.error('Permanent delete failed');
    }
  };

  const jobsCount = trashedJobs.length;
  const customersCount = trashedCustomers.length;
  const trucksCount = trashedTrucks.length;
  const driversCount = trashedDrivers.length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-base">Trash</h3>
        <p className="text-xs text-muted-foreground">
          Soft-deleted rows live here for {PURGE_AFTER_DAYS} days. Restore brings them back; permanent delete is irreversible.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-rebel-border overflow-x-auto">
        <TabButton active={tab === 'jobs'} onClick={() => setTab('jobs')} icon={Briefcase}>
          Jobs
          <Badge variant="secondary" className="ml-1.5 bg-muted text-muted-foreground border-none text-[10px]">
            {jobsCount}
          </Badge>
        </TabButton>
        <TabButton
          active={tab === 'customers'}
          onClick={() => setTab('customers')}
          icon={UserIcon}
        >
          Customers
          <Badge variant="secondary" className="ml-1.5 bg-muted text-muted-foreground border-none text-[10px]">
            {customersCount}
          </Badge>
        </TabButton>
        <TabButton active={tab === 'trucks'} onClick={() => setTab('trucks')} icon={TruckIcon}>
          Trucks
          <Badge variant="secondary" className="ml-1.5 bg-muted text-muted-foreground border-none text-[10px]">
            {trucksCount}
          </Badge>
        </TabButton>
        <TabButton active={tab === 'drivers'} onClick={() => setTab('drivers')} icon={UsersIcon}>
          Drivers
          <Badge variant="secondary" className="ml-1.5 bg-muted text-muted-foreground border-none text-[10px]">
            {driversCount}
          </Badge>
        </TabButton>
      </div>

      {tab === 'jobs' && (
        <TrashList
          isLoading={jobsLoading}
          empty={{ icon: Briefcase, label: 'No jobs in Trash.' }}
          rows={trashedJobs.map((j) => ({
            id: j.id,
            primary: j.customerName,
            secondary:
              j.quoteNumber ?? `${j.type}${j.assignedTruck ? ` · ${j.assignedTruck}` : ''}`,
            deletedAt: j.deletedAt ?? null,
          }))}
          onRestore={(id, label) => handleRestoreJob(id, label)}
          onPurge={(id, label) => handlePurgeJob(id, label)}
          isRestoring={restoreJobs.isPending}
          isPurging={purgeJobs.isPending}
        />
      )}
      {tab === 'customers' && (
        <TrashList
          isLoading={customersLoading}
          empty={{ icon: UserIcon, label: 'No customers in Trash.' }}
          rows={trashedCustomers.map((c) => ({
            id: c.id,
            primary: c.name,
            secondary: c.companyName ?? c.phone ?? c.email ?? '—',
            deletedAt: c.deletedAt ?? null,
          }))}
          onRestore={(id, label) => handleRestoreCustomer(id, label)}
          onPurge={(id, label) => handlePurgeCustomer(id, label)}
          isRestoring={restoreCustomers.isPending}
          isPurging={purgeCustomers.isPending}
        />
      )}
      {tab === 'trucks' && (
        <TrashList
          isLoading={trucksLoading}
          empty={{ icon: TruckIcon, label: 'No trucks in Trash.' }}
          rows={trashedTrucks.map((t) => ({
            id: t.id,
            primary: t.name,
            secondary: t.description ?? (t.userId ? 'Has login' : 'No login'),
            deletedAt: t.deletedAt ?? null,
          }))}
          onRestore={(id, label) => handleRestoreTruck(id, label)}
          onPurge={(id, label) => handlePurgeTruck(id, label)}
          isRestoring={restoreTrucks.isPending}
          isPurging={purgeTrucks.isPending}
        />
      )}
      {tab === 'drivers' && (
        <TrashList
          isLoading={driversLoading}
          empty={{ icon: UsersIcon, label: 'No drivers in Trash.' }}
          rows={trashedDrivers.map((d) => ({
            id: d.id,
            primary: d.name,
            secondary: d.phone ?? '—',
            deletedAt: d.deletedAt ?? null,
          }))}
          onRestore={(id, label) => handleRestoreDriver(id, label)}
          onPurge={(id, label) => handlePurgeDriver(id, label)}
          isRestoring={restoreDrivers.isPending}
          isPurging={purgeDrivers.isPending}
        />
      )}
    </div>
  );
}

interface TrashRow {
  id: string;
  primary: string;
  secondary: string;
  deletedAt: string | null;
}

function TrashList({
  isLoading,
  empty,
  rows,
  onRestore,
  onPurge,
  isRestoring,
  isPurging,
}: {
  isLoading: boolean;
  empty: { icon: typeof Briefcase; label: string };
  rows: TrashRow[];
  onRestore: (id: string, label: string) => void;
  onPurge: (id: string, label: string) => void;
  isRestoring: boolean;
  isPurging: boolean;
}) {
  const Empty = empty.icon;
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''),
      ),
    [rows],
  );

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
    );
  }
  if (sorted.length === 0) {
    return (
      <Card className="border-dashed border-rebel-border bg-card shadow-none">
        <CardContent className="p-8 flex flex-col items-center text-center gap-2">
          <Empty className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{empty.label}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((row) => {
        const ageDays = row.deletedAt
          ? differenceInDays(new Date(), parseISO(row.deletedAt))
          : 0;
        const stale = ageDays >= PURGE_AFTER_DAYS;
        return (
          <Card
            key={row.id}
            className={cn(
              'border-rebel-border shadow-none bg-card',
              stale && 'border-amber-300 bg-amber-50/40',
            )}
          >
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{row.primary}</p>
                <p className="text-[11px] text-muted-foreground truncate">{row.secondary}</p>
                <p
                  className={cn(
                    'text-[10px] mt-1 inline-flex items-center gap-1',
                    stale ? 'text-amber-700 font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {stale ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      Past {PURGE_AFTER_DAYS}-day window — ready to purge
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" />
                      Deleted{' '}
                      {row.deletedAt
                        ? formatDistanceToNow(parseISO(row.deletedAt), { addSuffix: true })
                        : 'recently'}
                      {row.deletedAt && (
                        <span className="text-muted-foreground/70">
                          {' · '}
                          {format(parseISO(row.deletedAt), 'd MMM yyyy')}
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onRestore(row.id, row.primary)}
                  disabled={isRestoring}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  onClick={() => onPurge(row.id, row.primary)}
                  disabled={isPurging}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete forever
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Briefcase;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 px-3 -mb-px border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5',
        active
          ? 'border-rebel-accent text-rebel-accent'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}
