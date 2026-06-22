import { useMemo, useState } from 'react'
import { suggestCpt, type CptMap, type CptSuggestion } from '../cpt'

export interface CptChoice {
  code: string | null
  description: string | null
}

interface Props {
  caseName: string
  map?: CptMap
  saving: boolean
  onBack: () => void
  onConfirm: (choice: CptChoice) => void
}

const NONE = '__none__'

// CPT confirmation step. The user MUST tap to confirm one candidate (or choose
// "None / enter manually"); a single suggestion is never auto-committed.
export function CptConfirm({ caseName, map, saving, onBack, onConfirm }: Props) {
  const suggestions = useMemo<CptSuggestion[]>(() => suggestCpt(caseName, map), [caseName, map])
  // Pre-select the top match so the appropriate CPT is auto-added — but the user
  // still taps Save to commit it (never silently committed).
  const [selected, setSelected] = useState<string | null>(() => suggestions[0]?.code ?? null)
  const [manualCode, setManualCode] = useState('')

  const decided = selected !== null
  const isNone = selected === NONE

  function handleSave() {
    if (!decided) return
    if (isNone) {
      const code = manualCode.trim()
      onConfirm(code ? { code, description: 'Manual entry' } : { code: null, description: null })
    } else {
      const cand = suggestions.find((s) => s.code === selected)
      onConfirm(cand ? { code: cand.code, description: cand.description } : { code: null, description: null })
    }
  }

  return (
    <div className="screen">
      <header className="appbar">
        <button className="link" onClick={onBack}>
          ‹ Back
        </button>
        <div className="appbar__title">Confirm CPT</div>
        <span style={{ width: 40 }} />
      </header>

      <div className="cpt">
        <p className="cpt__case">“{caseName}”</p>
        <p className="hint">
          {suggestions.length === 0
            ? 'No CPT suggestions matched — choose “None / enter manually”.'
            : 'Tap to confirm one code (ranked by match), or enter one manually.'}
        </p>

        <ul className="cpt__list">
          {suggestions.map((s) => (
            <li key={s.code}>
              <button
                type="button"
                className={`cpt__opt ${selected === s.code ? 'cpt__opt--on' : ''}`}
                onClick={() => setSelected(s.code)}
              >
                <span className="cpt__radio" />
                <span className="cpt__body">
                  <span className="cpt__code">{s.code}</span>
                  <span className="cpt__desc">{s.description}</span>
                </span>
                <span className="cpt__conf">{Math.round(s.confidence * 100)}%</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={`cpt__opt ${isNone ? 'cpt__opt--on' : ''}`}
              onClick={() => setSelected(NONE)}
            >
              <span className="cpt__radio" />
              <span className="cpt__body">
                <span className="cpt__code">None / enter manually</span>
                <span className="cpt__desc">No CPT, or type a code below</span>
              </span>
            </button>
          </li>
        </ul>

        {isNone && (
          <label className="field">
            <span>CPT code (optional)</span>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 49505"
              inputMode="numeric"
            />
          </label>
        )}
      </div>

      <div className="actions">
        <button className="btn btn--ghost" onClick={onBack} disabled={saving}>
          Back
        </button>
        <button className="btn btn--primary" onClick={handleSave} disabled={!decided || saving}>
          {saving ? 'Saving…' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  )
}
