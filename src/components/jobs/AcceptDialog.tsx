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
import { usePricingRates } from '@/hooks/usePricingRates';
import { calculateQuote } from '@/lib/pricing';
import { sanitiseDecimal } from '@/lib/utils';
import { Job, JobLocation, PricingRates, PricingType } from '@/lib/types';
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pick a sensible default fee for the AcceptDialog.
 *
 * Order of preference:
 *   1. Rate book — for Standard/White Glove + Regional, that's the flat
 *      minimum charge for the right type. For Standard/White Glove + Metro
 *      with cubic_metres known, that's cubes × per-cube rate. Always wins
 *      when it gives a positive value because it's the "right" answer
 *      according to the price list Yamin set himself.
 *   2. Last same-customer + same-type + same-location job. Falls back when
 *      the rate book doesn't apply (e.g. Metro with no cubes recorded yet).
 *   3. Average of recent same-type + same-location jobs (last 60d, ≥2 rows).
 *
 * Critically, every historical lookup is filtered by BOTH type AND location.
 * A White Glove Metro 1m³ history of $120 must NOT bleed into a White Glove
 * Regional booking where the floor is $480.
 */
function buildSuggestion(
  job: Job,
  allJobs: Job[],
  rates: PricingRates | undefined,
): PricingSuggestion | null {
  // 1. Rate-book answer — strongest signal when it applies.
  if (rates) {
    const breakdown = calculateQuote({
      type: job.type,
      location: job.location as JobLocation | undefined,
      cubicMetres: job.cubicMetres ?? 0,
      estimatedHours: job.hoursEstimated ?? 0,
      rates,
    });
    // For Regional, breakdown.subtotal is the flat minimum (always positive).
    // For Metro, it's only useful if cubic_metres is set (otherwise = 0).
    const isRegional = job.type !== 'House Move' && job.location === 'Regional';
    const isMetroWithCubes =
      job.type !== 'House Move' && job.location === 'Metro' && (job.cubicMetres ?? 0) > 0;
    if (breakdown.subtotal > 0 && (isRegional || isMetroWithCubes)) {
      const tag = job.type === 'White Glove' ? ' (White Glove rate)' : '';
      const label = isRegional
        ? `Rate book: $${breakdown.subtotal.toFixed(0)} flat ${job.location} minimum${tag}`
        : `Rate book: ${job.cubicMetres} m³ × $${breakdown.metroRate} = $${breakdown.subtotal.toFixed(0)}${tag}`;
      return { value: breakdown.subtotal, label };
    }
  }

  // 2. Same-customer history — but only when type + location agree.
  const cutoff = subDays(new Date(), SMART_SUGGESTION_LOOKBACK_DAYS);
  const matchesProfile = (j: Job): boolean =>
    j.id !== job.id &&
    j.type === job.type &&
    (job.type === 'House Move' ? true : (j.location ?? null) === (job.location ?? null)) &&
    j.pricingType === 'fixed' &&
    j.fee > 0;

  const sameCustomer = allJobs
    .filter(
      (j) =>
        matchesProfile(j) &&
        ((job.customerId && j.customerId === job.customerId) ||
          (!!job.customerPhone && j.customerPhone === job.customerPhone)),
    )
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (sameCustomer[0]) {
    const locTag = job.location ? ` ${job.location}` : '';
    return {
      value: sameCustomer[0].fee,
      label: `Last ${job.type}${locTag} for ${job.customerName}: $${sameCustomer[0].fee.toFixed(0)}`,
    };
  }

  // 3. Recent average of the same type + location.
  const typeRecent = allJobs.filter((j) => {
    if (!matchesProfile(j)) return false;
    if (!j.date) return false;
    try {
      return isAfter(parseISO(j.date), cutoff);
    } catch {
      return false;
    }
  });
  if (typeRecent.length >= 2) {
    const avg = typeRecent.reduce((sum, j) => sum + j.fee, 0) / typeRecent.length;
    const locTag = job.location ? ` ${job.location}` : '';
    return {
      value: Math.round(avg),
      label: `Avg ${job.type}${locTag} (${typeRecent.length} jobs, last ${SMART_SUGGESTION_LOOKBACK_DAYS}d): $${Math.round(avg)}`,
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
  const { data: rates } = usePricingRates();
  const gstPercent = rates?.gstPercent ?? 10;

  useEffect(() => {
    if (job) {
      setForm(initialFromJob(job));
    }
  }, [job]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const suggestion = useMemo(() => {
    if (!job || form.pricingType !== 'fixed') return null;
    return buildSuggestion(job, allJobs, rates);
  }, [job, allJobs, form.pricingType, rates]);

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
      // GST is computed against the subtotal (fee, ex-GST). Mirrors the
      // breakdown the user sees below the form.
      const gstAmount = round2(computedFee * (gstPercent / 100));
      const updated = await updateJob.mutateAsync({
        id: job.id,
        status: 'Accepted',
        date: form.date,
        fee: computedFee,
        fuelLevy: derivedFuelLevy,
        gstAmount,
        pricingType: form.pricingType,
        hourlyRate: form.pricingType === 'hourly' ? parseFloat(form.hourlyRate) || 0 : undefined,
        hoursEstimated: form.pricingType === 'hourly' ? parseFloat(form.hoursEstimated) || 0 : undefined,
      });
      const totalIncGst = computedFee + derivedFuelLevy + gstAmount;
      toast.success(`Accepted — ${job.customerName}, $${totalIncGst.toFixed(0)} inc GST`);
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
            <Field label="Fee (AUD ex-GST)">
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={form.fee}
                onChange={(e) => update('fee', sanitiseDecimal(e.target.value))}
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
              <Field label="Hourly rate (AUD ex-GST)">
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.hourlyRate}
                  onChange={(e) => update('hourlyRate', sanitiseDecimal(e.target.value))}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Hours estimated">
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.hoursEstimated}
                  onChange={(e) => update('hoursEstimated', sanitiseDecimal(e.target.value))}
                  placeholder="0"
                />
              </Field>
            </div>
          )}

          <Field label="Fuel levy (AUD ex-GST)">
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={form.fuelLevy}
              onChange={(e) => update('fuelLevy', sanitiseDecimal(e.target.value))}
              placeholder={String(derivedFuelLevy.toFixed(2))}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              {job.distanceKm
                ? `Auto: $${(job.distanceKm > LONG_DISTANCE_THRESHOLD_KM ? LONG_DISTANCE_LEVY_AUD : 0).toFixed(2)} (${job.distanceKm} km)`
                : 'Leave blank to keep the quote value.'}
            </p>
          </Field>

          {(() => {
            const gstAmount = round2(computedFee * (gstPercent / 100));
            const totalIncGst = round2(computedFee + derivedFuelLevy + gstAmount);
            return (
              <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal (ex-GST)</span>
                  <span className="font-semibold tabular-nums">${computedFee.toFixed(2)}</span>
                </div>
                {derivedFuelLevy > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fuel levy (ex-GST)</span>
                    <span className="font-semibold tabular-nums">${derivedFuelLevy.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({gstPercent}%)</span>
                  <span className="font-semibold tabular-nums">${gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="font-semibold">Total inc. GST</span>
                  <span className="font-bold text-base tabular-nums">${totalIncGst.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
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
