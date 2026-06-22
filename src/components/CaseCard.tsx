import type { CaseRow } from '../types/models'
import { LoggedToggle } from './LoggedToggle'

interface Props {
  c: CaseRow
  onToggleLogged: (id: string, next: boolean) => void
}

export function CaseCard({ c, onToggleLogged }: Props) {
  return (
    <li className="case-card">
      <div className="case-card__head">
        <span className="case-card__num">{c.case_number}</span>
        <span className="case-card__date">{c.surgery_date}</span>
      </div>
      <div className="case-card__name">{c.case_name}</div>
      <div className="case-card__meta">
        <span>{c.attending_name}</span>
        <span>·</span>
        <span>{c.resident_role}</span>
        {c.pgy_year ? (
          <>
            <span>·</span>
            <span>PGY-{c.pgy_year}</span>
          </>
        ) : null}
      </div>
      {(c.rotation || c.cpt_code) && (
        <div className="case-card__meta case-card__meta--sub">
          {c.rotation ? <span>{c.rotation}</span> : null}
          {c.rotation && c.cpt_code ? <span>·</span> : null}
          {c.cpt_code ? <span>CPT {c.cpt_code}</span> : null}
        </div>
      )}
      {c.case_ref ? <div className="case-card__meta case-card__meta--sub">Ref: {c.case_ref}</div> : null}
      <div className="case-card__foot">
        <LoggedToggle logged={c.logged_to_acgme} onChange={(next) => onToggleLogged(c.id, next)} />
      </div>
    </li>
  )
}
