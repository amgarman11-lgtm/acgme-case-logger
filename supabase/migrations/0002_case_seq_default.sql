-- 0002_case_seq_default.sql
-- case_seq is assigned by the assign_case_seq() BEFORE INSERT trigger. A
-- placeholder default (0) lets clients omit it on insert (the trigger always
-- overwrites it with the real per-academic-year sequence) and makes the
-- generated TypeScript Insert type mark case_seq as optional.
alter table public.cases alter column case_seq set default 0;
