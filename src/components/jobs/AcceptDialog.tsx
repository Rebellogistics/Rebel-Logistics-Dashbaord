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
import { useJobs, useUpdateJob } from '@/hooks/useSupabaseData';
import { Job, PricingType } from '@/lib/types';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { Sparkles, Info } from 'lucide-react';

const LONG_DISTANCE_THRESHOLD_KM = 40;
const LONG_DISTANCE_LEVY_AUD = 25;
const SMART_SUGGESTION_LOOKBACK_DAYS = 60;

interface AcceptDialogProps {
  job: Job | null;
  onClose: () => void;
  /**
   * If true, after accept the caller should open the AssignTruck dialog
   * for the same job — used for the "Accept & assign" quick path.
   */
  onAccepted?: (acceptedJob: Job) => void;
  mode?: 'accept' | 'accept-and-assign';
}

interface FormState {
  date: string;
  pricingType: PricingType;
  fee: string;
  hourlyRate: string;
  hoursEstimated: string;
  fuelLevy: string;
}

function initialFromJob(job: Job): FormState {
  return {
    date: job.date || format(new Date(), 'yyyy-MM-dd'),
    pricingType: job.pricingType ?? 'fixed',
    fee: job.fee ? String(job.fee) : '',
    hourlyRate: job.hourlyRate != null ? String(job.hourlyRate) : '',
    hoursEstimated: job.hoursEstimated != null ? String(job.hoursEstimated) : '',
    fuelLevy: job.fuelLevy != null ? String(job.fuelLevy) : '',
  };
}

interface PricingSuggestion {
  value: number;
  label: string;
}

