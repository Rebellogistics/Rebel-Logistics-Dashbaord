import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Job } from '@/lib/types';
import { useJobs } from '@/hooks/useSupabaseData';
import { MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/status-pill';

export function MyRunWeek() {
  const { data: jobs = [], isLoading, error } = useJobs();

  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = addDays(today, 7);
    const buckets = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.date) continue;
      try {
        const d = parseISO(job.date);
        if (isBefore(d, today) || isAfter(d, weekEnd)) continue;
        const key = format(d, 'yyyy-MM-dd');
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(job);
      } catch {
        // ignore
      }
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [jobs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-rebel-border border-t-rebel-accent mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Loading your week…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-rebel-border bg-card">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-rebel-danger mx-auto" />
          <p className="text-sm font-semibold">Couldn't load your jobs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[18px] font-bold leading-none">This week</h2>
        <p className="text-[11px] text-rebel-text-tertiary mt-1">
          {grouped.length === 0 ? 'No jobs in the next 7 days' : `${grouped.length} ${grouped.length === 1 ? 'day' : 'days'} with runs`}
        </p>
      </div>

      {grouped.length === 0 ? (
        <Card className="border-rebel-border bg-card">
          <CardContent className="p-10 text-center space-y-2">
            <Calendar className="w-8 h-8 text-rebel-text-tertiary/40 mx-auto" />
            <p className="text-sm text-rebel-text-secondary">All quiet for the next 7 days.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, dayJobs]) => {
            const date = parseISO(dateKey);
            return (
              <section key={dateKey} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[15px] font-bold text-rebel-text">{format(date, 'EEEE')}</p>
                  <p className="text-[11px] font-mono text-rebel-text-tertiary">
                    {format(date, 'd MMM')}
                  </p>
                </div>
                <div className="space-y-2">
                  {dayJobs.map((job) => (
                    <WeekJobRow key={job.id} job={job} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekJobRow({ job }: { job: Job }) {
  const isDone = job.status === 'Completed' || job.status === 'Invoiced';
  return (
    <Card
      className={cn(
        'border border-rebel-border shadow-none',
        isDone ? 'bg-rebel-success-surface/30' : 'bg-card',
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold truncate">{job.customerName}</p>
          <StatusPill status={job.status} size="xs" />
        </div>
        <div className="flex items-start gap-1.5 text-[11px] text-rebel-text-secondary">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-rebel-text-tertiary" />
          <span className="truncate">
            {job.pickupAddress || '—'} → {job.deliveryAddress || '—'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
