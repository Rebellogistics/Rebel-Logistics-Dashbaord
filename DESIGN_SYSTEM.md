# Rebel Logistics — Design System

> Reverse-engineered from the LUVAL dashboard reference, translated to a refined **light-first** identity for Yamen's day-to-day operations, with full dark-mode parity. This document is the source of truth for the revamp.

---

## 1 · Reference Dissection (LUVAL, dark mode)

The reference is a polished crypto/auctions dashboard. What makes it work is not novelty — it's the **discipline** of three things:

1. A **single dominant accent** (electric blue) on a near-black canvas
2. **Strict negative space** between the sidebar, content header, card strip, and table
3. **Density that grades**: header is airy, cards are medium-density, the table is dense

### 1.1 Anatomy

```
┌─ macOS chrome ──────────────────────────────────────────────────────────┐
│ ●●●  ◀ ▶  🛡  app.luval.com/dashboard       ↻        ⤓ + ▢            │
├──────────┬──────────────────────────────────────────────────────────────┤
│ ⚡ LUVAL  │ Overview                       Live · Explore   🔍   🔔  👤 │
│          │ ─────────────────────────────────────────────────────────── │
│ ▌Overview│  Activity   Created(23)  Collections(4)  Owned(117)  …      │
│  Market🅿 │ ─────────────────────────────────────────────────────────── │
│  Watchli │  Live Auctions                                  Sort ⌄   ⊞  │
│  History │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                              │
│  Wallet  │  │NFT│ │NFT│ │NFT│ │NFT│ │NFT│   →                          │
│ ──────── │  └───┘ └───┘ └───┘ └───┘ └───┘                              │
│  Inbox ● │                                                             │
│  Offers ●│  Recent History         All · Purchase · Transfer · …       │
│  Invites │  ┌─────────────────────────────────────────────────────┐   │
│ ──────── │  │ Event   Object   From/To   Amount  Value  Time  Lnk│   │
│  Settings│  │ Purchase 🟧      A → B       2     16ETH 4/4   …   │   │
│          │  │ …                                                  │   │
│ ┌──────┐ │  └─────────────────────────────────────────────────────┘   │
│ │🚀 Pro│ │                                                             │
│ └──────┘ │                                                             │
└──────────┴──────────────────────────────────────────────────────────────┘
```

### 1.2 Color tokens (extracted)

| Role | Hex | Notes |
|---|---|---|
| Canvas | `#0B0E17` | Almost-black, slight cool cast |
| Surface (cards, sidebar) | `#11151F` | One step lighter |
| Surface raised (popover) | `#181D2A` | Two steps lighter, with shadow |
| Border subtle | `#1E2433` | Barely visible — mostly to separate dense areas |
| Border focus | `#3D5AFE` | Brand blue |
| Text primary | `#F5F7FB` | Off-white, never pure white |
| Text secondary | `#8B92A5` | For labels, inactive nav |
| Text tertiary | `#5B6477` | For meta, timestamps |
| **Accent / brand** | `#3D5AFE` | The single dominant color — used sparingly but boldly |
| Accent hover | `#5570FF` | |
| Success (Active badge) | `#10B981` | Green dot + label |
| Warning (Ending Soon) | `#F97316` | Orange + flame icon |
| Danger (PRO badge, Logout) | `#FF4D4F` | |
| Notification dot | `#FF4D4F` | Tiny pulsing dot on icons |

### 1.3 Typography

LUVAL uses two families:

- A **slightly condensed display sans** for the logo and section titles (think Sora / Manrope / Bricolage Grotesque). Letters are tall, bold, and slightly tightened (`tracking: -0.02em`).
- A **neutral grotesque body** (Inter-class) at 13–14px for navigation, table cells, and meta.

Hierarchy:

| Token | Size | Weight | Line | Use |
|---|---|---|---|---|
| `display-xl` | 28 / 32 | 700 | 1.1 | Hero greeting, page title |
| `display-lg` | 20 / 22 | 700 | 1.2 | Section headers ("Live Auctions") |
| `display-md` | 16 | 600 | 1.3 | Card titles |
| `body` | 14 | 500 | 1.5 | Default UI |
| `label` | 12 | 600 | 1.4 | Tab labels, table column headers (uppercase, +0.05em tracking) |
| `meta` | 11 | 500 | 1.4 | Timestamps, secondary numbers |
| `mono` | 12 | 500 | — | Hashes, IDs, ETH amounts |

### 1.4 Spacing & radii

- Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. The reference uses **24px** as its workhorse gap between sections, **16px** inside cards.
- Radii: cards `16px`, buttons / inputs `12px`, pills `999px`, sidebar nav items `10px`.
- The sidebar is **240px**. The content gutter on either side is **24px**.

