import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJobs, useUpdateJob } from '@/hooks/useSupabaseData';
import { useTrucks } from '@/hooks/useTrucks';
import { Job, TruckId } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle, Truck } from 'lucide-react';

interface AssignTruckDialogProps {
  job: Job | null;
  onClose: () => void;
  /**
   * If true, accepting this dialog should also flip status to 'Scheduled'.
   * When reassigning an already-scheduled job we just swap the truck without
   * touching status.
   */
  setScheduled?: boolean;
}

const HIGH_UTILISATION_HOURS = 6;

export function AssignTruckDialog({ job, onClose, setScheduled = true }: AssignTruckDialogProps) {
  const { data: trucks = [] } = useTrucks();
  const { data: allJobs = [] } = useJobs();
  const activeTrucks = useMemo(() => trucks.filter((t) => t.active), [trucks]);
  const fallbackTruck = activeTrucks[0]?.name ?? 'Truck 1';

  const [truck, setTruck] = useState<TruckId>(fallbackTruck);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const updateJob = useUpdateJob();

  useEffect(() => {
    if (job) {
      setTruck(job.assignedTruck ?? fallbackTruck);
      setDate(job.date || format(new Date(), 'yyyy-MM-dd'));
    }
  }, [job, fallbackTruck]);

  const overlapHours = useMemo(() => {
    if (!job || !truck || !date) return 0;
    let total = 0;
    for (const other of allJobs) {
      if (other.id === job.id) continue;
      if (other.assignedTruck !== truck) continue;
      if (other.date !== date) continue;
      if (other.status === 'Declined' || other.status === 'Completed' || other.status === 'Invoiced') continue;
      total += other.hoursEstimated ?? estimateHoursFromType(other);
    }
    return total;
  }, [allJobs, job, truck, date]);

  const overlapHigh = overlapHours >= HIGH_UTILISATION_HOURS;

  if (!job) return null;

  const handleSubmit = async () => {
    try {
      await updateJob.mutateAsync({
        id: job.id,
        assignedTruck: truck,
        date,
        ...(setScheduled ? { status: 'Scheduled' as const } : {}),
      });
      toast.success(
        setScheduled
          ? `Scheduled on ${truck} for ${format(new Date(date), 'EEE d MMM')}`
          : `Moved to ${truck}`,
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign truck');
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{setScheduled ? 'Assign truck' : 'Reassign truck'}</DialogTitle>
          <DialogDescription className="text-xs">
            {job.customerName} · {job.pickupAddress} → {job.deliveryAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Truck</Label>
            <select
              value={truck}
              onChange={(e) => setTruck(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {activeTrucks.length === 0 ? (
                <option value="">— No trucks available —</option>
              ) : (
                activeTrucks.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {overlapHigh && (
            <div className="flex items-start gap-2 rounded-lg bg-rebel-warning-surface px-3 py-2 text-[11px] text-rebel-warning ring-1 ring-rebel-warning/20">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>{truck}</strong> already has ~{overlapHours.toFixed(1)}h booked on {format(new Date(date), 'EEE d MMM')}. Consider another truck.
              </span>
            </div>
          )}
          {!overlapHigh && overlapHours > 0 && (
            <p className="text-[10.5px] text-muted-foreground flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {truck} has ~{overlapHours.toFixed(1)}h booked on {format(new Date(date), 'EEE d MMM')} (including this job).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={updateJob.isPending || activeTrucks.length === 0}
            onClick={handleSubmit}
          >
            {updateJob.isPending ? 'Saving…' : setScheduled ? 'Assign & schedule' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function estimateHoursFromType(job: Job): number {
  if (job.hoursEstimated && job.hoursEstimated > 0) return job.hoursEstimated;
  switch (job.type) {
    case 'House Move':
      return 4;
    case 'White Glove':
      return 1.5;
    default:
      return 1;
  }
}
