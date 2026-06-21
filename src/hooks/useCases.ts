import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CaseInsert, CaseRow } from '../types/models'

// Phase 4: live case list via Supabase Realtime + logged-toggle write-back.
// (Offline queue is added in Phase 5.)
export function useCases() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // silent=true skips the loading flag, so Realtime-driven refetches don't flash.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setCases(data ?? [])
    }
    if (!silent) setLoading(false)
  }, [])

  // Initial load.
  useEffect(() => {
    void load()
  }, [load])

  // Realtime: refetch (silently) whenever this user's rows change — keeps the
  // list live across tabs/devices that share the same identity.
  useEffect(() => {
    const channel = supabase
      .channel('cases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        void load(true)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const addCase = useCallback(
    async (payload: CaseInsert): Promise<CaseRow> => {
      const { data, error } = await supabase.from('cases').insert(payload).select('*').single()
      if (error) throw error
      await load(true) // pull authoritative row (server-assigned case_number)
      return data
    },
    [load],
  )

  const setLogged = useCallback(
    async (id: string, logged: boolean) => {
      // Optimistic update; revert by refetching if the write fails.
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, logged_to_acgme: logged } : c)))
      const { error } = await supabase.from('cases').update({ logged_to_acgme: logged }).eq('id', id)
      if (error) {
        await load(true)
        throw error
      }
    },
    [load],
  )

  const unloggedCount = cases.filter((c) => !c.logged_to_acgme).length

  return { cases, loading, error, refresh: () => load(), addCase, setLogged, unloggedCount }
}
