-- V7 Phase 1: the rate book the calculator models.
--
-- The existing rate book carries five figures and assumes every job is a
-- per-m³ delivery or an hourly one. The corrected structure adds two job
-- types (Labour, and warehousing split into three services), gives hourly
-- work a truck choice, prices storage by tier and term, and moves rubbish
-- disposal and packaging from "job types" to extras that tick onto the job
-- that created them.
--
-- SCHEMA ONLY. Nothing here changes how a price is calculated — the engine
-- and the dialogs follow in Phase 2. Every column is additive with a
-- default, so the existing five figures and every historical job are
-- untouched and the app keeps working unchanged until the engine ships.
--
-- DELIBERATELY NOT CHANGED: the five existing rate columns keep their live
-- values. metro_per_cube_aud stays at whatever this environment holds — the
-- calculator proposes $100 but that is a pricing decision to apply by hand,
-- not something a migration should do behind Yamin's back.

-- ---------------------------------------------------------------------------
-- 1. Rate book
-- ---------------------------------------------------------------------------

ALTER TABLE public.pricing_rates
  -- Hourly work splits by truck. hourly_rate_aud remains the standard truck.
  ADD COLUMN IF NOT EXISTS hourly_rate_large_aud      NUMERIC(10,2) NOT NULL DEFAULT 200.00,

  -- Labour: crew time on site, no truck.
  ADD COLUMN IF NOT EXISTS labour_per_hour_aud        NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS labour_min_labourers       INTEGER       NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS labour_min_hours           NUMERIC(5,2)  NOT NULL DEFAULT 3,

  -- Warehousing — storage, per m³ per month by tier. Long term pays the
  -- tier rate; a short-term hold adds short_term_uplift_pct on top.
  ADD COLUMN IF NOT EXISTS storage_standard_aud       NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  ADD COLUMN IF NOT EXISTS storage_high_end_aud       NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS storage_insured_aud        NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS short_term_uplift_pct      NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS storage_grace_days         INTEGER       NOT NULL DEFAULT 5,

  -- Warehousing — container unload. Flat per container, never multiplied by
  -- volume or term. Each covers container_included_hours on site; beyond
  -- that is charged as warehouse labour.
  ADD COLUMN IF NOT EXISTS container_20ft_aud         NUMERIC(10,2) NOT NULL DEFAULT 550.00,
  ADD COLUMN IF NOT EXISTS container_40ft_aud         NUMERIC(10,2) NOT NULL DEFAULT 800.00,
  ADD COLUMN IF NOT EXISTS container_included_hours   NUMERIC(5,2)  NOT NULL DEFAULT 2,

  -- Warehousing — labour work. Per labourer per hour, and unlike a Labour
  -- job there is no crew or hours floor. Both minimums are stored so they
  -- can be raised later without a migration.
  ADD COLUMN IF NOT EXISTS wh_labour_outbound_aud     NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS wh_labour_qc_aud           NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS wh_labour_unload_aud       NUMERIC(10,2) NOT NULL DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS wh_labour_min_crew         INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wh_labour_min_hours        NUMERIC(5,2)  NOT NULL DEFAULT 0,

  -- Rubbish disposal — an extra, never a job of its own.
  ADD COLUMN IF NOT EXISTS disposal_van_aud           NUMERIC(10,2) NOT NULL DEFAULT 190.00,
  ADD COLUMN IF NOT EXISTS disposal_trailer_aud       NUMERIC(10,2) NOT NULL DEFAULT 290.00,
  ADD COLUMN IF NOT EXISTS disposal_transport_aud     NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS disposal_transport_large_aud NUMERIC(10,2) NOT NULL DEFAULT 220.00,

  -- White Glove covers rubbish removal in its rate up to this volume; past
  -- it, disposal becomes chargeable.
  ADD COLUMN IF NOT EXISTS wg_disposal_threshold_m3   NUMERIC(10,2) NOT NULL DEFAULT 10.00,

  -- Fuel levy. Off while fuel is normal, on to recover a price rise. It
  -- rides transport only — never labour, storage, disposal or packaging.
  ADD COLUMN IF NOT EXISTS fuel_levy_pct              NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS fuel_levy_on               BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Time bills in this increment, always rounded up, before any minimum.
  ADD COLUMN IF NOT EXISTS billing_increment_hours    NUMERIC(5,2)  NOT NULL DEFAULT 0.5;

