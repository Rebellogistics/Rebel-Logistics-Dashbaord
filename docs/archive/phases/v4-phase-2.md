# V4 Phase 2 — Quote-form correctness + small UX debts
**Status:** ✅ shipped 2026-05-04 · **Commit:** `651e70f`

## What's done
- **Desktop New Job button** in the top bar (right cluster, hidden on `<lg`). Opens the full `NewQuoteDialog`.
- **Duplicate customer prevention.** `NewQuoteDialog` scans the customer book against the typed company-name / customer-name. Levenshtein-based fuzzy compare with 20% tolerance — *Bayless* vs *Bayleys* trips it. Amber banner: *"Did you mean Bayleys Rugs? They're already in your customer book · 7 previous bookings."* One-click *Use existing* button. Helpers in `src/lib/utils.ts` (`normaliseName`, `levenshtein`, `isNearDuplicate`).
- **Match-reason chip in customer combobox.** Each result row shows a tiny *company / contact / phone / email* chip indicating which field matched.
- **Required-field rules locked.** `NewQuoteDialog` confirms before saving when delivery address is empty. Drafts skip the confirm. Customer/company name = only hard-required identity.
- **Customer search by phone — verified.** Both `CustomersView` and `useSearch` already match normalised phone digits (3-digit min).
- **Stops counter — verified job-based.** Both `TruckRunsView` and `TrucksView` count `jobs.length` not unique addresses.
- **3-dots menu in dialog edit pane.** `JobDetailDialog` renders `JobActionMenu` next to *Edit* (non-edit) and *Cancel/Save* (edit). *Mark complete…* triggers a local `MarkCompleteDialog` instance scoped to the dialog.
- **Live identity preview** under contact-phone field. Shows what the quote will save as as Yamin types.

## What's left
✅ Nothing — fully shipped.

## Deferred (not blocking)
- Quote-form contact UX cosmetic polish.
- Edit-mode delivery confirm (create path has it, edit path doesn't).
- QuickQuoteDialog company-aware parity.

## Files touched
- `src/App.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/jobs/NewQuoteDialog.tsx`
- `src/components/jobs/JobDetailDialog.tsx`
- `src/components/customers/CustomerCombobox.tsx`
- `src/lib/utils.ts`
