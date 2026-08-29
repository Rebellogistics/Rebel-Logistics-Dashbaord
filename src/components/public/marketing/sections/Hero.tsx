import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BUSINESS, IMG } from '../site/data';
import { Button, Container, prefersReducedMotion, useScrollProgress } from '../site/ui';

// Kept short so each line breaks predictably at every width.
const PHRASES = [
  ['Handled like', "it's irreplaceable."],
  ['Delivered, installed,', 'placed precisely.'],
  ['The partner luxury', 'interiors rely on.'],
];

export function Hero() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  // Read duration imperatively as well as from the event. When the file is
  // already cached, `loadedmetadata` can fire before React attaches its
  // handler, leaving duration at 0 so the scrub never runs and the hero
  // looks frozen. Listening on the element covers both orderings.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      const d = v.duration;
      if (Number.isFinite(d) && d > 0) setDuration((prev) => (prev === d ? prev : d));
    };
    sync();
    v.addEventListener('loadedmetadata', sync);
    v.addEventListener('durationchange', sync);
    v.addEventListener('canplay', sync);
    // The hero is scrubbed, never played. If anything starts playback
    // (autoplay heuristics, a restored session), pin it back to paused.
    const pin = () => v.pause();
    v.addEventListener('play', pin);
    return () => {
      v.removeEventListener('loadedmetadata', sync);
      v.removeEventListener('durationchange', sync);
      v.removeEventListener('canplay', sync);
      v.removeEventListener('play', pin);
    };
  }, [reduced]);

  // Scrub the video to scroll position. The source is encoded with a keyframe
  // on every frame, so seeking is cheap and stays smooth.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !duration || reduced) return;
    const target = Math.min(duration - 0.05, progress * duration);
    if (Math.abs(v.currentTime - target) > 0.015) v.currentTime = target;
  }, [progress, duration, reduced]);

  // Map 0..1 onto 0..(last index) so the final phrase lands exactly on itself
  // and stays fully visible at the end of the scroll instead of fading to zero.
  const phraseFloat = progress * (PHRASES.length - 1);
  const active = Math.min(PHRASES.length - 1, Math.round(phraseFloat));

  return (
    <section ref={ref} className="relative h-[280vh]" aria-label="Rebel Logistics">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-[var(--char)]">
        {reduced ? (
          <img
            src={IMG.heroStill}
            alt="A Rebel Logistics handler wrapping a designer armchair in protective blankets"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src={IMG.heroVideo}
            poster={IMG.heroStill}
            muted
            playsInline
            preload="auto"
            aria-hidden
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          />
        )}

        {/* Scrims */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(15,13,9,0.52) 0%, rgba(15,13,9,0.04) 26%, rgba(15,13,9,0.14) 54%, rgba(15,13,9,0.8) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,13,9,0.58) 0%, rgba(15,13,9,0.08) 50%, transparent 74%)' }} />

        <Container wide className="relative flex h-full flex-col justify-end pb-[13vh] sm:pb-[11vh]">
          <div className="max-w-[52rem]">
            <div className="mb-6 flex items-center gap-3">
              <span aria-hidden className="inline-block h-px w-9 bg-white/40" />
              <span className="rl-kicker !gap-0 text-white/70">
                {BUSINESS.suburb}&nbsp; ·&nbsp; Est. {BUSINESS.founded}
              </span>
            </div>

            {/* Stacked in one grid cell: the box auto-sizes to the tallest
                phrase, so nothing can overlap the paragraph below. */}
            <div className="grid">
              {PHRASES.map((lines, i) => {
                const dist = Math.abs(phraseFloat - i);
                const opacity = reduced ? (i === 0 ? 1 : 0) : Math.max(0, 1 - dist * 1.7);
                const y = reduced ? 0 : (phraseFloat - i) * -16;
                // Only the first phrase is the document h1. The others are
                // decorative duplicates for the scroll crossfade; three h1s
                // would be both an SEO and a screen-reader defect.
                const Tag = (i === 0 ? 'h1' : 'div') as 'h1' | 'div';
                return (
                  <Tag
                    key={i}
                    className="rl-display [grid-area:1/1] text-[clamp(2.35rem,6vw,5.2rem)] text-white"
                    style={{
                      opacity,
                      transform: `translateY(${y}px)`,
                      transition: 'opacity 140ms linear',
                      pointerEvents: i === active ? undefined : 'none',
                    }}
                    aria-hidden={i !== 0 ? true : undefined}
                  >
                    <span className="block whitespace-nowrap font-medium">{lines[0]}</span>
                    <span className="block whitespace-nowrap font-light text-white/85">{lines[1]}</span>
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
              <a
                href="#services"
                className="inline-flex h-[52px] items-center justify-center rounded-[2px] border border-white/25 px-8 text-[14px] font-medium text-white/90 transition-colors hover:border-white hover:text-white"
              >
                Our services
              </a>
            </div>
          </div>
        </Container>

        {/* Progress hairline */}
        <div className="absolute bottom-0 left-0 h-px w-full bg-white/10">
          <div className="h-full origin-left bg-white/70" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
