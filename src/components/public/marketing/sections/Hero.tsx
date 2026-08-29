import { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { BUSINESS, HERO_FRAMES, type HeroFrame } from '../site/data';
import { Button, Container, cx, prefersReducedMotion } from '../site/ui';

/** Below this width the hero auto-advances and sets the copy under the image. */
const MOBILE_MAX = 767;

export function Hero({ frames = HERO_FRAMES, callCta = false }: { frames?: HeroFrame[]; callCta?: boolean } = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Start every load at the top so the first frame is always frame one.
  useEffect(() => {
    if ('scrollRestoration' in history) {
      const prev = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
      return () => {
        history.scrollRestoration = prev;
      };
    }
  }, []);

  return isMobile
    ? <MobileHero reduced={reduced} frames={frames} callCta={callCta} />
    : <DesktopHero reduced={reduced} frames={frames} callCta={callCta} />;
}

/* ------------------------------------------------------------------ */
/* Mobile: image leads, copy sits beneath it, frames advance on their  */
/* own. Scroll-scrubbing a sticky panel on a phone fights the thumb    */
/* and buries the words under the picture.                             */
/* ------------------------------------------------------------------ */

function MobileHero({ reduced, frames, callCta }: { reduced: boolean; frames: HeroFrame[]; callCta: boolean }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % frames.length), 4200);
    return () => window.clearInterval(id);
  }, [reduced]);

  const f = HERO_FRAMES[i];

  return (
    <section className="bg-[var(--paper)] pt-[76px]" aria-label="Rebel Logistics">
      {/* Image, uncovered */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--char)]">
        {frames.map((frame, n) => (
          <img
            key={frame.src}
            src={frame.src}
            alt={n === 0 ? frame.alt : ''}
            aria-hidden={n !== 0 ? true : undefined}
            loading={n === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: n === i ? 1 : 0,
              transform: n === i && !reduced ? 'scale(1.06)' : 'scale(1)',
              transition: 'opacity 900ms ease-out, transform 6000ms linear',
            }}
          />
        ))}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(252,251,248,0.9) 82%, var(--paper))' }}
        />
      </div>

      {/* Copy, on the page rather than over the picture */}
      <Container className="pb-14 pt-7">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-8 bg-[var(--line-2)]" />
          <span className="rl-kicker !gap-0 text-[var(--ink-faint)]">
            {BUSINESS.suburb}&nbsp; ·&nbsp; Est. {BUSINESS.founded}
          </span>
        </div>

        <div className="mt-5 grid">
          {frames.map((frame, n) => (
            <h1
              key={frame.src}
              className="rl-display [grid-area:1/1] text-[clamp(2.1rem,9vw,2.9rem)] text-[var(--ink)] transition-opacity duration-500"
              style={{ opacity: n === i ? 1 : 0, pointerEvents: n === i ? undefined : 'none' }}
              aria-hidden={n !== 0 ? true : undefined}
            >
              <span className="block font-medium">{frame.line1}</span>
              <span className="block font-light text-[var(--ink-soft)]">{frame.line2}</span>
            </h1>
          ))}
        </div>

        <p className="mt-5 text-[15.5px] font-light leading-relaxed text-[var(--ink-soft)]">
          {BUSINESS.name} is Melbourne's specialist partner for luxury furniture, art and interiors:
          logistics, warehousing and installation, handled with the care your pieces deserve.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Button to="/quote" size="lg" variant="ink" className="w-full">
            Request a quote
            <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          </Button>
          {callCta ? (
            <a
              href={`tel:${BUSINESS.phoneIntl}`}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[2px] border border-[var(--line-2)] px-8 text-[14px] font-medium text-[var(--ink)]"
            >
              <Phone className="h-4 w-4" strokeWidth={1.7} />
              {BUSINESS.phone}
            </a>
          ) : (
            <a
              href="#services"
              className="inline-flex h-[52px] items-center justify-center rounded-[2px] border border-[var(--line-2)] px-8 text-[14px] font-medium text-[var(--ink)]"
            >
              Our services
            </a>
          )}
        </div>

        {/* Tappable frame markers */}
        <div className="mt-7 flex items-center gap-2">
          {frames.map((frame, n) => (
            <button
              key={frame.src}
              type="button"
              aria-label={`Show frame ${n + 1}`}
              onClick={() => setI(n)}
              className="py-3"
            >
              <span
                className={cx(
                  'block h-px transition-all duration-300',
                  n === i ? 'w-10 bg-[var(--ink)]' : 'w-5 bg-[var(--line-2)]',
                )}
              />
            </button>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop: sticky panel, frames crossfade with scroll position.       */
/* ------------------------------------------------------------------ */

function DesktopHero({ reduced, frames, callCta }: { reduced: boolean; frames: HeroFrame[]; callCta: boolean }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % frames.length), 5200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-[var(--char)]" aria-label="Rebel Logistics">
      {frames.map((f, n) => (
        <img
          key={f.src}
          src={f.src}
          alt={n === 0 ? f.alt : ''}
          aria-hidden={n !== 0 ? true : undefined}
          loading={n === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: n === i ? 1 : 0,
            // Slow drift while a frame is on screen; it resets once hidden.
            transform: n === i && !reduced ? 'scale(1.075)' : 'scale(1)',
            transition: 'opacity 1100ms ease-out, transform 7000ms linear',
          }}
        />
      ))}

      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,13,9,0.52) 0%, rgba(15,13,9,0.06) 26%, rgba(15,13,9,0.16) 54%, rgba(15,13,9,0.82) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,13,9,0.6) 0%, rgba(15,13,9,0.1) 52%, transparent 76%)' }} />

      <Container wide className="relative flex h-full flex-col justify-end pb-[13vh] sm:pb-[11vh]">
        <div className="max-w-[52rem]">
          <div className="mb-6 flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-9 bg-white/40" />
            <span className="rl-kicker !gap-0 text-white/70">
              {BUSINESS.suburb}&nbsp; ·&nbsp; Est. {BUSINESS.founded}
            </span>
          </div>

          <div className="grid">
            {frames.map((f, n) => {
              const Tag = (n === 0 ? 'h1' : 'div') as 'h1' | 'div';
              return (
                <Tag
                  key={f.src}
                  className="rl-display [grid-area:1/1] text-[clamp(2.35rem,6vw,5.2rem)] text-white transition-opacity duration-700"
                  style={{ opacity: n === i ? 1 : 0, pointerEvents: n === i ? undefined : 'none' }}
                  aria-hidden={n !== 0 ? true : undefined}
                >
                  <span className="block font-medium">{f.line1}</span>
                  <span className="block font-light text-white/85">{f.line2}</span>
                </Tag>
              );
            })}
          </div>

          <p className="mt-7 max-w-[33rem] text-[clamp(0.98rem,1.3vw,1.12rem)] font-light leading-relaxed text-white/70">
            {BUSINESS.name} is Melbourne's specialist partner for luxury furniture, art and interiors:
            logistics, warehousing and installation, handled with the care your pieces deserve.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button to="/quote" size="lg" variant="light">
              Request a quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} />
            </Button>
            {callCta ? (
              <a
                href={`tel:${BUSINESS.phoneIntl}`}
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[2px] border border-white/25 px-8 text-[14px] font-medium text-white/90 transition-colors hover:border-white hover:text-white"
              >
                <Phone className="h-4 w-4" strokeWidth={1.7} />
                {BUSINESS.phone}
              </a>
            ) : (
              <a
                href="#services"
                className="inline-flex h-[52px] items-center justify-center rounded-[2px] border border-white/25 px-8 text-[14px] font-medium text-white/90 transition-colors hover:border-white hover:text-white"
              >
                Our services
              </a>
            )}
          </div>

          <div className="mt-9 flex items-center gap-2">
            {frames.map((f, n) => (
              <button
                key={f.src}
                type="button"
                aria-label={`Show frame ${n + 1}`}
                onClick={() => setI(n)}
                className="py-2"
              >
                <span
                  className={cx(
                    'block h-px transition-all duration-300',
                    n === i ? 'w-10 bg-white' : 'w-5 bg-white/30',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
