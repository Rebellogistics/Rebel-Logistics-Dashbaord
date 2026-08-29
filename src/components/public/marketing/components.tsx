import { Link } from 'react-router-dom';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

const SUPPORT_PHONE =
  (import.meta.env.VITE_REBEL_SUPPORT_PHONE as string | undefined) ?? '+61 420 411 168';

type BaseProps = {
  children: ReactNode;
  className?: string;
};

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const BUTTON_BASE =
  'inline-flex items-center justify-center font-mono text-[16px] leading-none tracking-[0.24px] rounded-[10px] px-[25.6px] py-[19.2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ghost-white)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-midnight-oil)] disabled:opacity-50 disabled:pointer-events-none';

type ButtonAnchorProps = (
  | (ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined; to?: undefined })
  | (AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; to?: undefined })
  | { to: string; children?: ReactNode; className?: string }
);

function renderButtonish(extra: string, props: ButtonAnchorProps) {
  const className = cx(BUTTON_BASE, extra, (props as BaseProps).className);
  if ('to' in props && props.to) {
    const { to, children, ...rest } = props as { to: string; children?: ReactNode };
    return (
      <Link to={to} className={className} {...(rest as object)}>
        {children}
      </Link>
    );
  }
  if ('href' in props && props.href) {
    const { href, children, className: _omit, ...rest } = props as AnchorHTMLAttributes<HTMLAnchorElement>;
    void _omit;
    return (
      <a href={href} className={className} {...rest}>
        {children}
      </a>
    );
  }
  const { children, className: _omit, ...rest } = props as ButtonHTMLAttributes<HTMLButtonElement>;
  void _omit;
  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  );
}

export function GhostButton(props: ButtonAnchorProps) {
  return renderButtonish(
    'bg-transparent text-[var(--color-ghost-white)] border border-[var(--color-muted-ash)] hover:border-[var(--color-ghost-white)]',
    props,
  );
}

export function FilledButton(props: ButtonAnchorProps) {
  return renderButtonish(
    'bg-[var(--color-ghost-white)] text-[var(--color-midnight-oil)] border border-transparent hover:bg-[var(--color-dim-gray)]',
    props,
  );
}

export function SubtleButton(props: ButtonAnchorProps) {
  return renderButtonish(
    'bg-[var(--color-steel-gray)] text-[var(--color-ghost-white)] border border-transparent hover:bg-[var(--color-muted-ash)]',
    props,
  );
}

export function Card({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx(
        'bg-[var(--color-steel-gray)] border border-[var(--color-muted-ash)] rounded-[10px]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Hairline({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('h-px w-full bg-[var(--color-muted-ash)]', className)}
    />
  );
}

const TEXT_BTN =
  'font-mono text-[16px] tracking-[0.24px] text-[var(--color-ghost-white)] hover:text-[var(--color-dim-gray)] transition-colors';

export function TerminalNav() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--color-midnight-oil)] border-b border-[var(--color-muted-ash)]">
      <div className="mx-auto max-w-[1600px] px-[26.5px] py-[19px] flex items-center justify-between gap-4">
        <Link to="/" className={cx(TEXT_BTN, 'flex items-center gap-2')}>
          <span aria-hidden>&gt;</span>
          <span>rebel_logistics</span>
        </Link>
        <nav className="flex items-center gap-[16px]">
          <a href="#services" className={cx(TEXT_BTN, 'hidden sm:inline')}>
            [MENU]
          </a>
          <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`} className={cx(TEXT_BTN, 'hidden md:inline')}>
            [CALL]
          </a>
          <Link to="/login" className={cx(TEXT_BTN, 'hidden sm:inline')}>
            [LOGIN]
          </Link>
          <FilledButton to="/quote" className="px-[19.2px] py-[12.8px]">
            [GET QUOTE]
          </FilledButton>
        </nav>
      </div>
    </header>
  );
}

export const REBEL_SUPPORT_PHONE = SUPPORT_PHONE;
