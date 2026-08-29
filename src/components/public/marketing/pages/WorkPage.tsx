import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { SiteHeader, SiteFooter } from '../site/Chrome';
import { BUSINESS, CLIENTS, IMG, PHOTO } from '../site/data';
import { Button, Container, Marquee, Reveal, cx , goToQuoteForm } from '../site/ui';
import { ReelRail } from '../site/Reels';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';

/* ------------------------------------------------------------------ */
/* Labelled chapters of real work                                     */
/* ------------------------------------------------------------------ */

type Chapter = {
  id: string;
  index: string;
  title: string;
  lead: string;
  body: string;
  images: { src: string; caption: string }[];
};

const CHAPTERS: Chapter[] = [
  {
    id: 'craning',
    index: '01',
    title: 'Heavy lift and craning',
    lead: 'Craning crated furniture and stone into sites with no other access.',
    body: 'Crated furniture and full-height stone craned over pool houses, glass balustrades and tight side access. The lift is surveyed, planned and permitted before the truck is loaded, never improvised on the day.',
    images: [
      { src: IMG.craneAirborne, caption: 'A crate airborne above a glass pool house' },
      { src: IMG.craneLift, caption: 'Setting the lift from the street' },
      { src: IMG.craneVertical, caption: 'Clearing the roofline into the rear garden' },
      { src: PHOTO('IMG-20200313-WA0014.jpg'), caption: 'Spotting the load in' },
    ],
  },
  {
    id: 'stone',
    index: '02',
    title: 'Stone and surfaces',
    lead: 'Full-height slabs delivered and set without damage.',
    body: 'Marble and engineered slabs travel on purpose-built A-frames, protected at every edge and walked into position by hand. One wrong angle ends a slab, so nothing is rushed.',
    images: [
      { src: IMG.marble, caption: 'Slabs staged on site before placement' },
      { src: PHOTO('IMG-20200313-WA0024.jpg'), caption: 'Braced and upright for the walk-in' },
      { src: PHOTO('IMG-20200313-WA0023.jpg'), caption: 'Protected ground before the walk-in' },
      { src: PHOTO('IMG-20200313-WA0024.jpg'), caption: 'Hand-carrying the final metres' },
    ],
  },
  {
    id: 'installation',
    index: '03',
    title: 'Designer installation',
    lead: 'Whole rooms delivered, assembled and positioned to the drawing.',
    body: 'Whole rooms installed in a single visit for interior designers and showrooms: protection down first, pieces assembled in place, packaging removed. The room is finished when we leave, not started.',
    images: [
      { src: IMG.lounge, caption: 'A finished living room, styled and placed' },
      { src: IMG.loungeWide, caption: 'The wider room, complete' },
      { src: IMG.dining, caption: 'Formal dining, seated and aligned' },
      { src: IMG.chandelier, caption: 'A bespoke lighting installation assembled on site' },
    ],
  },
  {
    id: 'art',
    index: '04',
    title: 'Art and gallery handling',
    lead: 'Crating, transport, positioning and hanging for galleries and collections.',
    body: 'Crating, transport, positioning and hanging for galleries, dealers and private collections. Handled with gloves, measured twice and hung to the millimetre.',
    images: [
      { src: IMG.artHall, caption: 'A private residence gallery corridor' },
      { src: IMG.artDetail, caption: 'Positioned and levelled' },
      { src: PHOTO('IMG_3506.jpg'), caption: 'Works hung along the approach' },
      { src: PHOTO('IMG_3507.jpg'), caption: 'The finished hang' },
    ],
  },
  {
    id: 'warehouse',
    index: '05',
    title: 'Warehousing and 3PL',
    lead: 'Storage per cubic metre, container unpack and 3PL.',
    body: 'Wrapped, palletised and stored per cubic metre at our Flemington warehouse. Container unpack, short and long-term storage, and delivery piece by piece on your schedule.',
    images: [
      { src: IMG.warehouse, caption: 'High-value stock wrapped and palletised' },
      { src: IMG.warehouseAlt, caption: 'Racked and catalogued' },
      { src: PHOTO('IMG_3816 2.jpg'), caption: 'Ready for despatch' },
      { src: PHOTO('IMG_3811 2.jpg'), caption: 'Our crane truck on the yard' },
    ],
  },
  {
    id: 'onsite',
    index: '06',
    title: 'On site with the crew',
    lead: 'Wrapping, protection and handling on site.',
    body: 'Protective wrapping, poolside handling, showroom resets and the patient work of getting large pieces through small openings.',
    images: [
      { src: IMG.wrapping, caption: 'Protective wrapping before the move' },
      { src: IMG.crew, caption: 'Planning the approach on site' },
      { src: PHOTO('IMG-20200313-WA0030.jpg'), caption: 'Poolside handling, protected ground' },
      { src: PHOTO('IMG-20200313-WA0018.jpg'), caption: 'Working the piece into position' },
    ],
  },
];

