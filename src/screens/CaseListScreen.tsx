import { CaseCard } from '../components/CaseCard'
import { SyncIndicator } from '../components/SyncIndicator'
import type { CaseRow } from '../types/models'
import type { QueuedCase } from '../offline/db'

interface Props {
  cases: CaseRow[]
  pending: QueuedCase[]
  loading: boolean
  error: string | null
  unloggedCount: number
  unsyncedCount: number
  onNew: () => void
  onSettings: () => void
  onToggleLogged: (id: string, next: boolean) => void
}

export function CaseListScreen({
  cases,
  pending,
  loading,
  error,
  unloggedCount,
  unsyncedCount,
  onNew,
  onSettings,
  onToggleLogged,
}: Props) {
  const isEmpty = !loading && cases.length === 0 && pending.length === 0

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
        <div className="appbar__right">
          <SyncIndicator pendingCount={unsyncedCount} />
          <button className="iconbtn" onClick={onSettings} aria-label="Settings">
            ⚙
          </button>
        </div>
      </header>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : isEmpty ? (
        <div className="empty">No cases yet. Tap + to log your first case.</div>
      ) : (
        <ul className="case-list">
          {pending.map((q) => (
            <li className="case-card case-card--pending" key={q.localId}>
              <div className="case-card__head">
                <span className="case-card__num">#pending</span>
                <span className="case-card__date">{q.payload.surgery_date}</span>
              </div>
              <div className="case-card__name">{q.payload.case_name}</div>
              <div className="case-card__meta">
                <span>{q.payload.attending_name}</span>
                <span>·</span>
                <span>{q.payload.resident_role}</span>
              </div>
              <div className="case-card__foot">
                <span className="pending-pill">Queued offline — will sync</span>
              </div>
            </li>
          ))}
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
