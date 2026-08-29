import { useEffect } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Phone } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../site/Chrome';
import { BUSINESS, CLIENTS, GALLERY, IMG, SERVICES } from '../site/data';
import { AREAS_DATA, AREA_REGIONS, findArea, type Area } from '../site/areas';
import { Button, Container, Kicker, Marquee, PhotoRail, Reveal } from '../site/ui';
import { ReelRail } from '../site/Reels';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';

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
    title: 'Service Areas | Furniture & Art Logistics Across Melbourne | Rebel Logistics',
    description:
      'Rebel Logistics services Melbourne metro and regional Victoria, from Toorak and Brighton to the Mornington Peninsula and Geelong. Find white-glove delivery, storage and installation in your suburb.',
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
              <Kicker className="text-white/45">Service areas</Kicker>
              <h1 className="rl-display mt-6 max-w-3xl text-[clamp(2.6rem,6vw,4.6rem)] text-white">
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

function AreaBody({ area }: { area: Area }) {
  useSeo({
    title: `Furniture Delivery & Removals ${area.name} | Rebel Logistics Melbourne`,
    description:
      `White-glove furniture delivery, art handling, craning, storage and installation in ${area.name} ${area.postcode}. ${area.angle} Same-day quotes from our Flemington warehouse.`,
    path: `/areas/${area.slug}`,
    image: IMG.craneAirborne,
    service: {
      name: `White-glove logistics in ${area.name}`,
      description: `Specialist furniture, art and stone delivery, installation and warehousing serving ${area.name}, Victoria.`,
    },
  });

  const rail = GALLERY.map((g) => g.src);

  return (
    <div className="rl min-h-screen">
      <SiteHeader overHero />
      <main>
        {/* Hero */}
        <section className="relative flex h-[70vh] min-h-[480px] items-end overflow-hidden bg-[var(--char)]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/site/reels/bg/areas.mp4"
            poster={IMG.craneAirborne}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(15,13,9,0.5) 0%, rgba(15,13,9,0.1) 34%, rgba(15,13,9,0.85) 100%)' }}
          />
          <Container wide className="relative pb-16 sm:pb-20">
            <Reveal>
              <div className="mb-6 flex items-center gap-3">
                <span aria-hidden className="inline-block h-px w-9 bg-white/40" />
                <span className="rl-kicker !gap-0 text-white/70">
                  {area.region} &nbsp;·&nbsp; {area.postcode}
                </span>
              </div>
              <h1 className="rl-display max-w-4xl text-[clamp(2.4rem,5.6vw,4.6rem)] text-white">
                <span className="block font-medium">White-glove logistics</span>
                <span className="block font-light text-white/80">in {area.name}.</span>
              </h1>
              <p className="mt-7 max-w-xl text-[clamp(1rem,1.35vw,1.14rem)] font-light leading-relaxed text-white/70">
                {area.angle} Furniture, art, stone and lighting delivered, installed and stored by specialists
                who work in {area.name} every week.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button to="/quote" size="lg" variant="light">
                  Request a quote <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
                </Button>
                <Button href={`tel:${BUSINESS.phoneIntl}`} size="lg" variant="outlineLight">
                  {BUSINESS.phone}
                </Button>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Logos */}
        <section className="border-b border-[var(--line)] bg-[var(--paper)] py-12">
          <Container wide>
            <Reveal className="text-center">
              <p className="rl-kicker text-[var(--ink-faint)]">Trusted to handle the irreplaceable</p>
            </Reveal>
          </Container>
          <div className="mt-8">
            <Marquee logos={CLIENTS} />
          </div>
        </section>

        {/* Local detail */}
        <section className="bg-[var(--paper)] py-20 sm:py-28">
          <Container wide className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
            <Reveal>
              <Kicker className="text-[var(--ink-soft)]">Working in {area.name}</Kicker>
              <h2 className="rl-display mt-6 text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">
                {area.angle}
              </h2>
              <p className="mt-7 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">
                {area.access}
              </p>
              <p className="mt-4 text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">{area.note}</p>
              <div className="mt-8 flex items-start gap-3 border-l-2 border-[var(--accent)] pl-5">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={1.6} />
                <p className="text-[14.5px] font-light leading-relaxed text-[var(--ink-soft)]">
                  Dispatched from {BUSINESS.address}, roughly a short run to {area.name} {area.postcode}.
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
                <div className="mt-8 flex flex-wrap gap-2">
                  {SERVICES.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/${s.slug}`}
                      className="rounded-[2px] border border-[var(--line-2)] px-3.5 py-2 text-[13px] text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          </Container>
        </section>

        {/* Photo rail */}
        <section className="overflow-hidden bg-[var(--paper-2)] py-16 sm:py-20">
          <PhotoRail images={rail} fade="var(--paper-2)" />
        </section>

        {/* Film */}
        <section className="overflow-hidden bg-[var(--paper)] py-20 sm:py-24">
          <Container wide>
            <Reveal className="mb-10 max-w-2xl">
              <Kicker className="text-[var(--ink-soft)]">From the field</Kicker>
              <h2 className="rl-display mt-6 text-[clamp(1.8rem,3.2vw,2.6rem)] text-[var(--ink)]">
                See the work in motion.
              </h2>
            </Reveal>
          </Container>
          <ReelRail fade="var(--paper)" />
        </section>

        {/* Nearby */}
        <section className="bg-[var(--paper-2)] py-16">
          <Container wide>
            <Reveal>
              <p className="rl-kicker text-[var(--ink-faint)]">Also serving nearby</p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
                {area.near.map((n) => (
                  <span key={n} className="text-[15px] font-light text-[var(--ink-soft)]">{n}</span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--line)] pt-6">
                {AREAS_DATA.filter((a) => a.slug !== area.slug)
                  .slice(0, 10)
                  .map((a) => (
                    <Link
                      key={a.slug}
                      to={`/areas/${a.slug}`}
                      className="text-[14px] font-light text-[var(--ink-faint)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
                    >
                      {a.name}
                    </Link>
                  ))}
                <Link to="/areas" className="text-[14px] font-medium text-[var(--ink)] underline underline-offset-4">
                  All areas
                </Link>
              </div>
            </Reveal>
          </Container>
        </section>

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
          <Kicker className="text-[var(--ink-soft)]">Request a quote</Kicker>
          <h2 className="rl-display mt-6 text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
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
