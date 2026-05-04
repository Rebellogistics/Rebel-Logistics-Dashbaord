import { Job, SmsLogEntry } from '@/lib/types';
import {
  Truck,
  ClipboardList,
  Sparkles,
  Camera,
  LucideIcon,
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';

interface KPIStatsProps {
  jobs: Job[];
  /** Kept on the prop sig for backwards compat with callers — the
   *  "Notifications Sent" and "Closed with Proof" tiles got removed in
   *  V4 Phase 6 per Yamin's "I don't need them on the dashboard" feedback,
   *  so we no longer read smsLog here. Wired through anyway in case a
   *  future tile needs it. */
  smsLog?: SmsLogEntry[];
  /** V4 Phase 5 — Warehouse Load-up tile click → Truck Runs (today). */
  onNavigateToTruckRuns?: () => void;
  /** V4 Phase 6 — Outstanding Quotes / Need Proof tile clicks → Jobs tab. */
  onNavigateToJobs?: () => void;
  /** V4 Phase 6 — Today's Jobs tile click. Same as TruckRuns nav today,
   *  but kept distinct so a future "today's jobs detail" surface can swap
   *  in without touching every caller. */
  onNavigateToToday?: () => void;
}

/**
 * V4 Phase 6 — dashboard tile order driven by Yamin's May 4 ask:
 *
 *   1. Outstanding Quotes — quotes pending acceptance
 *   2. Warehouse Load-up  — today's open tasks across all trucks
 *   3. Today's Jobs       — what's on the road today
 *   4. Need Proof         — completed/invoiced jobs missing photo or signature
 *
 * Every tile is clickable. Tones:
 *   - amber   → actionable count (open work)
 *   - default → quiet count
 *
 * Removed from this row in Phase 6: "Notifications Sent" and the
 * "Closed with Proof %" range toggle. Yamin's call: "I don't need them
 * on the dashboard." Both surface in the SMS Log + the per-job dialog
 * already.
 */
export function KPIStatsCards({
  jobs,
  onNavigateToTruckRuns,
  onNavigateToJobs,
  onNavigateToToday,
}: KPIStatsProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // 1. Outstanding quotes: status==='Quote' and not a draft. Drafts are
  // half-finished captures — not waiting on the customer to accept.
  const outstandingQuotes = jobs.filter(
    (j) => j.status === 'Quote' && !j.isDraft,
  ).length;

  // 2. Warehouse load-up — Phase 5.
  const { data: tasks = [] } = useTasks();
  const todayTasks = tasks.filter((t) => {
    if (t.deletedAt) return false;
    if (!t.scheduledDate) return false;
    try {
      return isToday(parseISO(t.scheduledDate));
    } catch {
      return false;
    }
  });
  const openTasksToday = todayTasks.filter((t) => !t.completedAt).length;
  const doneTasksToday = todayTasks.filter((t) => !!t.completedAt).length;

  // 3. Today's jobs — anything scheduled for today, not Declined/Quote.
  const jobsToday = jobs.filter(
    (j) =>
      j.date === today &&
      j.status !== 'Declined' &&
      j.status !== 'Quote',
  );
  const truck1Count = jobsToday.filter((j) => j.assignedTruck === 'Truck 1').length;
  const truck2Count = jobsToday.filter((j) => j.assignedTruck === 'Truck 2').length;
  const otherTrucks = jobsToday.length - truck1Count - truck2Count;

  // 4. Need proof — completed/invoiced jobs missing photo OR signature.
  const needProofJobs = jobs.filter((j) => {
    if (j.status !== 'Completed' && j.status !== 'Invoiced') return false;
    return !j.proofPhoto || !j.signature;
  });

  const cards: KPICardProps[] = [
    {
      icon: ClipboardList,
      label: 'Outstanding Quotes',
      value: outstandingQuotes.toString(),
      meta:
        outstandingQuotes === 0
          ? 'Nothing waiting on customers'
          : `Pending acceptance · tap for the list`,
      tone: outstandingQuotes > 0 ? 'amber' : 'default',
      onClick: onNavigateToJobs,
    },
    {
      icon: Sparkles,
      label: 'Warehouse Load-up',
      value: openTasksToday.toString(),
      meta:
        todayTasks.length === 0
          ? 'No tasks scheduled today'
          : `${doneTasksToday} done · open across all trucks`,
      tone: openTasksToday > 0 ? 'amber' : 'default',
      onClick: onNavigateToTruckRuns,
    },
    {
      icon: Truck,
      label: "Today's Jobs",
      value: jobsToday.length.toString(),
      meta:
        jobsToday.length === 0
          ? 'No jobs on the books today'
          : `T1 ${truck1Count} · T2 ${truck2Count}${otherTrucks > 0 ? ` · +${otherTrucks}` : ''}`,
      tone: jobsToday.length > 0 ? 'amber' : 'default',
      onClick: onNavigateToToday ?? onNavigateToTruckRuns,
    },
    {
      icon: Camera,
      label: 'Need Proof',
      value: needProofJobs.length.toString(),
      meta:
        needProofJobs.length === 0
          ? 'Every closed job has photo + signature'
          : 'Closed without photo / signature',
      tone: needProofJobs.length > 0 ? 'rose' : 'default',
      onClick: onNavigateToJobs,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
  meta: string;
  tone?: 'default' | 'amber' | 'rose';
  onClick?: () => void;
}

function KPICard({ icon: Icon, label, value, meta, tone = 'default', onClick }: KPICardProps) {
  const Wrapper: 'button' | 'div' = onClick ? 'button' : 'div';
  const accentClasses = {
    default: {
      border: 'border-rebel-border hover:border-rebel-border-strong',
      iconBg: 'bg-rebel-accent-surface',
      iconText: 'text-rebel-accent',
      cardBg: '',
    },
    amber: {
      border: 'border-amber-300 hover:border-amber-400',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-700',
      cardBg: 'bg-amber-50/40',
    },
    rose: {
      border: 'border-rose-300 hover:border-rose-400',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-700',
      cardBg: 'bg-rose-50/40',
    },
  }[tone];

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative rounded-2xl bg-rebel-surface border p-5 shadow-card transition-colors overflow-hidden text-left w-full',
        accentClasses.border,
        accentClasses.cardBg,
        onClick && 'cursor-pointer hover:shadow-glow',
      )}
    >
      <div
        aria-hidden
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(45,91,255,0.18), transparent 70%)' }}
      />
      <div className="relative flex items-start gap-4">
        <div className={cn('h-11 w-11 shrink-0 rounded-xl flex items-center justify-center', accentClasses.iconBg)}>
          <Icon className={cn('w-[18px] h-[18px]', accentClasses.iconText)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-bold leading-none text-rebel-text tabular-nums tracking-tight">
              {value}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-rebel-text-tertiary truncate">{meta}</p>
        </div>
      </div>
    </Wrapper>
  );
}
