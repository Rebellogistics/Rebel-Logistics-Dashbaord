/**
 * Singleton loader for the Google Maps JS API. Idempotent — calling
 * `loadGoogleMaps()` more than once returns the same Promise. The script tag
 * is added on first call and cached on `window.google`.
 *
 * We load the `places` library (autocomplete + place details) only. Loading
 * additional libraries later would require a page reload because the Maps
 * script can only be loaded once per page.
 *
 * Phase 13: Yamin's API key is referrer-restricted in Google Cloud Console
 * to localhost + the prod / preview Vercel domains, plus scoped to the
 * Maps JS + Places APIs. The key in `VITE_GOOGLE_MAPS_API_KEY` is therefore
 * safe to ship to the browser bundle.
 */

declare global {
  interface Window {
    google?: typeof google;
  }
}

let loadPromise: Promise<typeof google.maps> | null = null;

export function isMapsAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps?.places;
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps requires a browser window'));
      return;
    }
    if (window.google?.maps?.importLibrary) {
      resolve(window.google.maps);
      return;
    }
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!key) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY not set — autocomplete disabled'));
      return;
    }
    // Poll for `google.maps.importLibrary` — the entry point for the new
    // Places API. Once this exists, callers can do
    //   await google.maps.importLibrary('places')
    // to get { AutocompleteSuggestion, Place, AutocompleteSessionToken }.
    const waitForMaps = () => {
      const start = Date.now();
      const tick = () => {
        if (window.google?.maps?.importLibrary) {
          resolve(window.google.maps);
          return;
        }
        if (Date.now() - start > 5000) {
          reject(new Error('Maps script failed to initialise within 5s'));
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    };
    // De-duplicate if a script tag was already injected (e.g. HMR reload).
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader]');
    if (existing) {
      existing.addEventListener('load', waitForMaps);
      existing.addEventListener('error', () => reject(new Error('Maps script failed to load')));
      // If the script already finished loading before this listener attached,
      // the load event won't fire again — kick the poll directly.
      waitForMaps();
      return;
    }
    const script = document.createElement('script');
    // `loading=async` + dynamic `importLibrary('places')` is Google's
    // recommended pattern for the new Places API. Library loading is
    // explicit, so we never race onload vs library decoration.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onload = waitForMaps;
    script.onerror = () => reject(new Error('Maps script failed to load'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export interface PlacePick {
  /** Human-readable formatted address from Google. */
  formattedAddress: string;
  /** Stable Google place id — useful for distance calculations later. */
  placeId: string;
  /** Decimal degrees, optional (only present when the place has geometry). */
  lat?: number;
  lng?: number;
}
