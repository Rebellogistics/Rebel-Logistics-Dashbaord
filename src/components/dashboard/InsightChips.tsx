import { Job } from '@/lib/types';
import { useMemo } from 'react';
import { addDays, format, parseISO, subDays, isAfter, isBefore } from 'date-fns';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';

interface InsightChipsProps {
  jobs: Job[];
}

export function InsightChips({ jobs }: InsightChipsProps) {
  const insights = useMemo(() => buildInsights(jobs), [jobs]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <InsightCard
        label="Jobs vs last week"
        value={`${insights.jobsThisWeek}`}
        delta={insights.jobsDelta}
        deltaSuffix=" vs last 7"
        sparkline={insights.dailyJobCounts}
      />
      <InsightCard
        label="On-time deliveries"
        value={`${insights.onTimePct}%`}
        delta={insights.onTimeDelta}
        deltaSuffix="%"
        sparkline={insights.dailyOnTime}
      />
    </div>
  );
}

interface InsightCardProps {
  label: string;
  value: string;
  delta: number;
  deltaSuffix?: string;
  sparkline: number[];
}

function InsightCard({ label, value, delta, deltaSuffix = '', sparkline }: InsightCardProps) {
  const positive = delta > 0;
  const flat = delta === 0;
  return (
    <div className="rounded-2xl bg-card border border-rebel-border p-4 shadow-card flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary truncate">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[20px] font-bold leading-none text-rebel-text tabular-nums tracking-tight">
            {value}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md text-[10px] font-bold',
              flat
                ? 'bg-muted text-muted-foreground'
                : positive
                  ? 'bg-rebel-success-surface text-rebel-success'
                  : 'bg-rebel-danger-surface text-rebel-danger',
            )}
          >
            {flat ? (
              <Minus className="w-2.5 h-2.5" />
            ) : positive ? (
              <ArrowUpRight className="w-2.5 h-2.5" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5" />
            )}
            {flat ? '0' : `${positive ? '+' : ''}${delta}`}
            {deltaSuffix}
          </span>
        </div>
      </div>
      <Sparkline values={sparkline} width={88} height={32} />
    </div>
  );
}

interface InsightSnapshot {
  jobsThisWeek: number;
  jobsLastWeek: number;
  jobsDelta: number;
  revenueThisWeek: number;
  revenueLastWeek: number;
  revenueDeltaPct: number;
  onTimePct: number;
  onTimeLastWeekPct: number;
  onTimeDelta: number;
  dailyJobCounts: number[];
  dailyRevenue: number[];
  dailyOnTime: number[];
}

function buildInsights(jobs: Job[]): InsightSnapshot {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenAgo = subDays(today, 7);
  const fourteenAgo = subDays(today, 14);

  const dailyJobCounts: number[] = Array(7).fill(0);
  const dailyRevenue: number[] = Array(7).fill(0);
  const dailyOnTime: number[] = Array(7).fill(0);
  const dailyOnTimeTotal: number[] = Array(7).fill(0);

  let jobsThisWeek = 0;
  let jobsLastWeek = 0;
  let revenueThisWeek = 0;
  let revenueLastWeek = 0;
  let onTimeThisWeek = 0;
  let billableThisWeek = 0;
  let onTimeLastWeek = 0;
  let billableLastWeek = 0;

  for (const job of jobs) {
    if (job.status === 'Quote' || job.status === 'Declined') continue;
    if (!job.date) continue;
    let jobDate: Date;
    try {
      jobDate = parseISO(job.date);
    } catch {
      continue;
    }

    const fee = job.fee + (job.fuelLevy ?? 0);
    const inThisWeek = !isBefore(jobDate, sevenAgo) && !isAfter(jobDate, today);
    const inLastWeek = !isBefore(jobDate, fourteenAgo) && isBefore(jobDate, sevenAgo);
    const onTime = wasOnTime(job);

    if (inThisWeek) {
      jobsThisWeek += 1;
      revenueThisWeek += fee;
      const dayIdx = Math.min(6, Math.max(0, Math.floor((jobDate.getTime() - sevenAgo.getTime()) / 86400000)));
      dailyJobCounts[dayIdx] += 1;
      dailyRevenue[dayIdx] += fee;
      if (job.status === 'Completed' || job.status === 'Invoiced') {
        billableThisWeek += 1;
        dailyOnTimeTotal[dayIdx] += 1;
        if (onTime) {
          onTimeThisWeek += 1;
          dailyOnTime[dayIdx] += 1;
        }
      }
    } else if (inLastWeek) {
      jobsLastWeek += 1;
      revenueLastWeek += fee;
      if (job.status === 'Completed' || job.status === 'Invoiced') {
        billableLastWeek += 1;
        if (onTime) onTimeLastWeek += 1;
      }
    }
  }

  // Convert dailyOnTime to a percentage per day for the sparkline
  const dailyOnTimePct = dailyOnTime.map((v, i) =>
    dailyOnTimeTotal[i] === 0 ? 0 : Math.round((v / dailyOnTimeTotal[i]) * 100),
  );

  const onTimePct = billableThisWeek === 0 ? 0 : Math.round((onTimeThisWeek / billableThisWeek) * 100);
  const onTimeLastWeekPct =
    billableLastWeek === 0 ? 0 : Math.round((onTimeLastWeek / billableLastWeek) * 100);

  const revenueDeltaPct =
    revenueLastWeek === 0
      ? revenueThisWeek > 0
        ? 100
        : 0
      : Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100);

  // Suppress unused-var warning for `format` import which the file used to use
  void format;

  return {
    jobsThisWeek,
    jobsLastWeek,
    jobsDelta: jobsThisWeek - jobsLastWeek,
    revenueThisWeek,
    revenueLastWeek,
    revenueDeltaPct,
    onTimePct,
    onTimeLastWeekPct,
    onTimeDelta: onTimePct - onTimeLastWeekPct,
    dailyJobCounts,
    dailyRevenue,
    dailyOnTime: dailyOnTimePct,
  };
}

function wasOnTime(job: Job): boolean {
  // Heuristic: a completed job is "on time" if it has proof captured (we don't
  // store actual completion timestamp). Conservative — better than nothing.
  if (job.status === 'Completed' || job.status === 'Invoiced') {
    return !!(job.proofPhoto || job.signature);
  }
  return false;
}