### 1.5 Elevation

LUVAL is *almost flat* in dark mode. Elevation comes from **lighter surface** rather than shadow. The only real shadow is on the floating profile dropdown:

```
shadow-popover: 0 24px 48px -16px rgba(0, 0, 0, 0.5),
                0 8px 16px -8px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.06) inset;
```

In light mode we'll need shadows to do more work — see §2.

### 1.6 Components — what makes them feel premium

- **Sidebar nav item (active)**: pill background `rgba(61, 90, 254, 0.12)`, text `#F5F7FB`, **left** edge has a 3px-wide, 16px-tall blue bar. Inactive items are pure muted text with no background.
- **Auction card**: 200px wide, image fills top ~70%, status badge top-left with colored dot, countdown bottom-left over a dark gradient. Title + bid stacked below image with 8px padding. The card's whole bottom is a single tight unit.
- **Table**: zebra is **off**. Rows are separated by 1px hairlines `#1E2433`. Column headers are `label` style, all caps, muted. The first cell often has a small thumbnail.
- **Profile dropdown**: floats above and to the side of the trigger; arrow is implicit (no caret); the **stat strip** (Following / Followers) is two huge numbers in primary text with tiny labels below — no chrome around them.
- **Promo card** ("Upgrade to Pro"): an inset, shorter card in the sidebar bottom with an illustration and a single CTA button. It deliberately breaks the navigation rhythm to draw the eye.

### 1.7 Motion

- Sidebar items: 120ms ease-out background transition.
- Cards: subtle 200ms scale on hover (`scale: 1.02`) + a colored ring fading in.
- Page load: stagger reveals — KPIs in first, then card strip, then table. ~60ms between siblings.
- Notification dot: gentle ping (2s loop, opacity + scale).

---

## 2 · Light-mode adaptation (the Rebel identity)

The reference is dark. Yamen runs jobs in daylight with a phone in hand — light mode is the right default. Translating LUVAL to light is **not** about lifting the canvas: it's about **preserving the aesthetic discipline** (single accent, strict spacing, dense table, airy header) on a different substrate.

### 2.1 Light tokens

| Role | Hex | Notes |
|---|---|---|
| Canvas | `#F4F6FB` | Cool, slightly blue-tinted off-white |
| Surface (cards, sidebar) | `#FFFFFF` | |
| Surface sunken (table header, search input) | `#F1F4F9` | Just-darker than canvas |
| Surface raised (popover, hover) | `#FFFFFF` + shadow | |
| Border subtle | `#E6E9F2` | The single hairline color |
| Border strong | `#CFD4E3` | Inputs, focused dividers |
| Text primary | `#0D1220` | Near-black, never pure |
| Text secondary | `#5B6477` | Same as dark — works in both |
| Text tertiary | `#9AA1B2` | Meta |
| **Accent / brand** | `#2D5BFF` | One step deeper than LUVAL's `#3D5AFE` to retain contrast on white |
| Accent hover | `#1E47E6` | |
| Accent surface (active nav bg) | `#EAF0FF` | Pale blue tint |
| Success | `#0E9F6E` | Slightly deeper — needs to read on white |
| Warning | `#E65F1C` | |
| Danger | `#E11D48` | |
| Notification dot | `#E11D48` | |

### 2.2 Elevation rebuilt for light

In light mode shadows are the only depth tool, so they need to be designed:

```css
--shadow-card:    0 1px 2px rgba(15, 23, 42, 0.06),
                  0 8px 24px -12px rgba(15, 23, 42, 0.08);

--shadow-popover: 0 16px 48px -16px rgba(15, 23, 42, 0.18),
                  0 4px 12px -4px rgba(15, 23, 42, 0.10),
                  0 0 0 1px rgba(15, 23, 42, 0.04);

--shadow-button:  0 1px 0 rgba(255, 255, 255, 0.6) inset,
                  0 1px 2px rgba(15, 23, 42, 0.08);
```

### 2.3 Typography choices (committed)

- **Display**: `Bricolage Grotesque` — slightly condensed, characterful, modern but utility-friendly. Used for the logo wordmark, the page title, section headings.
- **Body**: `Plus Jakarta Sans` — neutral grotesque with a bit more warmth than Inter; reads well at 13–14px on white.
- **Mono**: `JetBrains Mono` — for IDs, phone numbers, money figures in tables.

These three are intentionally **not** Inter / Roboto / system. They give the dashboard a recognizable signature without becoming costume.

### 2.4 Light + dark CSS variables

