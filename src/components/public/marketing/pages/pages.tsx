import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, MapPin, Phone, Mail, Clock, Instagram, Building2, ShieldCheck } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../site/Chrome';
import { BUSINESS, CLIENTS, GALLERY, IMG, PHOTO, SERVICES, type Service } from '../site/data';
import { Button, Container, Marquee, PhotoRail, QuoteCTA, Reveal } from '../site/ui';
import { ReelRail } from '../site/Reels';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';

const SERVICE_SEO: Record<string, { title: string; description: string }> = {
  logistics: {
    title: 'Furniture & Art Delivery Melbourne | Rebel Logistics',
    description:
      'White-glove furniture delivery, art handling, craning and designer installation across Melbourne. Placed to the millimetre, not just dropped off.',
  },
  warehousing: {
    title: 'Furniture Storage & 3PL Melbourne | Rebel Logistics',
    description:
      'Secure furniture and art warehousing in Flemington, Melbourne. Storage per cubic metre, container unpack, short and long-term storage and 3PL.',
  },
  labour: {
    title: 'Labour Hire & Furniture Assembly Melbourne | Rebel Logistics',
    description:
      'Trained crews for install days, showroom rearrangement, furniture assembly and trade-fair set-up across Melbourne. Skilled hands used to precious spaces.',
  },
};

/** Pre-selects the matching enquiry type on each service page. */
const SERVICE_FORM_OPTION: Record<string, string> = {
  logistics: 'Delivery & installation',
  warehousing: 'Warehousing & storage',
  labour: 'Labour & assembly',
};

function Shell({ children, overHero }: { children: ReactNode; overHero?: boolean }) {
  const { pathname } = useLocation();
  // Block body: an implicit return here hands React a non-function "cleanup".
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="rl min-h-screen">
      <SiteHeader overHero={overHero} />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

function ImageHero({ eyebrow, title, sub, lead, image, alt, video }: { eyebrow: string; title: string; sub?: string; lead: string; image: string; alt: string; video?: string }) {
  return (
    <section className="relative flex h-[78vh] min-h-[540px] items-end overflow-hidden bg-[var(--char)]">
      {video ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={video}
          poster={image}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : (
        <img src={image} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,13,9,0.5) 0%, rgba(15,13,9,0.08) 34%, rgba(15,13,9,0.82) 100%)' }} />
      <Container wide className="relative pb-16 sm:pb-20">
        <Reveal>
          <div className="mb-6 flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-9" style={{ background: 'var(--accent-3)' }} />
            <span className="rl-kicker !gap-0 text-white/70">{eyebrow}</span>
          </div>
          <h1 className="rl-display max-w-4xl text-[clamp(2.6rem,6vw,5rem)] text-white">
            <span className="block font-medium">{title}</span>
            {sub && <span className="block font-light text-white/80">{sub}</span>}
          </h1>
          <p className="mt-7 max-w-xl text-[clamp(1rem,1.35vw,1.14rem)] font-light leading-relaxed text-white/70">{lead}</p>
          <div className="mt-9">
            <QuoteCTA variant="light">
              Request a quote <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
            </QuoteCTA>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="bg-[var(--paper-2)] py-24 sm:py-32" id="quote-form">
      <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
            Request a quote for your job.
          </h2>
          <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
            Share a few details and we'll come back the same business day with a plan and a clear price.
          </p>
          <div className="mt-8 space-y-3 text-[15px] text-[var(--ink-soft)]">
            <a href={`tel:${BUSINESS.phoneIntl}`} className="flex items-center gap-3 hover:text-[var(--ink)]">
              <Phone className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.6} /> {BUSINESS.phone}
            </a>
            <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-3 hover:text-[var(--ink)]">
              <Mail className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.6} /> {BUSINESS.email}
            </a>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <LeadForm compact />
        </Reveal>
      </Container>
    </section>
  );
}

const RELATED_IMG = [IMG.craneLift, IMG.marble, IMG.lounge, IMG.chandelier];

