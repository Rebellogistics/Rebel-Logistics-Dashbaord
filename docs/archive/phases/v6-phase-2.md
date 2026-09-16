# V6 Phase 2 — Canonicalise on www
**Status:** ✅ shipped 2026-09-16 · **Commit:** `61528f5`

## Source
Found while requesting indexing in Search Console. The homepage came back **"URL is not on Google — Page with redirect."**

## The problem
Vercel serves `www.rebellogistics.com.au` and 308-redirects the apex to it. But `SITE` in `seo.ts`, all 129 sitemap URLs and the robots.txt sitemap line all named the **apex**. So Google followed the sitemap to the apex, got a 308, landed on www, and found a canonical tag pointing back at the URL that had just redirected.

Pre-dated V6 P1 — it was invisible while nothing was being indexed at all.

## What's done
- `SITE` in `src/components/public/marketing/site/seo.ts` → `https://www.rebellogistics.com.au`
- All 129 `<loc>` entries in `public/sitemap.xml`
- The `Sitemap:` line in `public/robots.txt`

Email addresses and the truck-login domain stay on the bare apex — unrelated.

## Verified live
Canonical, `og:url` and the JSON-LD `@id` all name www across `/`, `/logistics`, `/warehousing`, `/labour`, `/areas/:slug`. www returns 200.

## Rule going forward
Any new public URL — sitemap entry, share link, structured data — uses the www host.
