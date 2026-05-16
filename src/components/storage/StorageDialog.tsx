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
import { Customer, Job, StorageRecord } from '@/lib/types';
import { CustomerCombobox } from '@/components/customers/CustomerCombobox';
import { useCreateStorage, useUpdateStorage } from '@/hooks/useStorage';
import { sanitiseDecimal } from '@/lib/utils';
import { toast } from 'sonner';

interface StorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: StorageRecord | null;
  /** V5 P5 conversion: prefill the form from a completed delivery job
   *  so a load-in becomes a storage record in one click. */
  prefillJob?: Job | null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const blankForm = (): FormState => ({
  customerId: '',
  customerName: '',
  itemsDescription: '',
  inDate: todayIsoDate(),
  plannedOutDate: '',
  actualOutDate: '',
  monthlyRate: '',
  notes: '',
});

interface FormState {
  customerId: string;
  customerName: string;
  itemsDescription: string;
  inDate: string;
  plannedOutDate: string;
  actualOutDate: string;
  monthlyRate: string;
  notes: string;
}

export function StorageDialog({ open, onOpenChange, record, prefillJob }: StorageDialogProps) {
  const [form, setForm] = useState<FormState>(blankForm);
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const createStorage = useCreateStorage();
  const updateStorage = useUpdateStorage();
  const isEditing = !!record;

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        customerId: record.customerId ?? '',
        customerName: record.customerName,
        itemsDescription: record.itemsDescription,
        inDate: record.inDate,
        plannedOutDate: record.plannedOutDate ?? '',
        actualOutDate: record.actualOutDate ?? '',
        monthlyRate: record.monthlyRate != null ? String(record.monthlyRate) : '',
        notes: record.notes ?? '',
      });
      setSearchQuery(record.customerName);
      setLinkedCustomer(null);
    } else if (prefillJob) {
      const customerDisplay =
        prefillJob.customerCompanyName?.trim() || prefillJob.customerName;
      setForm({
        customerId: prefillJob.customerId ?? '',
        customerName: customerDisplay,
        itemsDescription: prefillJob.notes?.trim() || prefillJob.type || '',
        inDate: prefillJob.date || todayIsoDate(),
        plannedOutDate: '',
        actualOutDate: '',
        monthlyRate: '',
        notes: '',
      });
      setSearchQuery(customerDisplay);
      setLinkedCustomer(null);
    } else {
      setForm(blankForm());
      setSearchQuery('');
      setLinkedCustomer(null);
    }
  }, [open, record, prefillJob]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePickCustomer = (c: Customer) => {
    setLinkedCustomer(c);
    const displayName = c.companyName?.trim() || c.name;
    setSearchQuery(displayName);
    setForm((prev) => ({ ...prev, customerId: c.id, customerName: displayName }));
  };

  const handleClearPick = () => {
    setLinkedCustomer(null);
    setForm((prev) => ({ ...prev, customerId: '' }));
  };

  const canSubmit =
    form.customerName.trim() &&
    form.itemsDescription.trim() &&
    form.inDate &&
    !createStorage.isPending &&
    !updateStorage.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const parsedRate = form.monthlyRate.trim() ? parseFloat(form.monthlyRate) : null;
    const payload = {
      customerId: form.customerId || null,
      customerName: form.customerName.trim(),
      itemsDescription: form.itemsDescription.trim(),
      inDate: form.inDate,
      plannedOutDate: form.plannedOutDate || null,
      actualOutDate: form.actualOutDate || null,
      monthlyRate: parsedRate != null && !isNaN(parsedRate) ? parsedRate : null,
      notes: form.notes.trim() || null,
    };
    try {
      if (isEditing && record) {
        await updateStorage.mutateAsync({ id: record.id, ...payload });
        toast.success('Storage record updated');
      } else {
        await createStorage.mutateAsync(payload);
        toast.success('Storage record created');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isEditing ? 'Failed to update record' : 'Failed to create record');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit storage record' : 'New storage record'}</DialogTitle>
          <DialogDescription>
            Track items stored in the warehouse. Status auto-flips to overdue if the planned out-date passes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <Field label="Customer" required>
            <CustomerCombobox
              value={searchQuery}
              onChange={(v) => {
                setSearchQuery(v);
                setForm((p) => ({ ...p, customerName: v }));
              }}
              onPick={handlePickCustomer}
              onClearPick={handleClearPick}
              linkedCustomer={linkedCustomer}
            />
          </Field>

          <Field label="Items / contents" required>
            <textarea
              value={form.itemsDescription}
              onChange={(e) => update('itemsDescription', e.target.value)}
              rows={3}
              placeholder="e.g. 12 boxes, 1 fridge, 3-seater couch, dining table…"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="In date" required>
              <Input
                type="date"
                value={form.inDate}
                onChange={(e) => update('inDate', e.target.value)}
              />
            </Field>
            <Field label="Planned out">
              <Input
                type="date"
                value={form.plannedOutDate}
                onChange={(e) => update('plannedOutDate', e.target.value)}
              />
            </Field>
            <Field label="Actual out">
              <Input
                type="date"
                value={form.actualOutDate}
                onChange={(e) => update('actualOutDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Monthly rate (AUD ex GST)">
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={form.monthlyRate}
              onChange={(e) => update('monthlyRate', sanitiseDecimal(e.target.value))}
              placeholder="e.g. 220"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="Aisle / pallet location, fragile items, billing terms…"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
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
            {createStorage.isPending || updateStorage.isPending
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Create record'}
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
      <Label className="text-xs text-muted-foreground font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
