import type {
  DisposalLoad,
  FuelLevyMode,
  JobLocation,
  JobType,
  PricingRates,
  StorageTerm,
  StorageTier,
  TruckSize,
  WarehouseService,
} from './types';
import { MELBOURNE_METRO_POSTCODES, locationForPostcode } from './metroPostcodes';

/**
 * V7 pricing engine — the model worked out in the rate calculator.
 *
 * This sits alongside `calculateQuote` in pricing.ts rather than replacing
 * it: the existing dialogs still call that, and they migrate to this one
 * screen at a time. Both read the same rate book.
 *
 * What it does differently:
 *  - the postcodes at BOTH ends decide the zone outright, with no override:
 *    either end regional makes the job regional
 *  - time bills in whole increments, rounded up, before any minimum
 *  - rubbish disposal and packaging are extras on the job that created
 *    them, never job types of their own
 *  - the fuel levy rides transport only, and a quote captures whether it
 *    applied rather than re-reading the switch later
 */

export interface JobPriceLine {
  label: string;
  /** Why the number is what it is — shown under the label on the quote. */
  note: string;
  amount: number;
  /** Whether the fuel levy rides on this line. Transport only. */
  levied: boolean;
}

export interface JobPrice {
  lines: JobPriceLine[];
  /** The zone the postcode resolved to, or null where a job has no zone. */
  zone: JobLocation | null;
  /** Sum of every line, ex levy and ex GST. */
  chargeable: number;
  /** The portion the levy is charged on. */
  levyBase: number;
  levyPct: number;
  levy: number;
  levyNote: string;
  exGst: number;
  gst: number;
  total: number;
}

export interface JobPricingInput {
  type: JobType;
  rates: PricingRates;

  /**
   * Standard / White Glove. The DELIVERY postcode.
   *
   * The zone comes from the postcodes alone, never from a manual choice --
   * but from BOTH ends, not just this one. See pickupPostcode.
   */
  postcode?: number | null;
  /**
   * The PICKUP postcode. A run is regional if EITHER end is regional:
   * Geelong -> the CBD is regional, and so is Heidelberg -> Geelong. Only a
   * run that is metro at both ends prices per m³ (Yamin, 2026-09-22).
   *
   * A BLANK pickup address is not an unknown one -- it means the load goes
   * out of our own warehouse, which is metro and always will be, so the
   * delivery end decides alone. A pickup that was TYPED but carries no
   * postcode is the genuinely unknown case: it never makes a job regional on
   * its own, it simply gets no vote.
   */
  pickupPostcode?: number | null;
  cubicMetres?: number;

  /** Hourly rate, and the truck for any warehousing collection legs. */
  truckSize?: TruckSize;
  estimatedHours?: number;

  /** Labour jobs, and warehouse labour work. */
  labourers?: number;

  /** Warehousing. */
  warehouseService?: WarehouseService;
  storageTier?: StorageTier;
  storageTerm?: StorageTerm;
  storageDays?: number;
  containerSize?: '20 ft' | '40 ft';
  whLabourType?: 'outbound' | 'qc' | 'unload';
  legsHours?: number;
  /**
   * Travel to the job, with NO minimum — the minimum is for a booked job,
   * not for getting to it. Rounded up to the billing increment like any
   * other hour.
   *
   * On an HOURLY job it bills at the same truck's rate, and the levy applies
   * because it is transport. On a LABOUR job there is no truck, so it bills
   * as the whole crew's time at the labour rate, and the levy never touches
   * it (Yamin, 2026-09-22).
   *
   * Deliberately not a distance calculation: per-km mechanics were removed
   * by decision on 2026-09-16, so whether a run is far enough out to charge
   * travel on is a judgement made at quote time and typed in.
   */
  travelHours?: number;
  /**
   * Crew work billed onto a storage or container-unload job rather than
   * quoted as its own labour-work job. This is how time beyond the
   * container's included hours gets onto the same invoice, and how a
   * client-requested quality check rides along with the unload.
   */
  extraLabourOn?: boolean;

  /** Extras. */
  disposalLoad?: DisposalLoad;
  /** Only read for a 'larger' load, which is measured once the job is done. */
  disposalAmount?: number;
  packagingAmount?: number;

  /** How this quote treats the levy. Defaults to following the rate book. */
  fuelLevyMode?: FuelLevyMode;

  /** Negotiated rates for a repeat customer, as today. */
  overrideMetroRate?: number;
  overrideHourlyRate?: number;

