-- Phase 11B: extend the existing driver-role RLS to the new truck role.
-- Trucks reuse current_user_role() and current_user_truck() — the synthetic
-- profile created by useCreateTruckLogin has role='truck' and assigned_truck
-- set to the truck's name, so the existing helpers Just Work.
--
-- Adding NEW policies (rather than altering driver ones) so the legacy
-- driver path keeps working unchanged during the transition.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='jobs_select_truck'
  ) THEN
    CREATE POLICY jobs_select_truck ON jobs FOR SELECT USING (
      current_user_role() = 'truck'
      AND assigned_truck = current_user_truck()
      AND (date)::date >= (CURRENT_DATE - INTERVAL '7 days')::date
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='jobs' AND policyname='jobs_update_truck'
  ) THEN
    CREATE POLICY jobs_update_truck ON jobs FOR UPDATE USING (
      current_user_role() = 'truck'
      AND assigned_truck = current_user_truck()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='job_photos' AND policyname='job_photos_truck_select'
  ) THEN
    CREATE POLICY job_photos_truck_select ON job_photos FOR SELECT USING (
      current_user_role() = 'truck'
      AND EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = job_photos.job_id
          AND jobs.assigned_truck = current_user_truck()
      )
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='job_photos' AND policyname='job_photos_truck_delete_own'
  ) THEN
    CREATE POLICY job_photos_truck_delete_own ON job_photos FOR DELETE USING (
      current_user_role() = 'truck' AND uploaded_by = auth.uid()
    );
  END IF;
END $$;

COMMENT ON POLICY jobs_select_truck ON jobs IS
  'Phase 11B: truck-role can see only its own truck''s jobs from the last 7 days.';
COMMENT ON POLICY jobs_update_truck ON jobs IS
  'Phase 11B: truck-role can update its own truck''s jobs (status, completion, notes).';
