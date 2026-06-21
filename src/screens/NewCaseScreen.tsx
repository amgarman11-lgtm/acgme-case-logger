import { useState } from 'react'
import type { CaseInsert, ResidentRole } from '../types/models'
import {
  DEFAULT_AY_CONFIG,
  academicYearFor,
  academicYearLabel,
  todayLocalISO,
} from '../lib/academicYear'

const ROLES: ResidentRole[] = ['Surgeon-Chief', 'Surgeon-Junior', 'First Assistant', 'Teaching Assistant']
const PGYS = [1, 2, 3, 4, 5, 6, 7]
// Seed list for the rotation picker; the editable/synced list arrives with the
// Settings screen (user_settings.rotations).
const DEFAULT_ROTATIONS = [
  'General Surgery',
  'Trauma',
  'SICU',
  'Colorectal',
  'Vascular',
  'Pediatric Surgery',
  'Surgical Oncology',
  'Night Float',
]

interface Props {
  onCancel: () => void
  onSave: (payload: CaseInsert) => Promise<void>
}

// Phase 1: manual text entry only (voice = Phase 2, CPT suggestions = Phase 3).
// Two steps: edit -> review. Nothing is saved without the review confirmation.
export function NewCaseScreen({ onCancel, onSave }: Props) {
  const [attending, setAttending] = useState('')
  const [role, setRole] = useState<ResidentRole | ''>('')
  const [caseName, setCaseName] = useState('')
  const [cpt, setCpt] = useState('') // manual in Phase 1
  const [rotation, setRotation] = useState('')
  const [pgy, setPgy] = useState<number | ''>('')
  const [surgeryDate, setSurgeryDate] = useState(todayLocalISO())
  const [review, setReview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canReview = Boolean(attending.trim() && role && caseName.trim())

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload: CaseInsert = {
        academic_year: academicYearFor(surgeryDate, DEFAULT_AY_CONFIG),
        attending_name: attending.trim(),
        resident_role: role as ResidentRole,
        case_name: caseName.trim(),
        cpt_code: cpt.trim() || null,
        rotation: rotation.trim() || null,
        pgy_year: pgy === '' ? null : pgy,
        surgery_date: surgeryDate,
      }
      await onSave(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  if (review) {
    return (
      <div className="screen">
        <header className="appbar">
          <button className="link" onClick={() => setReview(false)}>
            ‹ Edit
          </button>
          <div className="appbar__title">Review</div>
          <span style={{ width: 40 }} />
        </header>

        <div className="review">
          <Row label="Case #" value={`${academicYearLabel(academicYearFor(surgeryDate))} · assigned on save`} />
          <Row label="Date" value={surgeryDate} />
          <Row label="Attending" value={attending} />
          <Row label="Role" value={role} />
          <Row label="Procedure" value={caseName} />
          <Row label="CPT" value={cpt || '—'} />
          <Row label="Rotation" value={rotation || '—'} />
          <Row label="PGY" value={pgy ? `PGY-${pgy}` : '—'} />
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="actions">
          <button className="btn btn--ghost" onClick={() => setReview(false)} disabled={saving}>
            Back
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <header className="appbar">
        <button className="link" onClick={onCancel}>
          ‹ Cancel
        </button>
        <div className="appbar__title">New Case</div>
        <span style={{ width: 40 }} />
      </header>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (canReview) setReview(true)
        }}
      >
        <label className="field">
          <span>Attending</span>
          <input value={attending} onChange={(e) => setAttending(e.target.value)} placeholder="Dr. …" autoCapitalize="words" />
        </label>

        <label className="field">
          <span>Resident role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as ResidentRole)}>
            <option value="" disabled>
              Select…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Procedure / case name</span>
          <textarea
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            rows={2}
            placeholder="e.g. Laparoscopic cholecystectomy"
          />
        </label>

        <label className="field">
          <span>
            CPT code <small>(manual for now)</small>
          </span>
          <input value={cpt} onChange={(e) => setCpt(e.target.value)} placeholder="optional" inputMode="numeric" />
        </label>

        <label className="field">
          <span>Rotation</span>
          <input list="rotations" value={rotation} onChange={(e) => setRotation(e.target.value)} placeholder="type or pick" />
          <datalist id="rotations">
            {DEFAULT_ROTATIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <div className="field-row">
          <label className="field">
            <span>PGY</span>
            <select value={pgy} onChange={(e) => setPgy(e.target.value ? Number(e.target.value) : '')}>
              <option value="">—</option>
              {PGYS.map((n) => (
                <option key={n} value={n}>
                  PGY-{n}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date of surgery</span>
            <input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canReview}>
            Review →
          </button>
        </div>

        <p className="hint">
          No PHI: do not enter patient name, MRN, or date of birth. This app stores de-identified case data only.
        </p>
      </form>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="review__row">
      <span className="review__label">{label}</span>
      <span className="review__value">{value}</span>
    </div>
  )
}
