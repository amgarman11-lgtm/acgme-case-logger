import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_ROTATIONS } from '../data/rotations'
import { DEFAULT_AY_CONFIG, type AyConfig } from '../lib/academicYear'
import { mergeCptMap, seedCptMap, type CptMap } from '../cpt'
import type { UserSettingsRow } from '../types/models'
import type { Json } from '../types/database'

// Per-user settings, synced via the user_settings table (rotation list, CPT-map
// overrides, academic-year config, attendings list, Google Sheet webhook).
export function useSettings() {
  const [rotations, setRotations] = useState<string[]>(DEFAULT_ROTATIONS)
  const [attendings, setAttendings] = useState<string[]>([])
  const [cptOverrides, setCptOverrides] = useState<CptMap | null>(null)
  const [ayConfig, setAyConfig] = useState<AyConfig>(DEFAULT_AY_CONFIG)
  const [sheetWebhook, setSheetWebhook] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const apply = useCallback((row: UserSettingsRow | null) => {
    if (!row) return
    if (Array.isArray(row.rotations) && row.rotations.length) setRotations(row.rotations as string[])
    if (Array.isArray(row.attendings)) setAttendings(row.attendings as string[])
    setCptOverrides((row.cpt_map as unknown as CptMap | null) ?? null)
    setAyConfig({ startMonth: row.ay_start_month ?? 7, startDay: row.ay_start_day ?? 1 })
    setSheetWebhook(row.sheet_webhook ?? null)
  }, [])

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('user_settings').select('*').maybeSingle()
    apply(data as UserSettingsRow | null)
    setLoading(false)
  }, [apply])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  // Live sync across tabs/devices that share the same identity.
  useEffect(() => {
    const channel = supabase
      .channel('user-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, (payload) => {
        if (payload.eventType !== 'DELETE') apply(payload.new as UserSettingsRow)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [apply])

  // Reload settings once auth is established (deferred to avoid auth-lock re-entrancy).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setTimeout(() => void loadSettings(), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadSettings])

  const persist = useCallback(
    async (
      patch: Partial<{
        rotations: string[]
        attendings: string[]
        cpt_map: CptMap | null
        ay_start_month: number
        ay_start_day: number
        sheet_webhook: string | null
      }>,
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const row = {
        user_id: user.id,
        rotations: (patch.rotations ?? rotations) as unknown as Json,
        attendings: (patch.attendings ?? attendings) as unknown as Json,
        cpt_map: (patch.cpt_map !== undefined ? patch.cpt_map : cptOverrides) as unknown as Json,
        ay_start_month: patch.ay_start_month ?? ayConfig.startMonth,
        ay_start_day: patch.ay_start_day ?? ayConfig.startDay,
        sheet_webhook: patch.sheet_webhook !== undefined ? patch.sheet_webhook : sheetWebhook,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('user_settings').upsert(row)
      if (error) throw error
    },
    [rotations, attendings, cptOverrides, ayConfig, sheetWebhook],
  )

  const saveRotations = useCallback(
    async (next: string[]) => {
      setRotations(next)
      await persist({ rotations: next })
    },
    [persist],
  )

  const saveAttendings = useCallback(
    async (next: string[]) => {
      setAttendings(next)
      await persist({ attendings: next })
    },
    [persist],
  )

  const saveCptOverrides = useCallback(
    async (next: CptMap | null) => {
      setCptOverrides(next)
      await persist({ cpt_map: next })
    },
    [persist],
  )

  const saveAyConfig = useCallback(
    async (next: AyConfig) => {
      setAyConfig(next)
      await persist({ ay_start_month: next.startMonth, ay_start_day: next.startDay })
    },
    [persist],
  )

  const saveSheetWebhook = useCallback(
    async (next: string | null) => {
      setSheetWebhook(next)
      await persist({ sheet_webhook: next })
    },
    [persist],
  )

  const cptMap = mergeCptMap(seedCptMap, cptOverrides)

  return {
    rotations,
    attendings,
    cptOverrides,
    cptMap,
    ayConfig,
    sheetWebhook,
    loading,
    saveRotations,
    saveAttendings,
    saveCptOverrides,
    saveAyConfig,
    saveSheetWebhook,
  }
}
