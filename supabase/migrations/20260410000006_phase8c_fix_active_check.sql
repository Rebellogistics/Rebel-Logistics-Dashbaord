-- Phase 8c fix: honour profiles.active in current_user_role / current_user_truck.
--
-- Original Phase 8a helpers returned the role and truck regardless of whether
-- the profile was marked active. Phase 8b's driver RLS policies call these
-- helpers, so deactivating a driver from Settings → Team did not actually
-- block their access — the driver could still log in and see their truck's
-- jobs. This migration rewrites the helpers to filter by active=true so
-- deactivation takes effect immediately without touching the driver policies.
--
-- is_owner() already had the active=true check, so it's correct. Leaving it
-- alone, but re-declaring for completeness in case anything drifted.
--
-- Idempotent. Run after Phase 8a and 8b.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'owner' AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_truck()
RETURNS TEXT AS $$
  SELECT assigned_truck FROM public.profiles
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';

-- Verification: confirm the three helpers exist with the active check.
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) ILIKE '%active%' AS has_active_check
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('is_owner', 'current_user_role', 'current_user_truck')
ORDER BY p.proname;
