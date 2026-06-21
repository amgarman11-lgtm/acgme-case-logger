import { supabase } from './supabaseClient'

// PHASE 1 BRIDGE -----------------------------------------------------------
// RLS requires an authenticated user (auth.uid()). Until Google sign-in lands
// in Phase 4, we use Supabase ANONYMOUS sign-in so the app can read/write the
// live table with RLS fully enabled. Each device gets its own anonymous user;
// Phase 4 replaces this with Google (and can link the anonymous identity).
//
// REQUIRES: "Allow anonymous sign-ins" enabled in
//   Supabase -> Authentication -> Sign In / Providers.
// --------------------------------------------------------------------------
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signed.session
}
