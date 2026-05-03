-- Phase 21: track when the post-delivery confirmation SMS fired so the
-- auto-trigger doesn't re-send if the job is re-marked completed (which
-- happens occasionally — rework, second invoice, etc).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_sms_sent_at TIMESTAMPTZ;
COMMENT ON COLUMN jobs.completion_sms_sent_at IS
  'Phase 21: timestamp of the auto-fired delivery-complete SMS. NULL = not yet sent. Set by the lib/sms helper after a successful Twilio send.';
