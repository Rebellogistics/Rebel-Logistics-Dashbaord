-- Phase 8d: On-device photo capture and storage.
-- Creates the job_photos table, the job-proofs Storage bucket, and all RLS
-- policies needed for drivers to upload photos for their own jobs without
-- owner access leakage.
--
-- Requires Phase 8a (profiles, helpers), 8b (RLS), 8c (trucks).
-- Idempotent.

-- =============== job_photos table ===============

CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON public.job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_created_at ON public.job_photos(created_at);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_photos_owner_all" ON public.job_photos;
CREATE POLICY "job_photos_owner_all" ON public.job_photos
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "job_photos_driver_select" ON public.job_photos;
CREATE POLICY "job_photos_driver_select" ON public.job_photos
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_photos.job_id
      AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job_photos_driver_insert" ON public.job_photos;
CREATE POLICY "job_photos_driver_insert" ON public.job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_photos.job_id
      AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job_photos_driver_delete_own" ON public.job_photos;
CREATE POLICY "job_photos_driver_delete_own" ON public.job_photos
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'driver'
    AND uploaded_by = auth.uid()
  );

-- =============== Storage bucket: job-proofs ===============

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-proofs',
  'job-proofs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============== Storage RLS on objects ===============

DROP POLICY IF EXISTS "job-proofs_owner_all" ON storage.objects;
CREATE POLICY "job-proofs_owner_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'job-proofs' AND public.is_owner())
  WITH CHECK (bucket_id = 'job-proofs' AND public.is_owner());

DROP POLICY IF EXISTS "job-proofs_driver_select" ON storage.objects;
CREATE POLICY "job-proofs_driver_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
      AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job-proofs_driver_insert" ON storage.objects;
CREATE POLICY "job-proofs_driver_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = split_part(storage.objects.name, '/', 1)
      AND jobs.assigned_truck = public.current_user_truck()
    )
  );

DROP POLICY IF EXISTS "job-proofs_driver_delete_own" ON storage.objects;
CREATE POLICY "job-proofs_driver_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-proofs'
    AND public.current_user_role() = 'driver'
    AND owner = auth.uid()
  );

-- =============== Reload PostgREST cache ===============

NOTIFY pgrst, 'reload schema';

-- =============== Verification ===============

SELECT 'job_photos table exists' AS check_name,
  EXISTS(SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='job_photos') AS result
UNION ALL
SELECT 'job_photos has policies',
  (SELECT count(*) > 0 FROM pg_policies
   WHERE schemaname='public' AND tablename='job_photos')
UNION ALL
SELECT 'job-proofs bucket exists',
  EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'job-proofs')
UNION ALL
SELECT 'job-proofs storage policies',
  (SELECT count(*) > 0 FROM pg_policies
   WHERE schemaname='storage' AND tablename='objects'
   AND policyname LIKE 'job-proofs%');
