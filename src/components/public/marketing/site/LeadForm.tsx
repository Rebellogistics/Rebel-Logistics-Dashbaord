import { useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertCustomerByPhone } from '@/lib/customerUpsert';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { format } from 'date-fns';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { BUSINESS } from './data';
import { cx } from './ui';
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

export function LeadForm({ compact = false }: { compact?: boolean }) {
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    form.name.trim() && form.phone.trim() && form.pickup.trim() && state !== 'submitting';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
      <div className="border border-[var(--line-2)] bg-[var(--paper)]">
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
    <form onSubmit={submit} className="border border-[var(--line-2)] bg-[var(--paper)]">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--line-2)] px-6 py-4 sm:px-8">
        <p className="rl-kicker text-[var(--ink)]">Request a quote</p>
        <p className="hidden text-[12px] font-light text-[var(--ink-faint)] sm:block">
          Takes about a minute
        </p>
      </div>

      <div className={cx('px-6 sm:px-8', compact ? 'py-7' : 'py-9')}>
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
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
            <div className="flex flex-wrap gap-2 pt-1">
              {SERVICE_OPTIONS.map((s) => {
                const on = form.service === s.label;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => set('service', s.label)}
                    className={cx(
                      'rounded-[2px] border px-3.5 py-2 text-[13px] transition-colors',
                      on
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                        : 'border-[var(--line-2)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
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
              rows={compact ? 2 : 3}
              className={cx(inputCls, 'h-auto resize-none py-2')}
            />
          </Field>
        </div>

        {state === 'error' && (
          <p className="mt-6 border-l-2 border-[var(--accent)] bg-[var(--paper-2)] px-4 py-3 text-[13px] text-[var(--ink)]">
            We couldn't send that. {error || 'Please try again'}, or call{' '}
            <a href={`tel:${BUSINESS.phoneIntl}`} className="font-semibold underline">
              {BUSINESS.phone}
            </a>
            .
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-[var(--line-2)] px-6 py-5 sm:px-8">
        <button
          type="submit"
          disabled={!canSubmit}
          className="group flex h-[56px] w-full items-center justify-center gap-2.5 rounded-[2px] bg-[var(--ink)] text-[14.5px] font-medium tracking-[0.01em] text-white transition-colors hover:bg-[var(--char-2)] disabled:cursor-not-allowed disabled:opacity-40"
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

/* Underline fields: quieter and more considered than boxed inputs. */
const inputCls =
  'h-11 w-full border-0 border-b border-[var(--line-2)] bg-transparent px-0 text-[15.5px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-faint)]/70 focus:border-[var(--ink)] focus:ring-0';

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
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-faint)]">
        {label}
        {required && <span className="ml-1 text-[var(--accent)]">*</span>}
      </span>
      {children}
    </label>
  );
}
