import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { useCreateJob } from '@/hooks/useSupabaseData';
import { useRepeatCustomerLookup, type RepeatCustomerInfo } from '@/hooks/useRepeatCustomer';
import { Job, JobType, PricingType } from '@/lib/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Sparkles, Info } from 'lucide-react';

const LONG_DISTANCE_THRESHOLD_KM = 40;
const LONG_DISTANCE_LEVY_AUD = 25;

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillJob?: Job | null;
}

function formFromJob(job: Job): typeof initial {
  return {
    customerName: job.customerName ?? '',
    customerPhone: job.customerPhone ?? '',
    pickupAddress: job.pickupAddress ?? '',
    deliveryAddress: job.deliveryAddress ?? '',
    type: job.type,
    itemWeightKg: job.itemWeightKg != null ? String(job.itemWeightKg) : '',
    itemDimensions: job.itemDimensions ?? '',
    distanceKm: job.distanceKm != null ? String(job.distanceKm) : '',
    pricingType: job.pricingType ?? 'fixed',
    fee: job.pricingType === 'hourly' ? '' : String(job.fee ?? ''),
    hourlyRate: job.hourlyRate != null ? String(job.hourlyRate) : '',
    hoursEstimated: job.hoursEstimated != null ? String(job.hoursEstimated) : '',
    notes: job.notes ?? '',
  };
}

const initial = {
  customerName: '',
  customerPhone: '',
  pickupAddress: '',
  deliveryAddress: '',
  type: 'Standard' as JobType,
  itemWeightKg: '',
  itemDimensions: '',
  distanceKm: '',
  pricingType: 'fixed' as PricingType,
  fee: '',
  hourlyRate: '',
  hoursEstimated: '',
  notes: '',
};

