import { useEffect } from 'react';
import { Link, useLocation, useParams, Navigate } from 'react-router-dom';
import { Check, Quote } from 'lucide-react';
import { CLIENTS, GALLERY, IMG } from '../site/data';
import { AUDIENCES, findAudience } from '../site/audiences';
import { Container, Marquee, PhotoRail, Reveal } from '../site/ui';
import { LeadForm } from '../site/LeadForm';
import { useSeo } from '../site/seo';
import { Shell, ImageHero } from './pages';

function useTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

/* ------------------------------------------------------------------ */
/* One audience: the same services, told from the reader's side.       */
/* ------------------------------------------------------------------ */

export function AudiencePage() {
  useTop();
  const { slug } = useParams<{ slug: string }>();
  const audience = slug ? findAudience(slug) : undefined;

  // Called before the guard below so the hook order never changes between an
  // known slug and an unknown one.
  useSeo({
    title: audience?.seoTitle ?? 'Rebel Logistics',
    description: audience?.seoDescription ?? '',
    path: audience ? `/for/${audience.slug}` : '/',
    image: audience?.image ?? IMG.artHall,
    service: audience ? { name: audience.label, description: audience.seoDescription } : undefined,
  });

  if (!audience) return <Navigate to="/" replace />;

  return (
    <Shell overHero>
      <ImageHero
        eyebrow="Who we work with"
        title={audience.title}
        lead={audience.lead}
        image={audience.image}
        alt={audience.imageAlt}
      />

      <section className="border-y border-[var(--line)] bg-[var(--paper)] py-12">
        <div>
          <Marquee logos={CLIENTS} />
        </div>
      </section>

      {/* The reader's problem, before any pitch. */}
      <section className="bg-[var(--paper)] py-24 sm:py-28">
        <Container wide className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <Reveal>
            <h2 className="rl-display text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">
              {audience.problem.heading}
            </h2>
          </Reveal>
          <Reveal delay={120} className="flex flex-col gap-5">
            {audience.problem.body.map((p) => (
              <p key={p.slice(0, 40)} className="text-[16.5px] font-light leading-relaxed text-[var(--ink-soft)]">
                {p}
              </p>
            ))}
          </Reveal>
        </Container>
      </section>

      <section className="overflow-hidden bg-[var(--paper)]">
        <PhotoRail images={GALLERY.slice(0, 8).map((g) => g.src)} fade="var(--paper)" size="lg" />
      </section>

      {/* What they actually get. */}
      <section className="bg-[var(--paper-2)] py-24 sm:py-28">
        <Container wide className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <Reveal>
            <h3 className="rl-kicker text-[var(--ink-faint)]">What's included</h3>
            <h2 className="rl-display mt-5 text-[clamp(1.9rem,3.4vw,2.8rem)] text-[var(--ink)]">
              Everything between the showroom and the finished room.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line-2)]">
              {audience.included.map((item) => (
                <li key={item} className="flex items-start gap-4 py-5">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.8} />
                  <span className="text-[16.5px] leading-relaxed text-[var(--ink)]">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      {/* How a job runs. Numbered because it genuinely is a sequence. */}
      <section className="bg-[var(--paper)] py-24 sm:py-28">
        <Container wide>
          <Reveal className="max-w-3xl">
            <h2 className="rl-display text-[clamp(2rem,4vw,3.2rem)] text-[var(--ink)]">How a job runs.</h2>
          </Reveal>
          <div className="mt-14 grid gap-x-14 gap-y-10 border-t border-[var(--line)] pt-12 sm:grid-cols-2">
            {audience.process.map((step, i) => (
              <Reveal as="div" key={step.t} delay={(i % 2) * 80}>
                <div className="flex items-baseline gap-4">
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[1.15rem] font-semibold text-[var(--ink)]">{step.t}</h3>
                </div>
                <p className="mt-3 pl-9 text-[16px] font-light leading-relaxed text-[var(--ink-soft)]">{step.d}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* A real review from this segment. Verbatim — see audiences.ts. */}
      <section className="bg-[var(--char)] py-20 text-white sm:py-28">
        <Container className="text-center">
          <Reveal>
            <Quote className="mx-auto h-7 w-7 text-[var(--accent-3)]" strokeWidth={1.4} />
            <blockquote className="mx-auto mt-8 max-w-[62ch] text-[clamp(1.1rem,2vw,1.45rem)] font-light leading-relaxed text-white/90">
              {audience.quote.text}
            </blockquote>
            <div className="mx-auto mt-8 w-fit border-t border-white/15 pt-5">
              <p className="text-[15px] text-white">{audience.quote.name}</p>
              <p className="mt-1 text-[13px] text-white/50">{audience.quote.context}</p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Sideways door to the other segments. */}
      {AUDIENCES.length > 1 && (
        <section className="border-t border-[var(--line)] bg-[var(--paper)] py-16">
          <Container wide>
            <h3 className="rl-kicker text-[var(--ink-faint)]">Also work with</h3>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {AUDIENCES.filter((a) => a.slug !== audience.slug).map((a) => (
                <Link
                  key={a.slug}
                  to={`/for/${a.slug}`}
                  className="text-[16.5px] text-[var(--ink)] underline decoration-[var(--line-2)] underline-offset-4 transition-colors hover:decoration-[var(--accent)]"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section id="quote" className="scroll-mt-24 bg-[var(--paper-2)] py-24 sm:py-28">
        <Container wide>
          <LeadForm />
        </Container>
      </section>
    </Shell>
  );
}
