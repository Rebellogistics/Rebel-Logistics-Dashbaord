# Outstanding work

Everything started-but-not-finished, and everything blocked on someone else.
Written 2026-08-29. Live build: https://rebel-logistics-dashbaord.vercel.app

---

## 1. Started, not finished

### Instagram harvest — UNPROVEN, actively in progress
**Where it got to.** The naive read (fetch reel page, parse `og:video`) fails:
Instagram serves logged-out visitors a shell with no media URLs. Scrapling's
`page_action` did not help either, because it runs *after* navigation, so the
load-time XHRs were already gone — that is why the first run captured 0
payloads.

Moving the response listener into **`page_setup`** (pre-navigation) works:
**66 responses captured, 7 of them `www.instagram.com/api/graphql`.**

**What is left.** Mine those GraphQL payloads for `video_versions` /
`video_url` and confirm whether media URLs are present for a logged-out
session. Script: `website assets/scrape/ig_advanced.py` (the `_mine()` walker
is written; the `page_setup` fix is proven in a scratch run but not yet folded
into the script).

**Honest status:** not proven either way. I told the user early on that it was
impossible; that was premature — I had not tried interception. Do not repeat
that claim until the extraction has actually run.

**Constraint:** user asked for Scrapling only. `yt-dlp` was tested and *did*
read reel metadata successfully, which suggests the data is reachable — left
out per instruction. No login bypass.

**Fallback if it fails:** Instagram → Settings → Your activity → Download your
information gets all 57 posts in ~24–48h.

### About page — requested, NOT STARTED
Make it interactive: merge the hero with section two, auto-advancing carousel
with slow zoom (same treatment as the home hero), headings and descriptions
inside the hero itself, using the imagery currently in section two.

### Impeccable finish review — verdict pass never run
Round 1 returned `recapture` (evidence invalid: lazy images unloaded). Round 2
returned **`fix`** with 8 material findings. All 8 were applied, but the
skill requires sending the recaptured screenshots back to the *same* reviewer
to score each fix resolved / partial / unresolved. That scoring pass has not
happened, so "all 8 fixed" is my claim, not a verified verdict.

### DESIGN.md — never written
A new visual world ships with DESIGN.md written at finish by the documenter.
Not done.

### Direction contract — missing seed key
The reviewer flagged that the `FORM` block in the `index.html` body comment
carries no concept-roll seed key, so the direction round cannot be
corroborated. The direction was in fact **user-pinned** via a structured
question (they chose "Architectural quiet-luxury" and the accent), which
legitimately beats the roll — but that provenance should be written into the
contract instead of leaving it blank.

---

## 2. Blocked on the client / owner

| Item | Detail |
|---|---|
| **Trading hours** | **Invented by me.** Currently "Monday to Friday, 7am to 5pm. Weekends by arrangement." No evidence behind it. Confirm or cut. Also baked into the `openingHoursSpecification` JSON-LD in `site/seo.ts`. |
| **Phone number** | `0420 411 168`. Real evidence: printed on the crew shirts in the client's own footage, and matches the repo's existing default. Still worth confirming. |
| **Client logos** | Bentley Home, Roberto Cavalli Home and art to art came from **mislabelled files** in the supplied asset pack (`Fendi_Logo…-02` is a Bentley mark; `Versace…-16` is Roberto Cavalli). Confirm each is genuinely a client before publishing. |
| **Repo rename** | Needs admin, which the working account does not have (`push: true, admin: false`). Owner must do it: Settings → General → Repository name. Suggested: `rebel-logistics-operations-system-and-website` (also fixes the "Dashbaord" typo). |

---

## 3. Known technical debt

- **Client-side SEO only.** Every route returns the same `<title>` in raw HTML
  because titles are set by React after hydration. Google renders JS and reads
  the correct per-page titles, but link previews (WhatsApp, Slack, iMessage)
  show the generic one. Fix = prerender or SSR.
- **Doorway-page risk.** ~120 suburb pages under `/areas/`. Copy is composed
  from per-suburb attributes rather than duplicated, but volume alone can
  trigger thin-content treatment. Watch Search Console; prune to
  highest-intent suburbs if impressions stay flat.
- **Cleanup partially applied.** `scripts/cleanup-unused-assets.sh` was run
  once. `public/site/hero-scrub-hq.mp4` (the replaced AI hero, ~8 MB) is queued
  in the script but still present. Re-run after any asset change, and re-audit
  first: a previous run deleted `WA0025` which a later edit had begun
  referencing, producing a broken image.
- **Bundle size.** Main chunk ~1.6 MB (459 kB gzip). Vite warns. Route-level
  code splitting exists for marketing pages; the dashboard is not split.

---

## 4. Ideas raised but not decided

- Cutting the long source videos into more distinct segments so the reel rail
  never shows a repeat (currently 4 unique clips; the rail duplicates to loop).
- Mid-page CTA density on `/work` — one was added after chapter three; whether
  more are wanted is unresolved.
