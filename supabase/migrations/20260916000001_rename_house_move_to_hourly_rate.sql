-- Rename the 'House Move' job type to 'Hourly rate'.
--
-- The type was already the hourly-priced one — pricing.ts branches on it for
-- max(estimatedHours, minHours) × hourlyRate, and the customer prefill selects
-- it whenever a customer's billing basis is hourly — so only the name still
-- described a house. Applied 2026-09-16 alongside the UI rename.
--
-- jobs.type is guarded by a CHECK listing the allowed values, so the constraint
-- widens before the rows move and narrows again after. _bak_job_type_rename
-- keeps the 27 pre-migration rows so this is reversible; drop it once the
-- rename has bedded in.

drop table if exists public._bak_job_type_rename;
create table public._bak_job_type_rename as
  select 'jobs'::text as tbl, id::text as row_id, type as old_value
    from public.jobs where type = 'House Move'
  union all
  select 'customers', id::text, default_service
    from public.customers where default_service = 'House Move'
  union all
  select 'services', id::text, name
    from public.services where name = 'House Move';

alter table public.jobs drop constraint jobs_type_check;

update public.jobs      set type            = 'Hourly rate' where type            = 'House Move';
update public.customers set default_service = 'Hourly rate' where default_service = 'House Move';
update public.services  set name            = 'Hourly rate' where name            = 'House Move';

alter table public.jobs add constraint jobs_type_check
  check (type = any (array['Standard'::text, 'White Glove'::text, 'Hourly rate'::text]));
