import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Job, JobType } from '@/lib/types';
import { useTrucks } from '@/hooks/useTrucks';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Receipt,
  Route,
  TrendingUp,
  DollarSign,
  Fuel,
  Users,
  Truck,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isThisMonth,
  isThisWeek,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';

type ReviewMode = 'weekly' | 'monthly';

interface ReviewsViewProps {
  jobs: Job[];
}

export function ReviewsView({ jobs }: ReviewsViewProps) {
  const [mode, setMode] = useState<ReviewMode>('weekly');
  const [anchor, setAnchor] = useState<Date>(new Date());

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);

  const handlePrev = () =>
    setAnchor((d) => (mode === 'weekly' ? subWeeks(d, 1) : subMonths(d, 1)));
  const handleNext = () =>
    setAnchor((d) => (mode === 'weekly' ? addWeeks(d, 1) : addMonths(d, 1)));
  const handleNow = () => setAnchor(new Date());

  const isCurrent =
    mode === 'weekly'
      ? isThisWeek(anchor, { weekStartsOn: 1 })
      : isThisMonth(anchor);

  const headerLabel =
    mode === 'weekly'
      ? `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`
      : format(monthStart, 'MMMM yyyy');

  const weekJobs = useMemo(
    () => jobsInRange(jobs, weekStart, weekEnd),
    [jobs, weekStart, weekEnd]
  );
  const monthJobs = useMemo(
    () => jobsInRange(jobs, monthStart, monthEnd),
    [jobs, monthStart, monthEnd]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card rounded-xl border p-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === 'weekly' ? 'default' : 'outline'}
            className={mode === 'weekly' ? 'bg-rebel-accent hover:bg-rebel-accent-hover text-white' : ''}
            onClick={() => setMode('weekly')}
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant={mode === 'monthly' ? 'default' : 'outline'}
            className={mode === 'monthly' ? 'bg-rebel-accent hover:bg-rebel-accent-hover text-white' : ''}
            onClick={() => setMode('monthly')}
          >
            Monthly
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button size="icon-sm" variant="outline" onClick={handlePrev} aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-[200px] text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {isCurrent
                ? mode === 'weekly'
                  ? 'This week'
                  : 'This month'
                : mode === 'weekly'
                  ? 'Week of'
                  : 'Month of'}
            </p>
            <p className="font-bold text-sm">{headerLabel}</p>
          </div>
          <Button size="icon-sm" variant="outline" onClick={handleNext} aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleNow}>
            {mode === 'weekly' ? 'This week' : 'This month'}
          </Button>
        </div>
      </div>

      {mode === 'weekly' ? <WeeklyReview jobs={weekJobs} /> : <MonthlyReview jobs={monthJobs} />}
    </div>
  );
}

function jobsInRange(jobs: Job[], start: Date, end: Date): Job[] {
  return jobs.filter((j) => {
    if (!j.date) return false;
    try {
      const d = parseISO(j.date);
      return !isBefore(d, start) && !isAfter(d, end);
    } catch {
      return false;
    }
  });
}

// ----- Weekly -----

