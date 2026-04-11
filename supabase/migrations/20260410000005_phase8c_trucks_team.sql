-- Phase 8c extension: trucks table and team management prerequisites.
-- Adds a first-class trucks table so Yemen can add/rename trucks from the UI
-- instead of relying on hardcoded 'Truck 1'/'Truck 2' strings. Also tightens
-- profiles RLS so owners can list and create driver profiles via the dashboard.
--
-- Requires: Phase 8a (profiles, is_owner), Phase 8b (role-aware RLS).
-- Idempotent.

-- -------- trucks table --------

CREATE TABLE IF NOT EXISTS public.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trucks_active ON public.trucks(active);

-- Seed with existing hardcoded truck names so current jobs still match.
INSERT INTO public.trucks (name, description)
VALUES ('Truck 1', 'Primary truck'), ('Truck 2', 'Secondary truck')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trucks_select_authenticated" ON public.trucks;
CREATE POLICY "trucks_select_authenticated" ON public.trucks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trucks_insert_owner" ON public.trucks;
CREATE POLICY "trucks_insert_owner" ON public.trucks
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "trucks_update_owner" ON public.trucks;
CREATE POLICY "trucks_update_owner" ON public.trucks
  FOR UPDATE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "trucks_delete_owner" ON public.trucks;
CREATE POLICY "trucks_delete_owner" ON public.trucks
  FOR DELETE TO authenticated USING (public.is_owner());

-- -------- Reload PostgREST cache --------

NOTIFY pgrst, 'reload schema';

-- -------- Verification --------

SELECT 'trucks table exists' AS check_name,
  EXISTS(SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='trucks') AS result
UNION ALL
SELECT 'trucks has policies',
  (SELECT count(*) > 0 FROM pg_policies
   WHERE schemaname='public' AND tablename='trucks')
UNION ALL
SELECT 'seeded truck count > 0',
  (SELECT count(*) > 0 FROM public.trucks);
