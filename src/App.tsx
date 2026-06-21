import { useEffect, useState } from 'react'
import { ensureSession } from './lib/session'
import { useCases } from './hooks/useCases'
import { CaseListScreen } from './screens/CaseListScreen'
import { NewCaseScreen } from './screens/NewCaseScreen'
import { DEFAULT_ROTATIONS } from './data/rotations'
import type { CaseInsert } from './types/models'

type Screen = 'list' | 'new'

export default function App() {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('list')
  const { cases, loading, error, addCase, setLogged, unloggedCount } = useCases()

  useEffect(() => {
    ensureSession()
      .then(() => setReady(true))
      .catch((e) => setBootError(e instanceof Error ? e.message : 'Sign-in failed'))
  }, [])

  if (bootError) {
    return (
      <div className="screen">
        <div className="banner banner--error">{bootError}</div>
        <p className="hint">
          If this mentions anonymous sign-in, enable it in Supabase → Authentication → Sign In / Providers.
          (Phase-1 bridge; Google sign-in replaces it in Phase 4.)
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="screen">
        <div className="empty">Starting…</div>
      </div>
    )
  }

  const handleSave = async (payload: CaseInsert) => {
    await addCase(payload)
    setScreen('list')
  }

  return screen === 'list' ? (
    <CaseListScreen
      cases={cases}
      loading={loading}
      error={error}
      unloggedCount={unloggedCount}
      onNew={() => setScreen('new')}
      onToggleLogged={setLogged}
    />
  ) : (
    <NewCaseScreen onCancel={() => setScreen('list')} onSave={handleSave} rotations={DEFAULT_ROTATIONS} />
  )
}
