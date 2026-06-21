interface Props {
  logged: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function LoggedToggle({ logged, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      className={`toggle ${logged ? 'toggle--on' : ''}`}
      role="switch"
      aria-checked={logged}
      aria-label="Logged to ACGME"
      disabled={disabled}
      onClick={() => onChange(!logged)}
    >
      <span className="toggle__knob" />
      <span className="toggle__label">{logged ? 'Logged' : 'Not logged'}</span>
    </button>
  )
}
