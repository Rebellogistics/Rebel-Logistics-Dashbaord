-- Phase 10: Integrations table.
-- Stores per-user OAuth refresh tokens + connection metadata for external
-- services (Google Calendar today, Xero / Dropbox / etc. later).
-- Refresh tokens live server-side and are never exposed to the browser; the
-- app reads only the "connected / revoked" state via an RPC or a narrowed view.
--
-- The UI shell in Settings → Integrations renders against this table but all
-- OAuth wiring is held until Google / Xero creds arrive (see DEFERRED.md).

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  account_label TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT integrations_provider_check CHECK (
    provider IN ('google_calendar', 'xero', 'dropbox', 'gdrive', 'webdav')
  ),
  CONSTRAINT integrations_user_provider_uniq UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_provider
  ON public.integrations(provider) WHERE revoked_at IS NULL;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Owners see + manage every integration in the org.
DROP POLICY IF EXISTS "integrations_owner_all" ON public.integrations;
CREATE POLICY "integrations_owner_all" ON public.integrations
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Users may read + manage their own integration rows (so a dispatcher can
-- connect their own calendar without granting cross-user access).
DROP POLICY IF EXISTS "integrations_self_all" ON public.integrations;
CREATE POLICY "integrations_self_all" ON public.integrations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Job rows get a xero_invoice_id column ahead of Phase 12 so the Phase 10
-- scaffold migration doesn't have to bump twice. Idempotent.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_xero_invoice_id
  ON public.jobs(xero_invoice_id) WHERE xero_invoice_id IS NOT NULL;
