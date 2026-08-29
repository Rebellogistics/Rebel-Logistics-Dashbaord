import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin, ArrowUpRight, Instagram, Clock, ChevronDown, Lock } from 'lucide-react';
import { BUSINESS, SERVICES } from './data';
import { AREAS_DATA } from './areas';
import { Button, Container, cx } from './ui';

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

const PAGE_LINKS = [
  { label: 'Our work', to: '/work' },
  { label: 'Areas', to: '/areas' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const [scrolled, setScrolled] = useState(!overHero);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const loc = useLocation();

  useEffect(() => {
    if (!overHero) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [loc.pathname]);

  const light = !scrolled; // light text over the dark hero
  const linkCls = cx(
    'text-[14px] font-medium transition-colors duration-300',
    light ? 'text-white/80 hover:text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
  );

  const openMenu = () => {
    window.clearTimeout(closeTimer.current);
    setMenu(true);
  };
  const closeMenu = () => {
    closeTimer.current = window.setTimeout(() => setMenu(false), 140);
  };

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <Container wide className="flex h-[76px] items-center justify-between gap-3 sm:gap-4">
        <Link to="/" className="flex items-center" aria-label={BUSINESS.name}>
          {/* Always the real gold wordmark; a soft plate keeps it legible on white. */}
          <img
            src="/site/brand/rebel-logo-gold.png"
            alt="Rebel Logistics"
            className="h-8 w-auto shrink-0 sm:h-10"
            draggable={false}
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {/* Services dropdown */}
          <div className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenu}>
            <button
              type="button"
              className={cx(linkCls, 'inline-flex items-center gap-1.5')}
              aria-expanded={menu}
              aria-haspopup="true"
              onClick={() => setMenu((v) => !v)}
            >
              Services
              <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', menu && 'rotate-180')} />
            </button>
            {menu && (
              <div className="absolute left-1/2 top-full w-[420px] -translate-x-1/2 pt-4">
                <div className="overflow-hidden rounded-[2px] border border-[var(--line)] bg-[var(--paper)] shadow-[0_30px_70px_-40px_rgba(20,18,14,0.45)]">
                  {SERVICES.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/${s.slug}`}
                      className="group flex items-start gap-4 border-b border-[var(--line)] px-5 py-4 last:border-b-0 hover:bg-[var(--paper-2)]"
                    >
                      <span className="mt-0.5 text-[12px] font-semibold text-[var(--accent)]">{s.index}</span>
                      <span>
                        <span className="block text-[15px] font-medium text-[var(--ink)]">{s.title}</span>
                        <span className="mt-0.5 block text-[13px] font-light leading-snug text-[var(--ink-faint)]">
                          {s.lead}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {PAGE_LINKS.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${BUSINESS.phoneIntl}`}
            className={cx(
              'hidden items-center gap-2 text-[14px] font-medium transition-colors md:inline-flex',
              light ? 'text-white/85 hover:text-white' : 'text-[var(--ink)] hover:text-[var(--accent)]',
            )}
          >
            <Phone className="h-4 w-4" strokeWidth={1.6} />
            {BUSINESS.phone}
          </a>
          {/* Staff entry point to the operations dashboard. */}
          <Link
            to="/login"
            target="_blank"
            rel="noopener noreferrer"
            title="Team login"
            className={cx(
              'hidden h-[44px] items-center gap-2 rounded-[2px] border px-4 text-[13px] font-medium transition-colors lg:inline-flex',
              light
                ? 'border-white/25 text-white/85 hover:border-white hover:text-white'
                : 'border-[var(--line-2)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]',
            )}
          >
            <Lock className="h-3.5 w-3.5" strokeWidth={1.7} />
            Team login
          </Link>
          <Button
            to="/quote"
            variant={light ? 'light' : 'ink'}
            className="hidden whitespace-nowrap px-5 sm:inline-flex"
          >
            Get a quote
          </Button>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className={cx(
              'inline-flex h-10 w-10 items-center justify-center rounded-[2px] border lg:hidden',
              light ? 'border-white/30 text-white' : 'border-[var(--line-2)] text-[var(--ink)]',
            )}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--line)] bg-[var(--paper)] lg:hidden">
          <Container className="flex flex-col py-4">
            <p className="rl-kicker px-2 py-2 text-[var(--ink-faint)]">Services</p>
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                to={`/${s.slug}`}
                className="flex items-center gap-3 rounded-[2px] px-2 py-3 text-[16px] font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
              >
                <span className="text-[12px] text-[var(--accent)]">{s.index}</span>
                {s.title}
              </Link>
            ))}
            <div className="my-2 h-px bg-[var(--line)]" />
            {PAGE_LINKS.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-[2px] px-2 py-3 text-[16px] font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-3">
              <Button to="/quote" size="lg">Get a quote</Button>
              <a href={`tel:${BUSINESS.phoneIntl}`} className="inline-flex items-center gap-2 px-2 text-[15px] text-[var(--ink-soft)]">
                <Phone className="h-4 w-4" /> {BUSINESS.phone}
              </a>
              <Link to="/login"
            target="_blank"
            rel="noopener noreferrer" className="inline-flex items-center gap-2 px-2 text-[13px] text-[var(--ink-faint)]">
                <Lock className="h-3.5 w-3.5" /> Team login
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                             */
/* ------------------------------------------------------------------ */

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[var(--char)] text-white/70">
      {/* CTA nudge band */}
      <div className="border-b border-white/10">
        <Container wide className="flex flex-col items-start justify-between gap-10 py-20 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="rl-kicker text-white/45">Ready when you are</p>
            <h2 className="rl-display mt-6 text-[clamp(2.2rem,4.4vw,3.6rem)] text-white">
              Request a quote.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] font-light leading-relaxed text-white/55">
              Send us the pieces, the addresses and any access notes. We reply the same business day with a
              plan and a price.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button to="/quote" size="lg" variant="light">Request a quote</Button>
            <Button href={`tel:${BUSINESS.phoneIntl}`} size="lg" variant="outlineLight">
              {BUSINESS.phone}
            </Button>
          </div>
        </Container>
      </div>

      {/* Columns */}
      <Container wide className="grid grid-cols-2 gap-x-8 gap-y-12 py-16 md:grid-cols-4 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-2">
          <img src="/site/brand/rebel-logo-gold.png" alt="Rebel Logistics" className="h-10 w-auto" />
          <p className="mt-5 max-w-xs text-[14px] font-light leading-relaxed text-white/55">
            Melbourne's specialist white-glove logistics, warehousing and installation partner for luxury
            furniture, art and interiors. Trusted since {BUSINESS.founded}.
          </p>
          <a
            href={BUSINESS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
          >
            <Instagram className="h-4 w-4" /> {BUSINESS.instagramHandle}
          </a>
        </div>

        <FooterCol title="Services">
          {SERVICES.map((s) => (
            <FooterLink key={s.slug} to={`/${s.slug}`}>{s.title}</FooterLink>
          ))}
          <FooterLink to="/quote">Get a quote</FooterLink>
        </FooterCol>

        <FooterCol title="Company">
          <FooterLink to="/work">Our work</FooterLink>
          <FooterLink to="/areas">Service areas</FooterLink>
          <FooterLink to="/about">About us</FooterLink>
          <FooterLink to="/contact">Contact</FooterLink>
        </FooterCol>

        <FooterCol title="Get in touch">
          <li className="flex items-start gap-2.5 text-[14px] font-light leading-relaxed text-white/60">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
            <span>{BUSINESS.address}</span>
          </li>
          <li>
            <a href={`tel:${BUSINESS.phoneIntl}`} className="flex items-start gap-2.5 text-[14px] text-white/60 hover:text-white">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
              {BUSINESS.phone}
            </a>
          </li>
          <li>
            <a href={`mailto:${BUSINESS.email}`} className="flex items-start gap-2.5 text-[14px] text-white/60 hover:text-white">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
              <span className="[overflow-wrap:anywhere]">{BUSINESS.email}</span>
            </a>
          </li>
          <li className="flex items-start gap-2.5 text-[14px] font-light leading-relaxed text-white/60">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-white/40" strokeWidth={1.5} />
            <span>{BUSINESS.hours}</span>
          </li>
        </FooterCol>
      </Container>

      {/* Areas served — internal links into the suburb pages */}
      <Container wide className="border-t border-white/10 py-10">
        <p className="rl-kicker text-white/35">Servicing Melbourne and regional Victoria</p>
        {/* A trimmed selection. Repeating all ~120 on every page clutters the
            footer and dilutes internal link equity; the rest live on /areas. */}
        <ul className="mt-5 flex max-w-6xl flex-wrap gap-x-4 gap-y-2">
          {AREAS_DATA.slice(0, 24).map((a) => (
            <li key={a.slug}>
              <Link
                to={`/areas/${a.slug}`}
                className="text-[12.5px] font-light text-white/40 transition-colors hover:text-white/75"
              >
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/areas"
          className="mt-5 inline-block text-[12.5px] font-medium text-white/70 underline underline-offset-4 hover:text-white"
        >
          All service areas
        </Link>
      </Container>

      <div className="border-t border-white/10">
        <Container wide className="flex flex-col items-start justify-between gap-3 py-6 text-[12.5px] text-white/40 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} {BUSINESS.legal}. ABN {BUSINESS.abn}.</p>
          <p className="flex items-center gap-5">
            <Link to="/quote" className="hover:text-white/70">Request a quote</Link>
            <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-white/70">
              Instagram <ArrowUpRight className="h-3 w-3" />
            </a>
            <Link to="/login"
            target="_blank"
            rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white/70">
              <Lock className="h-3 w-3" /> Team login
            </Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="rl-kicker text-white/45">{title}</h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-[14px] font-light text-white/60 transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
