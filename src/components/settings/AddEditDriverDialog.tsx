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
import { useCreateDriverV2, useUpdateDriver } from '@/hooks/useDrivers';
import { cn } from '@/lib/utils';
import type { Driver } from '@/lib/types';
import { toast } from 'sonner';

interface AddEditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
}

/**
 * Phase 11: drivers don't log in. Email + password are deliberately absent —
 * a driver row is name + phone + active flag. Yamin picks them from the truck
 * portal dropdown at the start of a shift.
 */
export function AddEditDriverDialog({ open, onOpenChange, driver }: AddEditDriverDialogProps) {
  const isEdit = !!driver;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const create = useCreateDriverV2();
  const update = useUpdateDriver();

  useEffect(() => {
    if (open) {
      setName(driver?.name ?? '');
      setPhone(driver?.phone ?? '');
      setActive(driver?.active ?? true);
    }
  }, [open, driver]);

  const canSubmit = name.trim().length > 0 && !create.isPending && !update.isPending;

  const handleSave = async () => {
    if (!canSubmit) return;
    try {
      if (isEdit && driver) {
        await update.mutateAsync({ id: driver.id, name, phone, active });
        toast.success(`${name.trim()} updated`);
      } else {
        await create.mutateAsync({ name, phone });
        toast.success(`${name.trim()} added`);
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? 'Failed to update driver' : 'Failed to add driver');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit driver' : 'Add driver'}</DialogTitle>
          <DialogDescription className="text-xs">
            Drivers don't log in — their name appears on the truck portal's
            "Who's driving today?" dropdown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jacob"
              autoFocus={!isEdit}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Phone (optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="04xx xxx xxx"
              inputMode="tel"
            />
          </div>
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-rebel-border p-3">
              <div className="text-xs">
                <p className="font-semibold">Active</p>
                <p className="text-muted-foreground">
                  Inactive drivers stay on past job records but disappear from the picker.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((a) => !a)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors shrink-0',
                  active ? 'bg-rebel-accent' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                    active ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white w-full sm:w-auto"
            disabled={!canSubmit}
            onClick={handleSave}
          >
            {(create.isPending || update.isPending) ? 'Saving…' : isEdit ? 'Save' : 'Add driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
