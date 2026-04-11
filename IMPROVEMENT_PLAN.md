# Rebel Logistics — Improvement Plan (post-revamp)

This plan turns Yamen's notes plus everything the audit surfaced into a sequenced, shippable roadmap. Each phase is a coherent unit you could merge on its own.

**Inputs**
- Yamen's notes (10 items, captured below).
- Functional audit of the codebase (driver/owner shells, SMS stub, customer view, bell, search, dialogs, theme, dark-mode breakages, mobile shell).
- Goal: not just fix the listed items — make the platform **10× more useful** for day-to-day ops.

**Constraints**
- No data-model changes that aren't paid for by a real feature.
- Don't break the data layer — keep hooks/Supabase calls intact unless a phase explicitly upgrades them.
- Each phase ends in a clean lint and a working app.

---

## Yamen's notes → where they land

| # | Note | Phase |
|---|---|---|
| 1 | Dark mode broken on left-tab views | **Phase 1** |
| 2 | Dashboard-wide font is too loud — go subtle / readable | **Phase 1** |
| 3 | Theme toggle visually toggles wrong | **Phase 1** |
| 4 | Search should be functional and only show on relevant tabs | **Phase 3** |
| 5 | Make sure changes apply to all roles (driver, owner, etc.) | **Phase 1 + Phase 5** |
| 6 | Notifications bell should actually work | **Phase 3** |
| 7 | Live Truck Run cards should use the same customer icons as the Customers tab | **Phase 2** |
| 8 | Customers tab → table layout matching dashboard (not cards) | **Phase 2** |
| 9 | SMS: dynamic per-customer templates + ability to type custom messages | **Phase 4** |
| 10 | Driver: optional notes field when completing a delivery | **Phase 2** |

---

## Phase 1 — Foundation fixes (typography + dark mode + toggle)

> *"Before we add features, the things we already shipped should feel right."*

