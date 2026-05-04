import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Truck, User, type LucideIcon } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import type { Profile } from '@/lib/types';
import { MyRunToday } from './MyRunToday';
import { MyTasksToday } from './MyTasksToday';
import { DriverProfileTab } from './DriverProfileTab';
import { WhoDrivingDialog } from './WhoDrivingDialog';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useDriverToday } from '@/hooks/useDriverToday';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { useRealtimeTasks, useTasks } from '@/hooks/useTasks';
import { isToday, parseISO } from 'date-fns';

type DriverTab = 'tasks' | 'today' | 'profile';

interface DriverShellProps {
  profile: Profile;
}

const TABS: { id: DriverTab; label: string; icon: LucideIcon }[] = [
  // V4 Phase 5: Tasks tab leads — Yamin's mental model is "drivers do
  // tasks first, then jobs", so this is the landing surface on shift
  // start. Falls back gracefully when no tasks are scheduled.
  { id: 'tasks', label: 'Tasks', icon: Sparkles },
  { id: 'today', label: 'Jobs', icon: Truck },
  { id: 'profile', label: 'Profile', icon: User },
];

export function DriverShell({ profile }: DriverShellProps) {
  const [tab, setTab] = useState<DriverTab>('tasks');
  const truckLabel = profile.assignedTruck?.trim();
  const { name: driverName, needsPick, setName: setDriverName } = useDriverToday();
  const [pickerOpen, setPickerOpen] = useState(false);

  // V4 1.7: drivers see live updates when the office reassigns / reorders /
  // edits a job from the dashboard. Previously the truck shell only
  // refetched on its own mutations — drivers had to pull-to-refresh to
  // see Yamin's mid-shift edits. The toast on run-order change lives in
  // MyRunToday since that's where todaysJobs is computed.
  useRealtimeJobs();
  // V4 Phase 5: same for tasks — owner adds a task from the dashboard
  // mid-shift, the driver sees it within ~1s.
  useRealtimeTasks();

  // V4 Phase 5: tab badge counts for Tasks (open today) + Jobs (active
  // today). Driver glances at the bottom bar to see what's left to do.
  const { data: tasks = [] } = useTasks();
  const openTasksToday = useMemo(() => {
    let n = 0;
    for (const t of tasks) {
      if (t.deletedAt || t.completedAt) continue;
      try {
        if (isToday(parseISO(t.scheduledDate))) n += 1;
      } catch {
        /* ignore */
      }
    }
    return n;
  }, [tasks]);

  useEffect(() => {
    if (needsPick) setPickerOpen(true);
  }, [needsPick]);

  const greeting = driverName ?? profile.fullName?.split(' ')[0] ?? 'Driver';

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-rebel-text">
      {/* Top brand bar — minimal */}
      <header className="sticky top-0 z-30 glass border-b border-rebel-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Logo variant="full" height={36} className="max-h-[36px]" />
          <div className="flex items-center gap-2 min-w-0">
            {truckLabel && (
              <span
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-rebel-accent-surface text-rebel-accent text-[10.5px] font-bold uppercase tracking-wider shrink-0"
                title="The truck you're logged into today"
              >
                <Truck className="w-3 h-3" />
                {truckLabel}
              </span>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[13px] font-bold truncate text-rebel-text hover:text-rebel-accent transition-colors"
              title="Change today's driver"
            >
              Hi, {greeting}
            </button>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {tab === 'tasks' && <MyTasksToday />}
            {tab === 'today' && <MyRunToday />}
            {tab === 'profile' && <DriverProfileTab profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab bar — sticks to viewport bottom on mobile, with safe-area padding */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-rebel-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-2xl mx-auto px-2 py-2 flex items-center justify-around gap-2">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            const badge = t.id === 'tasks' && openTasksToday > 0 ? openTasksToday : null;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex-1 flex flex-col items-center gap-0.5 h-14 rounded-2xl transition-colors',
                  active
                    ? 'bg-rebel-accent-surface text-rebel-accent'
                    : 'text-rebel-text-tertiary hover:bg-muted hover:text-rebel-text-secondary',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10.5px] font-bold uppercase tracking-wider">{t.label}</span>
                {badge !== null && (
                  <span
                    className="absolute top-1 right-3 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-rebel-accent text-white text-[9.5px] font-bold"
                    aria-label={`${badge} open tasks`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <WhoDrivingDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(name) => setDriverName(name)}
        initialName={driverName}
      />

      <Toaster position="top-center" />
    </div>
  );
}