function WeeklyReview({ jobs }: { jobs: Job[] }) {
  const openCompletions = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (j.status === 'Completed' || j.status === 'Invoiced') &&
          (!j.proofPhoto || !j.signature)
      ),
    [jobs]
  );

  const needsInvoicing = useMemo(
    () => jobs.filter((j) => j.status === 'Completed'),
    [jobs]
  );

  const longDistance = useMemo(
    () => jobs.filter((j) => (j.distanceKm ?? 0) > 40),
    [jobs]
  );

  const numbers = useMemo(() => {
    const billable = jobs.filter((j) => j.status !== 'Declined' && j.status !== 'Quote');
    return {
      totalJobs: billable.length,
      totalRevenue: billable.reduce((sum, j) => sum + j.fee + (j.fuelLevy ?? 0), 0),
      totalFuelLevy: billable.reduce((sum, j) => sum + (j.fuelLevy ?? 0), 0),
    };
  }, [jobs]);

  return (
    <div className="space-y-4">
      <WeeklyNumbers numbers={numbers} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReviewCard
          icon={Camera}
          title="Open Completions"
          description="Completed jobs missing proof or signature"
          count={openCompletions.length}
          accent="red"
          emptyMessage="All completed jobs have proof on file."
        >
          {openCompletions.map((job) => (
            <JobRow key={job.id} job={job}>
              <span className="text-[10px] text-muted-foreground">
                missing{' '}
                {[!job.proofPhoto && 'photo', !job.signature && 'signature']
                  .filter(Boolean)
                  .join(' & ')}
              </span>
            </JobRow>
          ))}
        </ReviewCard>

        <ReviewCard
          icon={Receipt}
          title="Needs Invoicing"
          description="Completed jobs not yet marked Invoiced"
          count={needsInvoicing.length}
          accent="amber"
          emptyMessage="Nothing waiting to be invoiced."
        >
          {needsInvoicing.map((job) => (
            <JobRow key={job.id} job={job}>
              <span className="text-[10px] font-semibold">
                ${(job.fee + (job.fuelLevy ?? 0)).toFixed(2)}
              </span>
            </JobRow>
          ))}
        </ReviewCard>

        <ReviewCard
          icon={Route}
          title="Long-distance Review"
          description="Jobs this week with distance over 40km"
          count={longDistance.length}
          accent="indigo"
          emptyMessage="No long-distance jobs this week."
        >
          {longDistance.map((job) => (
            <JobRow key={job.id} job={job}>
              <span className="text-[10px] text-muted-foreground">
                {job.distanceKm?.toFixed(0)}km · ${(job.fee + (job.fuelLevy ?? 0)).toFixed(2)}
              </span>
            </JobRow>
          ))}
        </ReviewCard>
      </div>
    </div>
  );
}

interface WeeklyNumbersProps {
  numbers: {
    totalJobs: number;
    totalRevenue: number;
    totalFuelLevy: number;
  };
}

function WeeklyNumbers({ numbers }: WeeklyNumbersProps) {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NumberCell
          icon={TrendingUp}
          label="Total Jobs"
          value={numbers.totalJobs.toString()}
          accent="teal"
        />
        <NumberCell
          icon={DollarSign}
          label="Revenue"
          value={`$${numbers.totalRevenue.toFixed(2)}`}
          accent="green"
        />
        <NumberCell
          icon={Fuel}
          label="Fuel Levy"
          value={`$${numbers.totalFuelLevy.toFixed(2)}`}
          accent="orange"
        />
      </CardContent>
    </Card>
  );
}

// ----- Monthly -----

