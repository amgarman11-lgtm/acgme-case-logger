import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { exportCasesToXlsx } from '../export/exportXlsx'
import type { AyConfig } from '../lib/academicYear'
import type { CptMap } from '../cpt'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  onBack: () => void
  rotations: string[]
  cptOverrides: CptMap | null
  ayConfig: AyConfig
  saveRotations: (next: string[]) => Promise<void>
  saveCptOverrides: (next: CptMap | null) => Promise<void>
  saveAyConfig: (next: AyConfig) => Promise<void>
  userEmail: string | null
  onSignInGoogle: () => Promise<void>
  onSignOut: () => Promise<void>
}

export function SettingsScreen(props: Props) {
  const { onBack, rotations, cptOverrides, ayConfig } = props

  const [newRotation, setNewRotation] = useState('')
  const [kw, setKw] = useState('')
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const [month, setMonth] = useState(ayConfig.startMonth)
  const [day, setDay] = useState(ayConfig.startDay)
  const [accountMsg, setAccountMsg] = useState<string | null>(null)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function addRotation() {
    const r = newRotation.trim()
    if (!r || rotations.includes(r)) return
    setNewRotation('')
    await props.saveRotations([...rotations, r])
  }
  async function removeRotation(r: string) {
    await props.saveRotations(rotations.filter((x) => x !== r))
  }

  const overrideEntries = cptOverrides?.entries ?? []
  async function addCpt() {
    const keywords = kw.split(',').map((k) => k.trim()).filter(Boolean)
    const c = code.trim()
    if (keywords.length === 0 || !c) return
    const entry = { keywords, candidates: [{ code: c, description: desc.trim() || c }] }
    const next: CptMap = { version: 1, entries: [...overrideEntries, entry] }
    setKw('')
    setCode('')
    setDesc('')
    await props.saveCptOverrides(next)
  }
  async function removeCpt(idx: number) {
    const entries = overrideEntries.filter((_, i) => i !== idx)
    await props.saveCptOverrides(entries.length ? { version: 1, entries } : null)
  }

  async function saveAy() {
    await props.saveAyConfig({ startMonth: month, startDay: day })
    setAccountMsg(null)
  }

  async function handleGoogle() {
    setAccountMsg(null)
    try {
      await props.onSignInGoogle()
    } catch (e) {
      setAccountMsg(
        (e instanceof Error ? e.message : 'Google sign-in failed') +
          ' — enable the Google provider in Supabase first (see README).',
      )
    }
  }

  async function handleExport() {
    setBusy(true)
    setExportMsg(null)
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('surgery_date', { ascending: false })
      if (error) throw error
      if (!data || data.length === 0) {
        setExportMsg('No cases to export yet.')
      } else {
        await exportCasesToXlsx(data, `acgme-cases-${new Date().toISOString().slice(0, 10)}.xlsx`)
        setExportMsg(`Exported ${data.length} case${data.length === 1 ? '' : 's'}.`)
      }
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <header className="appbar">
        <button className="link" onClick={onBack}>
          ‹ Back
        </button>
        <div className="appbar__title">Settings</div>
        <span style={{ width: 40 }} />
      </header>

      <div className="settings">
        {/* Account */}
        <section className="card">
          <h3 className="card__title">Account</h3>
          {props.userEmail ? (
            <>
              <p className="card__text">Signed in as {props.userEmail}</p>
              <button className="btn btn--ghost" onClick={props.onSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="card__text">
                Anonymous device account. Cases are private to this device. Sign in with Google to sync across devices.
              </p>
              <button className="btn btn--primary" onClick={handleGoogle}>
                Sign in with Google
              </button>
            </>
          )}
          {accountMsg && <p className="card__note">{accountMsg}</p>}
        </section>

        {/* Rotations */}
        <section className="card">
          <h3 className="card__title">Rotations</h3>
          <ul className="chips">
            {rotations.map((r) => (
              <li className="chip" key={r}>
                {r}
                <button className="chip__x" onClick={() => removeRotation(r)} aria-label={`Remove ${r}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="inline-add">
            <input value={newRotation} onChange={(e) => setNewRotation(e.target.value)} placeholder="Add rotation…" />
            <button className="btn btn--primary" onClick={addRotation}>
              Add
            </button>
          </div>
        </section>

        {/* CPT map overrides */}
        <section className="card">
          <h3 className="card__title">Custom CPT mappings</h3>
          <p className="card__text">Keyword(s) → CPT. These are matched before the built-in list.</p>
          {overrideEntries.length > 0 && (
            <ul className="cpt-overrides">
              {overrideEntries.map((e, i) => (
                <li key={i}>
                  <span>
                    <strong>{e.candidates[0]?.code}</strong> — {e.keywords.join(', ')}
                  </span>
                  <button className="chip__x" onClick={() => removeCpt(i)} aria-label="Remove mapping">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="stack">
            <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="keywords, comma-separated" />
            <div className="inline-add">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CPT code" inputMode="numeric" />
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="description (optional)" />
            </div>
            <button className="btn btn--primary" onClick={addCpt}>
              Add mapping
            </button>
          </div>
        </section>

        {/* Academic year */}
        <section className="card">
          <h3 className="card__title">Academic year start</h3>
          <p className="card__text">Case numbers (YYYY-NNNN) reset on this date each year.</p>
          <div className="inline-add">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button className="btn btn--primary" onClick={saveAy}>
              Save
            </button>
          </div>
        </section>

        {/* Export */}
        <section className="card">
          <h3 className="card__title">Export</h3>
          <p className="card__text">Download all your cases as an Excel (.xlsx) file.</p>
          <button className="btn btn--primary" onClick={handleExport} disabled={busy}>
            {busy ? 'Exporting…' : 'Export to .xlsx'}
          </button>
          {exportMsg && <p className="card__note">{exportMsg}</p>}
        </section>

        <p className="hint">
          No PHI: this app stores only de-identified case data — never MRN, patient name, or DOB.
        </p>
      </div>
    </div>
  )
}
