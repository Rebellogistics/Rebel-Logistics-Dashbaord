import { Job, SmsLogEntry } from '@/lib/types';
import { Truck, Bell, CheckCircle2, ArrowUpRight, LucideIcon } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion } from 'motion/react';

interface KPIStatsProps {
  jobs: Job[];
  smsLog: SmsLogEntry[];
}

export function KPIStatsCards({ jobs, smsLog }: KPIStatsProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const jobsToday = jobs.filter((j) => j.date === today);
  const jobsYesterday = jobs.filter((j) => j.date === yesterday);
  const truck1Count = jobsToday.filter((j) => j.assignedTruck === 'Truck 1').length;
  const truck2Count = jobsToday.filter((j) => j.assignedTruck === 'Truck 2').length;
  const jobsDelta = jobsToday.length - jobsYesterday.length;

  const notificationsSent = smsLog.filter(
    (entry) => entry.status === 'sent' && entry.sentAt.startsWith(today),
  ).length;
  const notificationsYesterday = smsLog.filter(
    (entry) => entry.status === 'sent' && entry.sentAt.startsWith(yesterday),
  ).length;
  const smsDelta = notificationsSent - notificationsYesterday;

  const closedJobs = jobs.filter((j) => j.status === 'Completed' || j.status === 'Invoiced');
  const closedWithProof = closedJobs.filter((j) => j.proofPhoto && j.signature).length;
  const proofRate =
    closedJobs.length === 0 ? 0 : Math.round((closedWithProof / closedJobs.length) * 100);

  const cards: KPICardProps[] = [
    {
      icon: Truck,
      label: 'Jobs Today',
      value: jobsToday.length.toString(),
      delta: jobsDelta,
      meta: `T1 ${truck1Count} · T2 ${truck2Count}`,
    },
    {
      icon: Bell,
      label: 'Notifications Sent',
      value: notificationsSent.toString(),
      delta: smsDelta,
      meta: 'day-prior + en-route',
    },
    {
      icon: CheckCircle2,
      label: 'Closed with Proof',
      value: `${proofRate}%`,
      meta: `${closedWithProof}/${closedJobs.length} closed jobs`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <KPICard {...card} />
        </motion.div>
      ))}
    </div>
  );
}

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
  meta: string;
}

function KPICard({ icon: Icon, label, value, delta, meta }: KPICardProps) {
  return (
    <div className="group relative rounded-2xl bg-rebel-surface border border-rebel-border p-5 shadow-card hover:border-rebel-border-strong transition-colors overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(45,91,255,0.18), transparent 70%)' }}
      />
      <div className="relative flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-rebel-accent-surface flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-rebel-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold leading-none text-rebel-text tabular-nums tracking-tight">
              {value}
            </span>
            {typeof delta === 'number' && delta !== 0 && (
              <DeltaChip delta={delta} />
            )}
          </div>
          <p className="mt-2 text-[11px] font-medium text-rebel-text-tertiary truncate">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md text-[10px] font-bold ${
        positive
          ? 'bg-rebel-success-surface text-rebel-success'
          : 'bg-rebel-danger-surface text-rebel-danger'
      }`}
    >
      <ArrowUpRight className={`w-2.5 h-2.5 ${positive ? '' : 'rotate-90'}`} />
      {positive ? '+' : ''}
      {delta}
    </span>
  );
}
