-- Phase 4: editable SMS templates.
-- Run via the Supabase SQL editor or `supabase db push`. The app degrades to
-- baked-in defaults when this table is missing or empty, so it is safe to
-- delay running this migration.

CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('day_prior', 'en_route', 'other')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_active ON public.sms_templates(active);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all users" ON public.sms_templates;
CREATE POLICY "Enable read for all users" ON public.sms_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable write for all users" ON public.sms_templates;
CREATE POLICY "Enable write for all users" ON public.sms_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.touch_sms_templates_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sms_templates_set_updated_at ON public.sms_templates;
CREATE TRIGGER sms_templates_set_updated_at
    BEFORE UPDATE ON public.sms_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_sms_templates_updated_at();

-- Seed defaults so the editor opens with the same content as the app's fallbacks.
INSERT INTO public.sms_templates (key, label, body, type, sort_order)
VALUES
    (
        'day_prior',
        'Day-prior reminder',
        'Hi {{customer.firstName}}, {{owner.businessName}} here. Your {{job.type}} booking is scheduled for {{job.date}}. Pickup: {{job.pickup}}. Delivery: {{job.delivery}}. Reply if you need to change anything.',
        'day_prior',
        10
    ),
    (
        'en_route',
        'En route',
        'Hi {{customer.firstName}}, {{owner.businessName}}. Your driver is en route to {{job.pickup}} now and should arrive around {{job.eta}}. See you shortly.',
        'en_route',
        20
    ),
    (
        'arrival',
        'Arrived on site',
        'Hi {{customer.firstName}}, {{owner.businessName}}. We''ve arrived at {{job.pickup}}.',
        'other',
        30
    ),
    (
        'completed',
        'Job complete',
        'Hi {{customer.firstName}}, {{owner.businessName}}. Your delivery to {{job.delivery}} is complete. Thanks for choosing us — invoice to follow.',
        'other',
        40
    ),
    (
        'follow_up',
        'Follow-up',
        'Hi {{customer.firstName}}, {{owner.businessName}} here following up on your booking. Let us know if there''s anything we can help with.',
        'other',
        50
    )
ON CONFLICT (key) DO NOTHING;
