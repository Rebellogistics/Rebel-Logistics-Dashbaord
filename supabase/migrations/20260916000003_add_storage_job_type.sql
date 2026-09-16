-- Adds 'Storage' as a fourth job type so warehousing enquiries from the public
-- form land classified instead of arriving as Standard.
--
-- Purely additive, so it is safe to apply before the code deploys: no existing
-- row changes and the previously-deployed build never writes 'Storage'.
--
-- Storage has no rate-book entry; pricing.ts quotes it at zero with an
-- explainer rather than inventing a per-cube figure. Yamin sets the fee.

alter table public.jobs drop constraint jobs_type_check;

alter table public.jobs add constraint jobs_type_check
  check (type = any (array['Standard'::text, 'White Glove'::text, 'Hourly rate'::text, 'Storage'::text]));
