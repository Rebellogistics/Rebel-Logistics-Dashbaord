-- V4 Phase 3 — inbound SMS support
--
-- Yamin's call on May 4: customers replying to outbound SMS today either get
-- Twilio's default boilerplate (V4 1.6 fixed that with a Rebel-branded
-- auto-reply) or vanish into the void on the Twilio dashboard. He needs to
-- see those replies on his dashboard, route them to the right place, and
-- thread them against the outbound message they answered.
--
-- This block extends `sms_log` with the columns required for inbound
-- ingestion + threading + read state, plus widens the `type` check so we
-- can record 'auto_reply' alongside the existing day_prior / en_route /
-- other. Idempotent — safe to re-run.

-- 1. New columns
ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_message_sid TEXT,
  ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Direction must be one of the two known values.
ALTER TABLE public.sms_log
  DROP CONSTRAINT IF EXISTS sms_log_direction_check;
ALTER TABLE public.sms_log
  ADD CONSTRAINT sms_log_direction_check
  CHECK (direction IN ('outbound', 'inbound'));

-- 3. Widen the `type` check to allow auto_reply (existing rows stay valid).
ALTER TABLE public.sms_log
  DROP CONSTRAINT IF EXISTS sms_log_type_check;
ALTER TABLE public.sms_log
  ADD CONSTRAINT sms_log_type_check
  CHECK (type IN ('day_prior', 'en_route', 'auto_reply', 'other'));

-- 4. Indexes for the new query patterns.
--    - Threading: find recent outbounds to a phone to attach a parent SID.
--    - Inbox: list inbound, optionally unread.
CREATE INDEX IF NOT EXISTS idx_sms_log_recipient_phone_sent_at
  ON public.sms_log (recipient_phone, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_log_provider_message_id
  ON public.sms_log (provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_log_parent_message_sid
  ON public.sms_log (parent_message_sid)
  WHERE parent_message_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_log_inbound_unread
  ON public.sms_log (sent_at DESC)
  WHERE direction = 'inbound' AND read_at IS NULL;

-- 5. Backfill: existing rows are all outbound (direction defaulted), so the
--    only thing we need to do is mark read_at on every existing inbound
--    row (none today) — no-op. Comment kept for clarity.

COMMENT ON COLUMN public.sms_log.direction IS
  'V4 Phase 3.2: outbound (we sent it) or inbound (customer texted us).';
COMMENT ON COLUMN public.sms_log.provider_message_id IS
  'V4 Phase 3.2: Twilio Message SID for outbound rows. Used as the parent '
  'lookup key for threading inbound replies.';
COMMENT ON COLUMN public.sms_log.parent_message_sid IS
  'V4 Phase 3.4: for inbound rows, the provider_message_id of the most '
  'recent outbound to the same number — links a reply to its thread.';
COMMENT ON COLUMN public.sms_log.read_at IS
  'V4 Phase 3.3: timestamp the operator marked the inbound message as read. '
  'NULL = unread (drives the notification bell badge count).';
