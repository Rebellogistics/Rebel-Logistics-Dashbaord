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
import { usePricingRates } from '@/hooks/usePricingRates';
import { useRepeatCustomerLookup, type RepeatCustomerInfo } from '@/hooks/useRepeatCustomer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { Job, JobLocation, JobType } from '@/lib/types';
import { calculateQuote, formatAud } from '@/lib/pricing';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Sparkles, Info, Mic, MicOff } from 'lucide-react';

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillJob?: Job | null;
}

function defaultValidUntil() {
  return format(addDays(new Date(), 30), 'yyyy-MM-dd');
}

function formFromJob(job: Job): typeof initial {
  return {
    customerName: job.customerName ?? '',
    customerPhone: job.customerPhone ?? '',
    pickupAddress: job.pickupAddress ?? '',
    deliveryAddress: job.deliveryAddress ?? '',
    type: job.type,
    location: (job.location as JobLocation) ?? 'Metro',
    cubicMetres: job.cubicMetres != null ? String(job.cubicMetres) : '',
    itemWeightKg: job.itemWeightKg != null ? String(job.itemWeightKg) : '',
    estimatedHours: job.hoursEstimated != null ? String(job.hoursEstimated) : '',
    notes: job.notes ?? '',
    validUntil: job.validUntil ?? defaultValidUntil(),
  };
}

const initial = {
  customerName: '',
  customerPhone: '',
  pickupAddress: '',
  deliveryAddress: '',
  type: 'Standard' as JobType,
  location: 'Metro' as JobLocation,
  cubicMetres: '',
  itemWeightKg: '',
  estimatedHours: '',
  notes: '',
  validUntil: defaultValidUntil(),
};

