import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, MapPin, Instagram, Plus, Minus } from 'lucide-react';
import { BUSINESS, CLIENTS, FAQS, GALLERY, SECTORS, SERVICES } from '../site/data';
import { AREAS_DATA } from '../site/areas';
import { Container, Marquee, Reveal, cx, goToQuoteForm } from '../site/ui';
import { LeadForm } from '../site/LeadForm';
import { ReelRail } from '../site/Reels';

const FEATURED_SLUGS = [
  'toorak', 'south-yarra', 'brighton', 'melbourne-cbd', 'kew', 'malvern',
  'armadale', 'hawthorn', 'camberwell', 'fitzroy', 'port-melbourne', 'mornington',
];
const FEATURED_AREAS = FEATURED_SLUGS
  .map((s) => AREAS_DATA.find((a) => a.slug === s))
  .filter((a): a is (typeof AREAS_DATA)[number] => Boolean(a));

/* ---------------------------------------------------------------- */
/* Trusted-by                                                       */
/* ---------------------------------------------------------------- */

export function BrandsBand() {
  return (
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
  );
}

/* ---------------------------------------------------------------- */
/* Quote band                                                       */
/* ---------------------------------------------------------------- */

const ASSURANCES = [
  { icon: Clock, label: 'Same-day response', sub: 'A considered plan and a clear price, fast.' },
  { icon: ShieldCheck, label: 'White-glove care', sub: 'Wrapped, craned and placed with precision.' },
  { icon: MapPin, label: 'Melbourne and regional VIC', sub: 'Metro, regional and interstate on request.' },
];

export function QuoteBand() {
  return (
    <section id="quote-form" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-32">
      <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
            Request a quote.
            <span className="block font-light text-[var(--ink-soft)]">We reply the same business day.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
            Whether it is a single stone table or a full showroom fit-out, share the details and our team will
            come back with the right approach and a price you can trust.
          </p>
          <ul className="mt-10 divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {ASSURANCES.map((a) => (
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
  );
}

/* ---------------------------------------------------------------- */
/* Services — editorial alternating rows                            */
/* ---------------------------------------------------------------- */

