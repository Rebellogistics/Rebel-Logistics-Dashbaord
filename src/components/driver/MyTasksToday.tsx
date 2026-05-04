import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Boxes,
  Brush,
  Fuel,
  Package,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useTasks, useMarkTaskDone } from '@/hooks/useTasks';
import { useDriverToday } from '@/hooks/useDriverToday';
import { useProfile } from '@/hooks/useProfile';
import type { Task, TaskKind } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KIND_ICON: Record<TaskKind, typeof Package> = {
  load_up: Boxes,
  clean: Brush,
  fuel: Fuel,
  other: Package,
};

const KIND_LABEL: Record<TaskKind, string> = {
  load_up: 'Load up',
  clean: 'Clean',
  fuel: 'Fuel',
  other: 'Other',
};

/**
 * V4 Phase 5 — driver-side Tasks tab.
 *
 * Shows TODAY's open + completed tasks for the truck the driver is
 * logged into. Tap an open task → confirm → mark done (stamps driver
 * id + name from the WhoDriving picker, V3 Phase 3 attribution).
 *
 * Yamin's call: "the to-do will be what needs to happen in the morning
 * before the day starts. Whether it's loading up, making sure the truck
 * is clean… and then jobs is when they start, 'okay, where's my first
 * job after I've done all of this?'"
 */
export function MyTasksToday() {
  const { data: tasks = [], isLoading, error } = useTasks();
  const { data: profile } = useProfile();
  const { name: pickedDriverName } = useDriverToday();
  const markDone = useMarkTaskDone();

  const { open, done } = useMemo(() => {
    const o: Task[] = [];
    const d: Task[] = [];
    for (const t of tasks) {
      if (t.deletedAt) continue;
      if (!t.scheduledDate) continue;
      try {
        const day = parseISO(t.scheduledDate);
        if (!isToday(day)) continue;
      } catch {
        continue;
      }
      if (t.completedAt) d.push(t);
      else o.push(t);
    }
    return { open: o, done: d };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-rebel-accent mx-auto mb-3"></div>
          <p className="text-xs text-muted-foreground">Loading tasks…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/40 shadow-none">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-red-900">Couldn't load tasks</p>
          <p className="text-xs text-red-800">
            Check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleMarkDone = (task: Task) => {
    if (!confirm(`Mark "${task.title}" as done?`)) return;
    const driverId = profile?.userId ?? null;
    const driverName = pickedDriverName ?? profile?.fullName ?? null;
    markDone.mutate(
      { id: task.id, driverId, driverName },
      {
        onSuccess: () => toast.success(`✓ ${task.title}`),
        onError: () => toast.error('Failed to mark done'),
      },
    );
  };

  const totalToday = open.length + done.length;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Tasks
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(), 'EEEE d MMM')}
            </p>
          </div>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-md bg-muted text-muted-foreground text-[11px] font-bold">
            {open.length} open · {done.length} done
          </span>
        </div>

        {totalToday === 0 ? (
          <EmptyState />
        ) : (
          <>
            {open.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-800">
                  To do
                </p>
                {open.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onMarkDone={() => handleMarkDone(task)}
                    busy={markDone.isPending}
                  />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider font-bold text-rebel-success">
                  Done today
                </p>
                {done.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function TaskCard({
  task,
  onMarkDone,
  busy,
}: {
  task: Task;
  onMarkDone?: () => void;
  busy?: boolean;
}) {
  const Icon = KIND_ICON[task.kind] ?? Package;
  const isDone = !!task.completedAt;
  return (
    <Card
      className={cn(
        'border shadow-none',
        isDone ? 'bg-rebel-success-surface/40 border-rebel-success/30' : 'bg-amber-50/50 border-amber-200',
      )}
    >
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
              isDone ? 'bg-rebel-success/15 text-rebel-success' : 'bg-amber-100 text-amber-800',
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-bold text-sm leading-snug',
                isDone && 'line-through text-rebel-success/80',
              )}
            >
              {task.title}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {KIND_LABEL[task.kind]}
            </p>
          </div>
        </div>
        {task.description && (
          <p
            className={cn(
              'text-xs whitespace-pre-wrap',
              isDone ? 'text-rebel-success/80 line-through' : 'text-amber-900',
            )}
          >
            {task.description}
          </p>
        )}
        {isDone ? (
          <div className="inline-flex items-center justify-center w-full gap-1.5 h-9 rounded-lg bg-rebel-success-surface text-rebel-success text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Done
            {task.completedByDriverName ? ` · ${task.completedByDriverName}` : ''}
          </div>
        ) : (
          <Button
            onClick={onMarkDone}
            disabled={busy}
            className="w-full h-11 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-2 text-[13px] font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            {busy ? 'Marking…' : 'Mark done'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-8 text-center space-y-2">
        <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">No tasks for today.</p>
        <p className="text-[11px] text-muted-foreground">
          Yamin adds load-ups, fuel stops, and clean-ups from the dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
