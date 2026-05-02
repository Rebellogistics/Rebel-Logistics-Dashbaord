-- Phase 11 foundation: introduce a `drivers` table separate from `profiles`,
-- and a `trucks.user_id` link so each truck can hold its own auth.users
-- account (one tablet per truck). Yamin's mental model from the May 2 call:
-- trucks have logins, drivers don't — drivers are picked from a dropdown
-- at the start of a shift and never authenticate directly.

-- 1. Drivers table — name + phone only, no email/auth.
CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID
);
CREATE INDEX IF NOT EXISTS drivers_active_idx ON drivers(active) WHERE active = TRUE;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='drivers' AND policyname='drivers_owner_all'
  ) THEN
    CREATE POLICY drivers_owner_all ON drivers
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('owner','admin'))
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role IN ('owner','admin'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='drivers' AND policyname='drivers_authenticated_read'
  ) THEN
    CREATE POLICY drivers_authenticated_read ON drivers
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 2. Backfill: any active `driver` profile becomes a `drivers` row, keeping
-- the same UUID so `truck_shifts.driver_user_id` continues to resolve.
INSERT INTO drivers (id, name, phone, active, created_at)
SELECT user_id, COALESCE(full_name, 'Driver'), phone, COALESCE(active, TRUE), created_at
FROM profiles
WHERE role = 'driver'
ON CONFLICT (id) DO NOTHING;

-- 3. trucks.user_id — the auth.users account that owns the truck's tablet.
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS trucks_user_id_uniq ON trucks(user_id) WHERE user_id IS NOT NULL;

-- 4. Surface the new table to Realtime so the owner dashboard live-updates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
  END IF;
END $$;

COMMENT ON TABLE drivers IS 'Phase 11: name + phone of drivers picked from the truck portal dropdown. No auth — drivers do not log in.';
COMMENT ON COLUMN trucks.user_id IS 'Phase 11: optional auth.users account for the truck''s tablet login. NULL means no login yet.';
