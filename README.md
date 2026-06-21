# ACGME Case Logger

An installable PWA for surgical residents to log **de-identified** operative cases.
React + Vite + TypeScript, backed by Supabase (Postgres + Auth + Realtime).

> **NO PHI.** This app never captures, stores, or transmits MRN, patient name,
> DOB, or any direct identifier. Only the de-identified fields below are stored.

---

## Phased build

| Phase | Scope | Status |
|------|-------|--------|
| **1** | Supabase schema + RLS, installable PWA shell, case list, **manual** case entry against the live table | ✅ done |
| **2** | Voice dictation (Web Speech API) for attending, role, case name | ✅ this phase |
| 3 | CPT suggestion module | ⏳ |
| 4 | Google auth + Realtime sync + logged-toggle write-back | ⏳ |
| 5 | Offline IndexedDB queue + .xlsx export + Vercel deploy | ⏳ |

---

## Phase 1 setup

### Prerequisites
- Node.js 18+ and npm
- The Supabase project (already created): **`acgme-case-logger`** — ref `zvsgmraljdbulbppiimg`, region us-west-1

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```
Fill `.env.local` with values from **Supabase Dashboard → Project Settings → API**:
- `VITE_SUPABASE_URL` = Project URL (`https://zvsgmraljdbulbppiimg.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = the **publishable / anon** key (safe for the browser — RLS protects the data; never use the `service_role` key here)

> `.env.local` is gitignored.

### 3. Enable anonymous sign-in (Phase-1 bridge)
RLS requires an authenticated user. Until Google sign-in arrives in Phase 4, the
app uses Supabase **anonymous sign-in**. Enable it once:

**Supabase Dashboard → Authentication → Sign In / Providers → enable "Allow anonymous sign-ins".**

(Phase 4 replaces this with Google.)

### 4. Generate app icons (optional)
Placeholder icons are generated from `public/logo.svg`. To (re)generate after
editing the logo:
```bash
npm run generate-pwa-assets
```

### 5. Run
```bash
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build (best for testing the installed PWA)
```

---

## Install to your iPhone home screen
1. Open the app's URL in **Safari** on iOS.
2. Tap **Share → Add to Home Screen**.
3. Launch from the new icon — it opens full-screen with no Safari chrome.

(For local testing on a phone, run `npm run dev -- --host` and open your
computer's LAN IP, or test the deployed URL once Phase 5 ships Vercel.)

---

## Data model (de-identified only)

`cases`: auto case number `YYYY-NNNN` (resets each academic year, July 1 start),
attending name, resident role (ACGME set), procedure/case name, CPT code +
description, rotation, PGY year, surgery date, `logged_to_acgme`, `created_at`.

`user_settings`: rotation list, CPT-map overrides, academic-year config (synced).

Case numbers are assigned **server-side** so sequencing stays correct even when
offline cases sync out of order (Phase 5). Row Level Security ensures each user
only sees their own rows. Schema lives in `supabase/migrations/`.

---

## Tech notes
- `vite-plugin-pwa` (Workbox) generates the manifest + service worker.
- Voice (Phase 2) uses the Web Speech API, which can be unreliable inside an
  installed iOS PWA — manual text entry is always available as a fallback.
