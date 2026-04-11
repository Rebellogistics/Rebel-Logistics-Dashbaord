-- Phase 8a: Authentication foundation.
-- Creates the profiles table, first-user-wins owner bootstrap trigger, and
-- the is_owner() helper for later RLS policies. Run after Phase 7.
--
-- IMPORTANT: Before running this migration, go to Supabase dashboard →
-- Authentication → Providers → Email → toggle OFF "Confirm email". Otherwise
-- new accounts cannot sign in until they click a confirmation link, which
-- defeats the seed script.

-- -------- profiles table --------

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'pending',
  full_name TEXT,
  email TEXT,
  phone TEXT,
  assigned_truck TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'driver', 'dispatcher', 'admin', 'pending'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- -------- Auto-create profile on signup (first-user-wins owner) --------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  default_role TEXT;
BEGIN
  SELECT COUNT(*) = 0 INTO is_first_user FROM public.profiles;
  default_role := CASE WHEN is_first_user THEN 'owner' ELSE 'pending' END;

  INSERT INTO public.profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    default_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------- is_owner() helper for RLS --------
-- SECURITY DEFINER so RLS policies on other tables can call it without
-- recursing through profiles' own RLS.

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'owner' AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_user_truck()
RETURNS TEXT AS $$
  SELECT assigned_truck FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- -------- RLS on profiles --------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can read all profiles" ON public.profiles;
CREATE POLICY "Owners can read all profiles" ON public.profiles
  FOR SELECT USING (public.is_owner());

DROP POLICY IF EXISTS "Owners can insert profiles" ON public.profiles;
CREATE POLICY "Owners can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "Owners can update any profile" ON public.profiles;
CREATE POLICY "Owners can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_owner());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete profiles" ON public.profiles;
CREATE POLICY "Owners can delete profiles" ON public.profiles
  FOR DELETE USING (public.is_owner());

-- -------- Reload PostgREST schema cache --------

NOTIFY pgrst, 'reload schema';

-- -------- Verification query --------

SELECT
  'profiles table exists' AS check_name,
  EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AS result
UNION ALL
SELECT 'handle_new_user function exists',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
UNION ALL
SELECT 'is_owner function exists',
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_owner')
UNION ALL
SELECT 'on_auth_user_created trigger exists',
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created');