function buildSuggestion(job: Job, allJobs: Job[]): PricingSuggestion | null {
  const cutoff = subDays(new Date(), SMART_SUGGESTION_LOOKBACK_DAYS);
  // Prefer same customer + same type, most recent
  const sameCustomer = allJobs
    .filter(
      (j) =>
        j.id !== job.id &&
        j.type === job.type &&
        j.pricingType === 'fixed' &&
        j.fee > 0 &&
        ((job.customerId && j.customerId === job.customerId) ||
          (!!job.customerPhone && j.customerPhone === job.customerPhone)),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (sameCustomer[0]) {
    return {
      value: sameCustomer[0].fee,
      label: `Last ${job.type} for ${job.customerName}: $${sameCustomer[0].fee.toFixed(0)}`,
    };
  }

  const typeRecent = allJobs.filter((j) => {
    if (j.id === job.id) return false;
    if (j.type !== job.type) return false;
    if (j.pricingType !== 'fixed') return false;
    if (j.fee <= 0) return false;
    if (!j.date) return false;
    try {
      return isAfter(parseISO(j.date), cutoff);
    } catch {
      return false;
    }
  });
  if (typeRecent.length >= 2) {
    const avg = typeRecent.reduce((sum, j) => sum + j.fee, 0) / typeRecent.length;
    return {
      value: Math.round(avg),
      label: `Avg ${job.type} (${typeRecent.length} jobs, last ${SMART_SUGGESTION_LOOKBACK_DAYS}d): $${Math.round(avg)}`,
    };
  }
  return null;
}

export function AcceptDialog({ job, onClose, onAccepted, mode = 'accept' }: AcceptDialogProps) {
  const [form, setForm] = useState<FormState>(() =>
    job ? initialFromJob(job) : {
      date: format(new Date(), 'yyyy-MM-dd'),
      pricingType: 'fixed',
      fee: '',
      hourlyRate: '',
      hoursEstimated: '',
      fuelLevy: '',
    },
  );
  const updateJob = useUpdateJob();
  const { data: allJobs = [] } = useJobs();

  useEffect(() => {
    if (job) {
      setForm(initialFromJob(job));
    }
  }, [job]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const suggestion = useMemo(() => {
    if (!job || form.pricingType !== 'fixed') return null;
    return buildSuggestion(job, allJobs);
  }, [job, allJobs, form.pricingType]);

  const computedFee = useMemo(() => {
    if (form.pricingType === 'hourly') {
      const rate = parseFloat(form.hourlyRate) || 0;
      const hours = parseFloat(form.hoursEstimated) || 0;
      return rate * hours;
    }
    return parseFloat(form.fee) || 0;
  }, [form]);

  const derivedFuelLevy = useMemo(() => {
    if (form.fuelLevy.trim() !== '') return parseFloat(form.fuelLevy) || 0;
    if (!job?.distanceKm) return job?.fuelLevy ?? 0;
    return job.distanceKm > LONG_DISTANCE_THRESHOLD_KM ? LONG_DISTANCE_LEVY_AUD : 0;
  }, [form.fuelLevy, job]);

  if (!job) return null;

  const canSubmit = !!form.date && computedFee > 0 && !updateJob.isPending;

  const applySuggestion = () => {
    if (suggestion) update('fee', String(suggestion.value));
  };

  const handleAccept = async () => {
    if (!canSubmit) return;
    try {
      const updated = await updateJob.mutateAsync({
        id: job.id,
        status: 'Accepted',
        date: form.date,
        fee: computedFee,
        fuelLevy: derivedFuelLevy,
        pricingType: form.pricingType,
        hourlyRate: form.pricingType === 'hourly' ? parseFloat(form.hourlyRate) || 0 : undefined,
        hoursEstimated: form.pricingType === 'hourly' ? parseFloat(form.hoursEstimated) || 0 : undefined,
      });
      toast.success(`Accepted — ${job.customerName}, $${computedFee.toFixed(0)}`);
      if (mode === 'accept-and-assign' && onAccepted) {
        onAccepted(updated);
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept job');
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept quote</DialogTitle>
          <DialogDescription className="text-xs">
            {job.customerName} · {job.pickupAddress} → {job.deliveryAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="rounded-lg bg-rebel-accent-surface border border-rebel-accent/30 px-3 py-2 text-[11px] text-rebel-accent flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Accepting books the job at the price + date you set. You'll assign the truck later, when you can see the whole day's shape.
            </span>
          </div>

          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </Field>

          <Field label="Pricing">
            <select
              value={form.pricingType}
              onChange={(e) => update('pricingType', e.target.value as PricingType)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="fixed">Fixed fee</option>
              <option value="hourly">Hourly rate</option>
            </select>
          </Field>

          {form.pricingType === 'fixed' ? (
            <Field label="Fee (AUD)">
              <Input
                type="number"
                inputMode="decimal"
                value={form.fee}
                onChange={(e) => update('fee', e.target.value)}
                placeholder={suggestion ? String(suggestion.value) : '0.00'}
              />
              {suggestion && (
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-rebel-accent hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  {suggestion.label} — tap to use
                </button>
              )}
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

          <Field label="Fuel levy (AUD)">
            <Input
              type="number"
              inputMode="decimal"
              value={form.fuelLevy}
              onChange={(e) => update('fuelLevy', e.target.value)}
              placeholder={String(derivedFuelLevy.toFixed(2))}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {job.distanceKm
                ? `Auto: $${(job.distanceKm > LONG_DISTANCE_THRESHOLD_KM ? LONG_DISTANCE_LEVY_AUD : 0).toFixed(2)} (${job.distanceKm} km)`
                : 'Leave blank to keep the quote value.'}
            </p>
          </Field>

          <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-semibold tabular-nums">${computedFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fuel levy</span>
              <span className="font-semibold tabular-nums">${derivedFuelLevy.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-bold tabular-nums">${(computedFee + derivedFuelLevy).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={handleAccept}
          >
            {updateJob.isPending
              ? 'Accepting…'
              : mode === 'accept-and-assign'
                ? 'Accept & pick truck →'
                : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      {children}
    </div>
  );
}
