-- V7 Phase 3: Labour joins the services catalog.
--
-- 20260917000001 added 'Labour' to jobs_type_check, so it is a real job
-- type — but the services catalog still listed only four builtins. That
-- left Labour missing from the customer pricing-preset dropdown, which is
-- driven off this table, so a customer who is always booked for crew work
-- could not have it set as their default service.
--
-- Locked as a builtin like the other four: its pricing lives in the rate
-- book (labour_per_hour_aud and the two floors), not on this row.

INSERT INTO public.services (name, builtin, active, sort_order, description)
VALUES ('Labour', true, true, 40, 'Builtin · crew time on site, no truck')
ON CONFLICT (name) DO UPDATE
  SET builtin = true, active = true;
