import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertCustomerByPhone } from '@/lib/customerUpsert';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { format } from 'date-fns';
import { ArrowDown, ArrowRight, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { BUSINESS } from './data';
import { cx, FORM_FOCUS_EVENT } from './ui';
import type { JobType } from '@/lib/types';

const SERVICE_OPTIONS: { label: string; jobType: JobType }[] = [
  { label: 'Delivery & installation', jobType: 'White Glove' },
  { label: 'Warehousing & storage', jobType: 'Standard' },
  { label: 'House / office relocation', jobType: 'House Move' },
  { label: 'Labour & assembly', jobType: 'Standard' },
  { label: 'Something else', jobType: 'Standard' },
];

const initial = {
  name: '',
  phone: '',
  email: '',
  pickup: '',
  delivery: '',
  service: SERVICE_OPTIONS[0].label,
  details: '',
};

type State = 'idle' | 'submitting' | 'success' | 'error';

export function LeadForm({
  compact = false,
  defaultService,
}: {
  compact?: boolean;
  /** Pre-selects the enquiry type, e.g. on a service page. */
  defaultService?: string;
}) {
  const [form, setForm] = useState({ ...initial, service: defaultService ?? initial.service });
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  // Highlight only when a CTA sent the visitor here, never on its own.
  useEffect(() => {
    const onFocus = () => {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 2600);
    };
    window.addEventListener(FORM_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(FORM_FOCUS_EVENT, onFocus);
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = Boolean(
    form.name.trim() && form.phone.trim() && form.pickup.trim() && state !== 'submitting',
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // The control stays live and explains what is missing. A pre-disabled
    // primary action reads as broken and costs conversions.
    if (!canSubmit) {
      if (state !== 'submitting') {
        const missing = [
          !form.name.trim() && 'your name',
          !form.phone.trim() && 'a phone number',
          !form.pickup.trim() && 'a pickup address',
        ].filter(Boolean);
        setError(`We still need ${missing.join(', ')}.`);
        setState('error');
      }
      return;
    }
    setState('submitting');
    setError('');
    const jobType = SERVICE_OPTIONS.find((s) => s.label === form.service)?.jobType ?? 'Standard';
    const notes = [
      `Enquiry: ${form.service}`,
      form.details.trim() && `Details: ${form.details.trim()}`,
      form.email.trim() && `Email: ${form.email.trim()}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      const customerId = await upsertCustomerByPhone({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        source: 'website',
      });
      const { error: err } = await supabase.from('jobs').insert([
        {
          id: `RL-${Date.now().toString(36).toUpperCase()}`,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_id: customerId,
          pickup_address: form.pickup.trim(),
          delivery_address: form.delivery.trim() || form.pickup.trim(),
          type: jobType,
          status: 'Quote',
          date: format(new Date(), 'yyyy-MM-dd'),
          fee: 0,
          fuel_levy: 0,
          gst_amount: 0,
          pricing_type: 'fixed',
          notes: notes || null,
        } as never,
      ]);
      if (err) throw err;
      setState('success');
      setForm({ ...initial });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_24px_60px_-28px_rgba(22,20,15,0.4)]">
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ink)]">
            <Check className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <h3 className="rl-display mt-7 text-[1.9rem] text-[var(--ink)]">Thank you.</h3>
          <p className="mt-4 max-w-sm text-[15px] font-light leading-relaxed text-[var(--ink-soft)]">
            Your enquiry is with our team. We'll be in touch shortly, usually the same business day, with a
            considered plan and a clear price.
          </p>
          <button
            onClick={() => setState('idle')}
            className="mt-7 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] underline underline-offset-4 hover:text-[var(--accent)]"
          >
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cx(
        'overflow-hidden rounded-[3px] bg-white transition-all duration-500',
        // The form must not read as another paper panel on a paper page.
        flash
          ? 'shadow-[0_0_0_3px_rgba(107,39,51,0.16),0_30px_70px_-28px_rgba(22,20,15,0.45)]'
          : 'shadow-[0_24px_60px_-28px_rgba(22,20,15,0.4),0_2px_8px_-2px_rgba(22,20,15,0.08)]',
      )}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 bg-[var(--ink)] px-5 py-4 sm:px-7">
        <p className="rl-kicker text-white">Request a quote</p>
        <p className="hidden text-[12px] font-light text-white/60 sm:block">Takes about a minute</p>
      </div>

      {/* Only shown when a CTA brought the visitor here */}
      <div
        className="grid transition-all duration-500 ease-out"
        style={{ gridTemplateRows: flash ? '1fr' : '0fr' }}
        aria-live="polite"
      >
        <div className="overflow-hidden">
          <p className="flex items-center gap-2.5 border-b border-[var(--accent)] bg-[var(--accent)] px-5 py-3.5 text-[13.5px] font-medium text-white sm:px-7">
            <ArrowDown className="h-4 w-4 shrink-0" strokeWidth={2} />
            Fill in the form and we'll get back to you, usually the same business day.
          </p>
        </div>
      </div>

      <div className={cx('px-5 sm:px-7', compact ? 'py-6' : 'py-7')}>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              className={inputCls}
            />
          </Field>
          <Field label="Phone" required>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="04xx xxx xxx"
              inputMode="tel"
              autoComplete="tel"
              className={inputCls}
            />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@studio.com"
              type="email"
              autoComplete="email"
              className={inputCls}
            />
          </Field>

          <Field label="What can we help with?" className="sm:col-span-2">
            <div className="relative">
              <select
                value={form.service}
                onChange={(e) => set('service', e.target.value)}
                className={cx(inputCls, 'appearance-none pr-10')}
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s.label} value={s.label}>{s.label}</option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]"
                strokeWidth={1.7}
              />
            </div>
          </Field>

          <Field label="Pickup" required>
            <AddressAutocomplete
              value={form.pickup}
              onChange={(v) => set('pickup', v)}
              placeholder="Showroom, warehouse or address"
              className={inputCls}
            />
          </Field>
          <Field label="Delivery">
            <AddressAutocomplete
              value={form.delivery}
              onChange={(v) => set('delivery', v)}
              placeholder="Where it's going"
              className={inputCls}
            />
          </Field>

          <Field label="Anything we should know?" className="sm:col-span-2">
            <textarea
              value={form.details}
              onChange={(e) => set('details', e.target.value)}
              placeholder="What you're moving, access, timing, fragile pieces"
              rows={2}
              className={cx(inputCls, 'h-auto resize-none py-2.5 leading-relaxed')}
            />
          </Field>
        </div>

        {state === 'error' && (
          <p className="mt-6 border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-4 py-3 text-[13px] text-[var(--ink)]">
            {error || 'Please try again'}{' '}Or call{' '}
            <a href={`tel:${BUSINESS.phoneIntl}`} className="font-semibold underline">
              {BUSINESS.phone}
            </a>
            .
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-[var(--line)] bg-[#FBFAF7] px-5 py-4 sm:px-7">
        <button
          type="submit"
          aria-busy={state === 'submitting'}
          className="group flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[2px] bg-[var(--ink)] text-[14.5px] font-medium tracking-[0.01em] text-white transition-colors hover:bg-[var(--char-2)]"
        >
          {state === 'submitting' ? 'Sending your enquiry' : 'Request my quote'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.7} />
        </button>
        <p className="mt-3.5 flex items-center justify-center gap-2 text-[12px] font-light text-[var(--ink-faint)]">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
          No obligation. Your details stay with us.
        </p>
      </div>
    </form>
  );
}

/* Filled, hairline-bordered fields. Quiet enough for the world, solid enough
   to read as something you type into. */
const inputCls =
  'h-[46px] w-full rounded-[2px] border border-[var(--line-2)] bg-[#F7F5F0] px-3.5 text-[15px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--ink)] focus:bg-white';

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]">*</span>}
      </span>
      {children}
    </label>
  );
}
