import { Job, JobStatus, Customer } from '@/lib/types';
import { Truck, Clock, ArrowRight, MapPin, Flame, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { StatusPill, statusGradient } from '@/components/ui/status-pill';
import { SendSmsDialog } from '@/components/sms/SendSmsDialog';

interface LiveTruckRunsProps {
  jobs: Job[];
  customers?: Customer[];
}

const LIVE_STATUSES: JobStatus[] = ['Accepted', 'Scheduled', 'Notified', 'In Delivery'];

export function LiveTruckRuns({ jobs, customers = [] }: LiveTruckRunsProps) {
  const liveJobs = jobs.filter((j) => LIVE_STATUSES.includes(j.status)).slice(0, 12);
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  return (
    <section>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-rebel-text">
            Live Truck Runs
          </h2>
          <p className="mt-1 text-[12px] text-rebel-text-tertiary">
            {liveJobs.length} active {liveJobs.length === 1 ? 'run' : 'runs'} across the fleet
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
            Sort
          </span>
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-rebel-accent text-white"
            aria-label="Sort"
          >
            <ArrowRight className="w-3.5 h-3.5 -rotate-90" />
          </button>
          <button
            type="button"
            className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-card border border-rebel-border text-rebel-text-secondary hover:text-rebel-text"
            aria-label="Toggle layout"
          >
            <Truck className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {liveJobs.length === 0 ? (
        <EmptyLive />
      ) : (
        <div className="-mx-1 px-1 overflow-x-auto">
          <div className="flex gap-4 pb-3 snap-x snap-mandatory">
            {liveJobs.map((job, i) => {
              const customer =
                (job.customerId && customerById.get(job.customerId)) || {
                  id: job.id,
                  name: job.customerName,
                  vip: false,
                };
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="snap-start"
                >
                  <RunCard job={job} customer={customer} />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

interface RunCardProps {
  job: Job;
  customer: Customer | { id: string; name: string; vip: boolean; avatar?: string; type?: 'individual' | 'company'; companyName?: string };
}

function RunCard({ job, customer }: RunCardProps) {
  const [smsOpen, setSmsOpen] = useState(false);
  const shortRoute = (addr: string) => addr.split(',')[0];
  const isUrgent = job.status === 'In Delivery' || job.status === 'Notified';
  const total = job.fee + (job.fuelLevy ?? 0);
  const [from, to] = statusGradient(job.status);

  return (
    <>
    <article className="group w-[228px] shrink-0 rounded-2xl bg-card border border-rebel-border overflow-hidden shadow-card hover:shadow-glow hover:-translate-y-1 hover:border-rebel-accent/40 transition-all duration-300">
      {/* Hero region — solid status gradient with the customer avatar centered */}
      <div
        className="relative h-[152px] overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 55%)',
          }}
        />
        <div aria-hidden className="absolute inset-0 mix-blend-overlay opacity-30">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/40 blur-2xl" />
        </div>

        {/* Status pill */}
        <div className="absolute top-3 left-3">
          <StatusPill status={job.status} size="sm" withDot className="backdrop-blur-md bg-white/90 dark:bg-black/40" />
        </div>

        {/* Customer avatar — same icon as customers tab */}
        <div className="absolute inset-0 flex items-center justify-center">
          <CustomerAvatar customer={customer} size="xl" showVip />
        </div>

        {/* Truck icon overlay */}
        <Truck className="absolute bottom-3 right-3 w-5 h-5 text-white/70" />

        {/* Bottom: countdown */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-black/45 text-white text-[10px] font-bold backdrop-blur-md">
          {isUrgent ? <Flame className="w-3 h-3 text-orange-300" /> : <Clock className="w-3 h-3" />}
          {formatEta(job)}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-bold text-rebel-text truncate">{job.customerName}</h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSmsOpen(true);
            }}
            disabled={!job.customerPhone?.trim()}
            aria-label="Send SMS to customer"
            title={job.customerPhone ? 'Send SMS' : 'No phone number on file'}
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md text-rebel-text-tertiary hover:bg-rebel-accent-surface hover:text-rebel-accent transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-rebel-text-tertiary"
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] text-rebel-text-tertiary">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {shortRoute(job.pickupAddress)} → {shortRoute(job.deliveryAddress)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1.5 border-t border-rebel-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rebel-text-tertiary">
            {job.assignedTruck ?? 'Unassigned'}
          </span>
          <span className="font-mono text-[12px] font-bold text-rebel-text">
            ${total.toFixed(0)}
          </span>
        </div>
      </div>
    </article>
    <SendSmsDialog
      open={smsOpen}
      onClose={() => setSmsOpen(false)}
      job={job}
      customer={'phone' in customer && 'totalJobs' in customer ? (customer as Customer) : null}
    />
    </>
  );
}

function formatEta(job: Job): string {
  if (job.hoursEstimated && job.hoursEstimated > 0) {
    const hours = Math.floor(job.hoursEstimated);
    const mins = Math.round((job.hoursEstimated - hours) * 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }
  try {
    return format(new Date(job.date), 'MMM d');
  } catch {
    return job.date;
  }
}

function EmptyLive() {
  return (
    <div className="rounded-2xl border border-dashed border-rebel-border bg-card p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-rebel-accent-surface flex items-center justify-center">
        <Truck className="w-5 h-5 text-rebel-accent" />
      </div>
      <p className="mt-3 text-[13px] font-semibold text-rebel-text">No live runs right now</p>
      <p className="mt-1 text-[11px] text-rebel-text-tertiary">
        New jobs in Scheduled, Notified, or In Delivery will appear here.
      </p>
    </div>
  );
}
