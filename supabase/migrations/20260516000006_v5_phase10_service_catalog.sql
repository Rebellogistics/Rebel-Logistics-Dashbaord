-- V5 Phase 10: editable service catalog.
--
-- Yamin's ask (May 15 call): "can there be more flexibility where I can
-- edit a new service or remove a new service myself?"
--
-- The 3 builtin types ('Standard', 'White Glove', 'House Move') stay
-- hardcoded in the pricing calculator + JobType union for now —
-- changing those would mean re-wiring volume / hourly / metro maths
-- across the codebase. The new `services` table layers custom services
-- on top: they show up as picker options on the customer-pricing
-- preset (V5 P3 default_service) so Yamin can name a service like
-- "Pallet delivery" or "Tail-lift overnight storage transfer" and
-- attach it to a contracted customer without a deploy.
--
-- Builtins are seeded with builtin=true so a future migration can
-- safely flip jobs.type from a string-union to a real FK on this
-- table without orphaning historical rows.

CREATE TABLE IF NOT EXISTS public.services (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL UNIQUE,
  default_rate              NUMERIC,
  default_duration_minutes  INTEGER,
  description               TEXT,
  active                    BOOLEAN NOT NULL DEFAULT true,
  sort_order                INTEGER NOT NULL DEFAULT 100,
  builtin                   BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.services (name, sort_order, builtin, description)
VALUES
  ('Standard',    10, true, 'Builtin · volume-priced metro / regional delivery'),
  ('White Glove', 20, true, 'Builtin · premium volume-priced delivery'),
  ('House Move',  30, true, 'Builtin · hourly-priced full move')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_select_owner ON public.services;
CREATE POLICY services_select_owner ON public.services FOR SELECT TO authenticated
  USING (public.is_owner());
DROP POLICY IF EXISTS services_insert_owner ON public.services;
CREATE POLICY services_insert_owner ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS services_update_owner ON public.services;
CREATE POLICY services_update_owner ON public.services FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());
DROP POLICY IF EXISTS services_delete_owner ON public.services;
CREATE POLICY services_delete_owner ON public.services FOR DELETE TO authenticated
  USING (public.is_owner());
