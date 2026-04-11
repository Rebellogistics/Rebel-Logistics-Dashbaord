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
import { useCreateDriver } from '@/hooks/useTeam';
import { useTrucks } from '@/hooks/useTrucks';
import { toast } from 'sonner';

interface AddDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initial = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  assignedTruck: '',
};

export function AddDriverDialog({ open, onOpenChange }: AddDriverDialogProps) {
  const [form, setForm] = useState(initial);
  const createDriver = useCreateDriver();
  const { data: trucks = [] } = useTrucks();

  useEffect(() => {
    if (open) setForm(initial);
  }, [open]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.fullName.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    !createDriver.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createDriver.mutateAsync({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone || undefined,
        assignedTruck: form.assignedTruck || undefined,
      });
      toast.success(`${form.fullName.trim()} added as driver`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create driver';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add driver</DialogTitle>
          <DialogDescription>
            Creates a new login account for the driver. Share the email and temporary password
            with them — they'll sign in at the same URL you use.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label="Full name" required>
            <Input
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Sam Driver"
              className="h-10"
              autoComplete="name"
            />
          </Field>

          <Field label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="sam@example.com"
              className="h-10"
              autoComplete="off"
            />
          </Field>

          <Field label="Phone">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="04xx xxx xxx"
              className="h-10"
              autoComplete="off"
            />
          </Field>

          <Field label="Temporary password" required>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="At least 6 characters"
              className="h-10"
              autoComplete="new-password"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Share this with the driver. They can change it after signing in.
            </p>
          </Field>

          <Field label="Assigned truck">
            <select
              value={form.assignedTruck}
              onChange={(e) => update('assignedTruck', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">— None yet —</option>
              {trucks
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
            </select>
          </Field>
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
            {createDriver.isPending ? 'Creating…' : 'Create driver'}
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
