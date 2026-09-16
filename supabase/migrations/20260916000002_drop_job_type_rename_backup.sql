-- Scaffolding from the House Move -> Hourly rate rename, verified and dropped.
-- The rename was a deterministic 1:1 mapping, so reversing it never depended on
-- this table: it is the reverse update across every 'Hourly rate' row.
drop table if exists public._bak_job_type_rename;
