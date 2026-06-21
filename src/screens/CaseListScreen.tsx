import { CaseCard } from '../components/CaseCard'
import { SyncIndicator } from '../components/SyncIndicator'
import type { CaseRow } from '../types/models'

interface Props {
  cases: CaseRow[]
  loading: boolean
  error: string | null
  unloggedCount: number
  onNew: () => void
  onToggleLogged: (id: string, next: boolean) => void
}

export function CaseListScreen({ cases, loading, error, unloggedCount, onNew, onToggleLogged }: Props) {
  return (
    <div className="screen">
      <header className="appbar">
        <div className="appbar__title">
          Cases
          {unloggedCount > 0 && (
            <span className="badge" title="Cases not yet logged to ACGME">
              {unloggedCount}
            </span>
          )}
        </div>
        <SyncIndicator />
      </header>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : cases.length === 0 ? (
        <div className="empty">No cases yet. Tap + to log your first case.</div>
      ) : (
        <ul className="case-list">
          {cases.map((c) => (
            <CaseCard key={c.id} c={c} onToggleLogged={onToggleLogged} />
          ))}
        </ul>
      )}

      <button className="fab" onClick={onNew} aria-label="New case">
        +
      </button>
    </div>
  )
}
