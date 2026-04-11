import { useEffect, useState, type ReactNode } from 'react';
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
import { useCreateTruck, useUpdateTruck } from '@/hooks/useTrucks';
import { Truck } from '@/lib/types';
import { toast } from 'sonner';

interface TruckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truck?: Truck | null;
}

export function TruckDialog({ open, onOpenChange, truck }: TruckDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const createTruck = useCreateTruck();
  const updateTruck = useUpdateTruck();
  const isEditing = !!truck;

  useEffect(() => {
    if (open) {
      if (truck) {
        setName(truck.name);
        setDescription(truck.description ?? '');
        setActive(truck.active);
      } else {
        setName('');
        setDescription('');
        setActive(true);
      }
    }
  }, [open, truck]);

  const canSubmit = name.trim() && !createTruck.isPending && !updateTruck.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (isEditing && truck) {
        await updateTruck.mutateAsync({ id: truck.id, name, description, active });
        toast.success('Truck updated');
      } else {
        await createTruck.mutateAsync({ name, description, active });
        toast.success('Truck added');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save truck';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit truck' : 'Add truck'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Rename, describe, or deactivate this truck.'
              : 'Add a new truck to your fleet. You can assign drivers and jobs to it immediately.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Truck 3"
              className="h-10"
            />
          </Field>

          <Field label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — e.g. 'Long-distance', 'White glove', 'Reg: ABC-123'"
              className="h-10"
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="truck-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="truck-active" className="cursor-pointer">
              Active
            </Label>
            <span className="text-[10px] text-muted-foreground ml-1">
              (Inactive trucks are hidden from assignment dropdowns.)
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {createTruck.isPending || updateTruck.isPending
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Add truck'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
