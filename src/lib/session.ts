import { supabase } from './supabaseClient'

// PHASE 1 BRIDGE -----------------------------------------------------------
// RLS requires an authenticated user (auth.uid()). The app uses Supabase
// ANONYMOUS sign-in so it works immediately with RLS fully enabled. Each device
// gets its own anonymous user. Google sign-in (below) can upgrade it later.
//
// REQUIRES: "Allow anonymous sign-ins" enabled in
//   Supabase -> Authentication -> Sign In / Providers.  (Already enabled.)
// --------------------------------------------------------------------------
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signed.session
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// Upgrade the current anonymous account to Google (preserving logged cases) when
// possible; otherwise start a normal Google OAuth sign-in.
//
// REQUIRES (one-time, in the Supabase dashboard — see README "Enabling Google"):
//   - Authentication > Sign In / Providers > Google: enabled w/ Client ID + Secret
//   - "Allow manual linking" enabled (to upgrade the anonymous account)
//   - Your deployed URL added under Authentication > URL Configuration
export async function signInWithGoogle() {
  const redirectTo = window.location.origin
  const { data } = await supabase.auth.getUser()
  if (data.user?.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
    if (error) throw error
  } else {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) throw error
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}