  /** The live metro list. Falls back to the compiled-in constant. */
  metroPostcodes?: ReadonlySet<number>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Time bills in whole increments, always rounded up. */
export function billableHours(hours: number | undefined, increment: number): number {
  const inc = increment > 0 ? increment : 0.5;
  return Math.ceil((hours || 0) / inc) * inc;
}

/** The per-m³ storage rate: tier sets it, a short-term hold lifts it. */
export function storageRate(r: PricingRates, tier: StorageTier, term: StorageTerm): number {
  const base =
    tier === 'Insurance added'
      ? r.storageInsuredAud
      : tier === 'High end'
        ? r.storageHighEndAud
        : r.storageStandardAud;
  return term === 'Short term' ? round2(base * (1 + r.shortTermUpliftPct / 100)) : base;
}

/** Each item on the warehouse work list carries its own rate. */
function whLabourRate(r: PricingRates, which: JobPricingInput['whLabourType']): number {
  return which === 'qc' ? r.whLabourQcAud : which === 'unload' ? r.whLabourUnloadAud : r.whLabourOutboundAud;
}

const WH_LABOUR_LABEL: Record<NonNullable<JobPricingInput['whLabourType']>, string> = {
  outbound: 'Outbound warehouse charges',
  qc: 'Quality control check',
  unload: 'Additional labour to unload the container',
};

/**
 * Does this quote carry the levy?
 *
 * 'rate_book' follows the switch as it stands — what a quote raised now
 * would capture. 'on' and 'off' are the manual override, for a job quoted
 * in a levy-off month but carried out in a levy-on one, or the reverse.
 */
export function levyApplies(r: PricingRates, mode: FuelLevyMode | undefined): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return r.fuelLevyOn;
}

/** The disposal pair: the load charge, then its flat transport fee. */
function disposalLines(r: PricingRates, input: JobPricingInput): JobPriceLine[] {
  const load = input.disposalLoad;
  if (!load) return [];
  const larger = load === 'larger';
  const amount = larger
    ? input.disposalAmount || 0
    : load === 'trailer'
      ? r.disposalTrailerAud
      : r.disposalVanAud;
  const name = larger ? 'Larger load' : load === 'trailer' ? 'Trailer load' : 'Standard van load';
  return [
    {
      label: 'Rubbish disposal',
      note: larger
        ? `${name} — ${amount > 0 ? 'measured at the end of the job' : 'measured at the end of the job, nothing entered yet'}`
        : `${name} — preset`,
      amount,
      levied: false,
    },
    {
      label: 'Transport fee',
      note: larger ? 'flat, larger load' : 'flat, van or trailer',
      amount: larger ? r.disposalTransportLargeAud : r.disposalTransportAud,
      levied: false,
    },
  ];
}

function packagingLineFor(input: JobPricingInput): JobPriceLine[] {
  if (input.packagingAmount === undefined || input.packagingAmount === null) return [];
  return [
    {
      label: 'Packaging materials',
      note: input.packagingAmount > 0 ? 'as supplied on the job' : 'entered at the end of the job, nothing yet',
      amount: input.packagingAmount,
      levied: false,
    },
  ];
}

/**
 * Whether disposal is chargeable on this job at all.
 *
 * Standard deliveries generate no rubbish. White Glove carries removal in
 * its rate up to a threshold, past which it becomes chargeable. Labour has
 * no truck on site to collect with, and warehouse labour work is already
 * labour.
 */
export function disposalAllowed(input: JobPricingInput): boolean {
  const { type, rates } = input;
  if (type === 'Hourly rate') return true;
  if (type === 'White Glove') return (input.cubicMetres || 0) > rates.wgDisposalThresholdM3;
  if (type === 'Storage') return input.warehouseService !== 'labour_work';
  return false;
}

/** Whether packaging materials can be charged on this job. */
export function packagingAllowed(type: JobType): boolean {
  return type === 'Hourly rate' || type === 'Labour';
}

