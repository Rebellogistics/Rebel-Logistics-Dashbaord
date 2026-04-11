-- Phase 4: SMS notifications and audit log.
-- Run against your Supabase project via the SQL editor or the Supabase CLI.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS day_prior_sms_sent_at TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS en_route_sms_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT REFERENCES public.jobs(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('day_prior', 'en_route', 'other')),
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_sent_at ON public.sms_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_log_job_id ON public.sms_log(job_id);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.sms_log;
CREATE POLICY "Enable read access for all users" ON public.sms_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.sms_log;
CREATE POLICY "Enable insert access for all users" ON public.sms_log FOR INSERT WITH CHECK (true);
