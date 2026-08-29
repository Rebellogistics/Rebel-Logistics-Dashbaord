# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing app: React + Vite + TypeScript + Tailwind, Supabase (Postgres/Auth/Storage/Realtime), Vercel serverless `/api/*` (Twilio SMS, Google Calendar OAuth). The public marketing site is part of this same app (`src/components/public/marketing/**`, routed in `src/main.tsx`). Shares the design-token layer in `src/index.css` with the owner/driver dashboard.

## Users

Primary buyers are **high-end interior designers, luxury furniture & lighting showrooms, art galleries/dealers, architects, luxury retail and fashion houses**, plus private clients relocating valuable homes — based in Melbourne (metro + regional VIC). They are moving expensive, fragile, often irreplaceable pieces (designer furniture, stone slabs, art, chandeliers) and are choosing on **trust and care**, not price. Secondary: procurement/operations staff at those brands booking specialist jobs and events.

## Product Purpose

Rebel Logistics is a **specialist white-glove transport, warehousing and installation company** for valuable and luxury goods. It exists so designers, showrooms and brands can hand over irreplaceable pieces and trust they arrive, are stored, and are installed perfectly. Success = the client requests a quote / makes contact, and returns for repeat work.

## Positioning

Not a commodity removalist. The differentiator is **specialist handling of high-value goods**: crane / heavy-lift delivery into difficult luxury sites, white-glove wrapping and protection, interior-designer installation & assembly, and secure warehousing / 3PL — trusted by leading Australian and international brands. The site must read as a premium partner a fashion house or top designer would hire, never as a cheap mover.

## Operating Context

Melbourne metro and regional Victoria. Work happens at luxury private homes (pools, glass, tight access → crane lifts), designer showrooms, galleries, and event sites; and at their Flemington warehouse for storage/3PL. Jobs range from a single art piece or stone slab to full house relocations and showroom fit-outs. Quote-to-delivery is tracked by SMS.

## Capabilities and Constraints

Three service pillars (verbatim from client's content):
- **Warehousing** — storage per cubic metre; container unpack & delivery; short & long term storage; 3PL.
- **Logistics** — furniture pick-ups & deliveries; media & specialist event plan execution; specialist interior designer installations & assembly; house relocation.
- **Labour** — onsite labour hire; home furniture rearrangement & assembly; showroom rearrangement & assembly.

Existing quote engine (`PublicQuoteForm.tsx` + `src/lib/pricing.ts`): job types **Standard / White Glove / House Move (hourly)**; **Metro / Regional VIC**; cubic-metre or hourly pricing with GST; writes a `jobs` row to Supabase (status `Quote`), upserts the customer, detects repeat customers, uses Google Maps address autocomplete. This logic must be preserved when the form is restyled/condensed into the new marketing site.

## Brand Commitments

- Name: **Rebel Logistics Pty Ltd**. Founded **2019**.
- Logo: elegant **gold script** wordmark with a diamond **"R"** monogram (`website assets/extracted/Full-Colour-Full-Logo-reduce-Size.png`). NOTE: the repo's `public/logo.png` is an unrelated **FJT Logistics** blue/orange logo and must be replaced with the real Rebel mark.
- Palette derived from the logo: **gold** (accent) + **crisp white** (ground) + **deep charcoal/near-black** (weight). Light mode only.
- Chosen art direction (this rebuild): **"Quiet gallery"** — pure white ground, generous negative space, thin gold hairlines, serif display + clean sans, gallery/atelier feel. Explicitly NOT: monospace, dark mode, "coding/programmer" vibe (the old site was a monospace terminal theme — fully discarded).
- Voice: professional, understated, trusted. Speaks to a discerning design audience.

## Evidence on Hand

- **Real job photography** (`website assets/processed/`): crane/heavy-lift deliveries into modern luxury homes, stone/marble slab handling, poolside furniture wrapping, secure warehouse storage (white-wrapped furniture on pallets), luxury interiors staged (velvet sofas, cowhide rugs, chandeliers, gallery art walls), their crane truck. Some frames show crew faces → must be blurred **locally** before use (privacy) and cropped to consistent ratios.
- **Real client logos** in assets: Fendi, Versace, Articolo, Blainey North Collection, TLC Interiors, Cafe Lighting, Clifton Upholstery, art to art, Bentley. Cleared to display as "real + placeholder slots" (a carousel of real logos now, empty slots for more later).
- **Instagram** (`@rebellogistics`) reels/posts being pulled for additional real video/photo content + captions.
- Contact: address **159 Racecourse Road, Flemington VIC 3031**; **ABN 42 632 300 022**. Phone, email and business hours are **NOT YET PROVIDED** — must not be fabricated; ship as clearly-marked placeholders until the client supplies them.
- No testimonials, benchmark stats, or pricing claims are confirmed — do not invent quotes, review scores, or "320+ jobs / 98% on-time / 4.9★" style figures (those were placeholders in the old hero).

## Product Principles

1. **Care over cost.** Every screen should signal meticulous handling of valuable things, not the cheapest quote.
2. **Show the work.** Real cranes, real luxury sites, real wrapped pieces beat stock or claims — the proof is the product.
3. **Borrow the client's world.** The site should feel at home next to Fendi, Versace, and top interior designers.
4. **One clear action.** Every page nudges toward the quote/contact form; conversion is the job.
5. **Never fabricate trust.** Real logos, real photos; placeholders clearly marked until the client confirms facts.

## Accessibility & Inclusion

Standard web accessibility: light-mode, high-contrast text on white, legible type scale, keyboard-operable form, alt text on real photography, respects `prefers-reduced-motion` for the scroll-driven hero video.
