import { Link } from 'react-router-dom';

const TEXT_BTN =
  'text-[var(--color-ghost-white)] hover:text-[var(--color-dim-gray)] transition-colors';

export function Footer() {
  return (
    <footer className="mt-[48px] border-t border-[var(--color-muted-ash)]">
      <div className="mx-auto max-w-[1600px] px-[26.5px] py-[32px] flex flex-col md:flex-row md:items-end md:justify-between gap-[16px]">
        <div className="space-y-[8px] text-[var(--color-dim-gray)]">
          <p className="text-[var(--color-ghost-white)]">rebel_logistics © 2026</p>
          {/* ABN — same placeholder as the Coverage card; swap once in both places */}
          <p>abn · 00 000 000 000</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-[16px] gap-y-[8px]">
          <a href="#services" className={TEXT_BTN}>[ services ]</a>
          <a href="#process" className={TEXT_BTN}>[ process ]</a>
          <a href="#coverage" className={TEXT_BTN}>[ coverage ]</a>
          <Link to="/quote" className={TEXT_BTN}>[ get a quote ]</Link>
        </nav>
      </div>
      <div className="mx-auto max-w-[1600px] px-[26.5px] pb-[26.5px] text-[var(--color-dim-gray)]">
        {/* BUILT_LINK — optional credit line, delete this whole <p> if Yamin prefers */}
        <p>built by sumanyu</p>
      </div>
    </footer>
  );
}
