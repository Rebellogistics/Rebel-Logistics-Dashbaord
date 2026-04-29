import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePricingRates, useUpdatePricingRates } from '@/hooks/usePricingRates';
import { useCan } from '@/hooks/useCan';
import { PricingRates } from '@/lib/types';
import { DEFAULT_RATES } from '@/lib/pricing';
import { DollarSign, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function PricingPanel() {
  const canEdit = useCan('edit_pricing');
  const { data: rates, isLoading } = usePricingRates();
  const update = useUpdatePricingRates();
  const [draft, setDraft] = useState<PricingRates>(DEFAULT_RATES);

  useEffect(() => {
    if (rates) setDraft(rates);
  }, [rates]);

  const isDirty = rates && (
    draft.metroPerCubeAud !== rates.metroPerCubeAud ||
    draft.regionalMinimumAud !== rates.regionalMinimumAud ||
    draft.hourlyRateAud !== rates.hourlyRateAud ||
    draft.minimumHours !== rates.minimumHours ||
    draft.gstPercent !== rates.gstPercent
  );

  const handleSave = async () => {
    try {
      await update.mutateAsync(draft);
      toast.success('Pricing updated');
    } catch (err) {
      console.error(err);
      toast.error('Could not save pricing — check permissions');
    }
  };

  const setNum = (key: keyof PricingRates) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setDraft((d) => ({ ...d, [key]: isNaN(v) ? 0 : v } as PricingRates));
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-8 text-center">Loading rates…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-base">Pricing</h3>
          <p className="text-xs text-muted-foreground">
            These rates apply to every new quote. Existing quotes keep their original price.
          </p>
        </div>
        {rates?.updatedAt && (
          <p className="text-[10px] text-muted-foreground">
            Last updated {format(new Date(rates.updatedAt), 'd MMM yyyy, HH:mm')}
          </p>
        )}
      </div>

      {!canEdit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            You can view but not edit pricing. Ask an owner or admin to make changes.
          </p>
        </div>
      )}

      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-5 space-y-5">
          <Section
            title="Standard delivery & White Glove"
            subtitle="Per-cube for metro jobs, flat minimum for regional jobs."
          >
            <FieldRow>
              <RateField
                label="Metro — per m³ (AUD)"
                value={draft.metroPerCubeAud}
                onChange={setNum('metroPerCubeAud')}
                disabled={!canEdit}
                hint="Multiplied by the cubic-metres value on the quote."
              />
              <RateField
                label="Regional — minimum (AUD)"
                value={draft.regionalMinimumAud}
                onChange={setNum('regionalMinimumAud')}
                disabled={!canEdit}
                hint="Flat charge regardless of volume."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="House Move (Hourly)"
            subtitle="Customer is billed per hour with a minimum charge."
          >
            <FieldRow>
              <RateField
                label="Hourly rate (AUD)"
                value={draft.hourlyRateAud}
                onChange={setNum('hourlyRateAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Minimum hours"
                value={draft.minimumHours}
                onChange={setNum('minimumHours')}
                disabled={!canEdit}
                step="1"
                hint="Quotes for fewer hours are bumped up to this."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section title="Tax">
            <FieldRow>
              <RateField
                label="GST percent"
                value={draft.gstPercent}
                onChange={setNum('gstPercent')}
                disabled={!canEdit}
                step="0.1"
              />
            </FieldRow>
          </Section>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!isDirty || update.isPending}
          onClick={() => rates && setDraft(rates)}
        >
          Reset
        </Button>
        <Button
          className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1.5"
          disabled={!canEdit || !isDirty || update.isPending}
          onClick={handleSave}
        >
          <Save className="w-4 h-4" />
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <Card className="border-border shadow-none bg-muted/40">
        <CardContent className="p-4 flex items-start gap-3">
          <DollarSign className="w-5 h-5 text-rebel-accent shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">How quotes are calculated</p>
            <p>· <span className="font-semibold">Standard / White Glove + Metro</span> — cubic metres × metro rate.</p>
            <p>· <span className="font-semibold">Standard / White Glove + Regional</span> — flat regional minimum.</p>
            <p>· <span className="font-semibold">House Move</span> — max(estimated hours, minimum) × hourly rate.</p>
            <p>· GST is added on top of the subtotal at the percentage above.</p>
            <p>· A specific customer can override the metro per-cube and the hourly rate from their customer page.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function RateField({
  label,
  value,
  onChange,
  disabled,
  step = '0.01',
  hint,
}: {
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  step?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border" />;
}