export function ServicePage({ slug }: { slug: string }) {
  const service = SERVICES.find((s) => s.slug === slug) as Service;
  const others = SERVICES.filter((s) => s.slug !== slug);
  const meta = SERVICE_SEO[slug];
  useSeo({
    title: meta.title,
    description: meta.description,
    path: `/${slug}`,
    image: service.image,
    service: { name: service.title, description: service.blurb },
  });
  return (
    <Shell overHero>
      <ImageHero
        eyebrow={`Services / ${service.index}`}
        title={service.title}
        lead={service.lead}
        image={service.image}
        alt={service.imageAlt}
        video={service.heroVideo}
      />

      {/* 02 — Authority before the ask */}
      <section className="border-y border-[var(--line)] bg-[var(--paper)] py-12">
        <Container wide>
          <Reveal className="text-center">
            <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
          </Reveal>
        </Container>
        <div className="mt-8">
          <Marquee logos={CLIENTS} />
        </div>
      </section>

      {/* 03 — What the service is and what it includes */}
      <section className="bg-[var(--paper)] py-24 sm:py-28">
        <Container wide className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <Reveal>
            <h2 className="rl-display text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">{service.lead}</h2>
            <p className="mt-7 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">{service.blurb}</p>
            <p className="mt-4 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">
              Every job is handled by trained specialists who move precious, high-value pieces every day, with
              the wrapping, equipment and patience that protects both the piece and the space it is going into.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="border-t border-[var(--line-2)] pt-8">
              <h3 className="rl-kicker text-[var(--ink-faint)]">What's included</h3>
              <ul className="mt-8 divide-y divide-[var(--line)]">
                {service.points.map((p) => (
                  <li key={p} className="flex items-start gap-4 py-5">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.8} />
                    <span className="text-[16.5px] text-[var(--ink)]">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 04 — How we handle every job */}
      <section className="bg-[var(--paper)] py-24 sm:py-28">
        <Container wide>
          <Reveal className="max-w-3xl">
            <h2 className="rl-display text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">
              How we handle every job.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-14 gap-y-10 border-t border-[var(--line)] pt-12 sm:grid-cols-2">
            {service.detail.map((d, i) => (
              <Reveal as="div" key={d.t} delay={(i % 2) * 80}>
                <div className="flex items-baseline gap-4">
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[1.15rem] font-semibold text-[var(--ink)]">{d.t}</h3>
                </div>
                <p className="mt-3 pl-9 text-[15px] font-light leading-relaxed text-[var(--ink-soft)]">{d.d}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 05 — Ask, once the offer and method are clear */}
      <section id="quote-form" className="scroll-mt-24 bg-[var(--paper-2)] py-20 sm:py-28">
        <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
              Need {service.title.toLowerCase()}?
              <span className="block font-light text-[var(--ink-soft)]">Tell us what you're moving.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
              Share the pieces, the addresses and any access notes. We respond the same business day with a
              considered plan and a clear price.
            </p>
            <ul className="mt-10 divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {service.points.slice(0, 3).map((p) => (
                <li key={p} className="flex items-start gap-4 py-4">
                  <Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" strokeWidth={1.9} />
                  <span className="text-[15px] text-[var(--ink-soft)]">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <LeadForm compact defaultService={SERVICE_FORM_OPTION[slug]} />
          </Reveal>
        </Container>
      </section>

      {/* 06 — Proof on sight: full-bleed rail, edge to edge */}
      <section className="overflow-hidden bg-[var(--paper)]">
        <PhotoRail images={service.rail} fade="var(--paper)" size="lg" />
      </section>

      {/* 07 — Motion holds attention */}
      <section className="overflow-hidden bg-[var(--paper-2)] py-20 sm:py-24">
        <Container wide>
          <Reveal className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="rl-display mt-5 text-[clamp(1.7rem,3vw,2.4rem)] text-[var(--ink)]">
                See the work in motion.
              </h2>
            </div>
            <p className="text-[13px] font-light text-[var(--ink-faint)]">Select any clip to play it with sound.</p>
          </Reveal>
        </Container>
        <ReelRail />
        <Container wide>
          <div className="mt-9 flex justify-start">
            <a
              href="#quote-form"
              className="group inline-flex h-[46px] items-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--char-2)]"
            >
              Get a quote for your job
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
            </a>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--paper)] py-24">
        <Container wide>
          <Reveal className="mb-12">
            <h2 className="rl-display text-[clamp(1.7rem,3vw,2.4rem)] text-[var(--ink)]">
              Also from Rebel
            </h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2">
            {others.map((s) => (
              <Reveal as="div" key={s.slug}>
                <Link
                  to={`/${s.slug}`}
                  className="group flex items-center gap-6 rounded-[2px] border border-[var(--line)] bg-[var(--paper)] p-4 transition-colors hover:border-[var(--line-2)]"
                >
                  <div className="h-28 w-40 shrink-0 overflow-hidden rounded-[2px]">
                    <img src={s.image} alt={s.imageAlt} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div>
                    <span className="rl-display text-[1.1rem] text-[var(--accent)]">{s.index}</span>
                    <h3 className="rl-display mt-1 text-[1.5rem] text-[var(--ink)]">{s.title}</h3>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                      Explore <ArrowRight className="h-3.5 w-3.5 text-[var(--accent)] transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <ClosingCTA />
    </Shell>
  );
}

const VALUES = [
  { t: 'Specialists, not couriers', d: 'We handle high-value furniture, stone, art and lighting every day, and treat every piece as if it cannot be replaced, because often it cannot.' },
  { t: 'Placed, not dropped', d: 'The job is not done at the front door. We assemble, position and finish to the designer\'s brief, down to the millimetre.' },
  { t: 'Trusted by the best', d: 'Leading Australian and international brands and designers rely on Rebel for their most demanding installs and deliveries.' },
];

export function AboutPage() {
  useSeo({
    title: 'About Rebel Logistics | Specialist Transport Melbourne',
    description:
      'Founded in 2019, Rebel Logistics is a Melbourne specialist transport, warehousing and installation company trusted by leading brands and designers.',
    path: '/about',
    image: IMG.artHall,
  });
  return (
    <Shell overHero>
      <ImageHero
        eyebrow={`Melbourne / Est. ${BUSINESS.founded}`}
        title="Specialist logistics"
        sub="for Melbourne."
        lead="Born in 2019, Rebel Logistics is a specialist transport company started by people known for their professionalism, and trusted by leading Australian and international organisations to handle their every need."
        image={IMG.artHall}
        alt="Positioning gallery artwork in a private residence"
      />

      <section className="bg-[var(--paper)] py-24 sm:py-32">
        <Container wide className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
          <Reveal>
            <h2 className="rl-display text-[clamp(1.9rem,3.6vw,3rem)] text-[var(--ink)]">
              What we do and who we do it for.
            </h2>
            <p className="mt-7 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">
              We move the pieces other companies will not. Full-height stone slabs craned over pool houses,
              bespoke lighting installed to a designer's plan, entire showrooms reset overnight. From
              warehousing and 3PL to white-glove delivery and skilled on-site labour, Rebel is the single
              partner luxury interiors trust from the loading dock to the finished room.
            </p>
            <div className="mt-10 flex flex-wrap gap-12 border-t border-[var(--line)] pt-8">
              {[
                { k: `${new Date().getFullYear() - BUSINESS.founded}+`, v: 'Years specialising' },
                { k: 'VIC', v: 'Metro and regional' },
                { k: '3', v: 'Service pillars' },
              ].map((s) => (
                <div key={s.v}>
                  <p className="rl-display text-[2.6rem] text-[var(--ink)]">{s.k}</p>
                  <p className="mt-1 text-[12px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">{s.v}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={120} className="grid gap-4">
            <div className="overflow-hidden rounded-[2px]">
              <img src={IMG.lounge} alt="A completed luxury install" className="h-full w-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img src={IMG.craneVertical} alt="Heavy-lift access" className="aspect-[4/5] w-full rounded-[2px] object-cover" />
              <img src={IMG.chandelier} alt="Bespoke lighting install" className="aspect-[4/5] w-full rounded-[2px] object-cover" />
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-[var(--paper-2)] py-24">
        <Container wide>
          <div className="grid gap-px overflow-hidden rounded-[2px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal as="div" key={v.t} delay={i * 80} className="bg-[var(--paper)] p-9">
                <span className="rl-display text-[1.6rem] text-[var(--accent)]">0{i + 1}</span>
                <h3 className="mt-5 text-[1.2rem] font-semibold text-[var(--ink)]">{v.t}</h3>
                <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--ink-soft)]">{v.d}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Founder. Real photograph of Yamin on site, not a generated likeness. */}
      <section className="bg-[var(--char)] py-20 text-white sm:py-28">
        <Container wide className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <Reveal>
            <div className="overflow-hidden rounded-[2px]">
              <img
                src="/site/founder.jpg"
                alt="Yamin Kassouah, founder of Rebel Logistics, in the Flemington warehouse"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="rl-display text-[clamp(1.9rem,3.6vw,3rem)] text-white">Yamin Kassouah</h2>
            <p className="mt-6 text-[16.5px] font-light leading-relaxed text-white/65">
              Yamin started Rebel Logistics in {BUSINESS.founded} after years of moving high-value pieces for
              Melbourne showrooms and designers. He runs the yard at Flemington and is on site for the
              difficult jobs, which is usually where the crane is.
            </p>
            <p className="mt-4 text-[16.5px] font-light leading-relaxed text-white/65">
              The standard he set at the start has not changed: measure the access before quoting, protect the
              space before the piece enters it, and leave the room finished.
            </p>
            <div className="mt-8 border-t border-white/15 pt-6">
              <a
                href={`tel:${BUSINESS.phoneIntl}`}
                className="inline-flex items-center gap-3 text-[15px] text-white/70 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" strokeWidth={1.6} /> Speak to the team on {BUSINESS.phone}
              </a>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--paper)] py-12">
        <Container wide>
          <Reveal className="text-center">
            <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
          </Reveal>
        </Container>
        <div className="mt-8">
          <Marquee logos={CLIENTS} />
        </div>
      </section>

      <ClosingCTA />
    </Shell>
  );
}

/* ---------------------------------------------------------------- */
/* Quote page — the single lead form used across the site.           */
/* Supports ?embed=1 for the iframe embed offered in Settings.       */
/* ---------------------------------------------------------------- */

export function QuotePage() {
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';

  useSeo({
    title: 'Request a Quote | Rebel Logistics Melbourne',
    description:
      'Request a quote for white-glove furniture delivery, art handling, craning, warehousing or installation in Melbourne. Same-day response, no obligation.',
    path: '/quote',
  });

  if (embed) {
    return (
      <div className="rl bg-[var(--paper)] p-4">
        <LeadForm />
      </div>
    );
  }

  return (
    <Shell>
      <section className="bg-[var(--char)] pb-20 pt-40 text-white sm:pb-24 sm:pt-48">
        <Container wide>
          <Reveal>
            <h1 className="rl-display max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
              Request a quote.
              <span className="block font-light text-white/75">We reply the same business day.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] font-light leading-relaxed text-white/60">
              Share the pieces, the addresses and any access notes. We'll come back the same business day with
              a considered plan and a clear price.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-[var(--paper)] py-16 sm:py-24">
        <Container wide className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {[
                { icon: Clock, t: 'Same-day response', d: 'A considered plan and a clear price, fast.' },
                { icon: ShieldCheck, t: 'White-glove care', d: 'Wrapped, craned and placed with precision.' },
                { icon: MapPin, t: 'Melbourne and regional VIC', d: 'Metro, regional and interstate on request.' },
              ].map((a) => (
                <li key={a.t} className="flex items-start gap-4 py-6">
                  <a.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" strokeWidth={1.5} />
                  <div>
                    <p className="text-[15px] font-medium text-[var(--ink)]">{a.t}</p>
                    <p className="text-[14px] font-light text-[var(--ink-faint)]">{a.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-3 text-[15px] text-[var(--ink-soft)]">
              <a href={`tel:${BUSINESS.phoneIntl}`} className="flex items-center gap-3 hover:text-[var(--ink)]">
                <Phone className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.6} /> {BUSINESS.phone}
              </a>
              <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-3 hover:text-[var(--ink)]">
                <Mail className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.6} /> {BUSINESS.email}
              </a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <LeadForm />
          </Reveal>
        </Container>
      </section>
    </Shell>
  );
}

export function ContactPage() {
  useSeo({
    title: 'Contact Rebel Logistics | Flemington, Melbourne',
    description:
      'Contact Rebel Logistics in Flemington, Melbourne for white-glove furniture delivery, art handling, warehousing and installation. Same-day response on quotes.',
    path: '/contact',
  });
  const details = [
    { icon: MapPin, label: 'Visit / warehouse', value: BUSINESS.address },
    { icon: Phone, label: 'Call', value: BUSINESS.phone, href: `tel:${BUSINESS.phoneIntl}` },
    { icon: Mail, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
    { icon: Clock, label: 'Hours', value: BUSINESS.hours },
    { icon: Building2, label: 'ABN', value: BUSINESS.abn },
  ];
  return (
    <Shell>
      <section className="bg-[var(--char)] pb-20 pt-40 text-white sm:pb-24 sm:pt-48">
        <Container wide>
          <Reveal>
            <h1 className="rl-display max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
              Contact
              <span className="block font-light text-white/75">Rebel Logistics.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[16px] font-light leading-relaxed text-white/60">
              Tell us what you're moving and where. We'll respond the same business day with a considered plan
              and a clear price.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="bg-[var(--paper)] py-16 sm:py-24">
        <Container wide className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal>
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {details.map((d) => (
                <li key={d.label} className="flex items-start gap-4 py-6">
                  <d.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" strokeWidth={1.5} />
                  <div>
                    <p className="rl-kicker !gap-0 text-[var(--ink-faint)]">{d.label}</p>
                    {d.href ? (
                      <a href={d.href} className="mt-1.5 block text-[16px] font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                        {d.value}
                      </a>
                    ) : (
                      <p className="mt-1.5 text-[16px] font-medium text-[var(--ink)]">{d.value}</p>
                    )}
                  </div>
                </li>
              ))}
              <li className="flex items-start gap-4 py-6">
                <Instagram className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" strokeWidth={1.5} />
                <div>
                  <p className="rl-kicker !gap-0 text-[var(--ink-faint)]">Follow</p>
                  <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[16px] font-medium text-[var(--ink)] hover:text-[var(--accent)]">
                    {BUSINESS.instagramHandle} <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <LeadForm />
          </Reveal>
        </Container>
      </section>

      {/* Full-bleed scrolling rail, matching the service pages */}
      <section className="overflow-hidden bg-[var(--paper)]">
        <PhotoRail images={GALLERY.map((g) => g.src)} fade="var(--paper)" size="lg" />
      </section>
    </Shell>
  );
}
