# ACGME Case Logger

An installable PWA for surgical residents to log **de-identified** operative cases
by voice. React + Vite + TypeScript, backed by Supabase (Postgres + Auth + Realtime),
deployable to Vercel.

> **NO PHI.** This app never captures, stores, or transmits MRN, patient name,
> DOB, or any direct identifier. Only the de-identified fields below are stored.

---

## Status — all phases complete ✅

| Phase | Scope | Status |
|------|-------|--------|
| 1 | Supabase schema + RLS, installable PWA shell, case list, manual entry | ✅ |
| 2 | Voice dictation (Web Speech API) for attending, role, case name | ✅ |
| 3 | CPT suggestion module (tap-to-confirm) | ✅ |
| 4 | Realtime sync + logged-toggle write-back (+ Google sign-in code path) | ✅ |
| 5 | Offline IndexedDB queue, settings, .xlsx export, Vercel deploy | ✅ |

---

## Features

- **Installable PWA** — add to the iOS home screen; launches full-screen, works offline.
- **Voice capture** — dictate attending, resident role, and procedure name (Web Speech API),
  with live transcription and an edit-before-save review. Manual typing always works as a fallback.
- **Auto case numbers** — `YYYY-NNNN`, assigned server-side, reset each academic year (default Jul 1).
- **CPT suggestions** — dictated procedure → ranked CPT candidates; you must tap to confirm one
  (or choose none / enter manually). Seeded with ~35 general-surgery procedures, editable in Settings.
- **Offline-first** — saves made offline are queued in IndexedDB and auto-sync on reconnect, with a
  clear synced/unsynced indicator.
- **Realtime** — the case list updates live across tabs/devices that share an identity.
- **Settings** — account, rotation-list editor, custom CPT mappings, academic-year config, and
  **Export to .xlsx**.
- **Row Level Security** — every row is scoped to its owner; users only ever see their own cases.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

The Supabase connection (URL + **publishable** key) is committed as a default, so it runs out of the
box. To point at a different project, copy `.env.example` to `.env.local` and set the vars (they
override the defaults).

```bash
npm run build      # type-check + production build
npm run preview    # serve the production build (best for testing the installed PWA)
```

> Anonymous sign-in is **enabled** on the bundled Supabase project, so no login is required.

## Install to your iPhone home screen

1. Open the app URL in **Safari** (the deployed URL, or your computer's LAN IP via `npm run dev -- --host`).
2. **Share → Add to Home Screen.**
3. Launch from the icon — full-screen, no Safari chrome.

> iOS note: the in-app voice button uses the Web Speech API, which can be unreliable inside an
> installed PWA. If it doesn't respond, tap any text field and use the **keyboard's mic key** to
> dictate — that always works.

---

## Deploy to Vercel

This is a standard Vite SPA; Vercel auto-detects the framework.

- **CLI:** from the project root, `vercel deploy --prod` (after `vercel login`).
- **Git integration:** push to a Git remote connected to Vercel; it builds on every push.

`vercel.json` includes the SPA rewrite. Because the publishable key is committed, no Vercel
environment variables are required for the app to connect. (To use env vars instead, set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project and remove the committed
fallback in `src/lib/supabaseClient.ts`.)

---

## Enabling Google sign-in (optional, later)

The app ships with **anonymous** auth (each device is its own private account). To switch to Google
(and sync across devices), in the Supabase dashboard:

1. **Authentication → Sign In / Providers → Google:** enable, paste a Google OAuth **Client ID +
   Secret** (create them in Google Cloud → APIs & Services → Credentials → OAuth client; set the
   authorized redirect URI to `https://<your-project-ref>.supabase.co/auth/v1/callback`).
2. Enable **"Allow manual linking"** (lets the app upgrade the anonymous account, preserving cases).
3. **Authentication → URL Configuration:** add your deployed URL to the redirect allow-list.

The button is already wired (`Settings → Account → Sign in with Google` →
`src/lib/session.ts::signInWithGoogle`).

---

## Data model (de-identified only)

`public.cases` — `case_number` (`YYYY-NNNN`, server-assigned), `surgery_date`, `attending_name`,
`resident_role` (ACGME enum), `case_name`, `cpt_code` + `cpt_description`, `rotation`, `pgy_year`,
`logged_to_acgme`, `created_at`, `user_id`.

`public.user_settings` — `rotations`, `cpt_map` (overrides), `ay_start_month` / `ay_start_day`.

Migrations are in `supabase/migrations/`. RLS restricts every operation to `auth.uid() = user_id`.
Case numbers are assigned by a `BEFORE INSERT` trigger so sequencing stays correct even when offline
cases sync out of order.

---

## Security notes

- **Supabase advisors** flag "anonymous access policies" on both tables — this is **by design**
  (anonymous sign-in is our auth model; each anonymous user still only sees their own rows). The
  warning clears if you move to Google-only auth and disable anonymous sign-ins. "Leaked password
  protection" is irrelevant (no password auth is used).
- **SheetJS (`xlsx`)** has advisories that only affect *parsing* untrusted files. This app only
  *writes* `.xlsx` from your own data and never parses input, so they don't apply. It is lazy-loaded.

---

## Project structure

```
src/
  cpt/            CPT suggestion module (swappable matcher) + seed map
  data/           seed rotations
  export/         .xlsx export (SheetJS, lazy-loaded)
  hooks/          useCases (Realtime + offline), useSpeech, useOnlineStatus
  lib/            supabaseClient, session (auth), academicYear
  offline/        IndexedDB queue + sync
  state/          useSettings (synced user_settings)
  screens/        CaseList, NewCase, Settings
  components/      CaseCard, LoggedToggle, VoiceField, CptConfirm, SyncIndicator
  types/          generated Supabase types + app aliases
supabase/migrations/   SQL (mirror of applied migrations)
```