export function NewQuoteDialog({ open, onOpenChange, prefillJob }: NewQuoteDialogProps) {
  const [form, setForm] = useState(initial);
  const [nameTouched, setNameTouched] = useState(false);
  const createJob = useCreateJob();

  const { info: repeatInfo } = useRepeatCustomerLookup(form.customerPhone);

  useEffect(() => {
    if (open && prefillJob) {
      setForm(formFromJob(prefillJob));
      setNameTouched(true);
    } else if (!open) {
      setForm(initial);
      setNameTouched(false);
    }
  }, [open, prefillJob]);

  useEffect(() => {
    if (repeatInfo.found && repeatInfo.customerName && !nameTouched && !form.customerName) {
      setForm((prev) => ({
        ...prev,
        customerName: repeatInfo.customerName!,
        pickupAddress: prev.pickupAddress || repeatInfo.lastPickup || '',
      }));
    }
  }, [repeatInfo, nameTouched, form.customerName]);

  const distanceNum = parseFloat(form.distanceKm) || 0;
  const fuelLevy = distanceNum > LONG_DISTANCE_THRESHOLD_KM ? LONG_DISTANCE_LEVY_AUD : 0;

  const computedFee = useMemo(() => {
    if (form.pricingType === 'hourly') {
      const rate = parseFloat(form.hourlyRate) || 0;
      const hours = parseFloat(form.hoursEstimated) || 0;
      return rate * hours;
    }
    return parseFloat(form.fee) || 0;
  }, [form.pricingType, form.fee, form.hourlyRate, form.hoursEstimated]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.customerName.trim() &&
    form.customerPhone.trim() &&
    form.pickupAddress.trim() &&
    form.deliveryAddress.trim() &&
    computedFee > 0 &&
    !createJob.isPending;

  const handleSubmit = async () => {
    try {
      await createJob.mutateAsync({
        id: `RL-${Date.now().toString(36).toUpperCase()}`,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        pickupAddress: form.pickupAddress.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        type: form.type,
        status: 'Quote',
        date: format(new Date(), 'yyyy-MM-dd'),
        fee: computedFee,
        fuelLevy,
        itemWeightKg: form.itemWeightKg ? parseFloat(form.itemWeightKg) : undefined,
        itemDimensions: form.itemDimensions.trim() || undefined,
        distanceKm: distanceNum || undefined,
        pricingType: form.pricingType,
        hourlyRate: form.pricingType === 'hourly' ? parseFloat(form.hourlyRate) || 0 : undefined,
        hoursEstimated: form.pricingType === 'hourly' ? parseFloat(form.hoursEstimated) || 0 : undefined,
        notes: form.notes.trim() || undefined,
      } as any);
      toast.success('Quote created');
      setForm(initial);
      setNameTouched(false);
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to create quote');
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{prefillJob ? 'Rebook customer' : 'New Quote'}</DialogTitle>
          <DialogDescription>
            {prefillJob
              ? `Pre-filled from a previous job for ${prefillJob.customerName}. Adjust anything that has changed and submit.`
              : 'Record a customer enquiry as a quote. Accept or decline it later from the Jobs list.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer name">
              <Input
                value={form.customerName}
                onChange={(e) => {
                  setNameTouched(true);
                  update('customerName', e.target.value);
                }}
                placeholder="Jane Smith"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.customerPhone}
                onChange={(e) => update('customerPhone', e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </Field>
          </div>

          <RepeatCustomerBanner info={repeatInfo} />

          <Field label="Pickup address">
            <Input
              value={form.pickupAddress}
              onChange={(e) => update('pickupAddress', e.target.value)}
              placeholder="Footscray"
            />
          </Field>

          <Field label="Delivery address">
            <Input
              value={form.deliveryAddress}
              onChange={(e) => update('deliveryAddress', e.target.value)}
              placeholder="Brunswick"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Job type"
              hint="Standard = regular delivery. White Glove = careful handling / inside placement. House Move = hourly, whole-home relocations."
            >
              <NativeSelect
                value={form.type}
                onChange={(v) => update('type', v as JobType)}
                options={['Standard', 'White Glove', 'House Move']}
              />
            </Field>
            <Field label="Distance (km)">
              <Input
                type="number"
                inputMode="decimal"
                value={form.distanceKm}
                onChange={(e) => update('distanceKm', e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Item weight (kg)">
              <Input
                type="number"
                inputMode="decimal"
                value={form.itemWeightKg}
                onChange={(e) => update('itemWeightKg', e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Item dimensions">
              <Input
                value={form.itemDimensions}
                onChange={(e) => update('itemDimensions', e.target.value)}
                placeholder="Optional, e.g. 1.2×0.8×0.9m"
              />
            </Field>
          </div>

          <Field label="Pricing">
            <NativeSelect
              value={form.pricingType}
              onChange={(v) => update('pricingType', v as PricingType)}
              options={[
                { value: 'fixed', label: 'Fixed fee' },
                { value: 'hourly', label: 'Hourly rate' },
              ]}
            />
          </Field>

          {form.pricingType === 'fixed' ? (
            <Field label="Fee (AUD)">
              <Input
                type="number"
                inputMode="decimal"
                value={form.fee}
                onChange={(e) => update('fee', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hourly rate (AUD)">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.hourlyRate}
                  onChange={(e) => update('hourlyRate', e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Hours estimated">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.hoursEstimated}
                  onChange={(e) => update('hoursEstimated', e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          )}

          <Field
            label="Notes"
            hint="Visible to the driver on their job card. Use for access codes, stairs, fragile items, parking instructions, etc."
          >
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Access, stairs, special handling…"
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>

          <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-semibold">${computedFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span
                className="text-muted-foreground inline-flex items-center gap-1"
                title={`A flat $${LONG_DISTANCE_LEVY_AUD} surcharge applied automatically when distance exceeds ${LONG_DISTANCE_THRESHOLD_KM} km.`}
              >
                Fuel levy {distanceNum > LONG_DISTANCE_THRESHOLD_KM ? `(> ${LONG_DISTANCE_THRESHOLD_KM}km)` : ''}
                <Info className="w-3 h-3 opacity-60" />
              </span>
              <span className="font-semibold">${fuelLevy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold">${(computedFee + fuelLevy).toFixed(2)}</span>
            </div>
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
            {createJob.isPending ? 'Creating…' : 'Create quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
        {label}
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

function RepeatCustomerBanner({ info }: { info: RepeatCustomerInfo }) {
  if (!info.found) return null;
  const name = info.customerName ?? 'there';
  const count = info.jobCount ?? 0;
  return (
    <div className="rounded-lg bg-rebel-accent-surface border border-rebel-accent/30 p-2.5 flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-rebel-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-rebel-accent">Repeat customer — {name}</p>
        <p className="text-[10px] text-rebel-accent mt-0.5">
          {count} previous booking{count === 1 ? '' : 's'}
          {info.lastJobDate ? ` · last job ${info.lastJobDate}` : ''}
          {info.lastPickup ? ` · usual pickup: ${info.lastPickup}` : ''}
        </p>
      </div>
    </div>
  );
}

type SelectOption = string | { value: string; label: string };

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {options.map((opt) => {
        const v = typeof opt === 'string' ? opt : opt.value;
        const l = typeof opt === 'string' ? opt : opt.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}
