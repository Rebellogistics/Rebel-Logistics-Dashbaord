import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, Command, Truck, User, MessageSquare, CornerDownLeft } from 'lucide-react';
import { Job, Customer, SmsLogEntry } from '@/lib/types';
import {
  SearchResult,
  SearchResultKind,
  SearchScope as ScopeType,
  useSearch,
} from '@/hooks/useSearch';
import { CustomerAvatar } from '@/components/customers/CustomerAvatar';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

export type SearchScope = ScopeType;

interface SearchBarProps {
  jobs: Job[];
  customers: Customer[];
  smsLog: SmsLogEntry[];
  scope: SearchScope;
  onSelect?: (result: SearchResult) => void;
}

const PLACEHOLDER: Record<SearchScope, string> = {
  all: 'Search jobs, customers, SMS…',
  jobs: 'Search jobs by name, address, receipt…',
  customers: 'Search customers by name, phone, email…',
  sms: 'Search SMS by recipient or body…',
  none: '',
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  customer: 'Customers',
  job: 'Jobs',
  sms: 'SMS',
};

export function SearchBar({ jobs, customers, smsLog, scope, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { results, byKind, total } = useSearch({ query, jobs, customers, smsLog, scope, limit: 12 });

  // Flat ordered list for keyboard nav
  const flat: SearchResult[] = useMemo(() => {
    const order: SearchResultKind[] = ['customer', 'job', 'sms'];
    const out: SearchResult[] = [];
    for (const k of order) out.push(...byKind[k]);
    return out;
  }, [byKind]);

  // ⌘K / Ctrl+K focuses the input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query, scope]);

  const handleSelect = (r: SearchResult) => {
    onSelect?.(r);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && flat[activeIndex]) {
      e.preventDefault();
      handleSelect(flat[activeIndex]);
    }
  };

  const showEmpty = open && query.trim().length === 0 && flat.length === 0;
  const showRecent = open && query.trim().length === 0 && flat.length > 0;

  return (
    <div ref={wrapRef} className="relative w-full max-w-[460px]">
      <label className="group relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rebel-text-tertiary group-focus-within:text-rebel-accent transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER[scope]}
          className="w-full h-10 pl-10 pr-16 rounded-xl bg-muted border border-transparent focus:border-rebel-accent focus:bg-card text-[12.5px] text-rebel-text placeholder:text-rebel-text-tertiary outline-none transition-all"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md bg-card border border-rebel-border text-[10px] font-mono text-rebel-text-tertiary">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </label>

      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-popover border border-rebel-border shadow-popover overflow-hidden z-50">
          {/* Scope hint header */}
          <div className="px-4 py-2.5 border-b border-rebel-border flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
            <span>{scope === 'all' ? 'Searching everywhere' : `Searching ${scope}`}</span>
            <span>{total > 0 ? `${total} ${total === 1 ? 'result' : 'results'}` : ''}</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {showEmpty ? (
              <EmptyState scope={scope} />
            ) : (
              <div className="p-2">
                {showRecent && (
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
                    Recent
                  </p>
                )}
                {(['customer', 'job', 'sms'] as SearchResultKind[]).map((k) => {
                  const group = byKind[k];
                  if (group.length === 0) return null;
                  return (
                    <div key={k} className="mb-1.5 last:mb-0">
                      {!showRecent && (
                        <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-rebel-text-tertiary">
                          {KIND_LABEL[k]} · {group.length}
                        </p>
                      )}
                      {group.map((r) => {
                        const flatIndex = flat.indexOf(r);
                        return (
                          <ResultRow
                            key={r.id}
                            result={r}
                            active={flatIndex === activeIndex}
                            onClick={() => handleSelect(r)}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-rebel-border flex items-center justify-between text-[10px] text-rebel-text-tertiary">
            <span className="flex items-center gap-3">
              <KbdHint label="↑↓">navigate</KbdHint>
              <KbdHint label="↵">select</KbdHint>
              <KbdHint label="esc">close</KbdHint>
            </span>
            <span>Rebel search</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  result,
  active,
  onClick,
  onMouseEnter,
}: {
  result: SearchResult;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/60',
      )}
    >
      <ResultIcon result={result} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-rebel-text truncate">{result.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
      </div>
      {result.kind === 'job' && result.job ? (
        <StatusPill status={result.job.status} size="xs" />
      ) : (
        <span className="text-[10px] text-rebel-text-tertiary uppercase tracking-wider font-bold shrink-0">
          {result.meta}
        </span>
      )}
      {active && <CornerDownLeft className="w-3 h-3 text-rebel-text-tertiary shrink-0" />}
    </button>
  );
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.customer) {
    return <CustomerAvatar customer={result.customer} size="sm" />;
  }
  if (result.kind === 'job') {
    return (
      <div className="h-8 w-8 rounded-lg bg-rebel-accent-surface flex items-center justify-center shrink-0">
        <Truck className="w-4 h-4 text-rebel-accent" />
      </div>
    );
  }
  if (result.kind === 'sms') {
    return (
      <div className="h-8 w-8 rounded-lg bg-rebel-warning-surface flex items-center justify-center shrink-0">
        <MessageSquare className="w-4 h-4 text-rebel-warning" />
      </div>
    );
  }
  return (
    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <User className="w-4 h-4 text-rebel-text-tertiary" />
    </div>
  );
}

function EmptyState({ scope }: { scope: SearchScope }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
        <Search className="w-5 h-5 text-rebel-text-tertiary" />
      </div>
      <p className="mt-3 text-[13px] font-semibold text-rebel-text">
        {scope === 'all' ? 'Nothing here yet' : `No ${scope} to search`}
      </p>
      <p className="mt-1 text-[11px] text-rebel-text-tertiary">
        Start typing to find {scope === 'all' ? 'jobs, customers, or SMS' : scope}.
      </p>
    </div>
  );
}

function KbdHint({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded bg-card border border-rebel-border font-mono text-[9px] text-rebel-text-secondary">
        {label}
      </kbd>
      {children}
    </span>
  );
}
