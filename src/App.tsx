import { useEffect, useState } from 'react'
import { ensureSession, getCurrentUser, signInWithGoogle, signOut } from './lib/session'
import { useCases } from './hooks/useCases'
import { useSettings } from './state/settings'
import { CaseListScreen } from './screens/CaseListScreen'
import { NewCaseScreen } from './screens/NewCaseScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type { CaseInsert } from './types/models'

type Screen = 'list' | 'new' | 'settings'

export default function App() {
  const [ready, setReady] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('list')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const cases = useCases()
  const settings = useSettings()

  useEffect(() => {
    ensureSession()
      .then(async () => {
        const u = await getCurrentUser()
        setUserEmail(u && !u.is_anonymous ? u.email ?? null : null)
        setReady(true)
      })
      .catch((e) => setBootError(e instanceof Error ? e.message : 'Sign-in failed'))
  }, [])

  if (bootError) {
    return (
      <div className="screen">
        <div className="banner banner--error">{bootError}</div>
        <p className="hint">
          If this mentions anonymous sign-in, enable it in Supabase → Authentication → Sign In / Providers.
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
    await cases.addCase(payload)
    setScreen('list')
  }

  if (screen === 'new') {
    return (
      <NewCaseScreen
        onCancel={() => setScreen('list')}
        onSave={handleSave}
        rotations={settings.rotations}
        cptMap={settings.cptMap}
        ayConfig={settings.ayConfig}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setScreen('list')}
        rotations={settings.rotations}
        cptOverrides={settings.cptOverrides}
        ayConfig={settings.ayConfig}
        saveRotations={settings.saveRotations}
        saveCptOverrides={settings.saveCptOverrides}
        saveAyConfig={settings.saveAyConfig}
        userEmail={userEmail}
        onSignInGoogle={signInWithGoogle}
        onSignOut={async () => {
          await signOut()
          location.reload()
        }}
      />
    )
  }

  return (
    <CaseListScreen
      cases={cases.cases}
      pending={cases.queued}
      loading={cases.loading}
      error={cases.error}
      unloggedCount={cases.unloggedCount}
      unsyncedCount={cases.unsyncedCount}
      onNew={() => setScreen('new')}
      onSettings={() => setScreen('settings')}
      onToggleLogged={cases.setLogged}
    />
  )
}
