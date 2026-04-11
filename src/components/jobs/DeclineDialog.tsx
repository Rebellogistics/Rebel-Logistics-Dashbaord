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
import { Label } from '@/components/ui/label';
import { useUpdateJob } from '@/hooks/useSupabaseData';
import { Job } from '@/lib/types';
import { toast } from 'sonner';

interface DeclineDialogProps {
  job: Job | null;
  onClose: () => void;
}

export function DeclineDialog({ job, onClose }: DeclineDialogProps) {
  const [reason, setReason] = useState('');
  const updateJob = useUpdateJob();

  useEffect(() => {
    setReason('');
  }, [job]);

  const handleSubmit = async () => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({
        id: job.id,
        status: 'Declined',
        declineReason: reason.trim() || undefined,
      });
      toast.success('Quote declined');
      onClose();
    } catch (err) {
      toast.error('Failed to decline quote');
      console.error(err);
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline quote</DialogTitle>
          <DialogDescription>
            {job ? `${job.customerName} — ${job.pickupAddress} → ${job.deliveryAddress}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Reason (optional)</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. too expensive, customer booked competitor"
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={updateJob.isPending} onClick={handleSubmit}>
            {updateJob.isPending ? 'Declining…' : 'Decline quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
