import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Truck as TruckIcon,
  Search as SearchIcon,
  X as XIcon,
  PackageCheck,
  User,
  Calendar as CalendarIcon,
  CalendarClock,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns';
import { useTruckShifts } from '@/hooks/useTruckShifts';
import { useTrucks } from '@/hooks/useTrucks';
import { Job, TruckShift } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TrucksViewProps {
  jobs: Job[];
  onViewJob?: (job: Job) => void;
}

export function TrucksView({ jobs, onViewJob }: TrucksViewProps) {
  const [cursor, setCursor] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // Fine-search state
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchTruck, setSearchTruck] = useState<string>('');

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const { data: shifts = [] } = useTruckShifts({
    from: format(gridStart, 'yyyy-MM-dd'),
    to: format(gridEnd, 'yyyy-MM-dd'),
  });
  const { data: trucks = [] } = useTrucks();
  const truckOptions = useMemo(
    () => trucks.filter((t) => t.active).map((t) => t.name),
    [trucks],
  );

  // Group shifts by date for fast cell rendering
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, TruckShift[]>();
    for (const s of shifts) {
      const arr = map.get(s.shiftDate) ?? [];
      arr.push(s);
      map.set(s.shiftDate, arr);
    }
    return map;
  }, [shifts]);

  // Planned = jobs assigned to a truck for a date that haven't been
  // completed/invoiced/declined yet. The Phase-12 fix for the May 2 call:
  // future bookings now appear on the calendar, not just completed shifts.
  const plannedByDate = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      if (!job.assignedTruck || !job.date) continue;
      if (
        job.status === 'Completed' ||
        job.status === 'Invoiced' ||
        job.status === 'Declined'
      ) {
        continue;
      }
      const arr = map.get(job.date) ?? [];
      arr.push(job);
      map.set(job.date, arr);
    }
    return map;
  }, [jobs]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Heat-map intensity now blends completed + planned counts. A day with
  // 8 booked-but-not-yet-done jobs is just as "busy" as one with 8 already
  // completed.
  const maxActivityInMonth = useMemo(() => {
    let max = 0;
    const allKeys = new Set<string>([
      ...shiftsByDate.keys(),
      ...plannedByDate.keys(),
    ]);
    for (const key of allKeys) {
      const completed = (shiftsByDate.get(key) ?? []).reduce(
        (acc, s) => acc + s.jobCount,
        0,
      );
      const planned = (plannedByDate.get(key) ?? []).length;
      const total = completed + planned;
      if (total > max) max = total;
    }
    return max;
  }, [shiftsByDate, plannedByDate]);

  const handleFind = () => {
    if (!searchDate) return;
    try {
      const d = parseISO(searchDate);
      setCursor(d);
      setSelectedDay(d);
    } catch {
      /* ignore */
    }
  };
  const clearFind = () => {
    setSearchDate('');
    setSearchTruck('');
  };

  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const selectedShifts = selectedDayStr
    ? (shiftsByDate.get(selectedDayStr) ?? []).filter((s) =>
        searchTruck ? s.truckName === searchTruck : true,
      )
    : [];
  const selectedJobs = useMemo(() => {
    if (!selectedDayStr) return [];
    return jobs.filter(
      (j) =>
        j.completedAt &&
        j.completedByDriverName &&
        j.date === selectedDayStr,
    );
  }, [jobs, selectedDayStr]);
  const selectedPlanned = useMemo(() => {
    if (!selectedDayStr) return [];
    const list = plannedByDate.get(selectedDayStr) ?? [];
    return searchTruck ? list.filter((j) => j.assignedTruck === searchTruck) : list;
  }, [plannedByDate, selectedDayStr, searchTruck]);

  return (
    <div className="space-y-4">
      {/* Find-a-fine bar */}
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <SearchIcon className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-bold">Find a fine</p>
                <p className="text-[11px] text-muted-foreground">
                  Look up which driver was on a specific truck on a specific day.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <Input
                type="date"
                className="h-9 w-[150px] text-xs"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
              <select
                value={searchTruck}
                onChange={(e) => setSearchTruck(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-2 text-xs outline-none focus-visible:border-ring"
              >
                <option value="">All trucks</option>
                {truckOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
                onClick={handleFind}
                disabled={!searchDate}
              >
                <SearchIcon className="w-3.5 h-3.5" />
                Find
              </Button>
              {(searchDate || searchTruck) && (
                <Button size="sm" variant="ghost" className="gap-1" onClick={clearFind}>
                  <XIcon className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar header */}
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-rebel-accent" />
              <h3 className="font-bold text-sm">{format(cursor, 'MMMM yyyy')}</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon-sm" variant="outline" onClick={() => setCursor((d) => subMonths(d, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>
                Today
              </Button>
              <Button size="icon-sm" variant="outline" onClick={() => setCursor((d) => addMonths(d, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate.get(dateStr) ?? [];
              const dayPlanned = plannedByDate.get(dateStr) ?? [];
              const completedCount = dayShifts.reduce((acc, s) => acc + s.jobCount, 0);
              const plannedCount = dayPlanned.length;
              const totalActivity = completedCount + plannedCount;

              // Group planned jobs by truck so the chip says "Truck XV (3)"
              // instead of three identical chips.
              const plannedByTruck = (() => {
                const m = new Map<string, number>();
                for (const job of dayPlanned) {
                  if (!job.assignedTruck) continue;
                  m.set(job.assignedTruck, (m.get(job.assignedTruck) ?? 0) + 1);
                }
                return Array.from(m.entries());
              })();

              const inMonth = isSameMonth(day, cursor);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isToday_ = isToday(day);
              const matchesSearch = searchDate === dateStr;
              const heatLevel = heatLevelFor(totalActivity, maxActivityInMonth);
              // Past-due = planned-but-not-executed for a date that's already
              // gone. The amber border is the "fix this" cue.
              const isPastDue = plannedCount > 0 && dateStr < todayStr;

              const tooltip = totalActivity === 0
                ? format(day, 'd MMM yyyy')
                : `${format(day, 'd MMM yyyy')} — ${completedCount} completed · ${plannedCount} planned`;

              const completedChips = dayShifts.slice(0, 3).map((s) => (
                <div
                  key={`done-${s.id}`}
                  className="min-w-0 inline-flex items-center gap-1 text-[9px] sm:text-[10px] rounded px-1 py-0.5 bg-card/70 border border-rebel-border text-rebel-text"
                >
                  <TruckIcon className="w-2.5 h-2.5 shrink-0 text-rebel-accent" />
                  <span className="truncate font-semibold min-w-0">{s.truckName}</span>
                  <span className="truncate text-muted-foreground hidden sm:inline">
                    · {s.driverName}
                  </span>
                </div>
              ));

              const plannedChips = plannedByTruck.slice(0, Math.max(0, 3 - completedChips.length))
                .map(([truckName, count]) => (
                  <div
                    key={`plan-${truckName}`}
                    className={cn(
                      'min-w-0 inline-flex items-center gap-1 text-[9px] sm:text-[10px] rounded px-1 py-0.5 bg-transparent border border-dashed text-rebel-accent',
                      isPastDue ? 'border-amber-500' : 'border-rebel-accent/50',
                    )}
                  >
                    <CalendarClock className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate font-semibold min-w-0">{truckName}</span>
                    {count > 1 && (
                      <span className="text-[9px] tabular-nums">·{count}</span>
                    )}
                  </div>
                ));

              const totalChipsShown = completedChips.length + plannedChips.length;
              const totalChipSources = dayShifts.length + plannedByTruck.length;
              const overflow = totalChipSources - totalChipsShown;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  title={tooltip}
                  className={cn(
                    'min-h-[72px] sm:min-h-[88px] rounded-lg border p-1.5 sm:p-2 text-left transition-all flex flex-col gap-1',
                    !inMonth && 'opacity-40',
                    isSelected
                      ? 'border-rebel-accent ring-1 ring-rebel-accent/40'
                      : isPastDue
                        ? 'border-amber-400 ring-1 ring-amber-400/30'
                        : 'border-rebel-border hover:border-rebel-accent/50',
                    matchesSearch && !isSelected && 'border-amber-400 ring-1 ring-amber-400/40',
                    heatLevel === 0 ? 'bg-card' : '',
                    heatLevel === 1 && 'bg-rebel-accent-surface/40',
                    heatLevel === 2 && 'bg-rebel-accent-surface/70',
                    heatLevel === 3 && 'bg-rebel-accent/15',
                    heatLevel >= 4 && 'bg-rebel-accent/25',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[11px] font-bold tabular-nums',
                        isToday_ && 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-rebel-accent text-white text-[10px]',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {totalActivity > 0 && (
                      <span className="text-[9px] font-bold text-muted-foreground tabular-nums inline-flex items-center gap-0.5">
                        {isPastDue && (
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        )}
                        {totalActivity}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
                    {completedChips}
                    {plannedChips}
                    {overflow > 0 && (
                      <p className="text-[9px] text-muted-foreground">
                        +{overflow} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-start gap-4 mt-3 pt-2 border-t flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Activity</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded bg-card border border-rebel-border" /> 0
                <span className="w-3 h-3 rounded bg-rebel-accent-surface/40 ml-2" /> 1–2
                <span className="w-3 h-3 rounded bg-rebel-accent-surface/70 ml-2" /> 3–4
                <span className="w-3 h-3 rounded bg-rebel-accent/15 ml-2" /> 5–7
                <span className="w-3 h-3 rounded bg-rebel-accent/25 ml-2" /> 8+
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Chips</p>
              <span className="inline-flex items-center gap-1 text-[10px] rounded px-1 py-0.5 bg-card/70 border border-rebel-border">
                <TruckIcon className="w-2.5 h-2.5 text-rebel-accent" />
                Completed
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] rounded px-1 py-0.5 bg-transparent border border-dashed border-rebel-accent/50 text-rebel-accent">
                <CalendarClock className="w-2.5 h-2.5" />
                Planned
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] rounded px-1 py-0.5 bg-transparent border border-dashed border-amber-500 text-amber-700">
                <AlertTriangle className="w-2.5 h-2.5" />
                Past-due
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day side panel — split into Completed + Planned. */}
      {selectedDay && (
        <Card className="border-border shadow-none bg-card">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE')}
                </p>
                <h3 className="font-bold text-base">{format(selectedDay, 'd MMMM yyyy')}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedShifts.length > 0 && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
                    {selectedShifts.length} on duty
                  </Badge>
                )}
                {selectedPlanned.length > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'border-none',
                      selectedDayStr && selectedDayStr < todayStr
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rebel-accent-surface text-rebel-accent',
                    )}
                  >
                    {selectedPlanned.length} planned
                  </Badge>
                )}
              </div>
            </div>

            {/* Completed section */}
            {selectedShifts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                  <PackageCheck className="w-3 h-3 text-green-600" />
                  Completed ({selectedShifts.length})
                </h4>
                <div className="space-y-3">
                  {selectedShifts.map((s) => (
                    <ShiftRow
                      key={s.id}
                      shift={s}
                      jobs={selectedJobs.filter(
                        (j) => j.assignedTruck === s.truckName && j.completedByDriverName === s.driverName,
                      )}
                      onViewJob={onViewJob}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Planned section */}
            {selectedPlanned.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                  <CalendarClock className="w-3 h-3 text-rebel-accent" />
                  Planned ({selectedPlanned.length})
                  {selectedDayStr && selectedDayStr < todayStr && (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Past-due
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {Array.from(
                    selectedPlanned.reduce((map, j) => {
                      const truck = j.assignedTruck ?? 'No truck';
                      const arr = map.get(truck) ?? [];
                      arr.push(j);
                      map.set(truck, arr);
                      return map;
                    }, new Map<string, Job[]>()),
                  ).map(([truckName, jobsForTruck]) => (
                    <PlannedTruckGroup
                      key={truckName}
                      truckName={truckName}
                      jobs={jobsForTruck}
                      onViewJob={onViewJob}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedShifts.length === 0 && selectedPlanned.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                {searchTruck
                  ? `Nothing on ${searchTruck} on this day.`
                  : 'Nothing on the books for this day.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlannedTruckGroup({
  truckName,
  jobs,
  onViewJob,
}: {
  truckName: string;
  jobs: Job[];
  onViewJob?: (job: Job) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-rebel-accent/50 bg-rebel-accent-surface/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-rebel-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{truckName}</p>
            <p className="text-[11px] text-muted-foreground">Planned, not started yet</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-rebel-accent-surface text-rebel-accent border-none text-[10px]">
          {jobs.length} stop{jobs.length === 1 ? '' : 's'}
        </Badge>
      </div>
      <div className="space-y-1 pl-9">
        {jobs.map((j) => (
          <button
            key={j.id}
            type="button"
            onClick={() => onViewJob?.(j)}
            className="text-left w-full inline-flex items-start gap-1.5 text-[11px] text-muted-foreground hover:text-rebel-accent"
          >
            <MapPin className="w-3 h-3 mt-0.5 text-rebel-accent shrink-0" />
            <span className="truncate">
              <span className="font-semibold text-foreground">{j.customerName}</span>
              {j.deliveryAddress && (
                <span className="ml-1">· {j.deliveryAddress.split(',')[0]}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function heatLevelFor(jobs: number, max: number): number {
  if (jobs <= 0) return 0;
  if (max <= 0) return 0;
  if (jobs <= 2) return 1;
  if (jobs <= 4) return 2;
  if (jobs <= 7) return 3;
  return 4;
}

function ShiftRow({
  shift,
  jobs,
  onViewJob,
}: {
  shift: TruckShift;
  jobs: Job[];
  onViewJob?: (job: Job) => void;
}) {
  const start = (() => {
    try {
      return format(parseISO(shift.startedAt), 'HH:mm');
    } catch {
      return '—';
    }
  })();
  const end = (() => {
    try {
      return format(parseISO(shift.endedAt), 'HH:mm');
    } catch {
      return '—';
    }
  })();
  return (
    <div className="rounded-lg border border-rebel-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rebel-accent-surface flex items-center justify-center shrink-0">
            <TruckIcon className="w-4 h-4 text-rebel-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{shift.truckName}</p>
            <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {shift.driverName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {start} → {end}
          </span>
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px]">
            {shift.jobCount} job{shift.jobCount === 1 ? '' : 's'}
          </Badge>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="space-y-1 pl-9">
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onViewJob?.(j)}
              className="text-left w-full inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-rebel-accent"
            >
              <PackageCheck className="w-3 h-3 text-green-600 shrink-0" />
              <span className="truncate font-semibold text-foreground">{j.customerName}</span>
              <span className="truncate">· {j.deliveryAddress?.split(',')[0] ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