export function priceJob(input: JobPricingInput): JobPrice {
  const r = input.rates;
  const inc = r.billingIncrementHours;
  const lines: JobPriceLine[] = [];
  let zone: JobLocation | null = null;

  if (input.type === 'Storage') {
    const service: WarehouseService = input.warehouseService ?? 'storage';

    if (service === 'container_unload') {
      const size = input.containerSize ?? '20 ft';
      lines.push({
        label: 'Container unload',
        note: `${size} container — flat, covers ${r.containerIncludedHours} h of unload time`,
        amount: size === '40 ft' ? r.container40ftAud : r.container20ftAud,
        levied: false,
      });
    } else if (service === 'labour_work') {
      const which = input.whLabourType ?? 'outbound';
      const rate = whLabourRate(r, which);
      // No crew or hours floor by default — a single labourer for half an
      // hour bills half an hour. Both floors are rate-book settings.
      const crew = Math.max(input.labourers || 0, r.whLabourMinCrew);
      const hrs = Math.max(billableHours(input.estimatedHours, inc), r.whLabourMinHours);
      lines.push({
        label: 'Warehouse labour',
        note: `${WH_LABOUR_LABEL[which]} — ${crew} pax × ${hrs} h × $${rate}`,
        amount: round2(crew * hrs * rate),
        levied: false,
      });
    } else {
      const tier = input.storageTier ?? 'Standard';
      const term = input.storageTerm ?? 'Long term';
      const rate = storageRate(r, tier, term);
      const m3 = Math.ceil(input.cubicMetres || 0);
      const billableDays = Math.max(0, (input.storageDays || 0) - r.storageGraceDays);
      const months = Math.ceil(billableDays / 30);
      lines.push({
        label: 'Storage',
        note:
          `${m3} m³ × $${rate} × ${months} mo (${tier} · ${term.toLowerCase()}) — ` +
          `${r.storageGraceDays} d grace off ${input.storageDays || 0} d` +
          (term === 'Short term' ? `, short-term uplift +${r.shortTermUpliftPct}%` : ''),
        amount: round2(m3 * rate * months),
        levied: false,
      });
    }

    // Crew work on top of storage or an unload. Labour work is already
    // labour, so it never carries this.
    if (service !== 'labour_work' && input.extraLabourOn) {
      const which = input.whLabourType ?? 'unload';
      const rate = whLabourRate(r, which);
      const crew = Math.max(input.labourers || 0, r.whLabourMinCrew);
      const hrs = Math.max(billableHours(input.estimatedHours, inc), r.whLabourMinHours);
      // Extra time on an unload and a requested quality check are different
      // services at the same rate — the invoice line has to say which.
      const onContainer = service === 'container_unload';
      const overrun = onContainer && which === 'unload';
      lines.push({
        label: WH_LABOUR_LABEL[which],
        amount: round2(crew * hrs * rate),
        note:
          `${crew} pax × ${hrs} h × $${rate} — ` +
          (overrun
            ? `beyond the ${r.containerIncludedHours} h included`
            : onContainer
              ? 'requested on top of the unload'
              : 'on the stored stock'),
        levied: false,
      });
    }

    // Collection and return: the truck's hourly rate with NO minimum, and
    // the only part of a warehousing job the levy touches.
    if (input.legsHours) {
      const legRate = input.truckSize === 'large' ? r.hourlyRateLargeAud : r.hourlyRateAud;
      const legHrs = billableHours(input.legsHours, inc);
      lines.push({
        label: 'Pick-up & delivery',
        note: `${legHrs} h × $${legRate} (${input.truckSize === 'large' ? 'large' : 'standard'} truck) — no minimum`,
        amount: round2(legHrs * legRate),
        levied: true,
      });
    }
  } else if (input.type === 'Labour') {
    const crew = Math.max(input.labourers || 0, r.labourMinLabourers);
    const rounded = billableHours(input.estimatedHours, inc);
    const hrs = Math.max(rounded, r.labourMinHours);
    const notes: string[] = [];
    if (crew > (input.labourers || 0)) notes.push(`crew lifted to the ${r.labourMinLabourers} pax minimum`);
    if (rounded > (input.estimatedHours || 0)) notes.push(`rounded up to the next ${inc * 60} min`);
    if (hrs > rounded) notes.push(`lifted to the ${r.labourMinHours} h minimum`);
    lines.push({
      label: 'Labour',
      note: `${crew} pax × ${hrs} h × $${r.labourPerHourAud}${notes.length ? ` — ${notes.join(' · ')}` : ''}`,
      amount: round2(crew * hrs * r.labourPerHourAud),
      levied: false,
    });

    // Travel to an out-of-the-way site. There is no truck on a labour job, so
    // it bills as what it actually is: the whole crew's time, at their own
    // rate (Yamin, 2026-09-22). No minimum, and not levied — the levy never
    // touches labour.
    if (input.travelHours) {
      const travelHrs = billableHours(input.travelHours, inc);
      lines.push({
        label: 'Travel time',
        note: `${crew} pax × ${travelHrs} h × $${r.labourPerHourAud} — no minimum`,
        amount: round2(crew * travelHrs * r.labourPerHourAud),
        levied: false,
      });
    }
  } else if (input.type === 'Hourly rate') {
    const large = input.truckSize === 'large';
    const rate = input.overrideHourlyRate ?? (large ? r.hourlyRateLargeAud : r.hourlyRateAud);
    const rounded = billableHours(input.estimatedHours, inc);
    const hrs = Math.max(rounded, r.minimumHours);
    const notes: string[] = [];
    if (rounded > (input.estimatedHours || 0)) notes.push(`rounded up to the next ${inc * 60} min`);
    if (hrs > rounded) notes.push(`lifted to the ${r.minimumHours} h minimum`);
    lines.push({
      label: 'Base charge',
      note: `${hrs} h × $${rate} (${large ? 'large' : 'standard'} truck)${notes.length ? ` — ${notes.join(' · ')}` : ''}`,
      amount: round2(hrs * rate),
      levied: true,
    });

    // Travel, when the run is far enough out to be worth charging for. Same
    // truck rate, same rounding, no minimum — and levied, because it is
    // transport.
    if (input.travelHours) {
      const travelHrs = billableHours(input.travelHours, inc);
      lines.push({
        label: 'Travel time',
        note: `${travelHrs} h × $${rate} (${large ? 'large' : 'standard'} truck) — no minimum`,
        amount: round2(travelHrs * rate),
        levied: true,
      });
    }
  } else {
    // Standard / White Glove. The postcodes decide the zone outright -- both
    // of them. One regional end is enough to make the whole run regional.
    const wg = input.type === 'White Glove';
    const set = input.metroPostcodes ?? MELBOURNE_METRO_POSTCODES;
    const zoneOf = (pc: number | null | undefined) =>
      pc === null || pc === undefined ? null : locationForPostcode(pc, set);
    const deliveryZone = zoneOf(input.postcode);
    const pickupZone = zoneOf(input.pickupPostcode);
    zone =
      deliveryZone === 'Regional' || pickupZone === 'Regional'
        ? 'Regional'
        : (deliveryZone ?? pickupZone);

    if (zone === 'Regional') {
      const which =
        deliveryZone === 'Regional' && pickupZone === 'Regional'
          ? 'both ends regional'
          : deliveryZone === 'Regional'
            ? 'delivery is regional'
            : 'pickup is regional';
      lines.push({
        label: 'Base charge',
        amount: wg ? r.wgRegionalMinimumAud : r.regionalMinimumAud,
        note: `${wg ? 'White Glove regional' : 'Regional'} minimum — ${which}; flat, volume does not move it`,
        levied: true,
      });
    } else {
      // Metro, and also the no-postcode case: per m³ is the safer default,
      // since a flat regional minimum on a small metro job would overcharge.
      const rate = input.overrideMetroRate ?? (wg ? r.wgMetroPerCubeAud : r.metroPerCubeAud);
      const m3 = input.cubicMetres || 0;
      lines.push({
        label: 'Base charge',
        amount: round2(m3 * rate),
        note: `${m3} m³ × $${rate}${wg ? ' (White Glove)' : ''}${zone === null ? ' — no postcode yet, priced as metro' : ' — Melbourne metro'}`,
        levied: true,
      });
    }
  }

  if (disposalAllowed(input)) lines.push(...disposalLines(r, input));
  if (packagingAllowed(input.type)) lines.push(...packagingLineFor(input));

  const chargeable = round2(lines.reduce((t, l) => t + l.amount, 0));
  const levyBase = round2(lines.reduce((t, l) => t + (l.levied ? l.amount : 0), 0));
  const applies = levyApplies(r, input.fuelLevyMode);
  const levyPct = applies ? r.fuelLevyPct : 0;
  const levy = round2(levyBase * (levyPct / 100));

  let levyNote: string;
  if (!applies) {
    levyNote =
      input.fuelLevyMode === 'off'
        ? 'removed from this quote by hand'
        : 'not applied — the rate book had it off when this was quoted';
  } else if (levyBase === 0) {
    levyNote = 'nothing on this job moves a truck';
  } else {
    const portion = levyBase !== chargeable ? 'the transport portion only' : 'base';
    levyNote =
      `${levyPct}% of ${portion}, ex GST` +
      (input.fuelLevyMode === 'on' && !r.fuelLevyOn ? ' — added to this quote by hand' : '');
  }

  const exGst = round2(chargeable + levy);
  const gst = round2(exGst * (r.gstPercent / 100));

  return {
    lines,
    zone,
    chargeable,
    levyBase,
    levyPct,
    levy,
    levyNote,
    exGst,
    gst,
    total: round2(exGst + gst),
  };
}