export function ServicesOverview({ place }: { place?: string } = {}) {
  return (
    <section id="services" className="scroll-mt-24 bg-[var(--paper)] py-24 sm:py-32">
      <Container wide>
        <Reveal className="max-w-3xl">
          <h2 className="rl-display text-[clamp(2.2rem,4.6vw,3.8rem)] text-[var(--ink)]">
            Logistics, warehousing and labour{place ? ` in ${place}` : ''}.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
          {SERVICES.map((s, i) => {
            const flip = i % 2 === 1;
            return (
              <Reveal key={s.slug} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
                <div className={cx('lg:col-span-7', flip && 'lg:order-2')}>
                  <div className="overflow-hidden rounded-[2px]">
                    <img
                      src={s.image}
                      alt={s.imageAlt}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover"
                    />
                  </div>
                </div>
                <div className={cx('lg:col-span-5', flip && 'lg:order-1')}>
                  <div className="flex items-baseline gap-4">
                    <span className="rl-display text-[1.4rem] text-[var(--accent)]">{s.index}</span>
                    <span aria-hidden className="h-px flex-1 bg-[var(--line-2)]" />
                  </div>
                  <h3 className="rl-display mt-6 text-[clamp(2rem,3.2vw,2.7rem)] text-[var(--ink)]">{s.title}</h3>
                  <p className="mt-4 text-[17px] font-light leading-relaxed text-[var(--ink-soft)]">{s.lead}</p>
                  <p className="mt-3 text-[15px] font-light leading-relaxed text-[var(--ink-faint)]">{s.blurb}</p>
                  <ul className="mt-7 space-y-3">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-center gap-3 text-[14.5px] text-[var(--ink-soft)]">
                        <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/${s.slug}`}
                    className="group mt-8 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]"
                  >
                    Explore {s.title.toLowerCase()}
                    <ArrowRight className="h-4 w-4 text-[var(--accent)] transition-transform group-hover:translate-x-1" strokeWidth={1.6} />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Proof gallery                                                    */
/* ---------------------------------------------------------------- */

export function Proof({ place }: { place?: string } = {}) {
  return (
    <section id="work" className="scroll-mt-24 bg-[var(--char)] py-24 text-white sm:py-32">
      <Container wide>
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h2 className="rl-display mt-6 text-[clamp(2.2rem,4.6vw,3.8rem)] text-white">
              Recent work across {place ?? 'Melbourne'}.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] font-light leading-relaxed text-white/55">
            Real jobs across {place ? `${place} and greater Melbourne` : "Melbourne's finest homes and showrooms"}.
            Craned in, wrapped, assembled and placed exactly where they belong.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {GALLERY.map((g, i) => (
            <Reveal
              as="figure"
              key={g.src}
              delay={(i % 4) * 70}
              // Uniform cells. Mixed row/col spans left ragged gaps whenever a
              // span could not be filled, which read as random white space.
              className="group relative aspect-square overflow-hidden rounded-[2px]"
            >
              <img
                src={g.src}
                alt={g.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
              {/* Persistent, not hover-only: touch users never get :hover. */}
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,8,5,0.9)] via-[rgba(10,8,5,0.45)] to-transparent p-4 pt-10 text-[12.5px] font-light leading-snug text-white">
                {g.caption}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Process                                                          */
/* ---------------------------------------------------------------- */

const STEPS = [
  { n: '01', t: 'Enquire', d: 'Send us the pieces, the addresses and any access notes. We respond the same business day.' },
  { n: '02', t: 'Plan', d: 'We scope the crew, the equipment and the timing, craning and protection included.' },
  { n: '03', t: 'Handle', d: 'Wrapped, protected and transported by specialists who move precious things every day.' },
  { n: '04', t: 'Place', d: 'Delivered, assembled and positioned to the millimetre. Never just dropped off.' },
];

export function Process({ place }: { place?: string } = {}) {
  return (
    <section className="bg-[var(--paper)] py-24 sm:py-32">
      <Container wide>
        <Reveal className="max-w-3xl">
          <h2 className="rl-display text-[clamp(2.2rem,4.6vw,3.8rem)] text-[var(--ink)]">
            From quote
            <span className="block font-light text-[var(--ink-soft)]">to placement{place ? ` in ${place}` : ''}.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-x-12 gap-y-12 border-t border-[var(--line)] pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="div" delay={i * 80} key={s.n}>
              <span className="rl-display text-[2.2rem] text-[var(--accent)]">{s.n}</span>
              <h3 className="mt-5 text-[1.2rem] font-semibold text-[var(--ink)]">{s.t}</h3>
              <p className="mt-3 text-[14.5px] font-light leading-relaxed text-[var(--ink-soft)]">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Instagram                                                        */
/* ---------------------------------------------------------------- */

export function InstagramWall() {
  return (
    <section id="film" className="scroll-mt-24 overflow-hidden bg-[var(--paper-2)] py-24 sm:py-32">
      <Container wide>
        <Reveal className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <h2 className="rl-display mt-6 text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">
              Video from our jobs.
            </h2>
          </div>
          <a
            href={BUSINESS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[2px] border border-[var(--line-2)] bg-[var(--paper)] px-5 py-3 text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
          >
            <Instagram className="h-4 w-4" /> {BUSINESS.instagramHandle}
          </a>
        </Reveal>
      </Container>

      {/* Full-bleed auto-scrolling rail of real job footage. */}
      <ReelRail />

      <Container wide>
        <div className="mt-9 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-[13px] font-light text-[var(--ink-faint)]">
            Select any clip to play it with sound.
          </p>
          <a href="#quote-form"
            className="group inline-flex h-[46px] items-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--char-2)]"
           onClick={(e) => { if (goToQuoteForm()) e.preventDefault(); }}>
            Get a quote for your job
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
          </a>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Sectors we serve                                                 */
/* ---------------------------------------------------------------- */

export function Sectors({ place }: { place?: string } = {}) {
  return (
    <section id="sectors" className="scroll-mt-24 bg-[var(--paper)] py-24 sm:py-32">
      <Container wide>
        <Reveal className="max-w-3xl">
          <h2 className="rl-display text-[clamp(2.2rem,4.6vw,3.8rem)] text-[var(--ink)]">
            Designers, showrooms, galleries and private clients.
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-x-12 gap-y-10 border-t border-[var(--line)] pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((s, i) => (
            <Reveal as="div" key={s.t} delay={(i % 3) * 70}>
              <h3 className="text-[1.1rem] font-semibold text-[var(--ink)]">{s.t}</h3>
              <p className="mt-2.5 text-[14.5px] font-light leading-relaxed text-[var(--ink-soft)]">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* FAQ — also the FAQPage structured data surface                   */
/* ---------------------------------------------------------------- */

export function Faq({ place }: { place?: string } = {}) {
  const [open, setOpen] = useState<number | null>(0);
  // Localise the coverage answer so the page is genuinely about this suburb.
  const faqs = place
    ? FAQS.map((f) =>
        f.q.startsWith('Which areas')
          ? { q: `Do you service ${place}?`, a: `Yes. ${place} is part of our regular Melbourne coverage, dispatched from our warehouse at ${BUSINESS.address}. We also cover the rest of Melbourne metro and regional Victoria, with interstate work by arrangement.` }
          : f,
      )
    : FAQS;
  return (
    <section id="faq" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-32">
      <Container wide className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
            Frequently asked questions.
          </h2>
          <p className="mt-6 max-w-sm text-[15px] font-light leading-relaxed text-[var(--ink-soft)]">
            Something not covered here? Call {BUSINESS.phone} and we'll talk it through.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <ul className="border-t border-[var(--line-2)]">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q} className="border-b border-[var(--line-2)]">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-6 py-6 text-left"
                  >
                    <span className="text-[16.5px] font-medium text-[var(--ink)]">{f.q}</span>
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]">
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                  <div
                    className="grid transition-all duration-500 ease-out"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-10 text-[15px] font-light leading-relaxed text-[var(--ink-soft)]">
                        {f.a}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Coverage                                                         */
/* ---------------------------------------------------------------- */

export function Coverage() {
  return (
    <section className="bg-[var(--char)] py-20 text-white sm:py-24">
      <Container wide className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 className="rl-display text-[clamp(1.9rem,3.6vw,3rem)] text-white">
            Melbourne metro
            <span className="block font-light text-white/70">and regional Victoria.</span>
          </h2>
          <p className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-white/55">
            Our warehouse sits at {BUSINESS.address}. From there we service the whole of Melbourne and
            regional Victoria, with interstate work by arrangement.
          </p>
        </Reveal>
        <Reveal delay={120}>
          {/* A sample of real, linked suburb pages. Listing all of them here
              would bury the section, so the rest live behind /areas. */}
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3">
            {FEATURED_AREAS.map((a) => (
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
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              to="/areas"
              className="group inline-flex h-[48px] items-center gap-2 rounded-[2px] bg-white px-6 text-[14px] font-medium text-[var(--ink)] transition-colors hover:bg-white/90"
            >
              View all {AREAS_DATA.length} service areas
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
            </Link>
            <p className="text-[13px] font-light text-white/45">Not listed? We travel. Ask us.</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
