import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import type { Customer } from '@/lib/types';
import { useCustomers } from '@/hooks/useSupabaseData';
import { normalizePhone } from '@/hooks/useRepeatCustomer';
import { cn } from '@/lib/utils';
import { Search, Plus, Star, Building2, User as UserIcon } from 'lucide-react';

export interface CustomerComboboxProps {
  /** Plain-text query the user is typing. Lifted so the parent form can
   *  read it as the "fallback name" when no customer is picked. */
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks an existing customer from the dropdown.
   *  The form should auto-fill from this customer record. */
  onPick: (customer: Customer) => void;
  /** Fired when the user clears their selection (or types fresh after
   *  having picked one). The form should detach from the customer link. */
  onClearPick?: () => void;
  /** When set, shows a "Linked to X" badge above the input. */
  linkedCustomer?: Customer | null;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Phase 19: customer picker for the New Quote dialog.
 *
 * Behaves like a combobox over the existing customer book — type to filter
 * by name / company / phone, click a result to link the quote to that
 * customer record. If no result matches, the typed text is treated as a
 * brand-new customer (useCreateJob falls through to upsertCustomerByPhone
 * to create one when no customerId is supplied).
 */
export function CustomerCombobox({
  value,
  onChange,
  onPick,
  onClearPick,
  linkedCustomer,
  placeholder = 'Type a name, company, or phone…',
  autoFocus,
}: CustomerComboboxProps) {
  const { data: customers = [] } = useCustomers();
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // V4 2.7: rows now carry a `matchReason` so the dropdown can render a
  // little "matched: phone" chip — Yamin asked for trust signals after his
  // May 4 confusion about which customer record was being surfaced.
  type MatchReason = 'company' | 'contact' | 'phone' | 'email' | null;

  // Filter + sort the customer book by the typed query. VIPs first,
  // then most-recently-created. We cap to 8 results to keep the
  // dropdown finger-friendly on mobile.
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const qDigits = normalizePhone(value);
    const scored = customers
      .filter((c) => !c.deletedAt) // soft-deleted Phase 14 hides
      .map((c): { customer: Customer; score: number; reason: MatchReason } => {
        const company = (c.companyName ?? '').toLowerCase();
        const name = (c.name ?? '').toLowerCase();
        const email = (c.email ?? '').toLowerCase();
        const phoneDigits = c.phone ? normalizePhone(c.phone) : '';
        let score = 0;
        let reason: MatchReason = null;
        if (q) {
          const phoneMatch = qDigits.length >= 3 && phoneDigits.includes(qDigits);
          const companyMatch = company.includes(q);
          const nameMatch = name.includes(q);
          const emailMatch = email.includes(q);
          if (!phoneMatch && !companyMatch && !nameMatch && !emailMatch) {
            return { customer: c, score: -1, reason: null };
          }
          // First-match wins for the chip — order reflects what Yamin will
          // most often be searching by (company > contact > phone > email).
          reason = companyMatch
            ? 'company'
            : nameMatch
              ? 'contact'
              : phoneMatch
                ? 'phone'
                : 'email';
          if (company.startsWith(q)) score += 10;
          if (name.startsWith(q)) score += 10;
          if (qDigits && phoneDigits.startsWith(qDigits)) score += 5;
        }
        if (c.vip) score += 3;
        return { customer: c, score, reason };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (b.customer.createdAt ?? '').localeCompare(a.customer.createdAt ?? '');
      })
      .slice(0, 8);
    return scored;
  }, [customers, value]);

  const handleChange = (next: string) => {
    onChange(next);
    if (linkedCustomer) onClearPick?.();
    setIsOpen(true);
    setHighlight(0);
  };

  const handlePick = (customer: Customer) => {
    onPick(customer);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      const m = matches[highlight];
      if (m) handlePick(m.customer);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const showCreateNewHint = isOpen && value.trim().length > 0 && matches.length === 0;

  return (
    <div ref={containerRef} className="relative">
      {linkedCustomer && (
        <button
          type="button"
          onClick={() => onClearPick?.()}
          className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-rebel-accent-surface px-2 py-1 text-[11px] font-semibold text-rebel-accent hover:bg-rebel-accent hover:text-white transition-colors"
          title="Click to detach and start fresh"
        >
          <span className="inline-flex items-center gap-1">
            {linkedCustomer.companyName ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
            Linked to {linkedCustomer.companyName ?? linkedCustomer.name}
          </span>
          <span className="opacity-70">×</span>
        </button>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="pl-9"
        />
      </div>
      {isOpen && (matches.length > 0 || showCreateNewHint) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-rebel-border bg-card shadow-lg"
        >
          {matches.map(({ customer: c, reason }, idx) => {
            const primary = c.companyName ?? c.name;
            const secondary = [
              c.companyName ? `Contact: ${c.name}` : null,
              c.phone,
              c.email,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <li
                key={c.id}
                role="option"
                aria-selected={idx === highlight}
                onMouseDown={(e) => {
                  // mousedown beats input blur so the click registers before
                  // the dropdown closes from an onFocus loss.
                  e.preventDefault();
                  handlePick(c);
                }}
                onMouseEnter={() => setHighlight(idx)}
                className={cn(
                  'px-3 py-2 cursor-pointer flex items-center gap-2',
                  idx === highlight ? 'bg-rebel-accent-surface text-rebel-accent' : 'hover:bg-muted',
                )}
              >
                <span className="shrink-0">
                  {c.companyName ? (
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{primary}</p>
                    {c.vip && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                    )}
                    {reason && (
                      <span
                        className="ml-auto shrink-0 inline-flex items-center h-4 px-1.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold uppercase tracking-wider"
                        title={`Matched on ${reason}`}
                      >
                        {reason}
                      </span>
                    )}
                  </div>
                  {secondary && (
                    <p className="text-[11px] text-muted-foreground truncate">{secondary}</p>
                  )}
                </div>
              </li>
            );
          })}
          {showCreateNewHint && (
            <li className="px-3 py-2 inline-flex items-center gap-2 text-sm text-rebel-accent border-t border-rebel-border">
              <Plus className="w-3.5 h-3.5" />
              <span>
                No match — pressing <span className="font-semibold">Create quote</span> will add{' '}
                <span className="font-semibold">"{value.trim()}"</span> as a new customer.
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
