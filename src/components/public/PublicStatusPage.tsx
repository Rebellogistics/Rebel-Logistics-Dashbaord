import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Job, JobStatus } from '@/lib/types';
import { Logo } from '@/components/ui/logo';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClipboardList,
  CheckCircle2,
  Truck,
  PackageCheck,
  FileText,
  Clock,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type LoadState = 'loading' | 'found' | 'not_found' | 'error';

const STATUS_STEPS: { status: JobStatus; label: string; icon: typeof ClipboardList }[] = [
  { status: 'Quote', label: 'Quote received', icon: ClipboardList },
  { status: 'Accepted', label: 'Accepted', icon: CheckCircle2 },
  { status: 'Scheduled', label: 'Scheduled', icon: Clock },
  { status: 'In Delivery', label: 'On the way', icon: Truck },
  { status: 'Completed', label: 'Delivered', icon: PackageCheck },
];

function statusIndex(s: JobStatus): number {
  const idx = STATUS_STEPS.findIndex((step) => step.status === s);
  if (s === 'Invoiced') return STATUS_STEPS.length - 1;
  if (s === 'Notified') return 2;
  return idx >= 0 ? idx : -1;
}

export function PublicStatusPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [state, setState] = useState<LoadState>('loading');
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) {
      setState('not_found');
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, customer_name, status, date, pickup_address, delivery_address, assigned_truck, hours_estimated, type, created_at')
          .eq('id', jobId)
          .single();

        if (cancelled) return;
        if (error || !data) {
          setState('not_found');
          return;
        }
        setJob(toCamelCase(data));
        setState('found');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-rebel-text">
      <header className="glass border-b border-rebel-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Logo variant="full" height={40} className="max-h-[40px]" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8">
        {state === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rebel-accent" />
          </div>
        )}

        {state === 'not_found' && (
          <Card className="border-border shadow-none bg-card">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h2 className="font-bold text-lg">Job not found</h2>
              <p className="text-sm text-muted-foreground">
                The link may have expired or the job ID doesn't exist. Contact Rebel Logistics if
                you expected to see your delivery status here.
              </p>
            </CardContent>
          </Card>
        )}

        {state === 'error' && (
          <Card className="border-red-200 bg-red-50/40 shadow-none">
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h2 className="font-bold text-lg text-red-900">Something went wrong</h2>
              <p className="text-sm text-red-800">Check your connection and try refreshing the page.</p>
            </CardContent>
          </Card>
        )}

        {state === 'found' && job && <StatusCard job={job} />}
      </main>

      <footer className="border-t bg-card py-5">
        <p className="text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Rebel Logistics · Melbourne
        </p>
      </footer>
    </div>
  );
}

function StatusCard({ job }: { job: Job }) {
  const currentIdx = statusIndex(job.status);
  const isDeclined = job.status === 'Declined';
  const isInvoiced = job.status === 'Invoiced';
  const firstName = job.customerName?.split(/\s+/)[0] ?? 'Customer';
  const isInDelivery = job.status === 'In Delivery';

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-rebel-accent-surface text-rebel-accent text-[10px] font-bold uppercase tracking-wider mb-3">
          Job status
        </span>
        <h2 className="font-display text-[24px] sm:text-[28px] font-bold tracking-tight text-rebel-text leading-tight">
          {isDeclined
            ? `Hi ${firstName}, this job was declined`
            : isInDelivery
              ? `Hi ${firstName}, your driver is on the way`
              : currentIdx >= STATUS_STEPS.length - 1
                ? `Hi ${firstName}, your delivery is complete`
                : `Hi ${firstName}, here's your job status`}
        </h2>
        {job.date && (
          <p className="text-[13px] text-muted-foreground mt-2">
            {job.type} · {formatDate(job.date)}
            {job.assignedTruck ? ` · ${job.assignedTruck}` : ''}
          </p>
        )}
      </div>

      {isDeclined ? (
        <Card className="border-red-200 bg-red-50/40 shadow-none">
          <CardContent className="p-5 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-900 font-semibold">This job has been declined.</p>
            <p className="text-xs text-red-800">
              Contact Rebel Logistics if you'd like to reschedule or request a new quote.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-none bg-card">
          <CardContent className="p-5">
            <div className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const Icon = step.icon;
                const reached = i <= currentIdx;
                const isCurrent = i === currentIdx;
                const isLast = i === STATUS_STEPS.length - 1;

                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                          reached
                            ? isCurrent
                              ? 'bg-rebel-accent text-white ring-4 ring-rebel-accent/20'
                              : 'bg-rebel-success text-white'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            'w-0.5 flex-1 min-h-[28px]',
                            i < currentIdx ? 'bg-rebel-success' : 'bg-muted',
                          )}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p
                        className={cn(
                          'text-sm font-semibold mt-1.5',
                          reached ? 'text-rebel-text' : 'text-muted-foreground',
                        )}
                      >
                        {step.label}
                        {isCurrent && (
                          <span className="ml-2 inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-rebel-accent-surface text-rebel-accent text-[9px] font-bold uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </p>
                      {isCurrent && isInDelivery && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Your driver is en route. Sit tight — they'll be there soon.
                          {job.hoursEstimated
                            ? ` Estimated ~${job.hoursEstimated}h.`
                            : ''}
                        </p>
                      )}
                      {isCurrent && step.status === 'Completed' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Delivery complete. Thanks for choosing Rebel Logistics.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {isInvoiced && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-rebel-success text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mt-1.5 text-rebel-text">
                      Invoiced
                      <span className="ml-2 inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-rebel-accent-surface text-rebel-accent text-[9px] font-bold uppercase tracking-wider">
                        Current
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoice has been sent. Contact us if you have any billing queries.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(job.deliveryAddress || job.pickupAddress) && (
        <Card className="border-border shadow-none bg-card">
          <CardContent className="p-4 space-y-2 text-xs">
            {job.pickupAddress && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold text-rebel-text">Pickup:</span>{' '}
                  {job.pickupAddress}
                </span>
              </div>
            )}
            {job.deliveryAddress && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold text-rebel-text">Delivery:</span>{' '}
                  {job.deliveryAddress}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatDate(date: string): string {
  try {
    return format(parseISO(date), 'EEEE d MMMM yyyy');
  } catch {
    return date;
  }
}

function toCamelCase(obj: Record<string, unknown>): Job {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as unknown as Job;
}
