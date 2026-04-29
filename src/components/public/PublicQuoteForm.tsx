import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertCustomerByPhone } from '@/lib/customerUpsert';
import { JobLocation, JobType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Phone, Mail, MapPin, Package, Sparkles, Info, DollarSign } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { format } from 'date-fns';
import { useRepeatCustomerLookup, type RepeatCustomerInfo } from '@/hooks/useRepeatCustomer';
import { usePricingRates } from '@/hooks/usePricingRates';
import { calculateQuote, formatAud } from '@/lib/pricing';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const initial = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  pickupAddress: '',
  deliveryAddress: '',
  type: 'Standard' as JobType,
  location: 'Metro' as JobLocation,
  cubicMetres: '',
  estimatedHours: '',
  preferredDate: '',
  itemDescription: '',
  notes: '',
};

function useIsEmbed(): boolean {
  const [embed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  });
  return embed;
}

export function PublicQuoteForm() {
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [nameTouched, setNameTouched] = useState(false);
  const isEmbed = useIsEmbed();
  const { data: rates } = usePricingRates();

  const { info: repeatInfo } = useRepeatCustomerLookup(form.customerPhone);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Auto-fill name when a repeat customer is detected and the user hasn't
  // typed a name of their own yet.
  useEffect(() => {
    if (repeatInfo.found && repeatInfo.customerName && !nameTouched && !form.customerName) {
      setForm((prev) => ({ ...prev, customerName: repeatInfo.customerName! }));
    }
  }, [repeatInfo, nameTouched, form.customerName]);

  // Default estimated hours to the minimum when picking House Move.
  useEffect(() => {
    if (form.type === 'House Move' && rates && !form.estimatedHours) {
      setForm((prev) => ({ ...prev, estimatedHours: String(rates.minimumHours) }));
    }
  }, [form.type, rates, form.estimatedHours]);

  const isHouseMove = form.type === 'House Move';
  const isMetro = !isHouseMove && form.location === 'Metro';
  const isRegional = !isHouseMove && form.location === 'Regional';

  const breakdown = rates
    ? calculateQuote({
        type: form.type,
        location: form.location,
        cubicMetres: parseFloat(form.cubicMetres) || 0,
        estimatedHours: parseFloat(form.estimatedHours) || 0,
        rates,
        overrideMetroRate: repeatInfo.overrideMetroRate,
        overrideHourlyRate: repeatInfo.overrideHourlyRate,
      })
    : null;

  const canSubmit =
    form.customerName.trim() &&
    form.customerPhone.trim() &&
    form.pickupAddress.trim() &&
    form.deliveryAddress.trim() &&
    state !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !rates) return;
    setState('submitting');
    setErrorMessage('');

    const dateToUse = form.preferredDate?.trim() || format(new Date(), 'yyyy-MM-dd');

    const notesCombined = [
      form.itemDescription.trim() && `Items: ${form.itemDescription.trim()}`,
      form.customerEmail.trim() && `Email: ${form.customerEmail.trim()}`,
      form.notes.trim() && `Notes: ${form.notes.trim()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const customerId = await upsertCustomerByPhone({
        name: form.customerName.trim(),
        phone: form.customerPhone.trim(),
        email: form.customerEmail.trim() || undefined,
        source: 'website',
      });

      const { error } = await supabase.from('jobs').insert([
        {
          id: `RL-${Date.now().toString(36).toUpperCase()}`,
          customer_name: form.customerName.trim(),
          customer_phone: form.customerPhone.trim(),
          customer_id: customerId,
          pickup_address: form.pickupAddress.trim(),
          delivery_address: form.deliveryAddress.trim(),
          type: form.type,
          status: 'Quote',
          date: dateToUse,
          fee: breakdown?.subtotal ?? 0,
          fuel_levy: 0,
          gst_amount: breakdown?.gst ?? 0,
          location: isHouseMove ? null : form.location,
          cubic_metres: isMetro ? parseFloat(form.cubicMetres) || 0 : null,
          pricing_type: isHouseMove ? 'hourly' : 'fixed',
          hourly_rate: isHouseMove ? breakdown?.hourlyRate ?? rates.hourlyRateAud : null,
          hours_estimated: isHouseMove ? breakdown?.billedHours ?? rates.minimumHours : null,
          notes: notesCombined || null,
        } as any,
      ]);

      if (error) throw error;

      setState('success');
      setForm({ ...initial });
    } catch (err) {
      console.error(err);
      const message = extractErrorMessage(err);
      setErrorMessage(message);
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <SuccessScreen
        onReset={() => {
          setState('idle');
        }}
        isEmbed={isEmbed}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-background flex flex-col font-sans text-rebel-text overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(45,91,255,0.35), transparent 65%)' }}
      />
      {!isEmbed && <Header />}

      <main className="relative flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full bg-rebel-accent-surface text-rebel-accent text-[10px] font-bold uppercase tracking-wider mb-3">
            Free quote
          </span>
          <h2 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-rebel-text leading-[1.05]">
            Tell us what you're moving
          </h2>
          <p className="text-[13px] text-muted-foreground mt-2.5 max-w-md">
            Fill in the details below for an instant indicative price. We'll review and confirm shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section icon={Phone} title="Your details">
            <Grid2>
              <Field label="Full name" required>
                <Input
                  value={form.customerName}
                  onChange={(e) => {
                    setNameTouched(true);
                    update('customerName', e.target.value);
                  }}
                  placeholder="Jane Smith"
                  className="h-11"
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone" required>
                <Input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => update('customerPhone', e.target.value)}
                  placeholder="04xx xxx xxx"
                  className="h-11"
                  autoComplete="tel"
                />
              </Field>
            </Grid2>
            <RepeatCustomerBanner info={repeatInfo} />
            <Field label="Email">
              <Input
                type="email"
                value={form.customerEmail}
                onChange={(e) => update('customerEmail', e.target.value)}
                placeholder="optional"
                className="h-11"
                autoComplete="email"
              />
            </Field>
          </Section>

          <Section icon={MapPin} title="Where & when">
            <Field label="Pickup address" required>
              <Input
                value={form.pickupAddress}
                onChange={(e) => update('pickupAddress', e.target.value)}
                placeholder="123 Smith St, Footscray VIC 3011"
                className="h-11"
                autoComplete="street-address"
              />
            </Field>
            <Field label="Delivery address" required>
              <Input
                value={form.deliveryAddress}
                onChange={(e) => update('deliveryAddress', e.target.value)}
                placeholder="456 Sydney Rd, Brunswick VIC 3056"
                className="h-11"
              />
            </Field>
            <Grid2>
              <Field label="Job type">
                <select
                  value={form.type}
                  onChange={(e) => update('type', e.target.value as JobType)}
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Standard">Standard delivery</option>
                  <option value="White Glove">White Glove</option>
                  <option value="House Move">House move (hourly)</option>
                </select>
              </Field>
              <Field label="Preferred date">
                <Input
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => update('preferredDate', e.target.value)}
                  className="h-11"
                />
              </Field>
            </Grid2>
          </Section>

          <Section icon={Package} title={isHouseMove ? 'Job details' : 'What are we moving?'}>
            {!isHouseMove && (
              <>
                <Field label="Location">
                  <ToggleRow
                    options={[
                      { value: 'Metro', label: 'Melbourne metro' },
                      { value: 'Regional', label: 'Regional VIC' },
                    ]}
                    value={form.location}
                    onChange={(v) => update('location', v as JobLocation)}
                  />
                </Field>
                {isMetro ? (
                  <Field
                    label="Approximate volume (m³)"
                    hint="Roughly how many cubic metres of items? A queen mattress is ~1m³, a standard fridge ~1m³."
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      value={form.cubicMetres}
                      onChange={(e) => update('cubicMetres', e.target.value)}
                      placeholder="e.g. 2"
                      className="h-11"
                    />
                  </Field>
                ) : (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Regional jobs use a flat minimum charge of {rates ? formatAud(rates.regionalMinimumAud) : '—'} +GST.
                  </div>
                )}
                <Field label="Items">
                  <textarea
                    value={form.itemDescription}
                    onChange={(e) => update('itemDescription', e.target.value)}
                    placeholder="e.g. 1 fridge, 1 queen bed, 10 boxes"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </Field>
              </>
            )}

            {isHouseMove && rates && (
              <>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground inline-flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  House moves are charged hourly at <span className="font-semibold text-foreground mx-1">{formatAud(rates.hourlyRateAud)}/hr +GST</span> with a {rates.minimumHours}-hour minimum.
                </div>
                <Field
                  label={`Estimated hours (min ${rates.minimumHours})`}
                  hint={`We'll bill the actual time on site. Quotes for fewer than ${rates.minimumHours} hours are bumped up to the minimum.`}
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
                      }
                    }}
                    className="h-11"
                  />
                </Field>
                <Field label="Job description">
                  <textarea
                    value={form.itemDescription}
                    onChange={(e) => update('itemDescription', e.target.value)}
                    placeholder="e.g. 3-bedroom apartment, second floor with lift, two flights of stairs at delivery, fragile artwork…"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </Field>
              </>
            )}

            <Field label="Anything else we should know?">
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Access, stairs, time windows, special handling…"
                rows={2}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>
          </Section>

          {breakdown && breakdown.subtotal > 0 && (
            <Card className="border-rebel-accent/30 bg-rebel-accent-surface shadow-none">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 pb-2 border-b border-rebel-accent/20">
                  <DollarSign className="w-4 h-4 text-rebel-accent" />
                  <h3 className="font-bold text-sm text-rebel-accent">Indicative price</h3>
                </div>
                <div className="text-xs space-y-1 pt-3">
                  <div className="flex justify-between">
                    <span className="text-rebel-accent/80">{breakdown.explainer}</span>
                    <span className="font-semibold text-rebel-accent">{formatAud(breakdown.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rebel-accent/80">GST ({rates?.gstPercent ?? 10}%)</span>
                    <span className="font-semibold text-rebel-accent">{formatAud(breakdown.gst)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-rebel-accent/20">
                    <span className="font-semibold text-rebel-accent">Total inc. GST</span>
                    <span className="font-bold text-base text-rebel-accent">{formatAud(breakdown.total)}</span>
                  </div>
                </div>
                <p className="text-[10px] text-rebel-accent/70 mt-2">
                  Indicative only. We'll confirm the final price after reviewing your details.
                </p>
              </CardContent>
            </Card>
          )}

          {state === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <p className="font-semibold">Couldn't submit your request</p>
              <p className="text-xs mt-1">
                {errorMessage || 'Please try again, or call us directly if the problem persists.'}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 bg-rebel-accent hover:bg-rebel-accent-hover text-white text-[14px] font-semibold shadow-[0_12px_28px_-12px_rgba(45,91,255,0.55)]"
          >
            {state === 'submitting' ? 'Sending…' : 'Request my quote'}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            By submitting you agree to be contacted about your quote. We do not share your details with anyone.
          </p>
        </form>
      </main>

      {!isEmbed && <Footer />}
    </div>
  );
}

function Header() {
  return (
    <header className="relative glass border-b border-rebel-border z-10">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
        <Logo variant="full" height={44} className="max-h-[44px]" />
        <div className="leading-none ml-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-rebel-text-tertiary mt-1">
            Melbourne · Deliveries · Moves · White-glove
          </p>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card py-6 mt-8">
      <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <p>© {new Date().getFullYear()} Rebel Logistics</p>
        <div className="flex items-center gap-3">
          <a href="tel:" className="flex items-center gap-1 hover:text-foreground">
            <Phone className="w-3 h-3" /> Call us
          </a>
          <a href="mailto:" className="flex items-center gap-1 hover:text-foreground">
            <Mail className="w-3 h-3" /> Email
          </a>
        </div>
      </div>
    </footer>
  );
}

function SuccessScreen({ onReset, isEmbed }: { onReset: () => void; isEmbed?: boolean }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isEmbed && <Header />}
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border shadow-none bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Thanks, we've got your request</h2>
            <p className="text-sm text-muted-foreground">
              We'll review your job and get back to you shortly with a final price. Usually within a couple of hours during business hours.
            </p>
            <Button variant="outline" onClick={onReset} className="mt-2">
              Submit another request
            </Button>
          </CardContent>
        </Card>
      </main>
      {!isEmbed && <Footer />}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Phone;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border shadow-none bg-card">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="w-7 h-7 rounded-lg bg-rebel-accent-surface flex items-center justify-center">
            <Icon className="w-4 h-4 text-rebel-accent" />
          </div>
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
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
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && (
          <span
            tabIndex={0}
            role="img"
            aria-label={hint}
            title={hint}
            className="inline-flex items-center justify-center text-muted-foreground/70 cursor-help"
          >
            <Info className="w-3 h-3" />
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function ToggleRow({
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
            className={`flex-1 h-11 rounded-lg border text-sm font-semibold transition-colors ${
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

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const anyErr = err as { message?: string; details?: string; hint?: string; code?: string };
    if (anyErr.message) return anyErr.message;
    if (anyErr.details) return anyErr.details;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

function RepeatCustomerBanner({ info }: { info: RepeatCustomerInfo }) {
  if (!info.found) return null;
  const name = info.customerName ?? 'there';
  const count = info.jobCount ?? 0;
  return (
    <div className="rounded-lg bg-rebel-accent-surface border border-rebel-accent/30 p-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-rebel-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-rebel-accent">Welcome back, {name}!</p>
        <p className="text-xs text-rebel-accent mt-0.5">
          We've moved for you {count} time{count === 1 ? '' : 's'} before
          {info.lastPickup ? `. Last pickup: ${info.lastPickup}` : ''}.
        </p>
      </div>
    </div>
  );
}
