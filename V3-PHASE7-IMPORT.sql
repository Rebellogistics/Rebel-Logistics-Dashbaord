-- ============================================================================
-- Rebel Logistics — V3 Phase 7: Customer import polish
-- ============================================================================
-- Run after V3-PHASE5-CALENDAR.sql. Idempotent.
--
-- Adds an import_batch tag to customers so a bulk Xero / CSV import can be
-- isolated, audited, and (if needed) bulk-removed without touching customers
-- created via the public quote form or the new-quote dialog.
-- ============================================================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS import_batch TEXT;

CREATE INDEX IF NOT EXISTS customers_import_batch_idx
    ON customers(import_batch) WHERE import_batch IS NOT NULL;

NOTIFY pgrst, 'reload schema';