```css
:root {
  --rebel-canvas: #F4F6FB;
  --rebel-surface: #FFFFFF;
  --rebel-surface-sunken: #F1F4F9;
  --rebel-surface-raised: #FFFFFF;
  --rebel-border: #E6E9F2;
  --rebel-border-strong: #CFD4E3;
  --rebel-text: #0D1220;
  --rebel-text-secondary: #5B6477;
  --rebel-text-tertiary: #9AA1B2;
  --rebel-accent: #2D5BFF;
  --rebel-accent-hover: #1E47E6;
  --rebel-accent-surface: #EAF0FF;
  --rebel-success: #0E9F6E;
  --rebel-success-surface: #E6F7F0;
  --rebel-warning: #E65F1C;
  --rebel-warning-surface: #FFF1E6;
  --rebel-danger: #E11D48;
  --rebel-danger-surface: #FFE9EE;
}

.dark {
  --rebel-canvas: #0B0E17;
  --rebel-surface: #11151F;
  --rebel-surface-sunken: #0E1219;
  --rebel-surface-raised: #181D2A;
  --rebel-border: #1E2433;
  --rebel-border-strong: #2A3142;
  --rebel-text: #F5F7FB;
  --rebel-text-secondary: #8B92A5;
  --rebel-text-tertiary: #5B6477;
  --rebel-accent: #3D5AFE;
  --rebel-accent-hover: #5570FF;
  --rebel-accent-surface: rgba(61, 90, 254, 0.12);
  --rebel-success: #10B981;
  --rebel-success-surface: rgba(16, 185, 129, 0.12);
  --rebel-warning: #F97316;
  --rebel-warning-surface: rgba(249, 115, 22, 0.12);
  --rebel-danger: #FF4D4F;
  --rebel-danger-surface: rgba(255, 77, 79, 0.12);
}
```

---

## 3 · Mapping LUVAL → Rebel (the translation table)

| LUVAL element | Rebel equivalent | Why |
|---|---|---|
| Logo "LUVAL" + ⚡ | "REBEL" + truck/chevron mark | Same energy; logistics-native |
| Overview / Market / Watchlist / History / Wallet | Dashboard / Truck Runs / Jobs / Customers / Reviews | Yamen's actual ops sections |
| Inbox / Offers / Invitations | SMS Log / Drivers (coming soon) | Communication group |
| Settings | Settings | unchanged |
| "Upgrade to Pro" promo card | **Today's Brief** card — count of pending notifications, weather, day of week, with a "Send all en-route" CTA | Repurposes the bottom-of-sidebar attention magnet for something operationally useful |
| Live / Explore tabs | Today / This Week sub-toggle | Same right-aligned segmented control |
| Tab strip (Activity, Created, Collections…) | Sub-tabs by section: Dashboard → Overview, Insights · Truck Runs → Today, Tomorrow, History · Jobs → All, Quotes, In Progress, Closed | Same visual rhythm |
| "Live Auctions" cards | **Live Truck Runs** cards | Each card is one in-progress job: customer photo/initial, status pill (Scheduled / In Delivery / Notified), countdown to ETA, route preview, fee. Mirrors LUVAL exactly. |
| "Recent History" table | **Recent Jobs** table | Columns: Status · Customer · Route · Truck · Fee · Created · Action. Same dense styling. |
| Following / Followers stats | **Drivers / Customers** stats | Two big numbers in the profile dropdown |
| PRO badge | "OWNER" badge next to admin nav items | If we ever gate features |
| Inbox / Offers red dots | Job alert dots (e.g. "needs proof", "overdue ETA") | Same affordance, real signal |

---

## 4 · Component specifications

### 4.1 Sidebar (240px)

```
┌────────────────────────────┐
│ [⚡] REBEL          ‹      │  ← logo, collapse arrow (right-aligned)
│      logistics ops         │
├────────────────────────────┤
│  OPERATIONS                │  ← uppercase label, 11px, tertiary
│  ▌ ⊞  Dashboard            │  ← active: pale-blue bg, blue left bar
│    🚚 Truck Runs       •3  │  ← badge
│    📋 Jobs                 │
│    👥 Customers            │
│    ⭐ Reviews              │
│                            │
│  COMMUNICATION             │
│    💬 SMS Log          ●   │  ← red dot
│    🛡 Drivers              │
│                            │
│  ACCOUNT                   │
│    ⚙ Settings              │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │  🌅  Today's Brief     │ │  ← repurposed promo card
│ │  6 jobs · 4 to notify  │ │
│ │  [ Send en-route SMS ] │ │
│ └────────────────────────┘ │
│                            │
│ 🌗 Theme · 🚪 Logout        │
└────────────────────────────┘
```

