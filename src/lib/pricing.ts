import { JobLocation, JobType, PricingRates } from './types';

export const DEFAULT_RATES: PricingRates = {
  metroPerCubeAud: 90,
  regionalMinimumAud: 480,
  // White Glove defaults match Standard so first-install behaviour is
  // unchanged. Yamin can bump them upward in Settings → Pricing.
  wgMetroPerCubeAud: 90,
  wgRegionalMinimumAud: 480,
  hourlyRateAud: 180,
  minimumHours: 3,
  gstPercent: 10,
};

export interface QuoteInput {
  type: JobType;
  location?: JobLocation;
  cubicMetres?: number;
  estimatedHours?: number;
  rates: PricingRates;
  /** Optional per-customer overrides. */
  overrideMetroRate?: number;
  overrideHourlyRate?: number;
}

export interface QuoteBreakdown {
  /** Effective rate used for the metro per-cube calculation. */
  metroRate: number;
  /** Effective hourly rate. */
  hourlyRate: number;
  /** Hours that will actually be billed (max of estimated and minimum). */
  billedHours: number;
  /** Subtotal ex-GST. */
  subtotal: number;
  /** GST amount. */
  gst: number;
  /** Total inc-GST. */
  total: number;
  /** Human-readable explanation, e.g. "2 m³ × $90". */
  explainer: string;
}

/**
 * Compute the price for a quote based on its type, location, dimensions/hours,
 * the active rate book, and optional per-customer overrides.
 *
 * Standard + Metro     → cubicMetres × metroPerCubeAud
 * Standard + Regional  → flat regionalMinimumAud
 * White Glove + Metro  → cubicMetres × wgMetroPerCubeAud
 * White Glove + Regional → flat wgRegionalMinimumAud
 * House Move           → max(estimatedHours, minHours) × hourlyRateAud
 *
 * The customer-level `overrideMetroRate` is intentionally type-agnostic: a
 * special-rate customer pays their negotiated per-cube regardless of whether
 * the booking is Standard or White Glove. Same for `overrideHourlyRate` on
 * House Move bookings.
 */
export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const { type, location, cubicMetres = 0, estimatedHours = 0, rates } = input;
  const isWhiteGlove = type === 'White Glove';
  // Pick the right rate-book figures for this job type.
  const baseMetroRate = isWhiteGlove ? rates.wgMetroPerCubeAud : rates.metroPerCubeAud;
  const baseRegional = isWhiteGlove ? rates.wgRegionalMinimumAud : rates.regionalMinimumAud;
  const metroRate = input.overrideMetroRate ?? baseMetroRate;
  const hourlyRate = input.overrideHourlyRate ?? rates.hourlyRateAud;
  const billedHours = Math.max(estimatedHours, rates.minimumHours);

  let subtotal = 0;
  let explainer = '';

  if (type === 'House Move') {
    subtotal = billedHours * hourlyRate;
    explainer = `${billedHours} h × $${hourlyRate}`;
  } else if (location === 'Regional') {
    subtotal = baseRegional;
    explainer = isWhiteGlove
      ? 'White Glove regional minimum'
      : 'Regional minimum charge';
  } else {
    // Standard / White Glove + Metro (default if no location)
    subtotal = cubicMetres * metroRate;
    const tag = isWhiteGlove ? ' (White Glove)' : '';
    explainer = cubicMetres > 0
      ? `${cubicMetres} m³ × $${metroRate}${tag}`
      : `0 m³ × $${metroRate}${tag}`;
  }

  const gst = round2(subtotal * (rates.gstPercent / 100));
  const total = round2(subtotal + gst);

  return {
    metroRate,
    hourlyRate,
    billedHours,
    subtotal: round2(subtotal),
    gst,
    total,
    explainer,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format an AUD amount for display. */
export function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
