import { Card, Hairline, REBEL_SUPPORT_PHONE } from '../components';

function Pill({ children, outlined }: { children: React.ReactNode; outlined?: boolean }) {
  const base =
    'inline-flex items-center px-[12px] py-[6px] rounded-[10px] text-[var(--color-ghost-white)]';
  return (
    <span
      className={
        outlined
          ? `${base} bg-transparent border border-[var(--color-muted-ash)]`
          : `${base} bg-[var(--color-steel-gray)] border border-transparent`
      }
    >
      {children}
    </span>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  const valueEl = href ? (
    <a href={href} className="text-[var(--color-ghost-white)] hover:text-[var(--color-dim-gray)]">
      {value}
    </a>
  ) : (
    <span className="text-[var(--color-ghost-white)]">{value}</span>
  );
  return (
    <div className="flex flex-wrap items-baseline gap-[8px]">
      <span className="text-[var(--color-dim-gray)] min-w-[64px]">{label}</span>
      <span aria-hidden className="text-[var(--color-dim-gray)]">·</span>
      {valueEl}
    </div>
  );
}

export function Coverage() {
  const telHref = `tel:${REBEL_SUPPORT_PHONE.replace(/\s+/g, '')}`;

  return (
    <section id="coverage" className="py-[48px] scroll-mt-[80px]">
      <h2 className="text-[var(--color-ghost-white)]">
        <span aria-hidden>#</span> coverage
      </h2>
      <Hairline className="mt-[8px]" />

      <div className="mt-[32px] grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <Card className="p-[26.5px] space-y-[16px]">
          <h3 className="text-[var(--color-ghost-white)]">
            <span aria-hidden>#</span> zones
          </h3>
          <div className="flex flex-wrap gap-[8px]">
            <Pill>METRO</Pill>
            <Pill outlined>REGIONAL</Pill>
          </div>
          <p className="text-[var(--color-dim-gray)]">
            {/* ZONES_COPY */}
            sydney metro within 50km of the CBD, same-day quote turnaround. regional runs to
            wollongong, central coast, newcastle, blue mountains — book 48h ahead.
          </p>
        </Card>

        <Card className="p-[26.5px] space-y-[16px]">
          <h3 className="text-[var(--color-ghost-white)]">
            <span aria-hidden>#</span> contact
          </h3>
          <div className="space-y-[8px]">
            <Row label="phone" value={REBEL_SUPPORT_PHONE} href={telHref} />
            <Row
              label="email"
              /* EMAIL */
              value="hello@rebellogistics.com.au"
              href="mailto:hello@rebellogistics.com.au"
            />
            <Row
              label="abn"
              /* ABN */
              value="00 000 000 000"
            />
            <Row
              label="hours"
              /* HOURS */
              value="mon–sat · 07:00–19:00 AEST"
            />
          </div>
        </Card>
      </div>
    </section>
  );
}