COMMENT ON COLUMN public.pricing_rates.fuel_levy_on IS
  'Master switch. A quote captures this at the moment it is raised (see jobs.fuel_levy_mode) and never re-reads it, so a levied March quote stays levied in a levy-off September.';

COMMENT ON COLUMN public.pricing_rates.container_included_hours IS
  'Unload time covered by the flat container fee. Beyond this is billed as warehouse labour at wh_labour_unload_aud.';

-- ---------------------------------------------------------------------------
-- 2. Job types
-- ---------------------------------------------------------------------------
-- 'Labour' joins Standard / White Glove / Hourly rate / Storage. Rubbish
-- disposal is deliberately NOT a job type — it is an extra on the job that
-- created the rubbish.

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check
  CHECK (type IN ('Standard', 'White Glove', 'Hourly rate', 'Storage', 'Labour'));

-- ---------------------------------------------------------------------------
-- 3. Per-job pricing inputs and captured state
-- ---------------------------------------------------------------------------

ALTER TABLE public.jobs
  -- Which truck an hourly job used.
  ADD COLUMN IF NOT EXISTS truck_size            TEXT,

  -- Labour jobs and warehouse labour work.
  ADD COLUMN IF NOT EXISTS labourers             INTEGER,

  -- Warehousing: which of the three services, and the storage specifics.
  ADD COLUMN IF NOT EXISTS warehouse_service     TEXT,
  ADD COLUMN IF NOT EXISTS storage_tier          TEXT,
  ADD COLUMN IF NOT EXISTS storage_term          TEXT,
  ADD COLUMN IF NOT EXISTS storage_days          INTEGER,
  ADD COLUMN IF NOT EXISTS container_size        TEXT,
  ADD COLUMN IF NOT EXISTS wh_labour_type        TEXT,

  -- Extras. Amounts are stored resolved, not recomputed, so a historical
  -- job keeps what it was actually charged when a rate later moves.
  ADD COLUMN IF NOT EXISTS disposal_load         TEXT,
  ADD COLUMN IF NOT EXISTS disposal_amount       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS disposal_transport_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS packaging_amount      NUMERIC(10,2),

  -- The fuel levy as this quote captured it. 'rate_book' means it followed
  -- the switch at the moment the quote was raised; 'on' and 'off' are the
  -- manual override for a job quoted in one month and carried out in
  -- another. fuel_levy (already present) holds the resolved dollar amount.
  ADD COLUMN IF NOT EXISTS fuel_levy_mode        TEXT NOT NULL DEFAULT 'rate_book',
  ADD COLUMN IF NOT EXISTS fuel_levy_pct_applied NUMERIC(5,2);

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_fuel_levy_mode_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_fuel_levy_mode_check
  CHECK (fuel_levy_mode IN ('rate_book', 'on', 'off'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_warehouse_service_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_warehouse_service_check
  CHECK (warehouse_service IS NULL OR warehouse_service IN ('storage', 'container_unload', 'labour_work'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_truck_size_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_truck_size_check
  CHECK (truck_size IS NULL OR truck_size IN ('standard', 'large'));

COMMENT ON COLUMN public.jobs.fuel_levy_pct_applied IS
  'The levy percentage this job was actually quoted at, frozen at quote time. NULL on pre-V7 jobs, which predate the levy entirely.';

COMMENT ON COLUMN public.jobs.disposal_amount IS
  'Resolved dollar amount, not a rate lookup. A larger load is measured at the end of the job and typed in.';