- **Active state**: 3px-wide blue left bar (`--rebel-accent`), background `--rebel-accent-surface`, text `--rebel-text`.
- **Inactive**: text `--rebel-text-secondary`, no background.
- **Hover**: background `--rebel-surface-sunken`, text `--rebel-text`.
- **Section labels**: `font-size: 11px`, `font-weight: 700`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: --rebel-text-tertiary`.

### 4.2 TopBar

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard         Today · Week    🔍 search…    🌗  🔔   👤 ⌄  │
│ Tue · Apr 11                                                     │
└──────────────────────────────────────────────────────────────────┘
```

- Page title is **display-xl**, secondary line is the live date in `meta` style.
- Center: a search input that occupies the middle column. Width capped at 420px.
- Right: theme toggle (sun/moon, animated swap), notifications bell with red ping dot when unread, profile avatar with chevron.
- The whole bar is 72px tall, sticky, has a 1px bottom border and **`backdrop-filter: blur(12px) saturate(120%)`** with a 90%-opaque background — premium glass effect.

### 4.3 Live Truck Runs card (replaces NFT card)

```
┌────────────────────┐
│ ● In Delivery      │  ← status pill, top-left
│                    │
│   ╱╱ truck art ╱╱  │  ← gradient bg + monogram + truck SVG
│                    │
│ ⏱ 1h 14m to ETA   │  ← bottom-left over gradient
├────────────────────┤
│ Sarah Chen         │  ← customer name
│ Crows Nest → Manly │  ← route, tertiary text
│ Truck 1     $284   │  ← truck on left, fee on right
└────────────────────┘
```

- 224px wide, 268px tall.
- Top region: 160px tall, gradient (from per-status color to a darker shade), customer initials in big display font centered, small truck silhouette overlaid.
- Status pill: green dot for Scheduled/Accepted, blue for In Delivery, amber for Notified, slate for Quote.
- Countdown is computed from `date` + `hoursEstimated`.
- Hover: lifts 4px, ring `2px --rebel-accent` fades in.

### 4.4 Recent Jobs table (replaces Recent History)

| Status | Customer | Route | Truck | Fee | Created | |
|---|---|---|---|---|---|---|
| pill | name<br>phone | from → to | T1 | $284.00 | 2h ago | ⋯ |

- Headers: 11px uppercase, `letter-spacing: 0.08em`, `--rebel-text-tertiary`.
- Row separators: hairline `--rebel-border`. No zebra.
- Row height 56px. Hover: row background `--rebel-surface-sunken`.
- Status cell uses pill: bg = `--status-surface`, text = `--status-fg`, 11px font, 999px radius.

### 4.5 KPI cards

Three cards, equal width, denser than today's:

```
┌──────────────────────┐
│ ┌──┐ Jobs Today      │
│ │🚚│ 12               │  ← display-xl number
│ └──┘ T1 7 · T2 5  ↑3 │  ← meta line, with delta vs yesterday
└──────────────────────┘
```

- Card surface `--rebel-surface`, border `--rebel-border`, shadow `--shadow-card`.
- Icon tile: 44px, rounded `12px`, `--rebel-accent-surface` background, `--rebel-accent` icon. Same shape for all three (no per-card color washes — that's what made the old version feel template-y).
- Number is the focal point: 30px, `Bricolage Grotesque`, weight 700.
- Sub-line is `meta` style with a tiny up/down chip showing delta.

### 4.6 Profile dropdown (matches LUVAL exactly)

```
┌─────────────────────────────┐
│ 🟣 Yamen                    │
│    yamen@rebellogistics.au  │
│ ─────────────────────────── │
│      18           42        │
│   Drivers     Customers     │
│ ─────────────────────────── │
│ 👤 Profile                  │
│ ❓ Help Center              │
│ 🌗 Theme           ◐        │
│ ─────────────────────────── │
│ [        Log Out        ]   │  ← red filled button
└─────────────────────────────┘
```

---

## 5 · Theme switching

- Powered by `next-themes` (already in `package.json`).
- Toggle is in **two places**: TopBar (icon-only) and profile dropdown (labeled with switch).
- Initial: respect system preference; persist user choice in `localStorage` under key `rebel-theme`.
- Transition: when switching, the whole app fades the canvas via a 200ms transition on `background-color` and `color`. **No** view transition API to keep it snappy.

---

## 6 · What this does NOT do

- We're not adding charts, ML, AI summarization, or any new feature surface area.
- We're not touching Supabase data, hooks, dialogs, or driver views — only their styling inherits from the new tokens.
- We're not introducing a component library beyond what's already installed.

The brief is: **same data, dramatically better skin, with a real light/dark identity Yamen can live in all day.**
