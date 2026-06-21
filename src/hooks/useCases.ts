import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CaseInsert, CaseRow } from '../types/models'
import { queueCase, listQueued, type QueuedCase } from '../offline/db'
import { flushQueue } from '../offline/sync'

function isNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) return true
  const msg = e instanceof Error ? e.message : String(e)
  return /failed to fetch|networkerror|network error|fetch/i.test(msg)
}

// Phases 4 + 5: live case list (Realtime), logged-toggle write-back, and an
// offline IndexedDB queue that syncs when connectivity returns.
export function useCases() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [queued, setQueued] = useState<QueuedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const refreshQueued = useCallback(async () => {
    setQueued(await listQueued())
  }, [])

  const sync = useCallback(async () => {
    if (!navigator.onLine) return
    const res = await flushQueue()
    if (res.synced > 0) await load(true)
    await refreshQueued()
  }, [load, refreshQueued])

  // Initial load + queue read.
  useEffect(() => {
    void load()
    void refreshQueued()
  }, [load, refreshQueued])

  // Flush the offline queue on mount and whenever we come back online.
  useEffect(() => {
    void sync()
    const onOnline = () => void sync()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [sync])

  // Realtime: silent refetch when this user's rows change (live across tabs).
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

  // Reload once auth is established (anonymous sign-in can complete just after
  // mount on a first visit). Deferred to avoid re-entrancy with the auth lock.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(() => void load(true), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [load])

  // Insert online; on offline or network failure, queue locally for later sync.
  const addCase = useCallback(
    async (payload: CaseInsert): Promise<CaseRow | null> => {
      if (!navigator.onLine) {
        await queueCase(payload)
        await refreshQueued()
        return null
      }
      try {
        const { data, error } = await supabase.from('cases').insert(payload).select('*').single()
        if (error) throw error
        await load(true)
        return data
      } catch (e) {
        if (isNetworkError(e)) {
          await queueCase(payload)
          await refreshQueued()
          return null
        }
        throw e
      }
    },
    [load, refreshQueued],
  )

  const setLogged = useCallback(
    async (id: string, logged: boolean) => {
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, logged_to_acgme: logged } : c)))
      const { error } = await supabase.from('cases').update({ logged_to_acgme: logged }).eq('id', id)
      if (error) {
        await load(true)
        throw error
      }
    },
    [load],
  )

  // Unlogged badge counts un-logged synced cases plus everything still queued.
  const unloggedCount = cases.filter((c) => !c.logged_to_acgme).length + queued.length

  return {
    cases,
    queued,
    loading,
    error,
    refresh: () => load(),
    addCase,
    setLogged,
    unloggedCount,
    unsyncedCount: queued.length,
  }
}