function MonthlyReview({ jobs }: { jobs: Job[] }) {
  const { data: trucks = [] } = useTrucks();
  const truckNames = useMemo(
    () => trucks.filter((t) => t.active).map((t) => t.name),
    [trucks]
  );

  const billable = useMemo(
    () => jobs.filter((j) => j.status !== 'Declined' && j.status !== 'Quote'),
    [jobs]
  );

  const revenueByType = useMemo(() => {
    const sums: Record<JobType, number> = { Standard: 0, 'White Glove': 0, 'House Move': 0 };
    for (const job of billable) {
      sums[job.type] = (sums[job.type] ?? 0) + job.fee + (job.fuelLevy ?? 0);
    }
    const total = Object.values(sums).reduce((s, v) => s + v, 0);
    return { sums, total };
  }, [billable]);

  const fuelLevyTotal = useMemo(
    () => billable.reduce((s, j) => s + (j.fuelLevy ?? 0), 0),
    [billable]
  );
  const jobsWithLevy = billable.filter((j) => (j.fuelLevy ?? 0) > 0).length;

  const topClients = useMemo(() => {
    const byName = new Map<string, { name: string; jobs: number; revenue: number }>();
    for (const job of billable) {
      const key = job.customerName;
      if (!byName.has(key)) byName.set(key, { name: key, jobs: 0, revenue: 0 });
      const entry = byName.get(key)!;
      entry.jobs += 1;
      entry.revenue += job.fee + (job.fuelLevy ?? 0);
    }
    return [...byName.values()]
      .sort((a, b) => b.jobs - a.jobs || b.revenue - a.revenue)
      .slice(0, 5);
  }, [billable]);

  const perTruck = useMemo(() => {
    const calc = (truck: string) => {
      const rows = billable.filter((j) => j.assignedTruck === truck);
      const completed = rows.filter(
        (j) => j.status === 'Completed' || j.status === 'Invoiced'
      );
      const withProof = completed.filter((j) => j.proofPhoto && j.signature).length;
      return {
        truck,
        jobs: rows.length,
        revenue: rows.reduce((s, j) => s + j.fee + (j.fuelLevy ?? 0), 0),
        proofRate:
          completed.length === 0
            ? 0
            : Math.round((withProof / completed.length) * 100),
      };
    };
    return truckNames.map(calc);
  }, [billable, truckNames]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <SectionHeader icon={DollarSign} title="Revenue by Job Type" accent="green" />
          {revenueByType.total === 0 ? (
            <EmptyMessage text="No billable jobs this month." />
          ) : (
            <div className="space-y-2 pt-2">
              {(Object.entries(revenueByType.sums) as [JobType, number][]).map(
                ([type, amount]) => {
                  const pct =
                    revenueByType.total === 0 ? 0 : (amount / revenueByType.total) * 100;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{type}</span>
                        <span className="text-muted-foreground">
                          ${amount.toFixed(2)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span className="font-bold">Total</span>
                <span className="font-bold">${revenueByType.total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <SectionHeader icon={Fuel} title="Fuel Levy Collected" accent="orange" />
          <div className="text-center py-4">
            <p className="text-3xl font-bold">${fuelLevyTotal.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              from {jobsWithLevy} long-distance job{jobsWithLevy === 1 ? '' : 's'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none bg-card lg:col-span-2">
        <CardContent className="p-4 space-y-3">
          <SectionHeader icon={Users} title="Top 5 Clients" accent="indigo" />
          {topClients.length === 0 ? (
            <EmptyMessage text="No client activity this month." />
          ) : (
            <div className="space-y-1 pt-2">
              {topClients.map((client, idx) => (
                <div
                  key={client.name}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold">{client.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {client.jobs} job{client.jobs === 1 ? '' : 's'} · $
                    {client.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <SectionHeader icon={Truck} title="Per-Truck Performance" accent="teal" />
          <div className="space-y-3 pt-2">
            {perTruck.map((row) => (
              <div key={row.truck} className="p-3 rounded-lg bg-muted space-y-2">
                <p className="font-bold text-xs">{row.truck}</p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Jobs" value={row.jobs.toString()} />
                  <MiniStat label="Revenue" value={`$${row.revenue.toFixed(0)}`} />
                  <MiniStat label="Proof rate" value={`${row.proofRate}%`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <SectionHeader icon={CheckCircle2} title="Status Distribution" accent="slate" />
          {Object.keys(statusCounts).length === 0 ? (
            <EmptyMessage text="No jobs this month." />
          ) : (
            <div className="space-y-1 pt-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between text-xs py-1 border-b last:border-b-0"
                >
                  <span className="font-semibold">{status}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ----- Shared primitives -----

type Accent = 'slate' | 'amber' | 'teal' | 'red' | 'green' | 'orange' | 'indigo';

const accentIconStyles: Record<Accent, string> = {
  slate: 'bg-muted text-muted-foreground',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-rebel-accent-surface text-rebel-accent',
  red: 'bg-red-100 text-red-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  indigo: 'bg-indigo-100 text-indigo-700',
};

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  accent: Accent;
}

function SectionHeader({ icon: Icon, title, accent }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b pb-3">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentIconStyles[accent]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
    </div>
  );
}

interface ReviewCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  accent: Accent;
  emptyMessage: string;
  children?: ReactNode;
}

function ReviewCard({
  icon: Icon,
  title,
  description,
  count,
  accent,
  emptyMessage,
  children,
}: ReviewCardProps) {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentIconStyles[accent]}`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{title}</h3>
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
            {count}
          </Badge>
        </div>
        {count === 0 ? (
          <EmptyMessage text={emptyMessage} />
        ) : (
          <div className="max-h-72 overflow-y-auto pr-1">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
      <CheckCircle2 className="w-4 h-4 text-green-600" />
      {text}
    </div>
  );
}

interface JobRowProps {
  job: Job;
  children?: ReactNode;
}

function JobRow({ job, children }: JobRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{job.customerName}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {job.pickupAddress} → {job.deliveryAddress}
        </p>
      </div>
      <div className="shrink-0 text-right">{children}</div>
    </div>
  );
}

interface NumberCellProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: Accent;
}

function NumberCell({ icon: Icon, label, value, accent }: NumberCellProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentIconStyles[accent]}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
}

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
