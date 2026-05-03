-- Phase 18: persistent storage of generated truck-login passwords so the
-- owner can reveal them later, reset them to a new random one, or set a
-- custom one. Lives in a separate table from trucks so the existing
-- "all authenticated users can SELECT trucks" RLS policy doesn't leak
-- the password to truck-role tablets.
--
-- Storage is plaintext (encrypted at rest by Supabase). Only the owner
-- role can read or write — other authenticated roles are denied.

CREATE TABLE IF NOT EXISTS truck_credentials (
  truck_id   UUID PRIMARY KEY REFERENCES trucks(id) ON DELETE CASCADE,
  password   TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE truck_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='truck_credentials' AND policyname='truck_credentials_owner_all'
  ) THEN
    CREATE POLICY truck_credentials_owner_all ON truck_credentials
      FOR ALL USING (is_owner()) WITH CHECK (is_owner());
  END IF;
END $$;

COMMENT ON TABLE truck_credentials IS
  'Phase 18: per-truck plaintext tablet passwords. Owner-only via RLS. The Generate-login flow inserts; Reset / Set-custom updates; Reveal reads.';
