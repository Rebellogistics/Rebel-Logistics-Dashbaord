-- V4 Phase 5 — warehouse load-up + morning prep tasks
--
-- New `tasks` primitive: per truck-day checklist items the driver works
-- through before / between jobs. Yamin's call: "the to-do will be what
-- needs to happen in the morning before the day starts. Whether it's
-- loading up, making sure the truck is clean…"
--
-- Distinct from `jobs` because:
--   - no customer
--   - no money
--   - drivers complete them by tap, no proof / signature
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_name      TEXT NOT NULL,
  scheduled_date  DATE NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'load_up'
                    CHECK (kind IN ('load_up', 'clean', 'fuel', 'other')),
  title           TEXT NOT NULL,
  description     TEXT,
  sequence        INTEGER,
  completed_by_driver_id   UUID,
  completed_by_driver_name TEXT,
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_truck_date_sequence
  ON public.tasks (truck_name, scheduled_date, sequence)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_open
  ON public.tasks (scheduled_date, truck_name)
  WHERE deleted_at IS NULL AND completed_at IS NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_owner ON public.tasks;
CREATE POLICY tasks_select_owner ON public.tasks FOR SELECT TO authenticated
  USING (public.is_owner());
DROP POLICY IF EXISTS tasks_insert_owner ON public.tasks;
CREATE POLICY tasks_insert_owner ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS tasks_update_owner ON public.tasks;
CREATE POLICY tasks_update_owner ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS tasks_delete_owner ON public.tasks;
CREATE POLICY tasks_delete_owner ON public.tasks FOR DELETE TO authenticated
  USING (public.is_owner());

DROP POLICY IF EXISTS tasks_select_truck ON public.tasks;
CREATE POLICY tasks_select_truck ON public.tasks FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('truck','driver')
    AND truck_name = public.current_user_truck()
    AND scheduled_date >= (CURRENT_DATE - INTERVAL '7 days')::date
  );
DROP POLICY IF EXISTS tasks_update_truck ON public.tasks;
CREATE POLICY tasks_update_truck ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('truck','driver')
    AND truck_name = public.current_user_truck()
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

COMMENT ON TABLE public.tasks IS
  'V4 Phase 5: per-truck-per-day checklist items (warehouse load-up, '
  'truck clean, fuel up, other). Distinct from jobs — no customer, no '
  'money. Drivers tap to complete, owner manages the list.';
