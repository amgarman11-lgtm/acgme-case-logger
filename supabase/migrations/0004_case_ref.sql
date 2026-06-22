-- 0004_case_ref.sql
-- Optional, user-assigned, DE-IDENTIFIED case reference / label.
-- NOT PHI: must never contain MRN, patient name, DOB, or any direct identifier.
alter table public.cases add column if not exists case_ref text;
comment on column public.cases.case_ref is
  'De-identified, user-assigned reference/label only. Never store PHI (MRN, patient name, DOB).';
