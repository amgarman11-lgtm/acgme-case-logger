import { useEffect, useRef, useState } from 'react'
import type { CaseInsert, ResidentRole } from '../types/models'
import {
  DEFAULT_AY_CONFIG,
  academicYearFor,
  academicYearLabel,
  todayLocalISO,
  type AyConfig,
} from '../lib/academicYear'
import { useSpeech } from '../hooks/useSpeech'
import { VoiceField } from '../components/VoiceField'
import { CptConfirm, type CptChoice } from '../components/CptConfirm'
import type { CptMap } from '../cpt'
import { parseCaseDictation, type ParsedCase } from '../lib/parseDictation'
import { matchAttending } from '../lib/matchAttending'

const ROLES: ResidentRole[] = ['Surgeon-Chief', 'Surgeon-Junior', 'First Assistant', 'Teaching Assistant']
const PGYS = [1, 2, 3, 4, 5, 6, 7]

type VoiceTarget = 'attending' | 'caseName' | 'role'
type Step = 'edit' | 'review' | 'cpt'

function joinSpeech(prev: string, text: string): string {
  const t = text.trim()
  if (!t) return prev
  return prev.trim() ? `${prev.trim()} ${t}` : t
}

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
  rotations: string[]
  attendings: string[]
  cptMap?: CptMap
  ayConfig?: AyConfig
}

