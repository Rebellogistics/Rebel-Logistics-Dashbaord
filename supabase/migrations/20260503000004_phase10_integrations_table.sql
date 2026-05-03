-- Phase 10 / 19: integrations table holding the user's connected
-- third-party accounts (Google Calendar today, Xero / Twilio later).
-- The original migration was deleted from the repo at some point — this
-- recreates exactly the columns the api/auth/google/exchange.ts and
-- api/calendar/sync.ts handlers expect.

CREATE TABLE IF NOT EXISTS integrations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider                 TEXT NOT NULL,
  account_label            TEXT,
  refresh_token            TEXT,
  access_token_expires_at  TIMESTAMPTZ,
  connected_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at               TIMESTAMPTZ,
  last_sync_at             TIMESTAMPTZ,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT integrations_user_provider_uniq UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS integrations_user_id_idx
  ON integrations(user_id) WHERE revoked_at IS NULL;

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integrations' AND policyname='integrations_select_own'
  ) THEN
    CREATE POLICY integrations_select_own ON integrations
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='integrations' AND policyname='integrations_modify_own'
  ) THEN
    CREATE POLICY integrations_modify_own ON integrations
      FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

COMMENT ON TABLE integrations IS
  'Phase 10/19: user-scoped third-party connections (Google Calendar today). refresh_token + metadata.access_token are server-only — browser never reads them.';
COMMENT ON COLUMN integrations.metadata IS
  'JSONB bag for provider-specific state. For google_calendar: { calendar_id, access_token, scope }.';
