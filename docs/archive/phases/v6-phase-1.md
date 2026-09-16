# V6 Phase 1 — Pre-render the public marketing site to static HTML
**Status:** ✅ shipped 2026-09-16 · **Commit:** `47e316c`

## Source
2026-09-16: Yamin asked for a comparison against two competitors — hcotransport.com.au and inboxaustralia.com.au — and what would rank better. Measuring all three as Googlebot found the answer immediately: the site served **3,041 bytes containing an empty `<div id="root">`**. Inbox (Wix, server-rendered) served 5,078 characters of finished HTML; Hunter & Co. 883. Every heading, all 121 suburb pages and the entire JSON-LD block were written by React after load.

## What's done
- **`src/entry-server.tsx` (new)** — SSR entry covering only the public routes. Deliberately mirrors `main.tsx` rather than reusing it: those routes are `React.lazy`, and `renderToString` does not await lazy components.
- **`scripts/prerender.mjs` (new)** — renders each route, serialises its head, writes `dist/<route>/index.html`. Exits non-zero if any route renders empty markup or no head, so a broken pre-render fails the build instead of shipping blank pages.
- **`seo.ts` restructured** — the head is now *described* as data (`buildHead`) rather than applied imperatively. The browser turns descriptors into DOM nodes; the build serialises the same descriptors into HTML. One source, identical output.
- **Build is three stages:** `vite build && vite build --ssr && node scripts/prerender.mjs`.
- **`vercel.json`** — the SPA rewrite now targets `app.html`, a noindex shell with an empty root. Pointing it at `index.html` would serve home-page markup for every dashboard URL.

## Four things hydration required
1. **Marketing routes imported eagerly.** `React.lazy` suspends on the first hydration render, reconciling a `null` fallback against finished markup.
2. **next-themes scoped to dashboard routes.** It renders an inline `<script>` whose *minified text* differs between the client and SSR bundles, so it could never match. The stylesheet has no `.light` rules, so the public site is unaffected.
3. **Reel rail shuffle deferred to mount.** It used `Math.random()` during render, so server and client could never agree.
4. **React 19 preload hints hoisted.** `renderToString` emits `<link rel="preload">` inline; the build lifts them into `<head>`.

## Result
| | Before | After |
|---|---|---|
| Home | 0 chars | 7,299 |
| `/logistics` | 0 | 4,790 |
| `/areas/toorak` | 0 | 8,079 |

129/129 routes pre-render. Verified against a Vercel-like static server using React's development build: `/`, `/about`, `/logistics`, `/work`, `/quote` and `/areas/:slug` hydrate with zero errors.

## Gotcha worth remembering
`vite preview` SPA-falls-back — it serves `dist/index.html` for `/about`. That produced a phantom hydration mismatch that cost several rebuilds. Test pre-rendered output with a filesystem-first server, not `vite preview`.

## What's left
- The 1.6 MB dashboard bundle still ships to every public visitor. Splitting marketing and dashboard into separate Vite entries would fix it; larger change than this phase.
- About page emits three `<h1>`s (one per `ABOUT_BEATS` entry). Pre-existing, cosmetic.
