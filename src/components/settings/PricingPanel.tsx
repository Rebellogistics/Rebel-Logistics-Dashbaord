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
  const { data: rates, isLoading, isError, error, refetch } = usePricingRates();
  const update = useUpdatePricingRates();
  const [draft, setDraft] = useState<PricingRates>(DEFAULT_RATES);

  useEffect(() => {
    if (rates) setDraft(rates);
  }, [rates]);

  // Compare every figure rather than a hand-kept list: the rate book grew
  // from 5 figures to 30 in V7, and a forgotten line here silently disables
  // Save for that field.
  const isDirty =
    !!rates &&
    (Object.keys(rates) as Array<keyof PricingRates>).some(
      (k) => k !== 'updatedAt' && draft[k] !== rates[k],
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

  const setBool = (key: keyof PricingRates) => (checked: boolean) => {
    setDraft((d) => ({ ...d, [key]: checked } as PricingRates));
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-8 text-center">Loading rates…</p>;
  }

  // Never render the editor without the live rates. `draft` is seeded from
  // DEFAULT_RATES, so showing the form here would offer the first-install
  // seed values as if they were the current rate book — and saving would
  // overwrite the real rates with them.
  if (isError || !rates) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="text-sm font-semibold text-red-800">Couldn't load the current rates</p>
        <p className="text-xs text-red-800">
          The pricing editor stays hidden until the live rates load, so saving can't overwrite
          them with placeholder values.
        </p>
        {error instanceof Error && (
          <p className="text-[11px] text-red-700/80 font-mono break-words">{error.message}</p>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-base">Pricing</h3>
          <p className="text-xs text-muted-foreground">
            All rates below are <span className="font-semibold text-foreground">ex-GST</span>.
            GST is added on top of the subtotal at the percentage shown in the Tax section.
            These rates apply to every new quote — existing quotes keep their original price.
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
            title="Standard delivery"
            subtitle="Per-cube for metro jobs, flat minimum for regional jobs."
          >
            <FieldRow>
              <RateField
                label="Metro — per m³ (AUD ex-GST)"
                value={draft.metroPerCubeAud}
                onChange={setNum('metroPerCubeAud')}
                disabled={!canEdit}
                hint="Multiplied by the cubic-metres value on the quote."
              />
              <RateField
                label="Regional — minimum (AUD ex-GST)"
                value={draft.regionalMinimumAud}
                onChange={setNum('regionalMinimumAud')}
                disabled={!canEdit}
                hint="Flat charge regardless of volume."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="White Glove"
            subtitle="Its own rates, separate from Standard. Rubbish removal is carried in the White Glove rate up to the threshold in Additional services."
          >
            <FieldRow>
              <RateField
                label="Metro — per m³ (AUD ex-GST)"
                value={draft.wgMetroPerCubeAud}
                onChange={setNum('wgMetroPerCubeAud')}
                disabled={!canEdit}
                hint="Used when the quote's job type is White Glove + Metro."
              />
              <RateField
                label="Regional — minimum (AUD ex-GST)"
                value={draft.wgRegionalMinimumAud}
                onChange={setNum('wgRegionalMinimumAud')}
                disabled={!canEdit}
                hint="Used when the quote's job type is White Glove + Regional."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Hourly rate"
            subtitle="Billed per hour by truck, rounded up to the billing increment, then floored at the minimum."
          >
            <FieldRow>
              <RateField
                label="Standard truck — per hour (AUD ex-GST)"
                value={draft.hourlyRateAud}
                onChange={setNum('hourlyRateAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Large truck — per hour (AUD ex-GST)"
                value={draft.hourlyRateLargeAud}
                onChange={setNum('hourlyRateLargeAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Minimum hours"
                value={draft.minimumHours}
                onChange={setNum('minimumHours')}
                disabled={!canEdit}
                step="0.5"
                hint="Quotes for fewer hours are bumped up to this."
              />
              <RateField
                label="Billing increment (hours)"
                value={draft.billingIncrementHours}
                onChange={setNum('billingIncrementHours')}
                disabled={!canEdit}
                step="0.25"
                hint="Time rounds up to this before any minimum. 0.5 = half-hour blocks."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Labour"
            subtitle="Crew time on site with no truck. Both floors bite independently — a one-man hour still bills the minimum crew for the minimum hours."
          >
            <FieldRow>
              <RateField
                label="Per labourer, per hour (AUD ex-GST)"
                value={draft.labourPerHourAud}
                onChange={setNum('labourPerHourAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Minimum crew"
                value={draft.labourMinLabourers}
                onChange={setNum('labourMinLabourers')}
                disabled={!canEdit}
                step="1"
              />
              <RateField
                label="Minimum hours"
                value={draft.labourMinHours}
                onChange={setNum('labourMinHours')}
                disabled={!canEdit}
                step="0.5"
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Warehousing — storage"
            subtitle="Per m³ per month. Long term pays the tier rate; a short-term hold adds the uplift on top. Grace days come off the stay, the remainder rounds up to whole months, and volume rounds up to the next whole m³."
          >
            <FieldRow>
              <RateField
                label="Standard — per m³ / month"
                value={draft.storageStandardAud}
                onChange={setNum('storageStandardAud')}
                disabled={!canEdit}
              />
              <RateField
                label="High end — per m³ / month"
                value={draft.storageHighEndAud}
                onChange={setNum('storageHighEndAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Insurance added — per m³ / month"
                value={draft.storageInsuredAud}
                onChange={setNum('storageInsuredAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Short-term uplift (%)"
                value={draft.shortTermUpliftPct}
                onChange={setNum('shortTermUpliftPct')}
                disabled={!canEdit}
                step="1"
                hint="Added on top of whichever tier rate applies."
              />
              <RateField
                label="Free grace days"
                value={draft.storageGraceDays}
                onChange={setNum('storageGraceDays')}
                disabled={!canEdit}
                step="1"
                hint="Stock held this long or less is not charged storage."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Warehousing — container unload"
            subtitle="A service of its own, flat per container. Never multiplied by volume or term, and invoiced separately from anything stored."
          >
            <FieldRow>
              <RateField
                label="20 ft container (AUD ex-GST)"
                value={draft.container20ftAud}
                onChange={setNum('container20ftAud')}
                disabled={!canEdit}
              />
              <RateField
                label="40 ft container (AUD ex-GST)"
                value={draft.container40ftAud}
                onChange={setNum('container40ftAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Unload time included (hours)"
                value={draft.containerIncludedHours}
                onChange={setNum('containerIncludedHours')}
                disabled={!canEdit}
                step="0.5"
                hint="Beyond this is charged as warehouse labour."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Additional services"
            subtitle="What the pull-downs and tick-boxes on a job charge. Warehouse labour has no crew or hours floor by default — a single labourer for half an hour bills half an hour."
          >
            <FieldRow>
              <RateField
                label="Outbound warehouse — per labourer / hour"
                value={draft.whLabourOutboundAud}
                onChange={setNum('whLabourOutboundAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Quality control check — per labourer / hour"
                value={draft.whLabourQcAud}
                onChange={setNum('whLabourQcAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Additional unload labour — per labourer / hour"
                value={draft.whLabourUnloadAud}
                onChange={setNum('whLabourUnloadAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Warehouse labour — minimum crew"
                value={draft.whLabourMinCrew}
                onChange={setNum('whLabourMinCrew')}
                disabled={!canEdit}
                step="1"
                hint="0 = no floor."
              />
              <RateField
                label="Warehouse labour — minimum hours"
                value={draft.whLabourMinHours}
                onChange={setNum('whLabourMinHours')}
                disabled={!canEdit}
                step="0.5"
                hint="0 = no floor."
              />
            </FieldRow>

            <FieldRow>
              <RateField
                label="Rubbish — standard van load"
                value={draft.disposalVanAud}
                onChange={setNum('disposalVanAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Rubbish — trailer load"
                value={draft.disposalTrailerAud}
                onChange={setNum('disposalTrailerAud')}
                disabled={!canEdit}
              />
              <RateField
                label="Transport fee — van or trailer"
                value={draft.disposalTransportAud}
                onChange={setNum('disposalTransportAud')}
                disabled={!canEdit}
                hint="Charged on top of the load, on every disposal."
              />
              <RateField
                label="Transport fee — larger load"
                value={draft.disposalTransportLargeAud}
                onChange={setNum('disposalTransportLargeAud')}
                disabled={!canEdit}
                hint="A larger load's disposal charge is measured at the end of the job."
              />
              <RateField
                label="White Glove — rubbish included up to (m³)"
                value={draft.wgDisposalThresholdM3}
                onChange={setNum('wgDisposalThresholdM3')}
                disabled={!canEdit}
                step="0.5"
                hint="Removal is in the White Glove rate below this; past it, it can be charged."
              />
            </FieldRow>
          </Section>

          <Divider />

          <Section
            title="Fuel levy"
            subtitle="Transport only — never labour, storage, disposal or packaging. A quote captures whether it applied at the moment it was raised, so a levied quote stays levied after you switch this off."
          >
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <input
                id="fuelLevyOn"
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-rebel-accent"
                checked={draft.fuelLevyOn}
                onChange={(e) => setBool('fuelLevyOn')(e.target.checked)}
                disabled={!canEdit}
              />
              <div>
                <Label htmlFor="fuelLevyOn" className="text-xs font-medium cursor-pointer">
                  Apply the fuel levy to new quotes
                </Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Off while fuel is normal, on to recover a price rise. Turning it off does not
                  strip the levy from quotes already raised.
                </p>
              </div>
            </div>
            <FieldRow>
              <RateField
                label="Fuel levy (%)"
                value={draft.fuelLevyPct}
                onChange={setNum('fuelLevyPct')}
                disabled={!canEdit}
                step="0.5"
                hint="Set it ready and leave the switch off until fuel actually moves."
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
            <p>· <span className="font-semibold">Standard / White Glove</span> — the delivery postcode decides the zone. Metro bills cubic metres × the per-m³ rate; regional is the flat minimum and ignores volume.</p>
            <p>· <span className="font-semibold">Hourly rate</span> — time rounds up to the billing increment, then floors at the minimum, at the rate for the truck used.</p>
            <p>· <span className="font-semibold">Labour</span> — crew × hours × the labourer rate, with both floors applied independently.</p>
            <p>· <span className="font-semibold">Warehousing</span> — storage by tier and term, container unload flat per container, or warehouse labour by the hour. Each is its own service and its own invoice.</p>
            <p>· <span className="font-semibold">Extras</span> — rubbish disposal and packaging materials tick onto the job that created them. Standard deliveries have neither; White Glove carries rubbish removal in its rate up to the threshold above.</p>
            <p>· <span className="font-semibold">Fuel levy</span> — charged on the transport portion only, and never on labour, storage, disposal or packaging.</p>
            <p>· GST is added on top of the subtotal at the percentage above.</p>
            <p>· A specific customer can override the metro per-cube and the hourly rate from their customer page — applies to whatever type they book.</p>
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
