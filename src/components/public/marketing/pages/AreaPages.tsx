import { useEffect } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../site/Chrome';
import { BUSINESS, CLIENTS, GALLERY, HERO_FRAMES, IMG, SERVICES, type HeroFrame } from '../site/data';
import { AREAS_DATA, AREA_REGIONS, findArea, type Area } from '../site/areas';
import { Button, Container, Marquee, PhotoRail, Reveal, goToQuoteForm } from '../site/ui';
import { ReelRail } from '../site/Reels';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';
import { ServicesOverview, Proof, Sectors, Process, Faq } from '../sections/homeSections';
import { Hero } from '../sections/Hero';

function useTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

/* ------------------------------------------------------------------ */
/* Index of every service area                                        */
/* ------------------------------------------------------------------ */

export function AreasIndexPage() {
  useTop();
  useSeo({
    title: 'Service Areas Across Melbourne | Rebel Logistics',
    description:
      'White-glove delivery, storage and installation across Melbourne metro and regional Victoria, from Toorak and Brighton to the Peninsula and Geelong.',
    path: '/areas',
    image: IMG.craneAirborne,
  });

  return (
    <div className="rl min-h-screen">
      <SiteHeader />
      <main>
        <section className="bg-[var(--char)] pb-20 pt-40 text-white sm:pb-24 sm:pt-48">
          <Container wide>
            <Reveal>
              <h1 className="rl-display max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
                Across Melbourne
                <span className="block font-light text-white/75">and regional Victoria.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] font-light leading-relaxed text-white/60">
                Our warehouse is at {BUSINESS.address}. From there we deliver, install and store for homes,
                showrooms and galleries across the state.
              </p>
            </Reveal>
          </Container>
        </section>

        <section className="bg-[var(--paper)] py-20 sm:py-24">
          <Container wide>
            {AREA_REGIONS.map((region, ri) => (
              <div key={region} className={ri > 0 ? 'mt-16' : ''}>
                <Reveal>
                  <h2 className="rl-kicker text-[var(--ink-faint)]">{region}</h2>
                </Reveal>
                <div className="mt-6 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
                  {AREAS_DATA.filter((a) => a.region === region).map((a, i) => (
                    <Reveal as="div" key={a.slug} delay={(i % 3) * 60} className="bg-[var(--paper)]">
                      <Link
                        to={`/areas/${a.slug}`}
                        className="group flex h-full flex-col p-7 transition-colors hover:bg-[var(--paper-2)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="rl-display text-[1.5rem] text-[var(--ink)]">{a.name}</h3>
                          <span className="text-[12px] tabular-nums text-[var(--ink-faint)]">{a.postcode}</span>
                        </div>
                        <p className="mt-2.5 flex-1 text-[14.5px] font-light leading-relaxed text-[var(--ink-soft)]">
                          {a.angle}
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                          View
                          <ArrowRight className="h-3.5 w-3.5 text-[var(--accent)] transition-transform group-hover:translate-x-1" />
                        </span>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
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

        <AreaEnquiry />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One suburb                                                          */
/* ------------------------------------------------------------------ */

export function AreaPage() {
  const { slug = '' } = useParams();
  const area = findArea(slug);
  useTop();
  if (!area) return <Navigate to="/areas" replace />;
  return <AreaBody area={area} />;
}

/** Twelve nearby suburbs: same region first, then the widest coverage. */
function NEARBY(area: Area) {
  const same = AREAS_DATA.filter((a) => a.region === area.region && a.slug !== area.slug);
  const rest = AREAS_DATA.filter((a) => a.region !== area.region);
  return [...same, ...rest].slice(0, 12);
}

function AreaBody({ area }: { area: Area }) {
  useSeo({
    title: `Furniture Delivery ${area.name} | Rebel Logistics Melbourne`,
    description:
      `White-glove furniture delivery, art handling, storage and installation in ${area.name} ${area.postcode}. Same-day quotes from our Flemington warehouse.`,
    path: `/areas/${area.slug}`,
    image: IMG.craneAirborne,
    service: {
      name: `White-glove logistics in ${area.name}`,
      description: `Specialist furniture, art and stone delivery, installation and warehousing serving ${area.name}, Victoria.`,
    },
  });

  const rail = GALLERY.map((g) => g.src);

  // The home page's frames, with the first line naming this suburb so the
  // page reads as local rather than as a template with a word swapped.
  const heroFrames: HeroFrame[] = [
    {
      ...HERO_FRAMES[0],
      alt: `Rebel Logistics installing luxury furniture in ${area.name}, Melbourne`,
      line1: 'White-glove logistics',
      line2: `in ${area.name}.`,
    },
    { ...HERO_FRAMES[1], line1: 'Handled like', line2: "it's irreplaceable." },
    { ...HERO_FRAMES[2], line1: 'Left finished,', line2: 'not just delivered.' },
  ];

  return (
    <div className="rl min-h-screen">
      <SiteHeader overHero />
      <main>
        {/* Same hero as the home page, copy written for this suburb */}
        <Hero frames={heroFrames} callCta />

        {/* 02 — Authority (mirrors the home page) */}
        <section className="border-b border-[var(--line)] bg-[var(--paper)] py-14">
          <Container wide>
            <Reveal className="text-center">
              <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
            </Reveal>
          </Container>
          <div className="mt-9">
            <Marquee logos={CLIENTS} />
          </div>
        </section>

        {/* 03 — Capture the lead, localised */}
        <section id="quote-form" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-28">
          <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
                Moving something in {area.name}?
                <span className="block font-light text-[var(--ink-soft)]">We reply the same business day.</span>
              </h2>
              <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
                {area.access}
              </p>
              <ul className="mt-10 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {[
                  { icon: Clock, label: 'Same-day response', sub: 'A considered plan and a clear price, fast.' },
                  { icon: ShieldCheck, label: 'White-glove care', sub: 'Wrapped, craned and placed with precision.' },
                  { icon: MapPin, label: `${area.name} ${area.postcode}`, sub: `Dispatched from ${BUSINESS.addressShort}.` },
                ].map((a) => (
                  <li key={a.label} className="flex items-start gap-4 py-5">
                    <a.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]" strokeWidth={1.5} />
                    <div>
                      <p className="text-[15px] font-medium text-[var(--ink)]">{a.label}</p>
                      <p className="text-[14px] font-light text-[var(--ink-faint)]">{a.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <LeadForm compact />
            </Reveal>
          </Container>
        </section>

        {/* 04 — Local detail, unique to this suburb */}
        <section className="bg-[var(--paper-2)] py-24 sm:py-28">
          <Container wide className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <Reveal>
              <h2 className="rl-display text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">
                {area.angle}
              </h2>
              <p className="mt-7 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">{area.note}</p>
              <div className="mt-8 flex items-start gap-3 border-l-2 border-[var(--accent)] pl-5">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={1.6} />
                <p className="text-[14.5px] font-light leading-relaxed text-[var(--ink-soft)]">
                  Dispatched from {BUSINESS.address}, a short run to {area.name} {area.postcode}.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="border-t border-[var(--line-2)] pt-8">
                <h3 className="rl-kicker text-[var(--ink-faint)]">What we do in {area.name}</h3>
                <ul className="mt-8 divide-y divide-[var(--line)]">
                  {SERVICES.flatMap((s) => s.points.slice(0, 2)).map((p) => (
                    <li key={p} className="flex items-start gap-4 py-4">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.8} />
                      <span className="text-[16px] text-[var(--ink)]">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* 06 — Services, 07 — Proof, 08 — Sectors, 09 — Process, all localised
            and reused from the home page so the structure is identical. */}
        <ServicesOverview place={area.name} />
        <Proof place={area.name} />

        {/* Photo rail: flush to the sections above and below, no padding */}
        <section className="overflow-hidden bg-[var(--paper)]">
          <PhotoRail images={rail} fade="var(--paper)" size="lg" />
        </section>

        <Sectors place={area.name} />
        <Process place={area.name} />
        {/* Film: supporting texture, placed after the argument is made */}
        <section className="overflow-hidden bg-[var(--paper)] py-24 sm:py-28">
          <Container wide>
            <Reveal className="mb-12 max-w-2xl">
              <h2 className="rl-display text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">
                Video
                <span className="block font-light text-[var(--ink-soft)]">from our jobs.</span>
              </h2>
            </Reveal>
          </Container>
          <ReelRail fade="var(--paper)" />
          <Container wide>
            <div className="mt-9 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-[13px] font-light text-[var(--ink-faint)]">
                Select any clip to play it with sound.
              </p>
              <a
                href="#quote-form"
                onClick={(e) => { if (goToQuoteForm()) e.preventDefault(); }}
                className="group inline-flex h-[46px] items-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--char-2)]"
              >
                Get a quote for your job
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </a>
            </div>
          </Container>
        </section>


        {/* 10 — Nearby areas */}
        <section className="bg-[var(--char)] py-20 text-white sm:py-24">
          <Container wide className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <h2 className="rl-display text-[clamp(1.9rem,3.6vw,3rem)] text-white">
                Also serving around {area.name}.
              </h2>
              <Link
                to="/areas"
                className="group mt-8 inline-flex h-[48px] items-center gap-2 rounded-[2px] bg-white px-6 text-[14px] font-medium text-[var(--ink)] transition-colors hover:bg-white/90"
              >
                View all {AREAS_DATA.length} service areas
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </Link>
            </Reveal>
            <Reveal delay={120}>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3">
                {NEARBY(area).map((a) => (
                  <li key={a.slug}>
                    <Link
                      to={`/areas/${a.slug}`}
                      className="group flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-[14.5px] font-light text-white/60 transition-colors hover:text-white"
                    >
                      {a.name}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-70" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </Container>
        </section>

        {/* 11 — FAQ, localised */}
        <Faq place={area.name} />

        <AreaEnquiry name={area.name} />
      </main>
      <SiteFooter />
    </div>
  );
}

function AreaEnquiry({ name }: { name?: string }) {
  return (
    <section id="quote-form" className="scroll-mt-24 bg-[var(--paper)] py-24 sm:py-28">
      <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
            {name ? `Moving something in ${name}?` : 'Moving something that matters?'}
            <span className="block font-light text-[var(--ink-soft)]">We'll take it from there.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
            Share the pieces, the addresses and any access notes. We respond the same business day.
          </p>
          <div className="mt-8">
            <a
              href={`tel:${BUSINESS.phoneIntl}`}
              className="inline-flex items-center gap-3 text-[15px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <Phone className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.6} /> {BUSINESS.phone}
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