export function NewQuoteDialog({ open, onOpenChange, prefillJob }: NewQuoteDialogProps) {
  const [form, setForm] = useState(initial);
  const [nameTouched, setNameTouched] = useState(false);
  const createJob = useCreateJob();
  const { data: rates } = usePricingRates();

  const { info: repeatInfo } = useRepeatCustomerLookup(form.customerPhone);
  const voice = useVoiceInput((transcript) => {
    setForm((prev) => ({ ...prev, notes: transcript }));
  });

  useEffect(() => {
    if (open && prefillJob) {
      setForm(formFromJob(prefillJob));
      setNameTouched(true);
    } else if (!open) {
      setForm({ ...initial, validUntil: defaultValidUntil() });
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

  // Default the estimated-hours field to the minimum once rates load.
  useEffect(() => {
    if (form.type === 'House Move' && rates && !form.estimatedHours) {
      setForm((prev) => ({ ...prev, estimatedHours: String(rates.minimumHours) }));
    }
  }, [form.type, rates, form.estimatedHours]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const breakdown = useMemo(() => {
    if (!rates) return null;
    return calculateQuote({
      type: form.type,
      location: form.location,
      cubicMetres: parseFloat(form.cubicMetres) || 0,
      estimatedHours: parseFloat(form.estimatedHours) || 0,
      rates,
      overrideMetroRate: repeatInfo.overrideMetroRate,
      overrideHourlyRate: repeatInfo.overrideHourlyRate,
    });
  }, [form, rates, repeatInfo]);

  const isHouseMove = form.type === 'House Move';
  const isMetro = !isHouseMove && form.location === 'Metro';
  const isRegional = !isHouseMove && form.location === 'Regional';
  const usingOverride =
    (isHouseMove && repeatInfo.overrideHourlyRate != null) ||
    (isMetro && repeatInfo.overrideMetroRate != null);

  const baseValid =
    form.customerName.trim() &&
    form.customerPhone.trim() &&
    form.pickupAddress.trim() &&
    form.deliveryAddress.trim();

  const pricingValid = (() => {
    if (!breakdown) return false;
    if (isHouseMove) return breakdown.subtotal > 0;
    if (isRegional) return true;
    // Metro
    return (parseFloat(form.cubicMetres) || 0) > 0;
  })();

  const canSubmit = !!baseValid && pricingValid && !createJob.isPending;
  const canSaveDraft = !!baseValid && !createJob.isPending;

  const buildPayload = (asDraft: boolean) => {
    if (!breakdown) throw new Error('Pricing rates not loaded');
    return {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      pickupAddress: form.pickupAddress.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      type: form.type,
      status: 'Quote' as const,
      date: format(new Date(), 'yyyy-MM-dd'),
      fee: breakdown.subtotal,
      fuelLevy: 0,
      gstAmount: breakdown.gst,
      location: isHouseMove ? undefined : form.location,
      cubicMetres: isHouseMove
        ? undefined
        : isMetro
          ? parseFloat(form.cubicMetres) || 0
          : undefined,
      itemWeightKg: form.itemWeightKg ? parseFloat(form.itemWeightKg) : undefined,
      pricingType: isHouseMove ? ('hourly' as const) : ('fixed' as const),
      hourlyRate: isHouseMove ? breakdown.hourlyRate : undefined,
      hoursEstimated: isHouseMove ? breakdown.billedHours : undefined,
      validUntil: form.validUntil || undefined,
      isDraft: asDraft,
      notes: form.notes.trim() || undefined,
    };
  };

  const handleSubmit = async (asDraft: boolean) => {
    try {
      await createJob.mutateAsync(buildPayload(asDraft) as any);
      toast.success(asDraft ? 'Draft saved' : 'Quote created');
      setForm({ ...initial, validUntil: defaultValidUntil() });
      setNameTouched(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(asDraft ? 'Failed to save draft' : 'Failed to create quote');
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
              : 'Record a customer enquiry as a quote. Pricing follows the rates set in Settings → Pricing.'}
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

          {!isHouseMove && (
            <>
              <Field label="Location">
                <ToggleGroup
                  options={[
                    { value: 'Metro', label: 'Metro' },
                    { value: 'Regional', label: 'Regional' },
                  ]}
                  value={form.location}
                  onChange={(v) => update('location', v as JobLocation)}
                />
              </Field>

              {isMetro ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Cubic metres (m³)"
                    hint="Total volume of the items. Multiplied by the metro per-cube rate."
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={form.cubicMetres}
                      onChange={(e) => update('cubicMetres', e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </Field>
                  <Field label="Item weight (kg)" hint="Optional. Useful for marble tables or unusually heavy items.">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.itemWeightKg}
                      onChange={(e) => update('itemWeightKg', e.target.value)}
                      placeholder="Optional"
                    />
                  </Field>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Regional jobs use a flat minimum charge of {rates ? formatAud(rates.regionalMinimumAud) : '—'}.
                </div>
              )}
            </>
          )}

          {isHouseMove && rates && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Hourly rate"
                hint={
                  usingOverride
                    ? 'Custom rate for this customer (overrides default).'
                    : 'Default rate from Settings → Pricing.'
                }
              >
                <Input
                  value={`${formatAud(breakdown?.hourlyRate ?? rates.hourlyRateAud)} / hr${usingOverride ? ' · custom' : ''}`}
                  readOnly
                  className="bg-muted/40"
                />
              </Field>
              <Field
                label={`Estimated hours (min ${rates.minimumHours})`}
                hint={`Minimum ${rates.minimumHours} hours applies. Quotes for fewer hours are bumped up automatically.`}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={rates.minimumHours}
                  value={form.estimatedHours}
                  onChange={(e) => update('estimatedHours', e.target.value)}
                  onBlur={() => {
                    const v = parseFloat(form.estimatedHours);
                    if (!isNaN(v) && v < rates.minimumHours) {
                      update('estimatedHours', String(rates.minimumHours));
                      toast.message(`Minimum ${rates.minimumHours} hours applied`);
                    }
                  }}
                />
              </Field>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium inline-flex items-center gap-1">
                {isHouseMove ? 'Job description' : 'Notes'}
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={
                    isHouseMove
                      ? 'Stairs, easy access, fragile items, lift available, parking instructions… Visible to the driver.'
                      : 'Visible to the driver on their job card. Use for access codes, stairs, fragile items, parking instructions, etc.'
                  }
                  title={
                    isHouseMove
                      ? 'Stairs, easy access, fragile items, lift available, parking instructions… Visible to the driver.'
                      : 'Visible to the driver on their job card. Use for access codes, stairs, fragile items, parking instructions, etc.'
                  }
                  className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-rebel-accent cursor-help"
                >
                  <Info className="w-3 h-3" />
                </span>
              </Label>
              {voice.supported && (
                <button
                  type="button"
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  className={`inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10px] font-semibold transition-colors ${
                    voice.listening
                      ? 'bg-red-500 text-white'
                      : 'bg-rebel-accent-surface text-rebel-accent hover:bg-rebel-accent hover:text-white'
                  }`}
                  aria-label={voice.listening ? 'Stop listening' : 'Dictate'}
                >
                  {voice.listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {voice.listening ? 'Stop' : 'Dictate'}
                </button>
              )}
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder={
                isHouseMove
                  ? 'e.g. 3-bedroom apartment, second floor, lift available, two flights of stairs at delivery…'
                  : 'Access, stairs, special handling…'
              }
              rows={isHouseMove ? 3 : 2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {voice.listening && (
              <p className="text-[10px] text-red-600 font-semibold inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Listening…
              </p>
            )}
          </div>

          <Field label="Quote valid until" hint="Defaults to 30 days from today. Adjust if a shorter window applies.">
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => update('validUntil', e.target.value)}
            />
          </Field>

          {breakdown && (
            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{breakdown.explainer}</span>
                <span className="font-semibold">{formatAud(breakdown.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  GST ({rates?.gstPercent ?? 10}%)
                </span>
                <span className="font-semibold">{formatAud(breakdown.gst)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="font-semibold">Total inc. GST</span>
                <span className="font-bold text-base">{formatAud(breakdown.total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={!canSaveDraft}
            onClick={() => handleSubmit(true)}
          >
            Save as draft
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={() => handleSubmit(false)}
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
  const hasOverride = info.overrideMetroRate != null || info.overrideHourlyRate != null;
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
        {hasOverride && (
          <p className="text-[10px] text-rebel-accent mt-0.5 font-semibold">
            Custom rate applies
            {info.overrideMetroRate != null ? ` · metro ${formatAud(info.overrideMetroRate)}/m³` : ''}
            {info.overrideHourlyRate != null ? ` · hourly ${formatAud(info.overrideHourlyRate)}` : ''}
          </p>
        )}
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

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 h-9 rounded-lg border text-xs font-semibold transition-colors ${
              active
                ? 'bg-rebel-accent border-rebel-accent text-white'
                : 'bg-card border-input text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
