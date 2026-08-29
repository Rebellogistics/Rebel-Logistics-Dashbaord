import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { REELS, type Reel } from './data';
import { cx } from './ui';

/* ------------------------------------------------------------------ */
/* Auto-scrolling reel rail (right to left), muted autoplay tiles      */
/* ------------------------------------------------------------------ */

export function ReelRail({ fade = 'var(--paper-2)' }: { fade?: string }) {
  const [open, setOpen] = useState<number | null>(null);

  // Shuffle once per mount so the rail does not always open on the same clip.
  const order = useMemo(() => {
    const a = REELS.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // Three copies: the track must exceed twice the viewport so the -50%
  // translate never exposes an empty gap on wide screens.
  const row = [...order, ...order, ...order];

  return (
    <>
      <div className="rl-marquee relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-24"
          style={{ background: `linear-gradient(90deg, ${fade}, transparent)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-24"
          style={{ background: `linear-gradient(270deg, ${fade}, transparent)` }}
        />
        <div className="rl-marquee-track gap-3" style={{ ['--rl-marquee-dur' as string]: '72s' }}>
          {row.map((idx, i) => (
            <ReelTile key={`${idx}-${i}`} reel={REELS[idx]} onOpen={() => setOpen(idx)} />
          ))}
        </div>
      </div>
      {open !== null && <ReelModal index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ReelTile({ reel, onOpen }: { reel: Reel; onOpen: () => void }) {
  const vref = useRef<HTMLVideoElement | null>(null);

  // Only play while on screen, so a rail of clips stays cheap.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Play: ${reel.title}`}
      className="group relative aspect-[9/16] w-[228px] shrink-0 overflow-hidden rounded-[2px] border border-[var(--line)] bg-[var(--char)] text-left sm:w-[320px]"
    >
      {/* Silent low-res loop keeps the rail light; the popup plays the
          full-quality clip with sound. */}
      <video
        ref={vref}
        src={reel.preview}
        poster={reel.poster}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,8,5,0.85)] via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-white">{reel.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] font-light text-white/65">{reel.caption}</p>
          <p className="mt-1.5 text-[11px] tracking-[0.08em] text-white/50">{reel.duration}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-colors group-hover:border-white group-hover:bg-white group-hover:text-[var(--ink)]">
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modal player — sound on, native controls, prev/next                 */
/* ------------------------------------------------------------------ */

function ReelModal({ index, onClose }: { index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const vref = useRef<HTMLVideoElement | null>(null);
  const reel = REELS[i];

  const go = useCallback((d: number) => setI((v) => (v + d + REELS.length) % REELS.length), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, go]);

  // Autoplay with sound on when the dialog opens or the clip changes.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      // Some browsers block unmuted autoplay; fall back to muted playback.
      v.muted = true;
      v.play().catch(() => {});
    });
  }, [i]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={reel.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(8,7,5,0.92)] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--ink)]"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Previous"
        onClick={(e) => { e.stopPropagation(); go(-1); }}
        className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={(e) => { e.stopPropagation(); go(1); }}
        className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-white sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        className="flex w-full max-w-[420px] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={vref}
          key={reel.slug}
          src={reel.src}
          poster={reel.poster}
          controls
          playsInline
          autoPlay
          className="max-h-[76vh] w-full rounded-[2px] bg-black"
        />
        <div className="mt-4 w-full text-left">
          <p className="text-[15px] font-medium text-white">{reel.title}</p>
          <p className="mt-1 text-[13px] font-light leading-relaxed text-white/60">{reel.caption}</p>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {REELS.map((r, n) => (
            <button
              key={r.slug}
              type="button"
              aria-label={`Go to ${r.title}`}
              onClick={() => setI(n)}
              className={cx('h-1 rounded-full transition-all', n === i ? 'w-6 bg-white' : 'w-2 bg-white/30')}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
