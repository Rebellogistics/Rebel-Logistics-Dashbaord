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
import { Job } from '@/lib/types';
import { toast } from 'sonner';
import { PhotoCapture } from '@/components/driver/PhotoCapture';
import { SignaturePad, type SignaturePadHandle } from '@/components/driver/SignaturePad';
import { PenLine, Camera } from 'lucide-react';
import { CompletionNotesField, appendCompletionNote } from './CompletionNotesField';

interface MarkCompleteDialogProps {
  job: Job | null;
  onClose: () => void;
}

export function MarkCompleteDialog({ job, onClose }: MarkCompleteDialogProps) {
  const [signatureValue, setSignatureValue] = useState<string | null>(null);
  const [firstPhotoPath, setFirstPhotoPath] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const updateJob = useUpdateJob();
  const { data: profile } = useProfile();

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

      const updatedNotes = appendCompletionNote(job.notes, newNote, profile?.fullName);
      await updateJob.mutateAsync({
        id: job.id,
        status: 'Completed',
        proofPhoto: firstPhotoPath || undefined,
        signature: resolvedSignature || undefined,
        notes: updatedNotes,
      });
      toast.success('Job marked complete');
      onClose();
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to mark complete';
      toast.error(message);
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark complete</DialogTitle>
          <DialogDescription>
            {job
              ? `${job.customerName} — ${job.pickupAddress} → ${job.deliveryAddress}`
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
                Tap to open the camera or choose a file. Up to 10 photos per job.
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={updateJob.isPending}
            onClick={handleSubmit}
          >
            {updateJob.isPending ? 'Saving…' : 'Mark complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
