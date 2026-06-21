// Academic-year helpers. The ACGME academic year starts July 1 by default; the
// start month/day are configurable per user (user_settings, wired up later).
// "academic_year" is the START year of the academic year, e.g. a case on
// 2026-03-15 with a July-1 schedule -> 2025 -> case number "2025-NNNN".

export interface AyConfig {
  startMonth: number // 1-12
  startDay: number // 1-31
}

export const DEFAULT_AY_CONFIG: AyConfig = { startMonth: 7, startDay: 1 }

/** Returns the academic-year START year for a date (YYYY-MM-DD string or Date). */
export function academicYearFor(date: string | Date, cfg: AyConfig = DEFAULT_AY_CONFIG): number {
  const d = typeof date === 'string' ? parseLocalDate(date) : date
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const afterStart = month > cfg.startMonth || (month === cfg.startMonth && day >= cfg.startDay)
  return afterStart ? year : year - 1
}

/** Parse a YYYY-MM-DD string as a LOCAL date (avoids UTC off-by-one). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Today as YYYY-MM-DD in local time. */
export function todayLocalISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Human label for an AY start year, e.g. 2025 -> "AY 2025-26". */
export function academicYearLabel(startYear: number): string {
  const end = (startYear + 1) % 100
  return `AY ${startYear}-${String(end).padStart(2, '0')}`
}
