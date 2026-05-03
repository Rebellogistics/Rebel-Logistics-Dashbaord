-- Phase 11B follow-up: trucks couldn't upload photos or signatures because
-- the original Phase 11B migration only added SELECT + DELETE policies for
-- the truck role on job_photos and skipped storage.objects entirely. Result:
-- saving a signature from a truck tablet returned
--   "new row violates row-level security policy"
-- since both the storage write and the job_photos insert were rejected.
--
-- This migration mirrors the existing driver-role policies for the truck
-- role: write access scoped to jobs assigned to the truck doing the upload,
-- and update/delete for re-signing or replacing photos.
-- Idempotent.

-- =============== job_photos: INSERT for truck role ===============

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_photos'
      AND policyname = 'job_photos_truck_insert'
  ) THEN
    CREATE POLICY job_photos_truck_insert ON public.job_photos
      FOR INSERT TO authenticated
      WITH CHECK (
        public.current_user_role() = 'truck'
        AND EXISTS (
          SELECT 1 FROM public.jobs
          WHERE jobs.id = job_photos.job_id
            AND jobs.assigned_truck = public.current_user_truck()
        )
      );
  END IF;
END $$;

-- =============== storage.objects: full CRUD for truck role on job-proofs ===============
-- Path convention: "{jobId}/{filename}". split_part(name, '/', 1) is the job id.
-- SignaturePad uses upsert: true, so UPDATE is needed in addition to INSERT
-- (re-signs over the same path).

DROP POLICY IF EXISTS "job-proofs_truck_select" ON storage.objects;
CREATE POLICY "job-proofs_truck_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'truck'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
        AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job-proofs_truck_insert" ON storage.objects;
CREATE POLICY "job-proofs_truck_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'truck'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
        AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job-proofs_truck_update" ON storage.objects;
CREATE POLICY "job-proofs_truck_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'truck'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
        AND jobs.assigned_truck = public.current_user_truck()
    )
  )
  WITH CHECK (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'truck'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
        AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job-proofs_truck_delete" ON storage.objects;
CREATE POLICY "job-proofs_truck_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'truck'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
        AND jobs.assigned_truck = public.current_user_truck()
    )
  );

NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 'job_photos truck insert policy',
  EXISTS(
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='job_photos'
      AND policyname='job_photos_truck_insert'
  )
UNION ALL
SELECT 'storage truck policies count == 4',
  (SELECT count(*) = 4 FROM pg_policies
   WHERE schemaname='storage' AND tablename='objects'
     AND policyname LIKE 'job-proofs_truck_%');
