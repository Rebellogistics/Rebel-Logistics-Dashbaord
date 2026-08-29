import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

export const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(' ');

/* --------------------------------------------------------------------- */
/* Layout                                                                */
/* --------------------------------------------------------------------- */

export function Container({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cx('mx-auto w-full px-5 sm:px-8', wide ? 'max-w-[1400px]' : 'max-w-[1200px]', className)}>
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Reveal on scroll                                                      */
/* --------------------------------------------------------------------- */

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span' | 'header' | 'figure';
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.classList.add('is-in');
      cleanup();
    };
    const check = () => {
      if (done) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) reveal();
    };
    const cleanup = () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      clearTimeout(safety);
    };
    // Safety: never leave content stuck invisible if scroll events misbehave.
    const safety = window.setTimeout(reveal, 2500);
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return cleanup;
  }, []);
  return (
    // @ts-expect-error — dynamic tag
    <Tag ref={ref} className={cx('rl-reveal', className)} style={{ ['--rl-delay' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------------------- */
/* Kicker / eyebrow                                                      */
/* --------------------------------------------------------------------- */

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('rl-kicker inline-flex items-center gap-2.5', className)}>
      <span aria-hidden className="inline-block h-px w-6" style={{ background: 'var(--accent)' }} />
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------- */
/* Buttons                                                               */
/* --------------------------------------------------------------------- */

type ButtonVariant = 'gold' | 'ink' | 'light' | 'outline' | 'outlineLight' | 'ghost';
const VARIANTS: Record<ButtonVariant, string> = {
  // 'gold' kept as the primary key; now a confident near-black, no gold.
  gold: 'bg-[var(--ink)] text-white hover:bg-[var(--char-2)]',
  ink: 'bg-[var(--ink)] text-white hover:bg-[var(--char-2)]',
  light: 'bg-white text-[var(--ink)] hover:bg-white/90',
  outline: 'bg-transparent text-[var(--ink)] border border-[var(--line-2)] hover:border-[var(--ink)]',
  outlineLight: 'bg-transparent text-white border border-white/30 hover:border-white',
  ghost: 'bg-transparent text-[var(--ink)] hover:text-[var(--accent)]',
};

type CommonBtn = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  to?: string;
  href?: string;
};

export function Button({
  children,
  className,
  variant = 'gold',
  size = 'md',
  to,
  href,
  ...rest
}: CommonBtn & (ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>)) {
  const base = cx(
    'group relative inline-flex items-center justify-center gap-2 rounded-[2px] font-medium tracking-[0.005em]',
    'transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
    size === 'lg' ? 'h-[52px] px-9 text-[14px]' : 'h-[44px] px-6 text-[13.5px]',
    VARIANTS[variant],
    className,
  );
  const style = undefined;
  const inner = <>{children}</>;
  if (to) {
    return (
      <Link to={to} className={base} style={style} {...(rest as object)}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={base} style={style} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button className={base} style={style} {...rest}>
      {inner}
    </button>
  );
}

/* --------------------------------------------------------------------- */
/* Brand marquee                                                         */
/* --------------------------------------------------------------------- */

export function Marquee({ logos }: { logos: { name: string; file: string }[] }) {
  const row = [...logos, ...logos];
  return (
    <div className="rl-marquee relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{ background: 'linear-gradient(90deg, var(--paper), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{ background: 'linear-gradient(270deg, var(--paper), transparent)' }}
      />
      <div className="rl-marquee-track items-center py-2">
        {row.map((l, i) => (
          // Every mark is pre-fitted to one 500x170 box, so a fixed cell keeps
          // optical weight even and stops any logo being sliced at the edge.
          <span
            key={l.name + i}
            className="flex w-[150px] shrink-0 items-center justify-center px-3 sm:w-[190px] sm:px-5"
          >
            <img
              src={l.file}
              alt={`${l.name}, a Rebel Logistics client`}
              className="max-h-10 w-auto max-w-full object-contain opacity-65 transition-opacity duration-300 hover:opacity-100 sm:max-h-12"
              loading="lazy"
              draggable={false}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Photo rail — auto-scrolls right to left, uniform proportions          */
/* --------------------------------------------------------------------- */

export function PhotoRail({
  images,
  fade = 'var(--paper)',
  duration = '58s',
  size = 'md',
}: {
  images: string[];
  fade?: string;
  duration?: string;
  size?: 'md' | 'lg';
}) {
  // Three copies so the -50% translate never exposes a gap on wide screens.
  const row = [...images, ...images, ...images];
  const cell =
    size === 'lg'
      ? 'w-[320px] sm:w-[520px] lg:w-[600px]'
      : 'w-[260px] sm:w-[380px]';
  return (
    <div className="rl-marquee relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-28"
        style={{ background: `linear-gradient(90deg, ${fade}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-28"
        style={{ background: `linear-gradient(270deg, ${fade}, transparent)` }}
      />
      <div className="rl-marquee-track" style={{ ['--rl-marquee-dur' as string]: duration }}>
        {row.map((src, i) => (
          <div key={src + i} className={cx('aspect-[4/3] shrink-0 overflow-hidden', cell)}>
            <img
              src={src}
              alt="Rebel Logistics at work in Melbourne"
              loading="lazy"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Client names — typeset, not logos                                     */
/* --------------------------------------------------------------------- */

export function ClientNames({ names, tone = 'ink' }: { names: string[]; tone?: 'ink' | 'white' }) {
  const color = tone === 'white' ? 'text-white/70' : 'text-[var(--ink-soft)]';
  const div = tone === 'white' ? 'bg-white/20' : 'bg-[var(--line-2)]';
  return (
    <ul className={cx('flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-12', color)}>
      {names.map((n, i) => (
        <li key={n} className="flex items-center gap-8 sm:gap-12">
          <span className="text-[15px] font-medium uppercase tracking-[0.16em] sm:text-[16px]">{n}</span>
          {i < names.length - 1 && <span aria-hidden className={cx('hidden h-3 w-px sm:block', div)} />}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------------- */
/* Scroll-scrub hook — maps an element's scroll progress to 0..1         */
/* --------------------------------------------------------------------- */

export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        // 0 when the top hits the viewport top, 1 when the bottom reaches it
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return { ref, progress };
}

/* --------------------------------------------------------------------- */
/* Quote CTA behaviour                                                   */
/* --------------------------------------------------------------------- */

export const FORM_FOCUS_EVENT = 'rl:focus-form';

/**
 * Sends the visitor to the lead form. If this page already has one, scroll to
 * it and flash it so the destination is obvious; otherwise fall back to the
 * dedicated quote page. Returns true when it handled the click.
 */
export function goToQuoteForm(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById('quote-form');
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  window.dispatchEvent(new CustomEvent(FORM_FOCUS_EVENT));
  return true;
}

/** Primary "request a quote" action used inside page content. */
export function QuoteCTA({
  children = 'Request a quote',
  className,
  variant = 'ink',
  size = 'lg',
}: {
  children?: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
}) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={(e) => {
        if (goToQuoteForm()) e.preventDefault();
      }}
      href="/quote"
    >
      {children}
    </Button>
  );
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
