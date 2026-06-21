import { useEffect, useState } from 'react'
import type { CaseInsert, ResidentRole } from '../types/models'
import {
  DEFAULT_AY_CONFIG,
  academicYearFor,
  academicYearLabel,
  todayLocalISO,
} from '../lib/academicYear'
import { useSpeech } from '../hooks/useSpeech'
import { VoiceField } from '../components/VoiceField'

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

type VoiceTarget = 'attending' | 'caseName' | 'role'

/** Append a dictated phrase to existing text (so multiple utterances accumulate). */
function joinSpeech(prev: string, text: string): string {
  const t = text.trim()
  if (!t) return prev
  return prev.trim() ? `${prev.trim()} ${t}` : t
}

/** Map a spoken phrase to one of the constrained ACGME roles. */
function matchRole(text: string): ResidentRole | null {
  const t = text.toLowerCase()
  if (t.includes('chief')) return 'Surgeon-Chief'
  if (t.includes('junior')) return 'Surgeon-Junior'
  if (t.includes('teaching')) return 'Teaching Assistant'
  if (t.includes('first') || t.includes('assist')) return 'First Assistant'
  return null
}

interface Props {
  onCancel: () => void
  onSave: (payload: CaseInsert) => Promise<void>
}

// Phase 2: voice dictation for attending, role, and case name (CPT suggestions
// = Phase 3). Two steps: edit -> review. Nothing is saved without the review
// confirmation; manual text editing is always available as a fallback.
export function NewCaseScreen({ onCancel, onSave }: Props) {
  const [attending, setAttending] = useState('')
  const [role, setRole] = useState<ResidentRole | ''>('')
  const [caseName, setCaseName] = useState('')
  const [cpt, setCpt] = useState('') // manual until Phase 3
  const [rotation, setRotation] = useState('')
  const [pgy, setPgy] = useState<number | ''>('')
  const [surgeryDate, setSurgeryDate] = useState(todayLocalISO())
  const [review, setReview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleNote, setRoleNote] = useState<string | null>(null)

  const speech = useSpeech()
  const [activeField, setActiveField] = useState<VoiceTarget | null>(null)

  // When a recognition session ends, clear the active-field highlight.
  useEffect(() => {
    if (!speech.listening) setActiveField(null)
  }, [speech.listening])

  const canReview = Boolean(attending.trim() && role && caseName.trim())

  function toggleMic(field: VoiceTarget) {
    if (speech.listening && activeField === field) {
      speech.stop()
      return
    }
    setActiveField(field)
    if (field === 'role') setRoleNote(null)
    speech.start((finalText) => {
      if (field === 'attending') setAttending((prev) => joinSpeech(prev, finalText))
      else if (field === 'caseName') setCaseName((prev) => joinSpeech(prev, finalText))
      else {
        const matched = matchRole(finalText)
        if (matched) {
          setRole(matched)
          setRoleNote(`Heard "${finalText.trim()}" → ${matched}`)
        } else {
          setRoleNote(`Couldn't match "${finalText.trim()}" to a role — pick it manually.`)
        }
      }
    })
  }

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
        {speech.supported ? (
          <p className="voice-note">🎤 Tap “Dictate” to speak a field; tap again for each phrase. You can always type instead.</p>
        ) : (
          <p className="voice-note">Voice input isn’t available in this browser — type your entries (or use your keyboard’s mic).</p>
        )}
        {speech.error && <div className="banner banner--error">{speech.error}</div>}

        <VoiceField
          id="attending"
          label="Attending"
          value={attending}
          onChange={setAttending}
          placeholder="Dr. …"
          autoCapitalize="words"
          voiceSupported={speech.supported}
          listening={speech.listening && activeField === 'attending'}
          interim={speech.interim}
          onMicToggle={() => toggleMic('attending')}
        />

        <div className="field">
          <div className="field__labelrow">
            <label htmlFor="role">Resident role</label>
            {speech.supported && (
              <button
                type="button"
                className={`mic ${speech.listening && activeField === 'role' ? 'mic--on' : ''}`}
                onClick={() => toggleMic('role')}
                aria-pressed={speech.listening && activeField === 'role'}
                aria-label={speech.listening && activeField === 'role' ? 'Stop dictation' : 'Dictate role'}
              >
                {speech.listening && activeField === 'role' ? (
                  <>
                    <span className="mic__dot" />
                    Listening
                  </>
                ) : (
                  'Dictate'
                )}
              </button>
            )}
          </div>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as ResidentRole)}>
            <option value="" disabled>
              Select…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {speech.listening && activeField === 'role' && (
            <div className="voice-interim">{speech.interim || 'Listening… say chief, junior, first assistant, or teaching'}</div>
          )}
          {roleNote && <div className="voice-hint">{roleNote}</div>}
        </div>

        <VoiceField
          id="caseName"
          label="Procedure / case name"
          value={caseName}
          onChange={setCaseName}
          placeholder="e.g. Laparoscopic cholecystectomy"
          multiline
          rows={2}
          voiceSupported={speech.supported}
          listening={speech.listening && activeField === 'caseName'}
          interim={speech.interim}
          onMicToggle={() => toggleMic('caseName')}
        />

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
