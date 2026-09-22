import { priceJob } from '../src/lib/jobPricing';
import { DEFAULT_RATES } from '../src/lib/pricing';
import type { PricingRates } from '../src/lib/types';

// The calculator's stored rate book, so the figures below are comparable
// with what Yamin has been reading off the sandbox.
const rates: PricingRates = {
  ...DEFAULT_RATES,
  metroPerCubeAud: 100, wgMetroPerCubeAud: 180,
  regionalMinimumAud: 480, wgRegionalMinimumAud: 560,
  hourlyRateAud: 180, hourlyRateLargeAud: 200, minimumHours: 3,
  labourPerHourAud: 60, labourMinLabourers: 2, labourMinHours: 3,
  storageStandardAud: 25, storageHighEndAud: 40, storageInsuredAud: 50,
  shortTermUpliftPct: 20, storageGraceDays: 5,
  container20ftAud: 550, container40ftAud: 800, containerIncludedHours: 2,
  whLabourOutboundAud: 60, whLabourQcAud: 60, whLabourUnloadAud: 60,
  disposalVanAud: 190, disposalTrailerAud: 290,
  disposalTransportAud: 150, disposalTransportLargeAud: 220,
  wgDisposalThresholdM3: 10, fuelLevyPct: 10, fuelLevyOn: true,
  gstPercent: 10, billingIncrementHours: 0.5,
};

