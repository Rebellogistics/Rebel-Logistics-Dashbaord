import { useMemo, useState } from 'react';
import { Send, X } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { Job } from '@/lib/types';
import { useSendDayPriorBulk } from '@/hooks/useSms';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DayPriorPillProps {
  jobs: Job[];
}

/**
 * V4 Phase 6.3 — sticky day-prior reminder on the dashboard.
 *
 * Yamin's flow on the call: "I finish work at 6, 7. I come home and then I
 * do this." (Manually typing day-prior reminders one customer at a time.)
 * Phase 3.1 put a button on Truck Runs; this surfaces the same action on
 * the dashboard so it's the first thing he sees when he opens the app
 * after dinner. Dismissable with localStorage memory so it doesn't pester
 * after he's already fired today.
 *
 * Hides when:
 *   - no jobs scheduled for tomorrow
 *   - every tomorrow-job already has dayPriorSmsSentAt
 *   - Yamin has manually dismissed today
 */
const DISMISS_KEY = 'rebel.dayPrior.dismissedDate';

export function DayPriorPill({ jobs }: DayPriorPillProps) {
  const send = useSendDayPriorBulk();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(DISMISS_KEY);
  });
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const eligible = useMemo(() => {
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    return jobs.filter((j) => {
      if (j.deletedAt) return false;
      if (j.date !== tomorrowStr) return false;
      if (!j.assignedTruck) return false; // only jobs already on a truck
      if (j.status === 'Quote' || j.status === 'Declined') return false;
      if (!j.customerPhone?.trim()) return false;
      if (j.dayPriorSmsSentAt) return false;
      return true;
    });
  }, [jobs]);

  if (eligible.length === 0) return null;
  if (dismissed === todayKey) return null;

  const tomorrowLabel = format(addDays(new Date(), 1), 'EEE d MMM');

  const handleSend = async () => {
    const proceed = confirm(
      `Send day-prior SMS to ${eligible.length} customer${eligible.length === 1 ? '' : 's'} for tomorrow (${tomorrowLabel})?\n\n` +
        `Each customer gets your live "Day-prior" template (Settings → SMS Templates).`,
    );
    if (!proceed) return;
    try {
      const result = await send.mutateAsync(eligible);
      if (result.failed === 0 && result.skipped === 0) {
        toast.success(`Day-prior reminders fired · ${result.sent} sent`);
      } else {
        const parts: string[] = [];
        if (result.sent) parts.push(`${result.sent} sent`);
        if (result.failed) parts.push(`${result.failed} failed`);
        if (result.skipped) parts.push(`${result.skipped} skipped`);
        toast.message('Day-prior reminders fired', { description: parts.join(' · ') });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fire day-prior reminders');
    }
  };

  const handleDismiss = () => {
    setDismissed(todayKey);
    try {
      window.localStorage.setItem(DISMISS_KEY, todayKey);
    } catch {
      /* ignore */
    }
  };

  // Heads-up if any eligible jobs land in the next 12h — surface as red.
  const urgent = eligible.some((j) => {
    try {
      const tomorrowMs = parseISO(j.date).getTime();
      return tomorrowMs - Date.now() < 12 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-3.5 sm:p-4',
        urgent
          ? 'border-rose-300 bg-rose-50/70'
          : 'border-amber-300 bg-amber-50/70',
      )}
    >
      <div
        className={cn(
          'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center',
          urgent ? 'bg-rose-200/60 text-rose-700' : 'bg-amber-200/60 text-amber-800',
        )}
      >
        <Send className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13px] font-bold', urgent ? 'text-rose-900' : 'text-amber-900')}>
          {eligible.length} customer{eligible.length === 1 ? '' : 's'} waiting on a day-prior SMS for tomorrow
        </p>
        <p className={cn('text-[11px] mt-0.5', urgent ? 'text-rose-800' : 'text-amber-800')}>
          {tomorrowLabel} · uses the live template from Settings → SMS Templates
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleSend}
          disabled={send.isPending}
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold text-white transition-colors',
            urgent
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-amber-600 hover:bg-amber-700',
            'disabled:opacity-60',
          )}
        >
          <Send className="w-3 h-3" />
          {send.isPending ? 'Sending…' : `Send (${eligible.length})`}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss until tomorrow"
          title="Hide until tomorrow"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:bg-muted hover:text-rebel-text"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
