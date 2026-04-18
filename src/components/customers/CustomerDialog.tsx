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
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useSupabaseData';
import { Customer, CustomerType } from '@/lib/types';
import { toast } from 'sonner';
import { Info } from 'lucide-react';

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

const initial = {
  type: 'individual' as CustomerType,
  name: '',
  companyName: '',
  abn: '',
  phone: '',
  email: '',
  source: '',
  notes: '',
  vip: false,
};

const SOURCES = [
  { value: '', label: 'Unknown' },
  { value: 'phone', label: 'Phone' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'airtasker', label: 'Airtasker' },
  { value: 'gumtree', label: 'Gumtree' },
  { value: 'b2b', label: 'B2B repeat' },
  { value: 'other', label: 'Other' },
];

function generateCustomerId(): string {
  try {
    return `C-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  } catch {
    return `C-${Date.now().toString(36).toUpperCase()}`;
  }
}


export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
  const [form, setForm] = useState(initial);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEditing = !!customer;

  useEffect(() => {
    if (open && customer) {
      setForm({
        type: customer.type,
        name: customer.name,
        companyName: customer.companyName ?? '',
        abn: customer.abn ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        source: customer.source ?? '',
        notes: customer.notes ?? '',
        vip: customer.vip,
      });
    } else if (open && !customer) {
      setForm(initial);
    }
  }, [open, customer]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit = form.name.trim() && !createCustomer.isPending && !updateCustomer.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const base = {
        type: form.type,
        name: form.name.trim(),
        companyName: form.companyName.trim() || undefined,
        abn: form.abn.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        source: form.source.trim() || undefined,
        notes: form.notes.trim() || undefined,
        vip: form.vip,
      };

      if (isEditing && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...base } as any);
        toast.success('Customer updated');
      } else {
        await createCustomer.mutateAsync({
          id: generateCustomerId(),
          ...base,
        } as any);
        toast.success('Customer created');
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isEditing ? 'Failed to update customer' : 'Failed to create customer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details. Linked jobs will follow automatically.'
              : 'Add a customer manually. Customers are also created automatically when you accept a quote or when someone submits the public form.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <Field label="Type">
            <div className="flex gap-2">
              <TypeButton
                active={form.type === 'individual'}
                onClick={() => update('type', 'individual')}
              >
                Individual
              </TypeButton>
              <TypeButton
                active={form.type === 'company'}
                onClick={() => update('type', 'company')}
              >
                Company
              </TypeButton>
            </div>
          </Field>

          <Field label={form.type === 'company' ? 'Contact name' : 'Full name'} required>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Jane Smith"
            />
          </Field>

          {form.type === 'company' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Company name">
                <Input
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  placeholder="Acme Moving Pty Ltd"
                />
              </Field>
              <Field label="ABN">
                <Input
                  value={form.abn}
                  onChange={(e) => update('abn', e.target.value)}
                  placeholder="11 222 333 444"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="optional"
              />
            </Field>
          </div>

          <Field
            label="Source"
            hint="How this customer found Rebel Logistics. Used for reporting so you can see which channels bring in the most work."
          >
            <select
              value={form.source}
              onChange={(e) => update('source', e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {SOURCES.map((s) => (
                <option key={s.value || 'unknown'} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="vip-toggle"
              type="checkbox"
              checked={form.vip}
              onChange={(e) => update('vip', e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="vip-toggle" className="cursor-pointer inline-flex items-center gap-1">
              Mark as VIP customer
              <span
                tabIndex={0}
                role="img"
                aria-label="VIP customers show a gold star across the app — jobs table, truck runs, driver cards — so they get the white-glove treatment."
                title="VIP customers show a gold star across the app — jobs table, truck runs, driver cards — so they get the white-glove treatment."
                className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-rebel-accent cursor-help"
              >
                <Info className="w-3 h-3" />
              </span>
            </Label>
          </div>

          <Field
            label="Notes"
            hint="Internal notes only. Not shown to drivers. Use for billing preferences, payment terms, gate codes, anything you want to remember about this customer."
          >
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Preferences, payment terms, access instructions…"
              rows={3}
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
            {createCustomer.isPending || updateCustomer.isPending
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : 'Create customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && (
          <span
            tabIndex={0}
            role="img"
            aria-label={hint}
            title={hint}
            className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-rebel-accent cursor-help"
          >
            <Info className="w-3 h-3" />
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
        active
          ? 'bg-rebel-accent border-rebel-accent text-white'
          : 'bg-card border-input text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
