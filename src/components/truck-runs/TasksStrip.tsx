import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Boxes,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Truck as TruckIcon,
  Fuel,
  Brush,
  Package,
} from 'lucide-react';
import {
  useTasks,
  useCreateTask,
  useDeleteTask,
  useMarkTaskDone,
  useReopenTask,
} from '@/hooks/useTasks';
import { useDrivers } from '@/hooks/useDrivers';
import type { Task, TaskKind } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TasksStripProps {
  /** Truck names to render rows for. Empty trucks still get a row so
   *  Yamin can add the day's first task with one click. */
  truckNames: string[];
  /** YYYY-MM-DD scheduled date — usually the Truck Runs day picker. */
  selectedDate: string;
  /** Friendly day label (Today / Tomorrow / dd MMM) for the dialog copy. */
  dateLabel: string;
}

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
 * V4 Phase 5 — owner-facing Tasks strip on Truck Runs.
 *
 * One row per truck for the picker day. Each row shows the open + done
 * task chips and an "Add task" button. Tasks live in `tasks` (separate
 * from `jobs`) — no customer, no money — and drivers tick them off one
 * at a time on the truck shell.
 */
export function TasksStrip({ truckNames, selectedDate, dateLabel }: TasksStripProps) {
  const { data: tasks = [], isLoading } = useTasks();
  const deleteTask = useDeleteTask();
  const markDone = useMarkTaskDone();
  const reopen = useReopenTask();
  const [addDialogTruck, setAddDialogTruck] = useState<string | null>(null);

  const tasksByTruck = useMemo(() => {
    const byT: Record<string, Task[]> = {};
    for (const name of truckNames) byT[name] = [];
    for (const t of tasks) {
      if (t.scheduledDate !== selectedDate) continue;
      if (!byT[t.truckName]) byT[t.truckName] = [];
      byT[t.truckName].push(t);
    }
    return byT;
  }, [tasks, truckNames, selectedDate]);

  if (truckNames.length === 0) return null;

  return (
    <>
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-rebel-border pb-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm">Tasks · {dateLabel}</h3>
              <p className="text-[11px] text-muted-foreground">
                Warehouse load-ups, fuel, truck clean — drivers tick them off before / between jobs.
              </p>
            </div>
            {isLoading && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px]">
                Loading…
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {truckNames.map((truck) => {
              const trow = tasksByTruck[truck] ?? [];
              const open = trow.filter((t) => !t.completedAt);
              const done = trow.filter((t) => !!t.completedAt);
              return (
                <div
                  key={truck}
                  className="rounded-lg border border-rebel-border bg-card p-2.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <TruckIcon className="w-3.5 h-3.5 text-rebel-accent shrink-0" />
                      <p className="text-xs font-bold truncate">{truck}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {open.length} open · {done.length} done
                      </span>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      className="gap-1"
                      onClick={() => setAddDialogTruck(truck)}
                    >
                      <Plus className="w-3 h-3" />
                      Add task
                    </Button>
                  </div>

                  {trow.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic px-1">
                      No tasks yet — Yamin adds them as needed.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {trow.map((task) => (
                        <TaskChip
                          key={task.id}
                          task={task}
                          onMarkDone={() =>
                            markDone.mutate(
                              { id: task.id, driverId: null, driverName: null },
                              {
                                onSuccess: () =>
                                  toast.success(`Marked "${task.title}" done`),
                                onError: () => toast.error('Failed to mark done'),
                              },
                            )
                          }
                          onReopen={() =>
                            reopen.mutate(task.id, {
                              onSuccess: () => toast.message('Task re-opened'),
                              onError: () => toast.error('Failed to re-open'),
                            })
                          }
                          onDelete={() => {
                            if (!confirm(`Delete "${task.title}"?`)) return;
                            deleteTask.mutate(task.id, {
                              onSuccess: () => toast.success('Task deleted'),
                              onError: () => toast.error('Failed to delete'),
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AddTaskDialog
        open={!!addDialogTruck}
        truckName={addDialogTruck}
        scheduledDate={selectedDate}
        dateLabel={dateLabel}
        onClose={() => setAddDialogTruck(null)}
      />
    </>
  );
}

function TaskChip({
  task,
  onMarkDone,
  onReopen,
  onDelete,
}: {
  task: Task;
  onMarkDone: () => void;
  onReopen: () => void;
  onDelete: () => void;
}) {
  const isDone = !!task.completedAt;
  const Icon = KIND_ICON[task.kind] ?? Package;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-2 py-1.5 text-[11.5px] transition-colors',
        isDone
          ? 'bg-rebel-success-surface border-rebel-success/30 text-rebel-success'
          : 'bg-amber-50/40 border-amber-200 text-amber-900',
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', isDone && 'opacity-60')} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold truncate',
            isDone && 'line-through opacity-70',
          )}
          title={task.description ?? undefined}
        >
          {task.title}
        </p>
        {isDone && task.completedByDriverName && (
          <p className="text-[9.5px] text-rebel-success/80 truncate">
            ✓ {task.completedByDriverName}
          </p>
        )}
        {!isDone && (
          <p className="text-[9.5px] uppercase tracking-wider opacity-60">
            {KIND_LABEL[task.kind]}
            {task.assignedToDriverName && (
              <span className="ml-1 text-rebel-accent normal-case font-semibold">
                · for {task.assignedToDriverName}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {isDone ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReopen();
            }}
            aria-label="Reopen task"
            title="Mark as not done"
            className="inline-flex items-center justify-center w-5 h-5 rounded text-rebel-success/70 hover:bg-rebel-success/15"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkDone();
            }}
            aria-label="Mark task done"
            title="Mark done"
            className="inline-flex items-center justify-center w-5 h-5 rounded text-amber-700 hover:bg-amber-200/50"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete task"
          title="Delete"
          className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:bg-muted hover:text-rebel-danger"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AddTaskDialog({
  open,
  truckName,
  scheduledDate,
  dateLabel,
  onClose,
}: {
  open: boolean;
  truckName: string | null;
  scheduledDate: string;
  dateLabel: string;
  onClose: () => void;
}) {
  const create = useCreateTask();
  const { data: drivers = [] } = useDrivers({ activeOnly: true });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<TaskKind>('load_up');
  // V5 P6: optional driver pre-assignment. Empty string means "anyone
  // on the truck" — the underlying columns stay null.
  const [driverId, setDriverId] = useState<string>('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setKind('load_up');
    setDriverId('');
  };

  const handleSubmit = async () => {
    if (!truckName) return;
    if (!title.trim()) {
      toast.error('Task needs a title');
      return;
    }
    const assignedDriver = driverId ? drivers.find((d) => d.id === driverId) : null;
    try {
      await create.mutateAsync({
        truckName,
        scheduledDate,
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedToDriverId: assignedDriver?.id ?? null,
        assignedToDriverName: assignedDriver?.name ?? null,
      });
      toast.success(`Task added to ${truckName}`);
      reset();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add task';
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription>
            {truckName ? `${truckName} · ${dateLabel}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kind
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['load_up', 'clean', 'fuel', 'other'] as TaskKind[]).map((k) => {
                const Icon = KIND_ICON[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      'inline-flex flex-col items-center gap-1 h-12 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors',
                      kind === k
                        ? 'border-rebel-accent bg-rebel-accent-surface text-rebel-accent'
                        : 'border-rebel-border bg-card text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {KIND_LABEL[k]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Load up Bayliss Rugs delivery for South Yarra"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assign driver (optional)
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Anyone on {truckName ?? 'truck'}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the driver needs to know — bay number, item count, etc."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            onClick={handleSubmit}
            disabled={!title.trim() || create.isPending}
          >
            {create.isPending ? 'Adding…' : 'Add task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