const cases: Array<[string, Parameters<typeof priceJob>[0], number]> = [
  ['2 m³ metro standard (3121)', { type: 'Standard', rates, postcode: 3121, cubicMetres: 2 }, 242],
  ['4 m³ Geelong regional (3220)', { type: 'Standard', rates, postcode: 3220, cubicMetres: 4 }, 580.80],
  ['3 m³ WG Brighton (3186)', { type: 'White Glove', rates, postcode: 3186, cubicMetres: 3 }, 653.40],
  ['5 h hourly, standard truck', { type: 'Hourly rate', rates, estimatedHours: 5 }, 1089],
  ['8 h hourly, large truck', { type: 'Hourly rate', rates, estimatedHours: 8, truckSize: 'large' }, 1936],
  ['3.2 h bills 3.5 h', { type: 'Hourly rate', rates, estimatedHours: 3.2 }, 762.30],
  ['1 h bills the 3 h minimum', { type: 'Hourly rate', rates, estimatedHours: 1 }, 653.40],
  ['5 h hourly + van disposal', { type: 'Hourly rate', rates, estimatedHours: 5, disposalLoad: 'van' }, 1463],
  ['3 pax × 5 h labour + $220 packaging', { type: 'Labour', rates, labourers: 3, estimatedHours: 5, packagingAmount: 220 }, 1232],
  ['1 pax × 1 h labour floors to 2 × 3', { type: 'Labour', rates, labourers: 1, estimatedHours: 1 }, 396],
  ['12 m³ 45 d standard storage', { type: 'Storage', rates, warehouseService: 'storage', cubicMetres: 12, storageDays: 45 }, 660],
  ['same, short term', { type: 'Storage', rates, warehouseService: 'storage', cubicMetres: 12, storageDays: 45, storageTerm: 'Short term' }, 792],
  ['same, insured', { type: 'Storage', rates, warehouseService: 'storage', cubicMetres: 12, storageDays: 45, storageTier: 'Insurance added' }, 1320],
  ['12 m³ 45 d + 4 h legs', { type: 'Storage', rates, warehouseService: 'storage', cubicMetres: 12, storageDays: 45, legsHours: 4 }, 1531.20],
  ['40 ft container unload', { type: 'Storage', rates, warehouseService: 'container_unload', containerSize: '40 ft' }, 880],
  ['40 ft + extra unload labour', { type: 'Storage', rates, warehouseService: 'container_unload', containerSize: '40 ft', extraLabourOn: true, whLabourType: 'unload', labourers: 2, estimatedHours: 1.5 }, 1078],
  ['40 ft + requested QC', { type: 'Storage', rates, warehouseService: 'container_unload', containerSize: '40 ft', extraLabourOn: true, whLabourType: 'qc', labourers: 2, estimatedHours: 1.5 }, 1078],
  ['storage + QC on the stock', { type: 'Storage', rates, warehouseService: 'storage', cubicMetres: 12, storageDays: 45, extraLabourOn: true, whLabourType: 'qc', labourers: 2, estimatedHours: 1.5 }, 858],
  ['labour work ignores the extra', { type: 'Storage', rates, warehouseService: 'labour_work', whLabourType: 'qc', labourers: 2, estimatedHours: 1.5, extraLabourOn: true }, 198],
  ['QC check 2 pax × 1.5 h', { type: 'Storage', rates, warehouseService: 'labour_work', whLabourType: 'qc', labourers: 2, estimatedHours: 1.5 }, 198],
  ['WG 14 m³ + trailer disposal', { type: 'White Glove', rates, postcode: 3186, cubicMetres: 14, disposalLoad: 'trailer' }, 3533.20],
  ['WG 8 m³ disposal ignored (under 10 m³)', { type: 'White Glove', rates, postcode: 3186, cubicMetres: 8, disposalLoad: 'trailer' }, 1742.40],
  ['levy off by hand', { type: 'Hourly rate', rates, estimatedHours: 5, fuelLevyMode: 'off' }, 990],

  // Zone comes off BOTH ends: either end regional makes the run regional.
  ['Geelong pickup -> CBD delivery is regional', { type: 'Standard', rates, pickupPostcode: 3220, postcode: 3000, cubicMetres: 2 }, 580.80],
  ['Heidelberg pickup -> Geelong delivery is regional', { type: 'Standard', rates, pickupPostcode: 3084, postcode: 3220, cubicMetres: 2 }, 580.80],
  ['both ends metro prices per m³', { type: 'Standard', rates, pickupPostcode: 3121, postcode: 3000, cubicMetres: 2 }, 242],
  ['unknown pickup leaves delivery to decide', { type: 'Standard', rates, postcode: 3000, cubicMetres: 2 }, 242],
  ['regional pickup, unknown delivery is still regional', { type: 'Standard', rates, pickupPostcode: 3220, cubicMetres: 2 }, 580.80],
  ['WG Geelong pickup -> metro delivery', { type: 'White Glove', rates, pickupPostcode: 3220, postcode: 3186, cubicMetres: 3 }, 677.60],

  // Travel on an hourly job: the truck's rate, levied, no minimum.
  ['5 h hourly + 1.5 h travel', { type: 'Hourly rate', rates, estimatedHours: 5, travelHours: 1.5 }, 1415.70],
  ['travel rounds up to the next 30 min', { type: 'Hourly rate', rates, estimatedHours: 5, travelHours: 0.6 }, 1306.80],
  ['8 h large truck + 2 h travel', { type: 'Hourly rate', rates, estimatedHours: 8, truckSize: 'large', travelHours: 2 }, 2420],
  ['no travel entered charges none', { type: 'Hourly rate', rates, estimatedHours: 5, travelHours: 0 }, 1089],

  // Travel on a labour job: the whole crew's time at their rate, never levied.
  ['4 pax × 5 h labour + 1.5 h travel', { type: 'Labour', rates, labourers: 4, estimatedHours: 5, travelHours: 1.5 }, 1716],
  ['labour travel rounds up to 30 min', { type: 'Labour', rates, labourers: 3, estimatedHours: 4, travelHours: 0.6 }, 990],
  ['labour travel rides the crew minimum', { type: 'Labour', rates, labourers: 1, estimatedHours: 1, travelHours: 2 }, 660],
  ['labour travel has no minimum of its own', { type: 'Labour', rates, labourers: 2, estimatedHours: 3, travelHours: 0.5 }, 462],
];

let failed = 0;
for (const [name, input, expected] of cases) {
  const got = priceJob(input).total;
  const ok = Math.abs(got - expected) < 0.005;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(42)} expected ${expected.toFixed(2).padStart(9)}  got ${got.toFixed(2).padStart(9)}`);
}
console.log(failed ? `\n${failed} of ${cases.length} FAILED` : `\nall ${cases.length} match the calculator`);
process.exit(failed ? 1 : 0);
