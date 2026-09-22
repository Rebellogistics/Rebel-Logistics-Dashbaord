/**
 * Does the dashboard offer everything the pricing model has?
 *
 * The rate calculator is where the model is decided; the dashboard is a
 * second implementation of it. Twice now a control existed in the calculator
 * and silently did not exist in the dashboard — additional labour on a
 * container unload, and the per-quote fuel levy override. Both type-checked,
 * both built, both looked finished. Only Yamin comparing screenshots found
 * them.
 *
 * So the model gets a manifest. Every control is one row saying where it has
 * to appear, and this script fails if any of those places does not have it.
 * Adding a control to the calculator means adding a row here, and the row
 * stays red until the engine, the rate book and the dialogs all catch up.
 *
 *   npx tsx scripts/check-parity.ts
 */

import { readFileSync } from 'node:fs';

type Where = 'engine' | 'rateBook' | 'quoteDialog' | 'jobDialog';

interface Control {
  /** What it is, in the words the model uses. */
  name: string;
  /** Where it must appear, and the text that proves it does. */
  needs: Partial<Record<Where, RegExp>>;
  /**
   * Known to be missing, with the reason. Keeps the script honest: a gap is
   * recorded rather than quietly absent from the manifest.
   */
  known?: Partial<Record<Where, string>>;
}

const FILES: Record<Where, string> = {
  engine: 'src/lib/jobPricing.ts',
  rateBook: 'src/components/settings/PricingPanel.tsx',
  quoteDialog: 'src/components/jobs/NewQuoteDialog.tsx',
  jobDialog: 'src/components/jobs/JobDetailDialog.tsx',
};

const CONTROLS: Control[] = [
  {
    name: 'Job type — Labour',
    // jobDialog was missing here, which is exactly how the job dialog came to
    // offer four job types where the quote dialog offered five.
    needs: {
      engine: /'Labour'/,
      quoteDialog: /'Labour'/,
      jobDialog: /<option value="Labour">/,
    },
  },
  {
    name: 'Hourly — truck choice',
    needs: {
      engine: /hourlyRateLargeAud/,
      rateBook: /hourlyRateLargeAud/,
      quoteDialog: /truckSize/,
      jobDialog: /truckSize/,
    },
  },
  {
    name: 'Billing increment before minimums',
    needs: { engine: /billingIncrementHours/, rateBook: /billingIncrementHours/ },
  },
  {
    name: 'Warehousing — three services',
    needs: {
      engine: /container_unload[\s\S]*labour_work/,
      quoteDialog: /container_unload[\s\S]*labour_work/,
      jobDialog: /container_unload/,
    },
  },
  {
    name: 'Storage — tier and term',
    needs: {
      engine: /storageRate\(/,
      rateBook: /shortTermUpliftPct/,
      quoteDialog: /storageTerm/,
      jobDialog: /storageTerm/,
    },
  },
  {
    name: 'Storage — grace days and month rounding',
    needs: { engine: /storageGraceDays/, rateBook: /storageGraceDays/ },
  },
  {
    name: 'Container unload — flat, with included hours',
    needs: {
      engine: /containerIncludedHours/,
      rateBook: /containerIncludedHours/,
      quoteDialog: /containerSize/,
      jobDialog: /containerSize/,
    },
  },
  {
    name: 'Warehouse labour — three kinds, own rates',
    needs: {
      engine: /whLabourRate\(/,
      rateBook: /whLabourQcAud/,
      quoteDialog: /whLabourType/,
      jobDialog: /whLabourType/,
    },
  },
  {
    name: 'Additional labour on storage / container unload',
    needs: { engine: /extraLabourOn/, quoteDialog: /extraLabourOn/, jobDialog: /extraLabourOn/ },
  },
  {
    name: 'Pick-up & delivery legs, no minimum',
    needs: { engine: /legsHours/, quoteDialog: /legsHours/, jobDialog: /legsHours/ },
  },
  {
    name: 'Travel time — truck rate on hourly, crew rate on labour',
    needs: { engine: /travelHours/, quoteDialog: /travelHours/, jobDialog: /travelHours/ },
  },
  {
    name: 'Rubbish disposal — an extra, never a job type',
    needs: {
      engine: /disposalLines\(/,
      rateBook: /disposalTrailerAud/,
      quoteDialog: /disposalLoad/,
      jobDialog: /disposalLoad/,
    },
  },
  {
    name: 'Packaging materials — typed in at the end',
    needs: { engine: /packagingLineFor\(/, quoteDialog: /packagingAmount/, jobDialog: /packagingAmount/ },
  },
  {
    name: 'White Glove — rubbish included under the threshold',
    needs: {
      engine: /wgDisposalThresholdM3/,
      rateBook: /wgDisposalThresholdM3/,
      quoteDialog: /disposalAllowed/,
    },
  },
  {
    name: 'Fuel levy — rate book switch',
    needs: { engine: /fuelLevyOn/, rateBook: /fuelLevyOn/ },
  },
  {
    name: 'Fuel levy — per-quote override',
    needs: { engine: /levyApplies\(/, quoteDialog: /fuelLevyMode/, jobDialog: /fuelLevyMode/ },
  },
  {
    name: 'Container multi-invoice — unload, deliveries, storage',
    needs: {
      jobDialog: /ContainerJobsPanel/,
      quoteDialog: /containerJobId/,
    },
  },
  {
    name: 'Zone bound to the postcodes at BOTH ends',
    needs: {
      engine: /pickupPostcode/,
      quoteDialog: /pickupPostcode/,
      jobDialog: /draftPickupPostcode/,
    },
  },
];

const sources = Object.fromEntries(
  Object.entries(FILES).map(([k, f]) => [k, readFileSync(f, 'utf8')]),
) as Record<Where, string>;

let missing = 0;
const gaps: string[] = [];

for (const control of CONTROLS) {
  const absent: string[] = [];
  for (const [where, pattern] of Object.entries(control.needs) as [Where, RegExp][]) {
    if (!pattern.test(sources[where])) absent.push(where);
  }
  const noted = Object.entries(control.known ?? {}) as [Where, string][];

  if (absent.length) {
    missing += absent.length;
    console.log(`MISSING  ${control.name}`);
    for (const w of absent) console.log(`           not found in ${FILES[w]}`);
  } else {
    console.log(`ok       ${control.name}`);
  }
  for (const [w, why] of noted) gaps.push(`${control.name} — ${w}: ${why}`);
}

if (gaps.length) {
  console.log(`\nKnown gaps, recorded rather than forgotten (${gaps.length}):`);
  for (const g of [...new Set(gaps)]) console.log(`  · ${g}`);
}

console.log(
  missing
    ? `\n${missing} place(s) missing a control the model has. Fix, or add a \`known\` note saying why not.`
    : `\nEvery control in the manifest is present everywhere it is required.`,
);

process.exit(missing ? 1 : 0);
