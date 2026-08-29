import { Card, Hairline } from '../components';

type Step = {
  index: string;
  name: string;
  detail: string;
};

const STEPS: Step[] = [
  { index: '01', name: 'QUOTE',     detail: '60-second form → instant SMS confirmation' },
  { index: '02', name: 'BOOKED',    detail: 'driver assigned, calendar invite issued' },
  { index: '03', name: 'EN_ROUTE',  detail: 'live SMS with arrival window + driver name' },
  { index: '04', name: 'DELIVERED', detail: 'photo proof + payment link + review request' },
];

const NAME_PAD = Math.max(...STEPS.map((s) => s.name.length));

export function Process() {
  return (
    <section id="process" className="py-[48px] scroll-mt-[80px]">
      <h2 className="text-[var(--color-ghost-white)]">
        <span aria-hidden>#</span> process
      </h2>
      <Hairline className="mt-[8px]" />

      <Card className="mt-[32px] p-[26.5px]">
        <ul className="space-y-[16px]">
          {STEPS.map((step) => (
            <li key={step.index} className="whitespace-pre-wrap break-words">
              <span className="text-[var(--color-ghost-white)]">
                [{step.index}] {step.name.padEnd(NAME_PAD, ' ')}
              </span>
              <span aria-hidden className="text-[var(--color-dim-gray)]">  ·  </span>
              <span className="text-[var(--color-dim-gray)]">{step.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
