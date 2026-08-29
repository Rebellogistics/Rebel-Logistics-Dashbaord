import { Card, Hairline, SubtleButton } from '../components';

type Service = {
  index: string;
  name: string;
  basis: string;
  features: string[];
  price: string;
};

const SERVICES: Service[] = [
  {
    index: '01',
    name: 'STANDARD',
    basis: '[FLAT-RATE]',
    features: [
      '2-person crew, fully insured',
      'blankets + dollies included',
      'sydney metro + regional',
    ],
    /* PRICE — placeholder; pull from src/lib/pricing.ts in a follow-up */
    price: '249',
  },
  {
    index: '02',
    name: 'WHITE_GLOVE',
    basis: '[FLAT-RATE]',
    features: [
      'wrap + pad every item',
      'disassemble + reassemble onsite',
      'photo proof at drop-off',
    ],
    /* PRICE */
    price: '449',
  },
  {
    index: '03',
    name: 'HOUSE_MOVE',
    basis: '[HOURLY]',
    features: [
      '2-hour minimum, then per-hour',
      'priced live in the quote form',
      'travel time billed at half-rate',
    ],
    /* PRICE */
    price: '129/hr',
  },
];

export function Services() {
  return (
    <section id="services" className="py-[48px] scroll-mt-[80px]">
      <h2 className="text-[var(--color-ghost-white)]">
        <span aria-hidden>#</span> services
      </h2>
      <Hairline className="mt-[8px]" />

      <div className="mt-[32px] grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        {SERVICES.map((svc) => (
          <Card key={svc.index} className="p-[26.5px] flex flex-col gap-[16px]">
            <header className="flex items-baseline justify-between gap-[8px]">
              <span className="text-[var(--color-ghost-white)]">
                {svc.index} / {svc.name}
              </span>
              <span className="text-[var(--color-dim-gray)]">{svc.basis}</span>
            </header>

            <ul className="space-y-[8px] text-[var(--color-dim-gray)]">
              {svc.features.map((feature) => (
                <li key={feature}>
                  <span aria-hidden className="text-[var(--color-ghost-white)]">&gt;</span>{' '}
                  {feature}
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between gap-[8px]">
              <span className="text-[var(--color-ghost-white)]">from ${svc.price}</span>
              <span className="text-[var(--color-dim-gray)]">ex GST</span>
            </div>

            <SubtleButton
              to="/quote"
              className="w-full px-[19.2px] py-[12.8px]"
            >
              REQUEST →
            </SubtleButton>
          </Card>
        ))}
      </div>
    </section>
  );
}
