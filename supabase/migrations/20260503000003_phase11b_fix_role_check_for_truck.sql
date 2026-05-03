-- Phase 11B follow-up: the profiles.role check constraint never got
-- 'truck' added when the new role was introduced (Phase 11B added the
-- TypeScript enum + RLS policies but missed the column-level check).
-- Drop + recreate so truck-role profile rows can be inserted/updated.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'driver'::text, 'truck'::text, 'dispatcher'::text, 'admin'::text, 'pending'::text]));
