# V5 Phase 5 — Storage module
**Status:** ✅ shipped 2026-05-16 · **Commit:** `73e667e`

## Source
2026-05-15 call. Yamin needs a separate "Storage" tab for furniture stored at the warehouse during renos / house sales. Workflow is different enough from delivery jobs (no driver, no truck, monthly billing) that it earns its own table + tab. Two-way conversions: storage → load-out job, completed job → storage.

## What's done
- **Schema:** new `storage_records` (customer_id FK, denormalised customer_name, items_description, in_date, planned_out_date, actual_out_date, monthly_rate NUMERIC, notes) with owner-only RLS + realtime publication.
- **Status:** COMPUTED client-side (`computeStorageStatus` in `useStorage.ts`) — three states (`active` / `overdue` / `released`) — to avoid drift between a status column and the dates it depends on.
- **Sidebar:** new "Storage" nav item (Boxes icon).
- **Storage tab:** 4-stat header (Active / Overdue / Released / Monthly recurring inc. GST), basis filter chips, search box, table of records with status pill / days-stored / GST-labelled rate / inline actions (release, convert to job, edit, delete).
- **Per-row "Release" button:** stamps today as `actual_out_date`.
- **"Convert to job":** opens NewQuoteDialog seeded with a load-OUT quote (items pre-filled into notes).
- **"Convert to storage record":** new JobActionMenu item for Completed jobs → opens StorageDialog pre-filled (customer + items + in_date). Wired through JobDetailDialog, BoardView, TruckRunsView, and the nested JobDetailDialog inside CustomerDetailDialog.
- **CustomerDetailDialog:** new Storage section (per-customer history with status badges + GST-labelled monthly rate).
- **Realtime:** `useRealtimeStorage` mounted in OwnerShell.

## What's left
- **Auto-create reminder tasks** 7d before `planned_out_date` + monthly billing reminders at storage day 30 / 60 / 90. Today's UI surfaces overdue + elapsed days visually; the scheduled task creation needs a daily cron (Vercel cron / pg_cron / daily check at app load).
- **Storage record detail dialog with activity timeline.** Edit dialog covers basic needs.

## Files touched
- `supabase/migrations/20260516000004_v5_phase5_storage_records.sql` (new)
- `src/hooks/useStorage.ts` (new)
- `src/components/storage/StorageView.tsx`, `StorageDialog.tsx` (new)
- `src/lib/types.ts`, `src/lib/database.types.ts`
- `src/App.tsx` (mount + cross-flow state)
- `src/components/layout/Sidebar.tsx`
- `src/components/jobs/JobActionMenu.tsx`, `JobDetailDialog.tsx`, `NewQuoteDialog.tsx`
- `src/components/board/BoardView.tsx`, `src/components/truck-runs/TruckRunsView.tsx`
- `src/components/customers/CustomerDetailDialog.tsx`
