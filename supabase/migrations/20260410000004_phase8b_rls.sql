-- Phase 8b: Role-aware RLS on jobs, customers, sms_log, messages.
-- Plus two SECURITY DEFINER RPCs that let the public quote form continue to
-- work without opening up direct table access to anonymous users.
--
-- Requires: Phase 8a (profiles + is_owner + current_user_role + current_user_truck).
-- Idempotent: safe to re-run.

-- =============== JOBS ===============

DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select_driver" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_anon_quote" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_owner" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_driver" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_owner" ON public.jobs;

CREATE POLICY "jobs_select_owner" ON public.jobs
  FOR SELECT TO authenticated USING (public.is_owner());

CREATE POLICY "jobs_select_driver" ON public.jobs
  FOR SELECT TO authenticated USING (
    public.current_user_role() = 'driver'
    AND assigned_truck = public.current_user_truck()
    AND (date::date) >= (current_date - interval '7 days')::date
  );

CREATE POLICY "jobs_insert_owner" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

CREATE POLICY "jobs_insert_anon_quote" ON public.jobs
  FOR INSERT TO anon WITH CHECK (status = 'Quote');

CREATE POLICY "jobs_update_owner" ON public.jobs
  FOR UPDATE TO authenticated USING (public.is_owner());

CREATE POLICY "jobs_update_driver" ON public.jobs
  FOR UPDATE TO authenticated USING (
    public.current_user_role() = 'driver'
    AND assigned_truck = public.current_user_truck()
  );

CREATE POLICY "jobs_delete_owner" ON public.jobs
  FOR DELETE TO authenticated USING (public.is_owner());

-- =============== CUSTOMERS ===============

DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.customers;
DROP POLICY IF EXISTS "customers_select_owner" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_owner" ON public.customers;
DROP POLICY IF EXISTS "customers_update_owner" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_owner" ON public.customers;

CREATE POLICY "customers_select_owner" ON public.customers
  FOR SELECT TO authenticated USING (public.is_owner());

CREATE POLICY "customers_insert_owner" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

CREATE POLICY "customers_update_owner" ON public.customers
  FOR UPDATE TO authenticated USING (public.is_owner());

CREATE POLICY "customers_delete_owner" ON public.customers
  FOR DELETE TO authenticated USING (public.is_owner());

-- Customers is NOT exposed to anon directly. Public form uses upsert_customer_by_phone RPC.

-- =============== MESSAGES (legacy, owner only) ===============

DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.messages;
DROP POLICY IF EXISTS "messages_owner_only" ON public.messages;

CREATE POLICY "messages_owner_only" ON public.messages
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- =============== SMS_LOG ===============

DROP POLICY IF EXISTS "Enable read access for all users" ON public.sms_log;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.sms_log;
DROP POLICY IF EXISTS "sms_log_select_owner" ON public.sms_log;
DROP POLICY IF EXISTS "sms_log_insert_authenticated" ON public.sms_log;

CREATE POLICY "sms_log_select_owner" ON public.sms_log
  FOR SELECT TO authenticated USING (public.is_owner());

CREATE POLICY "sms_log_insert_authenticated" ON public.sms_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============== RPC: upsert_customer_by_phone ===============
-- SECURITY DEFINER lets the public form create and dedupe customers without
-- needing direct SELECT or INSERT access to the customers table.

CREATE OR REPLACE FUNCTION public.upsert_customer_by_phone(
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_id TEXT;
  v_normalized TEXT;
BEGIN
  v_normalized := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');

  IF length(v_normalized) >= 6 THEN
    SELECT id INTO v_id FROM public.customers
    WHERE regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = v_normalized
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  v_id := 'C-' || upper(substring(md5(random()::text || clock_timestamp()::text), 1, 12));

  INSERT INTO public.customers (id, name, phone, email, source, type, vip, avatar)
  VALUES (
    v_id,
    coalesce(nullif(trim(p_name), ''), 'Unknown'),
    p_phone,
    p_email,
    p_source,
    'individual',
    false,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' ||
      regexp_replace(coalesce(p_name, 'guest'), '[^A-Za-z0-9]', '', 'g')
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.upsert_customer_by_phone(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_customer_by_phone(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- =============== RPC: find_repeat_customer ===============
-- Returns at most one row with minimal info about a repeat customer.
-- Does NOT expose the jobs table or other customers.

CREATE OR REPLACE FUNCTION public.find_repeat_customer(p_phone TEXT)
RETURNS TABLE(
  customer_name TEXT,
  job_count INT,
  last_job_date TEXT,
  last_pickup TEXT,
  last_delivery TEXT
) AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  v_normalized := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_normalized) < 6 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      j.customer_name,
      j.pickup_address,
      j.delivery_address,
      j.date,
      j.created_at
    FROM public.jobs j
    WHERE regexp_replace(coalesce(j.customer_phone, ''), '[^0-9]', '', 'g') = v_normalized
  )
  SELECT
    (SELECT m.customer_name FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT count(*)::INT FROM matches),
    (SELECT m.date FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.pickup_address FROM matches m ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.delivery_address FROM matches m ORDER BY m.created_at DESC LIMIT 1)
  WHERE EXISTS (SELECT 1 FROM matches);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

REVOKE ALL ON FUNCTION public.find_repeat_customer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_repeat_customer(TEXT) TO anon, authenticated;

-- =============== Reload PostgREST cache ===============

NOTIFY pgrst, 'reload schema';

-- =============== Verification ===============

SELECT
  'jobs policies' AS check_name,
  count(*)::TEXT AS result
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'jobs'
UNION ALL
SELECT
  'customers policies',
  count(*)::TEXT
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'customers'
UNION ALL
SELECT
  'sms_log policies',
  count(*)::TEXT
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sms_log'
UNION ALL
SELECT
  'upsert_customer_by_phone RPC',
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname='upsert_customer_by_phone') THEN 'true' ELSE 'false' END
UNION ALL
SELECT
  'find_repeat_customer RPC',
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname='find_repeat_customer') THEN 'true' ELSE 'false' END;
