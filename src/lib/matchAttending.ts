// Fuzzy-match a (possibly mis-heard) spoken name to a saved attending.
// Speech recognition often garbles proper names; matching against the user's
// own attendings list snaps "doctor smith" / "dr smyth" -> "Dr. Smith".

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(dr|doctor|prof|professor|attending|md|do)\b\.?/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  const maxLen = Math.max(a.length, b.length, 1)
  return 1 - levenshtein(a, b) / maxLen
}

/**
 * Returns the best-matching attending name from `attendings` for the spoken
 * text, or null if nothing clears `threshold` (0..1). Matches on the full
 * normalized string, on surnames, and on surname containment.
 */
export function matchAttending(spoken: string, attendings: string[], threshold = 0.6): string | null {
  const s = norm(spoken)
  if (!s || !attendings.length) return null
  const sLast = s.split(' ').pop() || s

  let best: string | null = null
  let bestScore = 0
  for (const a of attendings) {
    const an = norm(a)
    if (!an) continue
    const aLast = an.split(' ').pop() || an
    const full = similarity(s, an)
    const last = similarity(sLast, aLast)
    const contains = aLast.length >= 3 && s.includes(aLast) ? 0.92 : 0
    const score = Math.max(full, last, contains)
    if (score > bestScore) {
      bestScore = score
      best = a
    }
  }
  return bestScore >= threshold ? best : null
}
