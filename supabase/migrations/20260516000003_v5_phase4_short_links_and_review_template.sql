-- V5 Phase 4: brand-owned URL shortener + review-request SMS template.
--
-- The shortener gives every customer-facing link a clean shape:
--   <vercel-domain>/api/r?slug=rebel  →  301 →  <wherever Yamin set>
-- The seed row uses a Google search fallback so the template works end-to-
-- end before Yamin sends through the real GMB review URL. Yamin (or
-- Sumanyu) updates the row in place when the real URL arrives.

CREATE TABLE IF NOT EXISTS public.short_links (
  slug         TEXT PRIMARY KEY,
  target_url   TEXT NOT NULL,
  owner_label  TEXT,
  hit_count    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.short_links (slug, target_url, owner_label)
VALUES (
  'rebel',
  'https://www.google.com/search?q=Rebel+Logistics+Sydney+reviews',
  'Google review request — placeholder; update with GMB review link when Yamin sends it'
)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS short_links_select_owner ON public.short_links;
CREATE POLICY short_links_select_owner ON public.short_links FOR SELECT TO authenticated
  USING (public.is_owner());
DROP POLICY IF EXISTS short_links_insert_owner ON public.short_links;
CREATE POLICY short_links_insert_owner ON public.short_links FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS short_links_update_owner ON public.short_links;
CREATE POLICY short_links_update_owner ON public.short_links FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS short_links_delete_owner ON public.short_links;
CREATE POLICY short_links_delete_owner ON public.short_links FOR DELETE TO authenticated
  USING (public.is_owner());

-- The /api/r redirect endpoint reads via service-role (bypasses RLS), so
-- no anon-read policy is needed.

-- Widen sms_templates.type CHECK to include review_request so the Settings
-- editor can persist the new template body.
ALTER TABLE public.sms_templates
  DROP CONSTRAINT IF EXISTS sms_templates_type_check;
ALTER TABLE public.sms_templates
  ADD CONSTRAINT sms_templates_type_check
  CHECK (type IN ('day_prior', 'en_route', 'review_request', 'other'));

-- Widen sms_log.type CHECK so review-request sends can be logged with the
-- right type (not collapsed to 'other').
ALTER TABLE public.sms_log
  DROP CONSTRAINT IF EXISTS sms_log_type_check;
ALTER TABLE public.sms_log
  ADD CONSTRAINT sms_log_type_check
  CHECK (type IN ('day_prior', 'en_route', 'auto_reply', 'review_request', 'other'));

-- Seed the review-request template so it shows in the Settings → SMS
-- template editor immediately (without waiting for the DEFAULT_TEMPLATES
-- fallback, which only kicks in when sms_templates is empty).
INSERT INTO public.sms_templates (key, label, body, type, active, sort_order)
VALUES (
  'review_request',
  'Google review request',
  'Hi {{customer.firstName}}, thanks for choosing {{owner.businessName}}! If we did a good job, could you take 30 seconds to leave us a Google review? {{review.url}}',
  'review_request',
  true,
  60
)
ON CONFLICT (key) DO NOTHING;
