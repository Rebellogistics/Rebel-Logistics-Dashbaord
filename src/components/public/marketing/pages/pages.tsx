import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, MapPin, Phone, Mail, Clock, Instagram, Building2, ShieldCheck } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../site/Chrome';
import { BUSINESS, CLIENTS, CLIENT_NAMES, GALLERY, IMG, SERVICES, type Service } from '../site/data';
import { Button, ClientNames, Container, Kicker, Marquee, PhotoRail, Reveal } from '../site/ui';
import { ReelRail } from '../site/Reels';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';

const SERVICE_SEO: Record<string, { title: string; description: string }> = {
  logistics: {
    title: 'Furniture & Art Delivery Melbourne | Rebel Logistics',
    description:
      'White-glove furniture delivery, art handling, craning and designer installation across Melbourne and regional Victoria. Placed to the millimetre, not just dropped off.',
  },
  warehousing: {
    title: 'Furniture Storage & 3PL Melbourne | Rebel Logistics',
    description:
      'Secure furniture and art warehousing in Flemington, Melbourne. Storage per cubic metre, container unpack, short and long-term storage and full third-party logistics.',
  },
  labour: {
    title: 'Onsite Labour Hire & Furniture Assembly Melbourne | Rebel Logistics',
    description:
      'Trained crews for install days, showroom rearrangement, furniture assembly and trade-fair set-up across Melbourne. Skilled hands used to precious spaces.',
  },
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
            <Button to="/quote" size="lg" variant="light">
              Request a quote <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
            </Button>
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
          <Kicker className="text-[var(--ink-soft)]">Start here</Kicker>
          <h2 className="rl-display mt-6 text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
            Let's move it
            <span className="block font-light text-[var(--ink-soft)]">beautifully.</span>
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

      <section className="bg-[var(--paper)] py-24 sm:py-32">
        <Container wide className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <Reveal>
            <Kicker className="text-[var(--ink-soft)]">The service</Kicker>
            <h2 className="rl-display mt-6 text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">{service.lead}</h2>
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

      {/* Scrolling photo rail, right to left */}
      <section className="overflow-hidden bg-[var(--paper-2)] py-16 sm:py-20">
        <Container wide>
          <Reveal className="mb-10">
            <Kicker className="text-[var(--ink-soft)]">On the job</Kicker>
            <h2 className="rl-display mt-5 text-[clamp(1.7rem,3vw,2.4rem)] text-[var(--ink)]">
              {service.title} in practice.
            </h2>
          </Reveal>
        </Container>
        <PhotoRail images={service.rail} fade="var(--paper-2)" />
      </section>

      {/* Expanded detail */}
      <section className="bg-[var(--paper)] py-24 sm:py-28">
        <Container wide>
          <Reveal className="max-w-3xl">
            <Kicker className="text-[var(--ink-soft)]">How we work</Kicker>
            <h2 className="rl-display mt-6 text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">
              The detail that
              <span className="block font-light text-[var(--ink-soft)]">makes the difference.</span>
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

      {/* Film rail */}
      <section className="overflow-hidden bg-[var(--paper-2)] py-20 sm:py-24">
        <Container wide>
          <Reveal className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Kicker className="text-[var(--ink-soft)]">From the field</Kicker>
              <h2 className="rl-display mt-5 text-[clamp(1.7rem,3vw,2.4rem)] text-[var(--ink)]">
                See the work in motion.
              </h2>
            </div>
            <p className="text-[13px] font-light text-[var(--ink-faint)]">Select any clip to play it with sound.</p>
          </Reveal>
        </Container>
        <ReelRail />
      </section>

      {/* Client logos for authority */}
      <section className="border-y border-[var(--line)] bg-[var(--paper)] py-14">
        <Container wide>
          <Reveal className="text-center">
            <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
          </Reveal>
        </Container>
        <div className="mt-9">
          <Marquee logos={CLIENTS} />
        </div>
      </section>

      <section className="bg-[var(--paper)] py-24">
        <Container wide>
          <Reveal className="mb-12">
            <Kicker className="text-[var(--ink-soft)]">Also from Rebel</Kicker>
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
      'Founded in 2019, Rebel Logistics is a Melbourne specialist transport, warehousing and installation company trusted by leading Australian and international brands and interior designers.',
    path: '/about',
    image: IMG.artHall,
  });
  return (
    <Shell overHero>
      <ImageHero
        eyebrow={`Melbourne / Est. ${BUSINESS.founded}`}
        title="Specialist logistics"
        sub="for a discerning world."
        lead="Born in 2019, Rebel Logistics is a specialist transport company started by people known for their professionalism, and trusted by leading Australian and international organisations to handle their every need."
        image={IMG.artHall}
        alt="Positioning gallery artwork in a private residence"
      />

      <section className="bg-[var(--paper)] py-24 sm:py-32">
        <Container wide className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
          <Reveal>
            <Kicker className="text-[var(--ink-soft)]">Our story</Kicker>
            <h2 className="rl-display mt-6 text-[clamp(1.9rem,3.6vw,3rem)] text-[var(--ink)]">
              When you engage Rebel, your every need is at the forefront.
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

      <section className="bg-[var(--paper)] py-16">
        <Container wide>
          <Reveal className="text-center">
            <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
            <div className="mt-8">
              <ClientNames names={CLIENT_NAMES} />
            </div>
          </Reveal>
        </Container>
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
            <Kicker className="text-white/45">Request a quote</Kicker>
            <h1 className="rl-display mt-6 max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
              Tell us what you're moving.
              <span className="block font-light text-white/75">We'll take it from there.</span>
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
            <Kicker className="text-white/45">Contact</Kicker>
            <h1 className="rl-display mt-6 max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
              Let's talk about
              <span className="block font-light text-white/75">your next move.</span>
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

      <section className="grid grid-cols-2 gap-1 bg-[var(--paper-2)] md:grid-cols-4">
        {GALLERY.slice(0, 4).map((g) => (
          <div key={g.src} className="aspect-[4/3] overflow-hidden">
            <img src={g.src} alt={g.caption} loading="lazy" className="h-full w-full object-cover" />
          </div>
        ))}
      </section>
    </Shell>
  );
}
