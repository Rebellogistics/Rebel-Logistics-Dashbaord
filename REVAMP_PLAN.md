# Rebel Logistics Dashboard — Revamp Plan

A phased plan to take the dashboard from its current state to the design described in `DESIGN_SYSTEM.md`. Each phase is independently shippable; nothing in a later phase blocks an earlier phase from being merged.

## Guiding constraints

- **Don't break the data layer.** Hooks (`useSupabaseData`, `useSms`, `useProfile`, `useAuth`), types, and Supabase calls stay untouched. We only re-skin the views.
- **Don't break feature views.** `TruckRunsView`, `CustomersView`, `ReviewsView`, `SmsLogView`, `SettingsView`, `DriverShell`, dialogs — all keep working. They inherit the new tokens automatically because we're rewriting CSS variables, not API surface.
- **Light is the default**, dark is parity. Yamen runs ops in daylight on a phone; light wins by default.
- **Aesthetic discipline > novelty.** One accent, strict spacing, real shadows, distinctive type. No purple gradients, no Inter, no template fluff.

---

## Phase 0 — Foundation (theme tokens + provider)

**Files touched**

- `src/index.css` — replace the OKLCH neutral tokens with the dual-mode `--rebel-*` token set from `DESIGN_SYSTEM.md` §2.4. Keep the existing `--background / --foreground / --primary / …` shadcn tokens but **point them at the new Rebel tokens**, so every existing component automatically picks up the new look. Swap fonts to `Bricolage Grotesque` (display) + `Plus Jakarta Sans` (body) + `JetBrains Mono` (mono).
- `src/main.tsx` — wrap the routes in a `ThemeProvider` from `next-themes` (`attribute="class"`, `defaultTheme="light"`, `enableSystem`, `storageKey="rebel-theme"`).
- `src/components/ui/theme-toggle.tsx` (new) — animated sun/moon icon button. Used in TopBar and profile dropdown.

**Acceptance**

- App still mounts. Existing views look different (because tokens changed) but nothing crashes.
- Toggling `<html>` between `class="light"` and `class="dark"` flips every surface, text, and accent correctly.
- Theme preference survives reload.

---

## Phase 1 — Layout shell (Sidebar + TopBar)

**Files touched**

- `src/components/layout/Sidebar.tsx` — full rewrite to the spec in §4.1:
  - Branded logo block ("REBEL" + chevron-truck mark + tagline)
  - Three nav sections: **Operations**, **Communication**, **Account**
  - Active state = pale-blue surface + 3px blue left bar (no orange dot anymore)
  - Bottom **Today's Brief** card replacing the old logout block
  - Bottom row: theme toggle + tiny logout
- `src/components/layout/TopBar.tsx` — full rewrite to the spec in §4.2:
  - Page title (display-xl) + live date subtitle
  - Centered search input with `--rebel-surface-sunken` background and `cmd+k` hint
  - Right cluster: theme toggle, notifications bell with ping dot, profile avatar with chevron
  - Sticky, glass-blur background
- `src/components/layout/ProfileMenu.tsx` (new) — popover with stats strip, links, theme switch, red Log Out button (spec §4.6).
- `src/App.tsx` — drop the old greeting / TimeRangeFilter row from the dashboard (TopBar + Sidebar already carry that). Keep the AnimatePresence content swap. Drop the redundant `flex min-h-screen bg-slate-50` and let tokens drive the canvas.

**Acceptance**

- Sidebar nav clicks still call `setActiveTab`; existing views render in the main area.
- Mobile drawer still works (the slide-in behavior stays).
- Profile dropdown opens / closes / signs out correctly.

---

## Phase 2 — Dashboard content

**Files touched**

- `src/components/dashboard/KPIStats.tsx` — restyle to spec §4.5. Three equal cards, neutral white surface, single brand-tinted icon tile each, big number, delta chip. Logic stays identical.
- `src/components/dashboard/LiveTruckRuns.tsx` (new) — horizontal-scroll strip of in-progress jobs (status ∈ {Scheduled, Notified, In Delivery, Accepted}). Each card per spec §4.3. Empty state when no live runs.
- `src/components/dashboard/JobsTable.tsx` — restyle to spec §4.4: hairline rows, uppercase column heads, refined status pills using the new token surfaces. **Behavior unchanged** — same dialogs, same actions.
- `src/components/dashboard/RecentJobs.tsx` (new, thin wrapper) — calls `JobsTable` with the latest 8 jobs and a "View all jobs" link to the Jobs tab.
- `src/App.tsx` — Dashboard tab now renders: `<KPIStats /> + <LiveTruckRuns /> + <RecentJobs />`. The DailyReviewPanel moves into a side rail or under the Jobs tab.

**Acceptance**

- Dashboard view matches the LUVAL silhouette: KPIs strip, live cards strip, recent table.
- All three respect light AND dark.
- No data hooks were modified; lint passes.

---

## Phase 3 — Polish + integration check

**Files touched**

- `src/App.tsx` — page-load motion stagger (KPIs → LiveRuns → RecentJobs, 60ms delays).
- `src/components/dashboard/LiveTruckRuns.tsx` — hover lift + ring per spec.
- Status screens (`StatusScreen`, `CenteredLoader`) — reskin to use new tokens (no more hard-coded `bg-slate-50`).
- `src/components/ui/sonner.tsx` — confirm Sonner picks up the dark class.
- Run `npm run lint` (TypeScript noEmit). Spot-check `TruckRunsView`, `CustomersView`, `ReviewsView`, `SmsLogView`, `SettingsView` — they should look intentional in both modes thanks to the token change.

**Acceptance**

- `npm run lint` clean.
- Both light and dark mode look like one product, not two.
- Nothing in the existing feature set is broken.

---

## Out of scope (deliberately)

- Charts / analytics overhauls
- Driver-side mobile views
- Auth screens
- New data sources, AI features, or schema changes
- Mobile-first redesign (responsiveness is preserved, but the redesign is desktop-first to match the brief)

---

## Phase order & dependencies

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
(tokens)    (shell)     (content)   (polish)
```

Phase 0 must land first because everything else assumes the new variables exist. After that, phases 1 and 2 could in principle run in parallel, but executing serially keeps the diff coherent.
