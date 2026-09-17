-- V7 Phase 6: deliveries know which container they came out of.
--
-- A container unload and the jobs that come out of it are separate jobs and
-- separate invoices -- Yamin's rule: not every unload leads to a delivery,
-- and storage only applies when the client asks for it. What was missing was
-- the link that lets the deliveries be invoiced together.
--
-- Two ways a job gets linked, both of which have to work (Yamin, 2026-09-18):
--   1. The container arrives, is unloaded and invoiced, and the client
--      confirms the deliveries weeks later. The link is set on jobs created
--      long after the unload.
--   2. The container arrives with the deliveries already confirmed, and they
--      are booked there and then.
-- So this is a plain nullable link, settable at any point in a job's life,
-- not something fixed at creation.
--
-- ON DELETE SET NULL: deleting a container unload must not cascade into
-- deleting real delivery jobs that have their own dates, trucks and history.
-- They simply stop being grouped.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS container_job_id TEXT
    REFERENCES public.jobs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.jobs.container_job_id IS
  'The container-unload job this delivery came out of, when it came out of one. Groups deliveries onto a single invoice; the unload itself always invoices separately.';

-- Every lookup is "what came out of this container", so index that direction.
CREATE INDEX IF NOT EXISTS jobs_container_job_id_idx
  ON public.jobs (container_job_id)
  WHERE container_job_id IS NOT NULL;

-- A container unload cannot come out of itself, and a delivery cannot be its
-- own parent. One level only: these are deliveries off an unload, not a tree.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_container_not_self;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_container_not_self
  CHECK (container_job_id IS NULL OR container_job_id <> id);
