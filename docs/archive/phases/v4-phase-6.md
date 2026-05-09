# V4 Phase 6 — Dashboard reorg + small things
**Status:** ✅ shipped 2026-05-04 · **Commit:** `0425546`

## What's done

### 6.1 KPI tile order rebuilt
New top row, all clickable:
1. **Outstanding Quotes** → Jobs tab (amber when > 0)
2. **Warehouse Load-up** → Truck Runs (today)
3. **Today's Jobs** → Truck Runs (today)
4. **Need Proof** → Jobs tab (rose when > 0)

Removed: Notifications Sent, Closed-with-Proof %. Both still surface on their own pages — Yamin: "I don't need them on the dashboard."

### 6.2 Today's Jobs tile clickable
`onNavigateToToday` wired through App.tsx → `setActiveTab('Truck Runs')`. Pure bug fix.

### 6.3 Sticky day-prior pill (+1)
New `DayPriorPill` component above KPIStats. Auto-detects jobs scheduled for tomorrow with truck assigned + phone + no day-prior sent. One-click bulk fire (same `useSendDayPriorBulk` hook the Truck Runs button uses). Dismissable with localStorage memory keyed by date. Goes red instead of amber when tomorrow's first job is < 12h out.

### 6.4 Customer mini-counts (+1)
`CustomerStats` grows a per-status breakdown (quotes / accepted / completed / invoiced). Customers table Jobs column stacks total count over a tiny `Q3 A5` open-work chip pair (amber for pending quotes, blue for active jobs). Yamin can scan for customers with pending work without clicking each row.

## What's left
✅ Nothing — fully shipped.

## Files touched
- `src/components/dashboard/KPIStats.tsx` (rewrite)
- `src/components/dashboard/DayPriorPill.tsx` (new)
- `src/components/customers/CustomersView.tsx`
- `src/App.tsx`
