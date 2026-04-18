/**
 * Phone number normalisation to E.164 — the canonical format Twilio (and every
 * other SMS provider) expects. Pure, no runtime deps. AU-first since that's
 * where Rebel operates, but falls through for other regions if given.
 *
 * Examples (AU default):
 *   "0412 345 678"          → "+61412345678"
 *   "+61 412 345 678"       → "+61412345678"
 *   "04 12-34-56-78"        → "+61412345678"
 *   "02 9876 5432"          → "+61298765432"
 *   "61412345678"           → "+61412345678"  (missing leading +)
 *   ""                      → null
 *   "123"                   → null (too short)
 */

export type PhoneRegion = 'AU' | 'US' | 'GB' | 'NZ';

const COUNTRY_CODE: Record<PhoneRegion, string> = {
  AU: '61',
  US: '1',
  GB: '44',
  NZ: '64',
};

/**
 * Minimum national-number length (after stripping leading zeroes). Anything
 * shorter is almost certainly a typo, not a real number.
 */
const MIN_DIGITS = 6;

export function normalizeToE164(raw: string | null | undefined, defaultRegion: PhoneRegion = 'AU'): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS) return null;

  // Explicit international form: +CC…
  if (hadPlus) {
    return `+${digits}`;
  }

  const cc = COUNTRY_CODE[defaultRegion];

  // Already starts with the expected country code (no +) — e.g. "61412345678"
  if (digits.startsWith(cc)) {
    return `+${digits}`;
  }

  // National form with trunk prefix "0" → swap for country code
  if (digits.startsWith('0')) {
    return `+${cc}${digits.slice(1)}`;
  }

  // Fallback: assume the user typed a local number without the trunk prefix
  return `+${cc}${digits}`;
}

/** True when the given value is a plausibly-valid E.164 number. */
export function isValidE164(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}
