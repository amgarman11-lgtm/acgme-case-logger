-- 0001_init_schema.sql
-- ACGME Case Logger - initial schema.
--
-- NO PHI: these tables store ONLY de-identified case data. Never add MRN,
-- patient name, DOB, or any other direct identifier to this database.

-- ACGME resident participation roles (fixed set).
create type public.resident_role as enum (
  'Surgeon-Chief',
  'Surgeon-Junior',
  'First Assistant',
  'Teaching Assistant'
);

-- == cases ===================================================================
create table public.cases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,

  -- Case number YYYY-NNNN, resets each academic year (default July 1 start).
  -- academic_year = academic-year START year (e.g. 2025 for Jul-2025..Jun-2026),
  -- computed by the client from surgery_date + the user's AY config.
  -- case_seq is assigned SERVER-SIDE (see trigger) so numbering stays correct
  -- even when offline cases sync out of order.
  academic_year    smallint not null,
  case_seq         integer  not null,
  case_number      text generated always as
                     (academic_year::text || '-' || lpad(case_seq::text, 4, '0')) stored,

  attending_name   text not null,
  resident_role    public.resident_role not null,
  case_name        text not null,                       -- dictated procedure description
  cpt_code         text,                                -- confirmed CPT (null = none / manual)
  cpt_description  text,
  rotation         text,
  pgy_year         smallint check (pgy_year between 1 and 7),
  surgery_date     date not null default current_date,
  logged_to_acgme  boolean not null default false,
  created_at       timestamptz not null default now(),

  unique (user_id, academic_year, case_seq)
);

comment on table public.cases is
  'De-identified ACGME operative case log. NO PHI: never store MRN, patient name, DOB, or direct identifiers.';

create index cases_user_created_idx  on public.cases (user_id, created_at desc);
create index cases_user_unlogged_idx on public.cases (user_id) where not logged_to_acgme;

-- Assign the next per-user, per-academic-year sequence number at insert time.
create or replace function public.assign_case_seq()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.academic_year is null then
    new.academic_year := case
      when extract(month from new.surgery_date) >= 7
        then extract(year from new.surgery_date)::int
        else extract(year from new.surgery_date)::int - 1
    end;
  end if;

  -- Serialize numbering within this user's academic-year bucket.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text || ':' || new.academic_year::text));

  -- SECURITY INVOKER (default): RLS restricts this SELECT to the caller's own
  -- rows, which is exactly the bucket we are numbering within.
  select coalesce(max(case_seq), 0) + 1
    into new.case_seq
    from public.cases
   where user_id = new.user_id
     and academic_year = new.academic_year;

  return new;
end;
$$;

create trigger cases_assign_seq
  before insert on public.cases
  for each row execute function public.assign_case_seq();

-- == user_settings ===========================================================
-- Per-user app settings, synced across devices (rotation list, CPT-map
-- overrides, academic-year config).
create table public.user_settings (
  user_id        uuid primary key default auth.uid()
                   references auth.users (id) on delete cascade,
  rotations      jsonb    not null default '[]'::jsonb,
  cpt_map        jsonb,                                 -- overrides merged over seeded cptMap.json
  ay_start_month smallint not null default 7 check (ay_start_month between 1 and 12),
  ay_start_day   smallint not null default 1 check (ay_start_day  between 1 and 31),
  updated_at     timestamptz not null default now()
);

comment on table public.user_settings is
  'Per-user settings (rotations, CPT-map overrides, academic-year config). No PHI.';

-- == Row Level Security ======================================================
alter table public.cases enable row level security;
alter table public.user_settings enable row level security;

create policy cases_select_own on public.cases
  for select using (auth.uid() = user_id);
create policy cases_insert_own on public.cases
  for insert with check (auth.uid() = user_id);
create policy cases_update_own on public.cases
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy cases_delete_own on public.cases
  for delete using (auth.uid() = user_id);

create policy user_settings_select_own on public.user_settings
  for select using (auth.uid() = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy user_settings_update_own on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_settings_delete_own on public.user_settings
  for delete using (auth.uid() = user_id);

-- API role privileges (RLS still applies). Supabase anonymous sign-in users
-- carry the `authenticated` role, so this also covers the Phase-1 auth bridge.
grant select, insert, update, delete on public.cases         to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

-- == Realtime (live cross-device updates) ====================================
alter publication supabase_realtime add table public.cases;
alter publication supabase_realtime add table public.user_settings;
