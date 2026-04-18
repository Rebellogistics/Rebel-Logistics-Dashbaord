import { useEffect, useRef, useState } from 'react';
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
import { useProfile } from '@/hooks/useProfile';
import { useDriverToday } from '@/hooks/useDriverToday';
import { Job } from '@/lib/types';
import { toast } from 'sonner';
import { PenLine, PackageCheck, Camera } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import {
  CompletionNotesField,
  appendCompletionNote,
} from '@/components/jobs/CompletionNotesField';

interface MarkDeliveredSheetProps {
  job: Job | null;
  onClose: () => void;
}

export function MarkDeliveredSheet({ job, onClose }: MarkDeliveredSheetProps) {
  const [signatureValue, setSignatureValue] = useState<string | null>(null);
  const [firstPhotoPath, setFirstPhotoPath] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const updateJob = useUpdateJob();
  const { data: profile } = useProfile();
  const { name: pickedDriverName } = useDriverToday();

  useEffect(() => {
    if (job) {
      setSignatureValue(job.signature ?? null);
      setFirstPhotoPath(job.proofPhoto ?? null);
      setNewNote('');
    } else {
      setSignatureValue(null);
      setFirstPhotoPath(null);
      setNewNote('');
    }
  }, [job]);

  const handleSubmit = async () => {
    if (!job) return;
    try {
      // Flush any unsaved canvas drawing in the signature pad before mutating.
      let resolvedSignature = signatureValue;
      if (sigPadRef.current?.hasPendingChanges()) {
        try {
          const flushed = await sigPadRef.current.commit();
          if (flushed) resolvedSignature = flushed;
        } catch {
          // commit() already toasted; abort the submit so the user can retry
          return;
        }
      }

      const author = pickedDriverName ?? profile?.fullName;
      const updatedNotes = appendCompletionNote(job.notes, newNote, author);
      await updateJob.mutateAsync({
        id: job.id,
        status: 'Completed',
        proofPhoto: firstPhotoPath || undefined,
        signature: resolvedSignature || undefined,
        notes: updatedNotes,
      });
      toast.success('Delivered');
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to mark delivered';
      toast.error(message);
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark delivered</DialogTitle>
          <DialogDescription>
            {job
              ? `${job.customerName} · ${job.pickupAddress} → ${job.deliveryAddress}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {job && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Proof photos
              </Label>
              <PhotoCapture
                jobId={job.id}
                onUploadedFirstPath={(path) => {
                  if (!firstPhotoPath) setFirstPhotoPath(path);
                }}
              />
              <p className="text-[10px] text-muted-foreground">
                Tap the button to open the camera. You can take up to 10 photos per job.
              </p>
            </div>
          )}

          {job && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" />
                Customer signature
              </Label>
              <SignaturePad
                ref={sigPadRef}
                jobId={job.id}
                initialValue={signatureValue}
                onChange={setSignatureValue}
              />
            </div>
          )}

          {job && (
            <CompletionNotesField
              value={newNote}
              onChange={setNewNote}
              existingNotes={job.notes}
            />
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5 h-11"
            disabled={updateJob.isPending}
            onClick={handleSubmit}
          >
            <PackageCheck className="w-4 h-4" />
            {updateJob.isPending ? 'Saving…' : 'Mark delivered'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
