import type { ReactNode } from 'react'

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

interface Props {
  id: string
  label: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  rows?: number
  autoCapitalize?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'search' | 'email' | 'url'
  datalistOptions?: string[]
  // Voice props are driven by the parent (one shared mic session).
  voiceSupported: boolean
  listening: boolean
  interim: string
  onMicToggle: () => void
  micDisabled?: boolean
}

// A text/textarea field with an optional dictation button and optional datalist
// autocomplete. Typing is always available; the mic only appears when the Web
// Speech API is supported.
export function VoiceField({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 2,
  autoCapitalize,
  inputMode,
  datalistOptions,
  voiceSupported,
  listening,
  interim,
  onMicToggle,
  micDisabled,
}: Props) {
  const listId = datalistOptions && datalistOptions.length ? `${id}-list` : undefined
  return (
    <div className="field">
      <div className="field__labelrow">
        <label htmlFor={id}>{label}</label>
        {voiceSupported && (
          <button
            type="button"
            className={`mic ${listening ? 'mic--on' : ''}`}
            onClick={onMicToggle}
            aria-pressed={listening}
            aria-label={listening ? 'Stop dictation' : 'Dictate'}
            disabled={micDisabled}
          >
            {listening ? (
              <>
                <span className="mic__dot" />
                Listening
              </>
            ) : (
              <>
                <MicIcon />
                Dictate
              </>
            )}
          </button>
        )}
      </div>

      {multiline ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoCapitalize={autoCapitalize}
          inputMode={inputMode}
          list={listId}
        />
      )}
      {listId && (
        <datalist id={listId}>
          {datalistOptions!.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}

      {listening && <div className="voice-interim">{interim || 'Listening… speak now'}</div>}
    </div>
  )
}
