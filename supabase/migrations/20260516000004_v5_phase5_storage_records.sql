-- V5 Phase 5: storage records.
--
-- Furniture-storage jobs (renos, house sales) are jobs too — but the
-- workflow is so different (no driver, no truck, monthly billing) that
-- they get their own table + top-level tab. Conversions in both
-- directions: a storage record can spawn a load-out delivery job, and
-- a completed delivery job can flip into a new storage record.
--
-- Status is COMPUTED client-side from in_date / planned_out_date /
-- actual_out_date to avoid drift between a status column and the dates
-- it depends on. Three states:
--   - active   : actual_out_date IS NULL AND planned_out_date >= today
--   - overdue  : actual_out_date IS NULL AND planned_out_date < today
--   - released : actual_out_date IS NOT NULL
--
-- customer_id is nullable + ON DELETE SET NULL; we denormalise
-- customer_name so a customer wipe doesn't orphan the storage history.

CREATE TABLE IF NOT EXISTS public.storage_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name       TEXT NOT NULL,
  items_description   TEXT NOT NULL,
  in_date             DATE NOT NULL,
  planned_out_date    DATE,
  actual_out_date     DATE,
  monthly_rate        NUMERIC,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_storage_records_active
  ON public.storage_records (in_date DESC)
  WHERE deleted_at IS NULL AND actual_out_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_storage_records_customer
  ON public.storage_records (customer_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.storage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_records_select_owner ON public.storage_records;
CREATE POLICY storage_records_select_owner ON public.storage_records FOR SELECT TO authenticated
  USING (public.is_owner());
DROP POLICY IF EXISTS storage_records_insert_owner ON public.storage_records;
CREATE POLICY storage_records_insert_owner ON public.storage_records FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS storage_records_update_owner ON public.storage_records;
CREATE POLICY storage_records_update_owner ON public.storage_records FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS storage_records_delete_owner ON public.storage_records;
CREATE POLICY storage_records_delete_owner ON public.storage_records FOR DELETE TO authenticated
  USING (public.is_owner());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'storage_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_records;
  END IF;
END $$;
