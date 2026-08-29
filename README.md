# Rebel Logistics — Operations System & Website

One React app serving three audiences:

| Surface | Route | Who |
|---|---|---|
| **Public website** | `/`, `/logistics`, `/warehousing`, `/labour`, `/work`, `/areas/*`, `/about`, `/contact`, `/quote` | Customers |
| **Operations dashboard** | `/*` (auth required) | Owner, dispatch |
| **Driver shell** | inside the dashboard | Drivers |

Leads submitted on the website write straight into the same `jobs` table the
dashboard reads, so a website enquiry appears as a `Quote` job immediately.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000, serves /api/* too
npm run lint         # tsc --noEmit
npx vite build       # production build
```

Environment variables live in `.env` (never committed). See `.env.example` for
the full list: Supabase URL/anon key, Google OAuth + Maps, Twilio, Gemini.

## Stack

- **React + Vite** (`vite.config.ts`)
- **Supabase** — Postgres, Auth, Storage, Realtime
- **Vercel serverless** `/api/*` for Twilio and Google Calendar OAuth.
  `vite-api-handlers-plugin.ts` runs those handlers under plain `npm run dev`.
- **Tailwind v4** with a token layer in `src/index.css`

Production deploys trigger automatically on push to `main`.

---

## The website

Source lives in `src/components/public/marketing/`.

```
marketing/
  MarketingHome.tsx        home page; section order is the conversion sequence
  sections/
    Hero.tsx               scroll-scrubbed video hero
    homeSections.tsx       trust, quote band, services, proof, sectors, FAQ…
  pages/
    pages.tsx              service pages, about, contact, quote
    WorkPage.tsx           portfolio, six labelled chapters
    AreaPages.tsx          service-area index + per-suburb pages
  site/
    data.ts                business facts, services, gallery, reels
    areas.ts               suburb data + copy composition
    Chrome.tsx             header (services dropdown, team login) and footer
    LeadForm.tsx           the single lead form used everywhere
    Reels.tsx              auto-scrolling video rail + popup player
    ui.tsx                 Container, Reveal, Button, marquees, CTA helpers
    seo.ts                 titles, meta, canonical, JSON-LD
```

### Design system

Everything public is scoped under `.rl` in `src/index.css` so the dashboard's
tokens are untouched. Warm-white ground, near-black ink, one restrained oxblood
accent, Hanken Grotesk throughout, 2px corner radius, light mode only.

The **dashboard keeps its own tokens** (Inter, blue accent). Do not restyle it.

### Conversion order

The home page section order is deliberate and documented inline in
`MarketingHome.tsx`. Service pages run: hero → client logos → what the service
includes → how we handle every job → **form** → photo rail → film.

Any in-page "Request a quote" scrolls to `#quote-form` and briefly highlights
it, rather than navigating away. Service pages pre-select the matching enquiry
type. The nav and footer buttons fall back to `/quote` when a page has no form.

### SEO

- Per-page title, description, canonical, OG/Twitter via `useSeo`.
- JSON-LD: `MovingCompany`, `Service`, `FAQPage`, `BreadcrumbList`.
- `public/robots.txt` and `public/sitemap.xml`.
- ~120 suburb pages under `/areas/`. Copy is composed from per-suburb
  attributes (character archetype, access notes, neighbours) rather than
  duplicated, because near-identical location pages can be treated as doorway
  pages. **If Search Console shows weak impressions, prune to the
  highest-intent suburbs.**

---

## Media

Web-ready assets are committed under `public/site/`:

| Path | What |
|---|---|
| `hero-scrub-hq.mp4` | home hero. **All-keyframe encode** — required for smooth scroll scrubbing |
| `reels/*.mp4` | full client footage with audio, played in the popup |
| `reels/*-preview.mp4` | silent low-res loops for the rail |
| `reels/bg/*.mp4` | silent hero background loops |
| `photos/` | job photography |
| `clients/` | client brand marks, normalised to one monochrome set |
| `founder.jpg` | founder portrait, a frame from the warehouse footage |

The camera originals, scrapers and virtualenvs live in `website assets/` and are
**gitignored** (~3.7 GB). Regeneration scripts sit in `website assets/scripts/`
(photo processing, logo normalisation, screenshots).

Re-encoding the hero must keep `-g 1 -keyint_min 1 -sc_threshold 0`. Without a
keyframe on every frame, seeking decodes from frame zero and the hero stutters.

### Housekeeping

`scripts/cleanup-unused-assets.sh` removes assets no page references, audited
against every import in `src/`. Re-run that audit after deleting sections.

---

## Where the truth lives

- **[`STATUS.md`](STATUS.md)** — live state, open action items, phase index. Read first.
- **[`PRODUCT.md`](PRODUCT.md)** — product truth: users, positioning, evidence on hand.
- **DB schema** — `supabase/migrations/*.sql`, mirrored in `src/lib/database.types.ts`
- **Domain types** — `src/lib/types.ts`
- **New environments** — [`SUPABASE-RUN-THIS.md`](SUPABASE-RUN-THIS.md)

## Unconfirmed facts

These are placeholders in `src/components/public/marketing/site/data.ts` and
should be confirmed before the site is promoted:

- **Phone** `0420 411 168` — taken from crew signage in the job photography.
- **Trading hours** — currently "Monday to Friday, 7am to 5pm".
- **Client logos** — Bentley Home, Roberto Cavalli Home and art to art came
  from mislabelled files in the supplied asset pack (the file named
  `Fendi_Logo…-02` is a Bentley mark; `Versace…-16` is Roberto Cavalli).
  Confirm each is a real client before publishing.
