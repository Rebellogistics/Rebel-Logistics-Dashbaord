-- Storage became a real job type in 20260916000003, so its services-catalog row
-- should be locked like the other three rather than sitting as a user-added
-- custom service. `builtin: true` renders it as a locked row in
-- Settings → Pricing → Service catalog; its pricing lives on the job, not here.
update public.services set builtin = true where name = 'Storage';
