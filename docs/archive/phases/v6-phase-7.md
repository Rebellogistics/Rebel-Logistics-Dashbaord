# V6 Phase 7 — Audience pages (`/for/*`)
**Status:** ✅ shipped 2026-09-17 · **Commits:** `af215c4`, `af026c8`, `205bebb`, `93c6b23`

## Source
Audit priority #4 from the 2026-09-16 competitive read. Inbox Australia's clearest structural advantage over Rebel was that it segments by **audience** (`/designers`, `/retailers`, `/showroom`, `/residential`) where Rebel segmented only by service. Same services underneath, written from that reader's problem.

## Which four, and why
The segments were chosen from Rebel's own reviews and client logos rather than copied from Inbox's list — each one has a real customer behind it:

| Segment | Evidence it exists |
|---|---|
| **Interior designers** | Lisa Hunter ("client's interior furniture installation"), Dani McMillan-Lyons ("recommend to all my Interior Design colleagues"), Blainey North logo |
| **Showrooms & brands** | Cafe Lighting & Living (trade fairs, exhibitions, stock deliveries), Fendi, Versace, Articolo, Cult |
| **Commercial & office** | Taige Alhadweh (commercial move, no damage) |
| **Private clients** | Sheila Roshan (residential move, "best removalists we've ever had") |

## The pages

| URL | Angle | Review carried |
|---|---|---|
| `/for/designers` | The install is the part clients remember — and most of what goes wrong is scheduling, not handling | Dani McMillan-Lyons |
| `/for/showrooms` | The delivery is the last thing a customer remembers about your brand | Cafe Lighting & Living |
| `/for/commercial` | The cost isn't the quote — it's forty people who can't work on Monday | Taige Alhadweh |
| `/for/private-clients` | What makes moving day awful isn't the lifting | Sheila Roshan |

Each carries a **verbatim Google review** from someone actually in that segment, its own hero image so they don't read as one template, and 3,700–4,000 crawler-visible characters. All four: one `<h1>`, correct canonical, full JSON-LD. Route count went 129 → **133 pre-rendered**.

## What's done
- **`src/components/public/marketing/site/audiences.ts` (new)** — the audience data model. Built first and deliberately: the other three pages after `/for/designers` were data entry, not new code.
- **`src/components/public/marketing/pages/AudiencePages.tsx` (new)** — one component driven by that data, each audience supplying its own hero image.
- **Footer column + service-page strip** (`205bebb`) — the pages are linked from every page's footer and from the service pages, so they aren't orphans in the crawl.
- Sitemap entries added; all four verified live (HTTP 200) on www.

## Two decisions worth not re-litigating

**The URL shape is `/for/<slug>`, not `/<slug>`.** It keeps the audience pages a clear set and avoids a top-level slug collision later. Cheap to change before indexing, painful after — and they are now indexed.

**Craning stays out of the visible copy.** Yamin's call. Removed from all four pages including one oblique instance (the designers process step read *"if a piece needs to go over the house instead of through it"*, which is craning without the word; it now reads "if something will not fit, you hear it at quote stage"). **One deliberate exception:** "craning" still appears once per page inside the JSON-LD business schema, in the service catalogue describing Logistics — structured data no reader sees, and the genuine service list; stripping it would misdescribe the business to Google. Craning also stays on `/logistics`. This is noted in `audiences.ts` itself so it doesn't creep back in.

## The merge, which went wrong once
Yamin asked to hold the marketing pages until pricing settled, then later to ship them. The first "undo" **moved a ref and was insufficient** — it removed only the links commit. The four pages had been committed to `main` in an earlier session and sat *underneath* the pricing sandbox commit, so they were still on `main`, still in the sitemap, and would still have deployed.

Lifting them out needed a rebase, not a ref move. That was safe because the two sets of commits touch entirely different files (the sandbox commit adds only `docs/RESTORE-POINT-2026-09-17.md` and `docs/rate-sandbox.html`). One consequence: the sandbox commit was rewritten `1fcccbb` → `fe58dda` — same content, new SHA, nothing pushed at the time.

**The lesson:** a ref move only undoes what the ref points at. Check what sits underneath before reporting an undo as done.

## What's left
Nothing for the pages themselves. Downstream follow-ups from the same competitive read remain open and unbuilt: the **client-portal page** (audit #5 — Rebel's strongest differentiator, still unmentioned anywhere on the site) and **published content / blog posts** aimed at real queries, which is where Inbox's 16 posts still beat the site.
