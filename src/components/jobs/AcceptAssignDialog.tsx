import { useEffect, useState } from 'react';
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
import { useUpdateJob } from '@/hooks/useSupabaseData';
import { useTrucks } from '@/hooks/useTrucks';
import { Job, TruckId } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AcceptAssignDialogProps {
  job: Job | null;
  onClose: () => void;
}

export function AcceptAssignDialog({ job, onClose }: AcceptAssignDialogProps) {
  const { data: trucks = [] } = useTrucks();
  const activeTrucks = trucks.filter((t) => t.active);
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

  const handleSubmit = async () => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({
        id: job.id,
        status: 'Scheduled',
        assignedTruck: truck,
        date,
      });
      toast.success(`Scheduled on ${truck} for ${date}`);
      onClose();
    } catch (err) {
      toast.error('Failed to schedule job');
      console.error(err);
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept & assign</DialogTitle>
          <DialogDescription>
            {job ? `${job.customerName} — ${job.pickupAddress} → ${job.deliveryAddress}` : ''}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={updateJob.isPending}
            onClick={handleSubmit}
          >
            {updateJob.isPending ? 'Scheduling…' : 'Accept & schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