export default function WorkPage() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(CHAPTERS[0].id);

  useSeo({
    title: 'Our Work | Rebel Logistics Melbourne',
    description:
      'Real Rebel Logistics jobs across Melbourne: crane lifts, stone slabs, designer installations, art handling and warehousing. Photography and film from site.',
    path: '/work',
    image: IMG.craneAirborne,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Track which chapter is in view for the sticky guide.
  useEffect(() => {
    const onScroll = () => {
      let current = CHAPTERS[0].id;
      for (const c of CHAPTERS) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= 220) current = c.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="rl min-h-screen">
      <SiteHeader overHero />
      <main>
        {/* Hero */}
        <section className="relative flex h-[72vh] min-h-[500px] items-end overflow-hidden bg-[var(--char)]">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/site/reels/bg/logistics.mp4"
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
                <span className="rl-kicker !gap-0 text-white/70">Selected work</span>
              </div>
              <h1 className="rl-display max-w-4xl text-[clamp(2.6rem,6vw,5rem)] text-white">
                <span className="block font-medium">Our work</span>
                <span className="block font-light text-white/80">across Melbourne.</span>
              </h1>
              <p className="mt-7 max-w-xl text-[clamp(1rem,1.35vw,1.14rem)] font-light leading-relaxed text-white/70">
                Real photography and film from Melbourne's finest homes, showrooms and galleries. Craned in,
                wrapped, assembled and placed exactly where they belong.
              </p>
            </Reveal>
          </Container>
        </section>

        {/* Client logos */}
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

        {/* Chapters with a sticky guide */}
        <section className="bg-[var(--paper)] py-20 sm:py-28">
          <Container wide className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
            {/* Guide */}
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="rl-kicker text-[var(--ink-faint)]">Contents</p>
                <ul className="mt-6 space-y-1">
                  {CHAPTERS.map((c) => (
                    <li key={c.id}>
                      <a
                        href={`#${c.id}`}
                        className={cx(
                          'flex items-baseline gap-3 border-l py-2 pl-4 text-[14px] transition-colors',
                          active === c.id
                            ? 'border-[var(--accent)] font-medium text-[var(--ink)]'
                            : 'border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--ink-soft)]',
                        )}
                      >
                        <span className="text-[11px] tabular-nums">{c.index}</span>
                        {c.title}
                      </a>
                    </li>
                  ))}
                </ul>
                <a href="#enquire"
                  className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--ink)] hover:text-[var(--accent)]"
                 onClick={(e) => { if (goToQuoteForm()) e.preventDefault(); }}>
                  Enquire <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </aside>

            {/* Chapter bodies */}
            <div className="space-y-24 sm:space-y-32">
              {CHAPTERS.map((c) => (
                <article key={c.id} id={c.id} className="scroll-mt-28">
                  <Reveal>
                    <div className="flex items-baseline gap-4">
                      <span className="rl-display text-[1.3rem] text-[var(--accent)]">{c.index}</span>
                      <span aria-hidden className="h-px flex-1 bg-[var(--line-2)]" />
                    </div>
                    <h2 className="rl-display mt-6 text-[clamp(1.9rem,3.4vw,2.9rem)] text-[var(--ink)]">
                      {c.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-[17px] font-light leading-relaxed text-[var(--ink-soft)]">
                      {c.lead}
                    </p>
                    <p className="mt-3 max-w-2xl text-[15px] font-light leading-relaxed text-[var(--ink-faint)]">
                      {c.body}
                    </p>
                  </Reveal>

                  <div className="mt-10 grid gap-4 sm:grid-cols-2">
                    {c.images.map((im, i) => (
                      <Reveal as="figure" media key={im.src + i} delay={(i % 2) * 80} className="group">
                        <div className="aspect-[4/3] overflow-hidden rounded-[2px]">
                          <img
                            src={im.src}
                            alt={`${c.title}: ${im.caption}, Melbourne`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
                          />
                        </div>
                        <figcaption className="mt-2.5 text-[13px] font-light text-[var(--ink-faint)]">
                          {im.caption}
                        </figcaption>
                      </Reveal>
                    ))}
                  </div>
                  {/* Halfway down, offer a way out that is not the footer. */}
                  {c.id === 'installation' && (
                    <Reveal className="mt-16 border-y border-[var(--line)] bg-[var(--paper-2)] px-7 py-9">
                      <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                        <div>
                          <p className="rl-display text-[1.4rem] text-[var(--ink)]">
                            Something like this to move?
                          </p>
                          <p className="mt-1.5 text-[14.5px] font-light text-[var(--ink-soft)]">
                            We reply the same business day.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                          <a
                            href="#enquire"
                            onClick={(e) => { if (goToQuoteForm()) e.preventDefault(); }}
                            className="group inline-flex h-[46px] items-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--char-2)]"
                          >
                            Request a quote
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
                          </a>
                          <a
                            href={`tel:${BUSINESS.phoneIntl}`}
                            className="inline-flex h-[46px] items-center gap-2 rounded-[2px] border border-[var(--line-2)] px-6 text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink)]"
                          >
                            <Phone className="h-4 w-4" strokeWidth={1.7} />
                            {BUSINESS.phone}
                          </a>
                        </div>
                      </div>
                    </Reveal>
                  )}
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* Film */}
        <section id="film" className="scroll-mt-24 overflow-hidden bg-[var(--paper-2)] py-20 sm:py-24">
          <Container wide>
            <Reveal className="mb-10 max-w-2xl">
              <h2 className="rl-display text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">
                Film from site.
              </h2>
            </Reveal>
          </Container>
          <ReelRail />
          <Container wide>
            <div className="mt-9 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <p className="text-[13px] font-light text-[var(--ink-faint)]">
                Select any clip to play it with sound.
              </p>
              <a href="#enquire"
                className="group inline-flex h-[46px] items-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--char-2)]"
               onClick={(e) => { if (goToQuoteForm()) e.preventDefault(); }}>
                Get a quote for your job
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </a>
            </div>
          </Container>
        </section>

        {/* Enquiry */}
        <section id="enquire" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-28">
          <Container wide className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <Reveal>
              <h2 className="rl-display text-[clamp(2rem,3.8vw,3.1rem)] text-[var(--ink)]">
                Request a quote
                <span className="block font-light text-[var(--ink-soft)]">for your job.</span>
              </h2>
              <p className="mt-6 max-w-md text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">
                Tell us what you're moving and where. We'll come back the same business day with a considered
                plan and a clear price.
              </p>
              <div className="mt-8">
                <Button href={`tel:${BUSINESS.phoneIntl}`} variant="outline" size="lg">
                  {BUSINESS.phone}
                </Button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <LeadForm compact />
            </Reveal>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
