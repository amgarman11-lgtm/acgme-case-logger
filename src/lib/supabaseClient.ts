import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

// Supabase connection.
//
// The publishable (anon) key is SAFE to expose in the browser — it only permits
// access gated by Row Level Security, never raw data access. It is committed here
// as a default so any build (Vercel, a fresh clone, etc.) connects out of the
// box. Environment variables override it for local dev or a different project.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://zvsgmraljdbulbppiimg.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_b-3ZKRzACJCj8UXkBUNr2Q_FYxssGcV'

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
