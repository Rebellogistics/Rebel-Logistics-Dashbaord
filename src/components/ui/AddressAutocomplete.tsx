import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps, type PlacePick } from '@/lib/googleMaps';
import { cn } from '@/lib/utils';

export interface AddressAutocompleteProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks a suggestion. Receives place_id + formatted address + lat/lng. */
  onPick?: (pick: PlacePick) => void;
  /** Restrict suggestions to a country code (ISO-3166 alpha-2). Defaults to AU. */
  country?: string;
}

interface DisplaySuggestion {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
  /** Reference to the underlying suggestion so we can call `toPlace()` later. */
  raw: google.maps.places.AutocompleteSuggestion;
}

/**
 * Address input backed by the Places API (New) — uses
 * `AutocompleteSuggestion.fetchAutocompleteSuggestions` for predictions and
 * `Place.fetchFields` for the formatted address. Falls back to a plain
 * Input if Maps fails to load (no key, network blocked, billing off, etc).
 *
 * Why the new API: Google's classic Places API and the new Places API are
 * separate billed services. The dashboard's Cloud project has the new one
 * enabled (per Yamin's May 2 GCP setup), so we target that. Bonus: it's
 * Promise-based, so error handling is sane.
 *
 * Billing-conscious: one AutocompleteSessionToken per "address picking
 * session." Google bills per session, not per keystroke. A new token mints
 * after each successful pick.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  country = 'AU',
  className,
  placeholder,
  ...inputProps
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<DisplaySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  // Track the latest request so out-of-order responses don't clobber state.
  const requestSeqRef = useRef(0);
  const listboxId = useId();

  // Lazy-load on first focus — saves the script fetch on pages that never
  // touch an address field.
  const handleFirstFocus = async () => {
    if (mapsReady || mapsError) return;
    try {
      const maps = await loadGoogleMaps();
      const lib = (await maps.importLibrary('places')) as google.maps.PlacesLibrary;
      placesLibRef.current = lib;
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
      setMapsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      console.warn('[AddressAutocomplete] Maps load failed — falling back to plain input.', err);
      setMapsError(msg);
    }
  };

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const fetchSuggestions = async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }
    const lib = placesLibRef.current;
    if (!lib || !sessionTokenRef.current) return;
    const seq = ++requestSeqRef.current;
    try {
      const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: country ? [country] : undefined,
      });
      // Out-of-order guard: a faster later request already won.
      if (seq !== requestSeqRef.current) return;
      const display: DisplaySuggestion[] = [];
      for (const s of suggestions) {
        const pp = s.placePrediction;
        if (!pp) continue;
        display.push({
          placeId: pp.placeId,
          text: pp.text?.toString() ?? '',
          mainText: pp.mainText?.toString() ?? pp.text?.toString() ?? '',
          secondaryText: pp.secondaryText?.toString() ?? '',
          raw: s,
        });
      }
      setPredictions(display);
      setIsOpen(display.length > 0);
      setHighlight(0);
    } catch (err) {
      console.warn('[AddressAutocomplete] fetchAutocompleteSuggestions failed:', err);
      setPredictions([]);
      setIsOpen(false);
    }
  };

  const handleChange = (next: string) => {
    onChange(next);
    if (!mapsReady) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    // 200ms debounce — one Places call per ~5 keystrokes. Session-tokened so
    // every request in this session bills as one autocomplete unit.
    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(next);
    }, 200);
  };

  const selectSuggestion = async (s: DisplaySuggestion) => {
    const lib = placesLibRef.current;
    const sessionToken = sessionTokenRef.current;
    if (!lib || !sessionToken) {
      // Maps gone away mid-flight — best-effort fall back to the visible text.
      onChange(s.text);
      setIsOpen(false);
      setPredictions([]);
      return;
    }
    try {
      const place = s.raw.placePrediction!.toPlace();
      await place.fetchFields({ fields: ['formattedAddress', 'location', 'id'] });
      const formatted = place.formattedAddress ?? s.text;
      onChange(formatted);
      onPick?.({
        formattedAddress: formatted,
        placeId: place.id ?? s.placeId,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
      });
    } catch (err) {
      console.warn('[AddressAutocomplete] place.fetchFields failed — using prediction text.', err);
      onChange(s.text);
    } finally {
      // Mint a fresh token for the next picking session — this completes
      // the previous session per Google's billing rules.
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
      setIsOpen(false);
      setPredictions([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = predictions[highlight];
      if (s) void selectSuggestion(s);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        {...inputProps}
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={(e) => {
          void handleFirstFocus();
          if (predictions.length > 0) setIsOpen(true);
          inputProps.onFocus?.(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />
      {isOpen && predictions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-rebel-border bg-card shadow-lg"
        >
          {predictions.map((s, idx) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => {
                // mousedown to fire BEFORE input blur (which would close the list).
                e.preventDefault();
                void selectSuggestion(s);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={cn(
                'px-3 py-2 text-sm cursor-pointer truncate',
                idx === highlight ? 'bg-rebel-accent-surface text-rebel-accent' : 'hover:bg-muted',
              )}
              title={s.text}
            >
              <span className="font-semibold">{s.mainText}</span>
              {s.secondaryText && (
                <span className="ml-1.5 text-xs text-muted-foreground">{s.secondaryText}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
