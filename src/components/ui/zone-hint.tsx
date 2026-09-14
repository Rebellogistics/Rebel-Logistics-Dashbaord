import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractPostcode, locationForAddress } from '@/lib/metroPostcodes';
import type { JobLocation } from '@/lib/types';

interface ZoneHintProps {
  /** The delivery address to read a postcode from. */
  address: string | null | undefined;
  /** Whatever Metro/Regional is currently selected. */
  selected: JobLocation;
  /** Called when the operator accepts the suggestion. */
  onApply: (location: JobLocation) => void;
  className?: string;
}

/**
 * Warns when the delivery postcode disagrees with the selected zone.
 *
 * Metro vs Regional is a manual choice that silently changes the pricing band,
 * and the postcode list lived only in a PDF — so a mis-click was invisible.
 * This surfaces the disagreement and offers a one-click fix; it deliberately
 * does not change the selection on its own, since the operator may have a
 * reason to override and should not be fought mid-edit.
 *
 * Renders nothing when the address has no readable postcode, or when the
 * selection already matches.
 */
export function ZoneHint({ address, selected, onApply, className }: ZoneHintProps) {
  const suggested = locationForAddress(address);
  if (suggested === null || suggested === selected) return null;

  const postcode = extractPostcode(address);

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <div className="space-y-1.5">
        <p>
          Postcode {postcode} is <strong>{suggested}</strong> on the Rebel metro list, but this job
          is set to {selected}. That changes the pricing band.
        </p>
        <button
          type="button"
          onClick={() => onApply(suggested)}
          className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800"
        >
          Set to {suggested}
        </button>
      </div>
    </div>
  );
}
