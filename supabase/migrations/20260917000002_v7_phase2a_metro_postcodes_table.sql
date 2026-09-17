-- V7 Phase 2a: the Melbourne metro postcode list becomes data.
--
-- The list decides Metro vs Regional, and from V7 that decision is binding
-- rather than advisory -- the postcode sets the zone and there is no manual
-- override on the job. That makes the list the single lever for service
-- area: moving ten suburbs from metro to regional should be ten rows
-- deleted, not a code change and a deploy.
--
-- It lived in src/lib/metroPostcodes.ts as a hardcoded Set. That file stays
-- as the seed and as the compiled-in fallback, but this table is the source
-- of truth for the dashboard from here on.
--
-- Source: "Melbourne Metro - As defined by Rebel Logistics" (Yamin,
-- 14 Sep 2026). The list reaches further out than "metro" suggests --
-- Kangaroo Ground (3097), Cottles Bridge (3099), Berwick (3806),
-- Langwarrin (3910) and the Cranbourne group (3975-3978) are all metro
-- under it. Judge by the number, never by how far the suburb feels.

CREATE TABLE IF NOT EXISTS public.metro_postcodes (
    postcode   INTEGER PRIMARY KEY CHECK (postcode BETWEEN 3000 AND 3999),
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.metro_postcodes IS
  'Rebel''s own definition of the Melbourne Metropolitan Area. A delivery postcode present here prices as Metro; anything absent is Regional. Binding, not advisory.';

-- Seed: the 192 postcodes exactly as they stood in src/lib/metroPostcodes.ts.
-- ON CONFLICT DO NOTHING so re-running never resurrects a postcode Yamin has
-- since deliberately removed.
INSERT INTO public.metro_postcodes (postcode) VALUES
  (3000), (3002), (3003), (3004), (3006), (3008), (3011), (3012), (3013), (3015),
  (3016), (3018), (3019), (3020), (3021), (3022), (3023), (3024), (3025), (3026),
  (3027), (3028), (3029), (3030), (3031), (3032), (3033), (3034), (3036), (3037),
  (3038), (3040), (3041), (3042), (3043), (3044), (3045), (3046), (3047), (3048),
  (3049), (3051), (3052), (3053), (3054), (3055), (3056), (3057), (3058), (3059),
  (3060), (3061), (3062), (3063), (3064), (3065), (3066), (3067), (3068), (3070),
  (3071), (3072), (3073), (3074), (3075), (3076), (3078), (3079), (3081), (3082),
  (3083), (3084), (3085), (3087), (3088), (3089), (3090), (3091), (3093), (3094),
  (3095), (3096), (3097), (3099), (3101), (3102), (3103), (3104), (3105), (3106),
  (3107), (3108), (3109), (3111), (3113), (3114), (3115), (3116), (3121), (3122),
  (3123), (3124), (3125), (3126), (3127), (3128), (3129), (3130), (3131), (3132),
  (3133), (3134), (3135), (3136), (3137), (3138), (3140), (3141), (3142), (3143),
  (3144), (3145), (3146), (3147), (3148), (3149), (3150), (3151), (3152), (3153),
  (3154), (3155), (3156), (3158), (3159), (3160), (3161), (3162), (3163), (3165),
  (3166), (3167), (3168), (3169), (3170), (3171), (3172), (3173), (3174), (3175),
  (3177), (3178), (3179), (3180), (3181), (3182), (3183), (3184), (3185), (3186),
  (3187), (3188), (3189), (3190), (3191), (3192), (3193), (3194), (3195), (3196),
  (3197), (3198), (3199), (3200), (3201), (3202), (3204), (3205), (3206), (3207),
  (3796), (3802), (3803), (3804), (3805), (3806), (3807), (3910), (3975), (3976),
  (3977), (3978)
ON CONFLICT (postcode) DO NOTHING;

ALTER TABLE public.metro_postcodes ENABLE ROW LEVEL SECURITY;

-- Matches pricing_rates: readable by anyone signed in, writable by
-- owner/admin only. No anon policy -- see the note in the app about the
-- public LeadForm, which still uses the compiled-in list.
DROP POLICY IF EXISTS "metro_postcodes readable by authenticated" ON public.metro_postcodes;
CREATE POLICY "metro_postcodes readable by authenticated"
  ON public.metro_postcodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "metro_postcodes writable by owner/admin" ON public.metro_postcodes;
CREATE POLICY "metro_postcodes writable by owner/admin"
  ON public.metro_postcodes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles
                 WHERE profiles.user_id = auth.uid()
                   AND profiles.role = ANY (ARRAY['owner'::text, 'admin'::text])
                   AND profiles.active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles
                      WHERE profiles.user_id = auth.uid()
                        AND profiles.role = ANY (ARRAY['owner'::text, 'admin'::text])
                        AND profiles.active = true));