// Phases 2/3/6: master full-case dictation + per-field dictation + CPT confirm.
// Flow: edit -> review -> CPT confirm -> save. Manual editing is always available;
// nothing is saved without the final confirmation.
export function NewCaseScreen({ onCancel, onSave, rotations, attendings, cptMap, ayConfig = DEFAULT_AY_CONFIG }: Props) {
  const [attending, setAttending] = useState('')
  const [role, setRole] = useState<ResidentRole | ''>('')
  const [caseName, setCaseName] = useState('')
  const [caseRef, setCaseRef] = useState('')
  const [rotation, setRotation] = useState('')
  const [pgy, setPgy] = useState<number | ''>('')
  const [surgeryDate, setSurgeryDate] = useState(todayLocalISO())
  const [step, setStep] = useState<Step>('edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleNote, setRoleNote] = useState<string | null>(null)

  const speech = useSpeech()
  const [activeField, setActiveField] = useState<VoiceTarget | null>(null)

  // Master "dictate full case": accumulate the transcript, then parse on stop.
  const [masterActive, setMasterActive] = useState(false)
  const [masterText, setMasterText] = useState('')
  const masterRef = useRef('')
  const [fillNote, setFillNote] = useState<string | null>(null)

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
      if (field === 'attending') {
        const m = attendings.length ? matchAttending(finalText, attendings) : null
        setAttending(m ?? finalText.trim())
      } else if (field === 'caseName') {
        setCaseName((prev) => joinSpeech(prev, finalText))
      } else {
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

  function applyParsed(p: ParsedCase) {
    const filled: string[] = []
    if (p.attending) {
      setAttending(p.attending)
      filled.push('attending')
    }
    if (p.role) {
      setRole(p.role)
      filled.push('role')
    }
    if (p.caseName) {
      setCaseName(p.caseName)
      filled.push('procedure')
    }
    if (p.pgy) {
      setPgy(p.pgy)
      filled.push('PGY')
    }
    if (p.rotation) {
      setRotation(p.rotation)
      filled.push('rotation')
    }
    if (p.reference) {
      setCaseRef(p.reference)
      filled.push('reference')
    }
    setFillNote(
      filled.length
        ? `Filled from dictation: ${filled.join(', ')}. Review and edit below.`
        : 'Couldn’t parse the fields — please enter them manually or try again.',
    )
  }

  function toggleMaster() {
    if (masterActive) {
      speech.stop()
      setMasterActive(false)
      const captured = masterRef.current
      // Let a trailing final result land before parsing.
      setTimeout(() => applyParsed(parseCaseDictation(captured, { attendings, rotations })), 700)
      return
    }
    masterRef.current = ''
    setMasterText('')
    setFillNote(null)
    setMasterActive(true)
    speech.start(
      (seg) => {
        masterRef.current = joinSpeech(masterRef.current, seg)
        setMasterText(masterRef.current)
      },
      { continuous: true },
    )
  }

  async function handleSave(cpt: CptChoice) {
    setSaving(true)
    setError(null)
    try {
      const payload: CaseInsert = {
        academic_year: academicYearFor(surgeryDate, ayConfig),
        attending_name: attending.trim(),
        resident_role: role as ResidentRole,
        case_name: caseName.trim(),
        case_ref: caseRef.trim() || null,
        cpt_code: cpt.code,
        cpt_description: cpt.description,
        rotation: rotation.trim() || null,
        pgy_year: pgy === '' ? null : pgy,
        surgery_date: surgeryDate,
      }
      await onSave(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
      setStep('review')
    }
  }

  if (step === 'cpt') {
    return (
      <>
        {error && <div className="banner banner--error">{error}</div>}
        <CptConfirm caseName={caseName} map={cptMap} saving={saving} onBack={() => setStep('review')} onConfirm={handleSave} />
      </>
    )
  }

  if (step === 'review') {
    return (
      <div className="screen">
        <header className="appbar">
          <button className="link" onClick={() => setStep('edit')}>
            ‹ Edit
          </button>
          <div className="appbar__title">Review</div>
          <span style={{ width: 40 }} />
        </header>

        <div className="review">
          <Row label="Case #" value={`${academicYearLabel(academicYearFor(surgeryDate, ayConfig))} · assigned on save`} />
          <Row label="Reference" value={caseRef || '—'} />
          <Row label="Date" value={surgeryDate} />
          <Row label="Attending" value={attending} />
          <Row label="Role" value={role} />
          <Row label="Procedure" value={caseName} />
          <Row label="Rotation" value={rotation || '—'} />
          <Row label="PGY" value={pgy ? `PGY-${pgy}` : '—'} />
          <Row label="CPT" value="chosen in the next step" />
        </div>

        {error && <div className="banner banner--error">{error}</div>}

        <div className="actions">
          <button className="btn btn--ghost" onClick={() => setStep('edit')} disabled={saving}>
            Back
          </button>
          <button className="btn btn--primary" onClick={() => setStep('cpt')} disabled={saving}>
            Choose CPT →
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
          if (canReview) setStep('review')
        }}
      >
        {speech.supported ? (
          <>
            <button
              type="button"
              className={`master-btn ${masterActive ? 'master-btn--on' : ''}`}
              onClick={toggleMaster}
              disabled={activeField !== null}
            >
              {masterActive ? '■  Stop & fill fields' : '🎤  Dictate full case'}
            </button>
            {masterActive && (
              <div className="master-live">
                <div className="master-live__label">
                  <span className="mic__dot" /> Listening — say the attending, your role, the procedure, PGY, rotation…
                </div>
                <div className="master-live__text">{[masterText, speech.interim].filter(Boolean).join(' ') || '…'}</div>
              </div>
            )}
            {fillNote && <div className="banner banner--info">{fillNote}</div>}
            <p className="voice-note">Or use the per-field “Dictate” buttons. You can always type instead.</p>
          </>
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
          datalistOptions={attendings}
          voiceSupported={speech.supported}
          listening={speech.listening && activeField === 'attending'}
          interim={speech.interim}
          onMicToggle={() => toggleMic('attending')}
          micDisabled={masterActive}
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
                disabled={masterActive}
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
          micDisabled={masterActive}
        />

        <label className="field">
          <span>
            Case reference <small>(optional, de-identified)</small>
          </span>
          <input
            value={caseRef}
            onChange={(e) => setCaseRef(e.target.value)}
            placeholder="e.g. OR2-Tue-a"
          />
          <div className="voice-hint voice-hint--warn">
            De-identified label only — never enter MRN, patient name, or date of birth.
          </div>
        </label>

        <label className="field">
          <span>Rotation</span>
          <input list="rotations" value={rotation} onChange={(e) => setRotation(e.target.value)} placeholder="type or pick" />
          <datalist id="rotations">
            {rotations.map((r) => (
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
