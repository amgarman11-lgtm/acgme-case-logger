import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CaseInsert, CaseRow } from '../types/models'

// Phase 1: fetch + insert + toggle against the live table.
// (Realtime subscription is added in Phase 4; offline queue in Phase 5.)
export function useCases() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setCases(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addCase = useCallback(
    async (payload: CaseInsert): Promise<CaseRow> => {
      const { data, error } = await supabase.from('cases').insert(payload).select('*').single()
      if (error) throw error
      await refresh()
      return data
    },
    [refresh],
  )

  const setLogged = useCallback(
    async (id: string, logged: boolean) => {
      // Optimistic update; revert by refetching if the write fails.
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, logged_to_acgme: logged } : c)))
      const { error } = await supabase.from('cases').update({ logged_to_acgme: logged }).eq('id', id)
      if (error) {
        await refresh()
        throw error
      }
    },
    [refresh],
  )

  const unloggedCount = cases.filter((c) => !c.logged_to_acgme).length

  return { cases, loading, error, refresh, addCase, setLogged, unloggedCount }
}
