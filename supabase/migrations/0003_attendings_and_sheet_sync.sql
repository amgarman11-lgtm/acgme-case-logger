-- 0003_attendings_and_sheet_sync.sql
-- Adds the attendings list (for dictation name-matching) and an optional
-- Google Sheet sync webhook URL to per-user settings. No PHI.
alter table public.user_settings
  add column if not exists attendings    jsonb not null default '[]'::jsonb,
  add column if not exists sheet_webhook text;