### 1.1 Typography pass — "subtle and readable"
- Replace **Plus Jakarta Sans** body with **Inter Variable** (already-installed `@fontsource-variable/geist` is also an option — Geist reads cleaner at 12–13px on dense tables; I'd lean Inter for the dashboard density).
- Keep a single **display** font for the page title and section headers — reduce **Bricolage Grotesque** usage to **only** the page title and brand wordmark. Everything else (KPI numbers, card titles, table headers) becomes the body family with weight variation, not a different family.
- Tighten the type scale so nothing screams: page title 22px (was 26), section headers 16px bold (was 20), card titles 13px, body 12.5px.
- Add `font-feature-settings: "ss01", "cv11"` (Inter stylistic alternates) for a slightly more grown-up look on numerals and `g`/`a`.
- Update `--font-display` in `index.css` and audit every place we used `font-display` — keep it on the page title, sidebar wordmark, and the giant KPI numbers; remove it from card titles and table headers.

**Why:** the audit's biggest cosmetic issue is competing fonts. Two display weights at 30px next to a 26px display title and 20px section headers reads as "AI demo." A single body family with restrained display use is what makes mature dashboards feel calm.

### 1.2 Dark mode — make it actually work
- The token system is right; the problem is **20 files hardcode `bg-white`, `bg-slate-50`, `border-slate-200`**. Sweep:
  - `DailyReviewPanel.tsx`, `ReviewsView.tsx`, `CustomersView.tsx`, `SmsLogView.tsx`, `SettingsView.tsx`, `TruckRunsView.tsx`, `MyRunToday.tsx`, `DriverShell.tsx`, all dialogs in `src/components/jobs/`, all dialogs in `src/components/customers/`, all dialogs in `src/components/settings/`.
- Replace with the bridge tokens — `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`. We don't need `bg-rebel-*` everywhere; the shadcn bridge already maps `card → rebel-surface` etc.
- Add a single `.surface` utility for cards so the next person doesn't reach for `bg-white` again.
- Confirm the `Toaster` (`src/components/ui/sonner.tsx`) reads `useTheme()` and passes `theme={…}` so toasts honor dark mode.

### 1.3 Theme toggle — fix the "wrong direction" feel
- The icon variant currently shows the **current** mode (sun in light, moon in dark). Most users expect it to show **what it will switch to** — that's why it feels wrong.
- Fix: invert the icon — show Moon in light mode, Sun in dark mode. Tooltip: "Switch to dark / Switch to light". Animation stays.
- Switch variant in the sidebar: keep the current track behavior, but add a small Sun/Moon marker on each side of the track so the user can see both states at once instead of guessing.
- Add a `useTheme()` SSR-safe mount guard in both spots so the icon doesn't flicker on first paint.

### 1.4 Driver shell + login screen — dark-mode parity
- `DriverShell.tsx` and `MyRunToday.tsx` are still light-only. Apply the same token sweep.
- `LoginPage.tsx` and `PublicQuoteForm.tsx` — sweep too. These are the first impression for new drivers and customers.

**Acceptance:** flipping dark/light on every tab (Dashboard, Truck Runs, Jobs, Customers, Reviews, SMS Log, Settings, the driver shell, and the public quote page) shows zero white-flash cards. Lint clean.

---

## Phase 2 — Customer identity + table parity + driver notes

> *"The customer is the unit of value. Make them visible everywhere and make completing a job tell the whole story."*

### 2.1 Unified customer avatar
- Today: `customer.avatar` is a stored URL; new customers get nothing; LiveTruckRuns uses big initials.
- Build a **single** `<CustomerAvatar customer={…} size="sm|md|lg" />` component that:
  1. Renders `customer.avatar` if present (with fallback on error).
  2. Else renders a deterministic gradient + initials (gradient seeded from customer ID so it's stable).
  3. Optional VIP star badge (top-right) when `customer.vip`.
- Replace **every** ad-hoc avatar in: `LiveTruckRuns` (the giant monogram), `CustomersView` cards, `CustomerDetailDialog`, `RecentJobs`, `JobsTable`, `DailyReviewPanel`. One component, one source of truth.
- Bonus: on LiveTruckRuns cards, the hero region uses the avatar's gradient as the card's gradient — the brand identity of each customer becomes the card's identity. This is the "characterful" thing the audit is missing.

### 2.2 CustomersView → table (not cards)
- Rebuild `CustomersView` around the same table primitives as `JobsTable`. Columns:
  - Avatar + Name (+ company subtitle if present)
  - Phone (mono)
  - Type pill (Individual / Company / **VIP** badge)
  - Total jobs (tabular)
  - Total spent (mono, tabular)
  - Last job (relative date — "3d ago")
  - Source pill (Phone / Website / Referral / etc.)
  - Row action: "View" + "New job for…" (creates a NewQuoteDialog prefilled)
- Keep the existing search, sort (VIPs → recency → alpha), and filters. Move them into a refined table header bar like `RecentJobs` has.
- Add a sparkline column (8 weeks of job count) — `recharts` is already a dep. Tiny visual that turns the customer book into something Yamen can scan.
- The grid-card view becomes optional via a layout toggle (table is the default; cards live behind a chip the way LUVAL switches between layouts).

### 2.3 Driver completion notes
- Add an **optional** `Notes` textarea to `MarkCompleteDialog` (and the driver-side `MarkDeliveredSheet`).
- On submit, append to `job.notes` with a timestamp + driver name (don't overwrite existing notes — those are dispatcher instructions).
- Schema: `job.notes` already exists. New convention: notes is a multi-line freeform field with timestamped lines like:
  ```
  [2026-04-11 14:32 · Steve] Garage code 4421. Left at side door per recipient request.
  ```
- Show the notes in `JobDetailDialog` and surface the latest note as a "last update" line on completed jobs in the dashboard.
- Bonus: a quick-pick chip row above the textarea — "Left at door", "With neighbour", "Garage code", "No-one home" — taps to insert the chip's text into the textarea.

### 2.4 Status & pill consistency
- The audit found three places that style status pills slightly differently. Centralize into one `<StatusPill status={…} />` component and use it in `LiveTruckRuns`, `JobsTable`, `CustomersView`, `JobDetailDialog`, `DailyReviewPanel`. Reduces drift forever.

---

## Phase 3 — Notifications bell + global search

> *"The two affordances we put in the topbar should actually do something."*

### 3.1 Notifications — real signals, real panel
- Compute alert sources from existing data (no new tables):
  - **Failed SMS** — already wired
  - **Overdue ETAs** — `In Delivery` jobs whose `date` is older than today
  - **Missing proof** — `Completed`/`Invoiced` jobs without `proofPhoto` or `signature`
  - **Unassigned scheduled jobs** — `Scheduled` status with no `assignedTruck`
  - **Day-prior SMS not sent** — tomorrow's jobs whose `dayPriorSmsSentAt` is null
- Build a `useAlerts(jobs, smsLog)` hook that returns a typed list of `{ id, severity, title, description, jobId, action }`.
- Bell button opens a popover with grouped alerts, severity colors, and a "Take action" button per alert that opens the relevant dialog (`MarkCompleteDialog` for missing proof, `AcceptAssignDialog` for unassigned, etc.).
- Bell badge shows total alert count (red if any high severity, blue if only info).
- Empty state: "All clear · No alerts right now" — feels good when it's the case.

### 3.2 Search — functional, scoped, optional per tab
- Build a `useSearch(query, jobs, customers, smsLog)` hook that returns ranked results across:
  - Jobs (by customer name, phone, address, ID, receipt number)
  - Customers (by name, company, phone, email)
  - SMS log entries (by recipient, body)
- TopBar exposes a `searchScope` prop. Each tab declares which scopes are relevant — Dashboard searches everything, Customers searches customers only, SMS Log searches SMS only, Settings hides the search entirely.
- The search input becomes a controlled component opening a dropdown of grouped results — clicking jumps to the right tab and opens the right detail dialog.
- ⌘K opens it from anywhere. (We already render the kbd hint.)
- Empty-query state: show 5 most recent items in the active scope as quick links.

### 3.3 Hide search where it's noise
- Settings tab: hide search entirely.
- Driver shell: no search bar (or if added later, scoped to "today's jobs").

---

## Phase 4 — Messaging upgrade

> *"SMS is the heartbeat of the business. Make it dynamic, customizable, and ready to actually send."*

### 4.1 Per-customer dynamic templates
- Move `SMS_TEMPLATES` out of `src/lib/sms.ts` into a Supabase table `sms_templates` with rows: `id, key, label, body, active, owner_id, updated_at`. Seed with the existing 3 hardcoded templates so nothing breaks on first load.
- Variables supported (Mustache-style `{{...}}`):
  - `{{customer.firstName}}`, `{{customer.fullName}}`, `{{customer.phone}}`
  - `{{job.date}}` (formatted), `{{job.pickup}}`, `{{job.delivery}}`, `{{job.fee}}`, `{{job.truck}}`, `{{job.eta}}`
  - `{{owner.name}}`, `{{owner.businessName}}` (from a new `business_settings` row)
- Template editor in **Settings → SMS Templates**: list of templates, edit body, preview against a sample customer, save. Validates required variables.
- Per-customer override: in `CustomerDetailDialog`, optionally pin a "preferred template" so when you send day-prior to that customer, the system picks their template if set.

### 4.2 Custom messages from anywhere
- New `<SendSmsDialog>` component:
  - Trigger from: customer detail, job detail, dashboard daily-review row, SMS log toolbar.
  - Lets you choose template (or "Custom"), edit the rendered body inline, see SMS character count + segment count, send.
  - Logs to `sms_log` with `type='other'` for custom sends (already supported).
- Add a "Send SMS" quick-action button to the customer table row and the LiveTruckRuns card.

### 4.3 Real SMS provider (gated, one-line swap)
- Wrap the existing stub in `src/lib/sms-provider.ts` with a single function `dispatch(to, body)`.
- Default implementation logs (current behavior).
- Drop-in adapters scaffolded for **Twilio** and **MessageMedia** (the two most common AU providers — Yamen is in AU based on the SettingsView comments). Activated by env var `SMS_PROVIDER=twilio|messagemedia|stub`.
- This phase ships the code path; Yamen flips the env var when he's ready to pay.

### 4.4 Bulk send
- "Send all day-prior SMS" button in DailyReviewPanel becomes one-click for tomorrow's whole run, with per-customer template resolution and a progress toast.

---

## Phase 5 — Roles, mobile driver, and the second-order improvements

> *"Now that the platform works for the owner, make it work for the people the owner depends on."*

### 5.1 Driver shell rebuild — mobile-first
- Bottom tab bar (3 tabs): **Today**, **Week**, **Profile**.
- Today tab: bigger touch targets, status filter chips (To-do / Done), inline "Start run" button on each job that flips the status `Scheduled → In Delivery` and triggers an en-route SMS automatically. This closes the loop on the en-route flow that's currently manual from the dashboard.
- Profile tab: name, assigned truck, lifetime jobs delivered, link to log out.
- Full dark-mode parity (already covered in Phase 1, but the new tabs need it too).
- Pull-to-refresh (`react-query` `refetch()` on a touch-pull gesture).
- "Mark complete" sheet keeps the photo + signature flow but adds the **notes** input from Phase 2.
- Network-aware: cache today's jobs in `localStorage` so a driver in a basement can still see their list and the "complete" action queues until they're back online (queue → mutation on reconnect).

### 5.2 Dispatcher / admin roles wired
- The data model already has `dispatcher` and `admin`, but App.tsx doesn't gate them. Define real perms:
  - **Dispatcher**: everything an owner can do **except** Settings and financials (no spend totals on customers, no fee column on tables, no SMS template editing).
  - **Admin**: same as owner (truly an alias today; reserved for future).
- Add a `useCan(action)` hook that returns booleans (`can('edit-team')`, `can('see-revenue')`). Use it to hide the menu items and table columns the role shouldn't see — don't render-and-disable, actually hide.

### 5.3 Real driver / customer counts in profile menu
- `driverCount={0}` is hardcoded. Wire to `useProfiles({ role: 'driver', active: true }).length`.
- `customerCount` already wired.

### 5.4 Job activity timeline
- Add a small "Activity" tab inside `JobDetailDialog` showing every status change with timestamp + actor (who marked it scheduled, who marked it complete, when each SMS was sent, who added each note).
- Implementation: derive from existing fields (`createdAt`, `dayPriorSmsSentAt`, `enRouteSmsSentAt`, completion timestamp, decline reason, declineDate). No new table required for v1; if/when we want full audit trail, add `job_events` later.

### 5.5 Dashboard insights chip
- Below the KPI strip, a slim **Today vs Last Week** chip row: "+18% jobs", "+$420 revenue", "92% on-time" — small, glanceable, computed from existing data using `recharts` mini sparklines.

---

## Phase 6 — Polishing the long tail

> *"Things that don't fit anywhere else but each of them earns 30 seconds of Yamen's day back."*

- **CSV import for customers** — `Settings → Customers → Import CSV`. Bootstraps a new owner onboarding in 5 minutes instead of an afternoon.
- **Receipt-number search fast path** — paste a receipt number into search, jump straight to the job with no clicks.
- **One-click rebook** in `JobDetailDialog` and `CustomersView` row action — duplicates the job into a new Quote with a fresh date.
- **Status filter chips** at the top of `JobsTable` (and `RecentJobs`) — All / Quote / Scheduled / In Delivery / Completed.
- **Empty states** for every tab — a designed empty state (illustration + 1-line CTA) for: no jobs, no customers, no SMS, no reviews, no team. Each one points to the action that fixes it.
- **Sonner toast skin** — match the rebel tokens, use the brand blue for "info", success green for completed, danger red for failures.
- **Login screen** — reskin to match the dashboard so the first impression is the same product. Keep the existing auth flow.
- **Public quote form** — same skin, but stays minimal (it's customer-facing).
- **Print-friendly invoice view** for `JobDetailDialog` — `@media print` styles + a "Print receipt" button. Covers Yamen's paper trail without building an invoicing system.

---

## Phase order & dependencies

```
Phase 1 (foundation)
  └─► Phase 2 (customers + driver notes)
        └─► Phase 3 (bell + search)
              └─► Phase 4 (messaging)
                    └─► Phase 5 (roles + mobile driver)
                          └─► Phase 6 (long tail polish)
```

Phases 1–2 are blockers for everything else. After that, 3 / 4 / 5 are independently shippable but stack nicely in the listed order because each one builds the trust the next one needs (you don't ship "real SMS" before the bell is reliable; you don't ship dispatcher gating before the customer table is in place to test it on).

## What's deliberately NOT here
- A new analytics module (a daily-revenue chart fits inside Phase 5; a full BI dashboard does not).
- Email integration / invoicing system — needs backend infra; revisit after Yamen is using the SMS provider in anger.
- Multi-business / multi-tenant — premature.
- AI features (auto-categorize jobs, suggest pricing) — premature; we don't have enough labelled data yet.

---

## Open questions for Yamen before Phase 1 starts

1. **Font preference confirmed?** Inter Variable, or do you want to try **Geist Variable** (tighter, more "tech-y")? I'll mock both in Phase 1.1 if you're undecided.
2. **SMS provider** — Twilio or MessageMedia? Affects Phase 4.3 scaffolding. (Or "neither yet, just stub it well.")
3. **Driver bottom-tab bar** in Phase 5.1 — do you want **Today / Week / Profile**, or just **Today / Profile** (simpler)?
4. **Dispatcher revenue visibility** — should dispatchers see fees at all, or only the owner sees money?
5. **Customer avatars** — okay with auto-generated initials gradients for new customers, or do you want photo upload as a setting?
