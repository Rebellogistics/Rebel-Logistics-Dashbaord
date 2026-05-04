import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip everything but digits and a single decimal point. Backs the numeric
// inputs (cubic metres, hours, fees…) — type="number" was eating mid-value
// keystrokes on Yamin's Mac so we use type="text" with this filter instead.
export function sanitiseDecimal(value: string): string {
  // Drop anything that's not a digit or a dot, then collapse multiple dots
  // down to the first one (so "1.2.3" becomes "1.23").
  const cleaned = value.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

// V4 2.1: lightweight name normalisation + Levenshtein for fuzzy duplicate
// detection on the quote form. Used to flag "Bayless Rugs" vs "Bayleys
// Rugs" before Yamin creates a third copy.
export function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Single-row DP — O(min(a,b)) memory.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let prev = Array.from({ length: shorter.length + 1 }, (_, i) => i);
  let curr = new Array(shorter.length + 1).fill(0);
  for (let i = 1; i <= longer.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= shorter.length; j += 1) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,           // insertion
        prev[j] + 1,                // deletion
        prev[j - 1] + cost,         // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[shorter.length];
}

// "Are these two strings near-duplicates?" — proportional tolerance so
// short names need exact-ish matches (Avi vs Ava is suspicious) while
// longer names tolerate one-letter typos (Bayleys vs Bayless).
export function isNearDuplicate(a: string, b: string): boolean {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length < 3 || nb.length < 3) return false;
  // One name fully contained in the other → likely a typo or shorthand.
  if (na.includes(nb) || nb.includes(na)) return true;
  const maxLen = Math.max(na.length, nb.length);
  const tolerance = Math.max(1, Math.floor(maxLen * 0.2));
  return levenshtein(na, nb) <= tolerance;
}
