# V5 Phase 2 — PWA safe-area for iOS standalone
**Status:** ✅ shipped 2026-05-16 · **Commit:** `5ad2e49`

## Source
2026-05-15 call. Yamin uses the dashboard as a home-screen PWA on his phone ("set up on the bottom of my phone") — reports it as "finicky" with the top nav clipped under the iOS notch / status bar.

## Discovery
Almost all PWA infra was already wired (manifest.webmanifest, `viewport-fit=cover`, apple-touch-icon, theme-color, `apple-mobile-web-app-capable`). Status bar style is `black-translucent` (correct for matching the rebel-accent theme) but the sticky `TopBar` + the mobile `Sidebar` drawer didn't compensate with safe-area padding → content rendered UNDER the notch.

## What's done
- **`TopBar` header:** inline `paddingTop: env(safe-area-inset-top)` so the sticky nav clears the iOS notch. Pattern matches existing `DriverShell` `paddingBottom: env(safe-area-inset-bottom)`.
- **`Sidebar` aside:** same + bottom safe-area. The mobile drawer was hitting both edges.
- **`manifest.webmanifest`:** dropped `maskable` from icon purpose (kept `any`). The existing favicon/logo is 1698×345 (a wide wordmark, not maskable-shaped) — Android was incorrectly mask-cropping it.

## What's left
Proper square + maskable icon set (192/512/maskable-512) generated from a SQUARE Rebel mark. Defer until Yamin reports icon quality issues — the current wordmark works in the standalone manifest, just not at home-screen sizes.

## Files touched
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`
- `public/manifest.webmanifest`
