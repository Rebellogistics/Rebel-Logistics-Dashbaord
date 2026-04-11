import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Customer, Job } from '@/lib/types';
import {
  Plus,
  Search,
  Users,
  Building2,
  LayoutGrid,
  Rows3,
  Phone as PhoneIcon,
} from 'lucide-react';
import { CustomerAvatar } from './CustomerAvatar';
import { CustomerDialog } from './CustomerDialog';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { useDeleteCustomer } from '@/hooks/useSupabaseData';
import { normalizePhone } from '@/hooks/useRepeatCustomer';
import { toast } from 'sonner';
import { Sparkline } from '@/components/ui/sparkline';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO, differenceInDays, startOfWeek, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'individual' | 'company' | 'vip';
type Layout = 'table' | 'grid';

interface CustomersViewProps {
  customers: Customer[];
  jobs: Job[];
}

interface CustomerStats {
  count: number;
  revenue: number;
  lastDate: string;
  weeklyCounts: number[];
}

export function CustomersView({ customers, jobs }: CustomersViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [layout, setLayout] = useState<Layout>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [detailTarget, setDetailTarget] = useState<Customer | null>(null);
  const deleteCustomer = useDeleteCustomer();

  const jobStatsByCustomer = useMemo(() => {
    const map = new Map<string, CustomerStats>();
    const weekStart = startOfWeek(addWeeks(new Date(), -7), { weekStartsOn: 1 });
    for (const job of jobs) {
      if (!job.customerId) continue;
      if (job.status === 'Quote' || job.status === 'Declined') continue;
      const entry =
        map.get(job.customerId) ??
        ({ count: 0, revenue: 0, lastDate: '', weeklyCounts: Array(8).fill(0) } as CustomerStats);
      entry.count += 1;
      entry.revenue += job.fee + (job.fuelLevy ?? 0);
      if (job.date > entry.lastDate) entry.lastDate = job.date;
      try {
        const jobDate = parseISO(job.date);
        const weekIdx = Math.floor(differenceInDays(jobDate, weekStart) / 7);
        if (weekIdx >= 0 && weekIdx < 8) entry.weeklyCounts[weekIdx] += 1;
      } catch {
        // ignore unparseable dates
      }
      map.set(job.customerId, entry);
    }
    return map;
  }, [jobs]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedSearchDigits = normalizePhone(search);
    return customers
      .filter((c) => {
        if (filter === 'individual' && c.type !== 'individual') return false;
        if (filter === 'company' && c.type !== 'company') return false;
        if (filter === 'vip' && !c.vip) return false;
        if (!normalizedSearch) return true;
        const haystack = [c.name, c.companyName, c.email, c.phone, c.notes]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.includes(normalizedSearch)) return true;
        if (normalizedSearchDigits.length >= 3 && c.phone) {
          return normalizePhone(c.phone).includes(normalizedSearchDigits);
        }
        return false;
      })
      .sort((a, b) => {
        if (a.vip !== b.vip) return a.vip ? -1 : 1;
        const aLast = jobStatsByCustomer.get(a.id)?.lastDate ?? '';
        const bLast = jobStatsByCustomer.get(b.id)?.lastDate ?? '';
        if (aLast !== bLast) return bLast.localeCompare(aLast);
        return a.name.localeCompare(b.name);
      });
  }, [customers, filter, search, jobStatsByCustomer]);

  const handleNew = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setDetailTarget(null);
    setEditTarget(customer);
    setDialogOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(
        `Delete ${customer.name}? Linked jobs will keep their info but lose the customer link.`,
      )
    ) {
      return;
    }
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast.success('Customer deleted');
      setDetailTarget(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete customer');
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, company…"
              className="h-10 pl-10 bg-card"
            />
          </div>
          <div className="flex items-center gap-1">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
              All ({customers.length})
            </FilterButton>
            <FilterButton active={filter === 'individual'} onClick={() => setFilter('individual')}>
              Individuals
            </FilterButton>
            <FilterButton active={filter === 'company'} onClick={() => setFilter('company')}>
              Companies
            </FilterButton>
            <FilterButton active={filter === 'vip'} onClick={() => setFilter('vip')}>
              VIP
            </FilterButton>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-rebel-border p-1 bg-card">
            <LayoutToggleButton
              active={layout === 'table'}
              onClick={() => setLayout('table')}
              aria-label="Table layout"
            >
              <Rows3 className="w-3.5 h-3.5" />
            </LayoutToggleButton>
            <LayoutToggleButton
              active={layout === 'grid'}
              onClick={() => setLayout('grid')}
              aria-label="Grid layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </LayoutToggleButton>
          </div>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
            onClick={handleNew}
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {filtered.length === 0 ? (
          customers.length === 0 ? (
            <EmptyState
              icon={Users}
              tone="accent"
              title="No customers yet"
              description="Add your first customer manually, or import an existing list from CSV in Settings → Import."
              actionLabel="Add Customer"
              onAction={handleNew}
            />
          ) : (
            <EmptyState
              icon={Search}
              tone="neutral"
              title="No customers match"
              description="Try a different filter or clear the search."
            />
          )
        ) : layout === 'table' ? (
          <CustomerTable
            customers={filtered}
            stats={jobStatsByCustomer}
            onSelect={setDetailTarget}
          />
        ) : (
          <CustomerGrid
            customers={filtered}
            stats={jobStatsByCustomer}
            onSelect={setDetailTarget}
          />
        )}
      </div>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        customer={editTarget}
      />

      <CustomerDetailDialog
        customer={detailTarget}
        jobs={jobs}
        onClose={() => setDetailTarget(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </>
  );
}

function CustomerTable({
  customers,
  stats,
  onSelect,
}: {
  customers: Customer[];
  stats: Map<string, CustomerStats>;
  onSelect: (c: Customer) => void;
}) {
  return (
    <div className="bg-card rounded-2xl border border-rebel-border overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-rebel-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] py-3 pl-5">
                Customer
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">
                Phone
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden lg:table-cell">
                Type
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] text-right">
                Jobs
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] text-right">
                Spent
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden md:table-cell">
                Last
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden lg:table-cell">
                8w trend
              </TableHead>
              <TableHead className="text-[10px] uppercase font-bold text-rebel-text-tertiary tracking-[0.08em] hidden lg:table-cell pr-5">
                Source
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const s = stats.get(customer.id);
              const last = s?.lastDate ? relativeDate(s.lastDate) : '—';
              const displayName =
                customer.type === 'company' && customer.companyName
                  ? customer.companyName
                  : customer.name;
              return (
                <TableRow
                  key={customer.id}
                  className="border-b border-rebel-border last:border-0 hover:bg-muted transition-colors h-[64px] cursor-pointer"
                  onClick={() => onSelect(customer)}
                >
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomerAvatar customer={customer} size="md" />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold text-rebel-text truncate">
                          {displayName}
                        </p>
                        {customer.type === 'company' && customer.name && (
                          <p className="text-[10.5px] text-muted-foreground truncate">
                            {customer.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {customer.phone ? (
                      <a
                        href={`tel:${customer.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[11.5px] text-rebel-text-secondary hover:text-rebel-accent inline-flex items-center gap-1.5"
                      >
                        <PhoneIcon className="w-3 h-3 opacity-50" />
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {customer.type === 'company' ? (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border-none text-[10px] h-5 px-1.5"
                      >
                        <Building2 className="w-2.5 h-2.5 mr-0.5" />
                        Company
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground border-none text-[10px] h-5 px-1.5"
                      >
                        Individual
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-[12px] font-semibold tabular-nums text-rebel-text">
                    {s?.count ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px] font-bold text-rebel-text tabular-nums">
                    ${(s?.revenue ?? 0).toFixed(0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[11px] text-muted-foreground">
                    {last}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Sparkline values={s?.weeklyCounts ?? []} width={72} height={22} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell pr-5 text-[11px] text-muted-foreground capitalize">
                    {customer.source ?? '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CustomerGrid({
  customers,
  stats,
  onSelect,
}: {
  customers: Customer[];
  stats: Map<string, CustomerStats>;
  onSelect: (c: Customer) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {customers.map((customer) => {
        const s = stats.get(customer.id);
        const displayName =
          customer.type === 'company' && customer.companyName ? customer.companyName : customer.name;
        return (
          <button
            key={customer.id}
            type="button"
            className="text-left"
            onClick={() => onSelect(customer)}
          >
            <Card className="border-border shadow-none bg-card hover:border-rebel-accent/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CustomerAvatar customer={customer} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate font-mono">
                      {customer.phone ?? 'no phone'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {customer.type === 'company' ? (
                        <Badge
                          variant="secondary"
                          className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border-none text-[10px] h-4 px-1.5"
                        >
                          <Building2 className="w-2.5 h-2.5 mr-0.5" />
                          Company
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground border-none text-[10px] h-4 px-1.5"
                        >
                          Individual
                        </Badge>
                      )}
                      {customer.source && (
                        <span className="text-[10px] text-muted-foreground capitalize">via {customer.source}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rebel-border">
                  <MiniStat label="Jobs" value={(s?.count ?? 0).toString()} />
                  <MiniStat label="Spent" value={`$${(s?.revenue ?? 0).toFixed(0)}`} />
                  <MiniStat label="Last" value={s?.lastDate ? relativeDate(s.lastDate) : '—'} />
                </div>
                <Sparkline values={s?.weeklyCounts ?? []} width={180} height={28} />
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 h-9 rounded-xl text-xs font-semibold transition-colors',
        active
          ? 'bg-rebel-accent text-white'
          : 'bg-card border border-input text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function LayoutToggleButton({
  active,
  onClick,
  children,
  ...props
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  'aria-label': string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded-lg transition-colors',
        active ? 'bg-rebel-accent text-white' : 'text-muted-foreground hover:text-rebel-text',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xs font-bold mt-0.5">{value}</p>
    </div>
  );
}

function relativeDate(iso: string): string {
  try {
    const d = parseISO(iso);
    const days = differenceInDays(new Date(), d);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return format(d, 'MMM d');
    return format(d, 'MMM yyyy');
  } catch {
    return iso.slice(5);
  }
}
