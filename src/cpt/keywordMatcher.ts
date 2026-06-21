import type { CptMap, CptSuggestion } from './index'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// Keyword-overlap matcher. Confidence rewards full keyword coverage and, lightly,
// more specific (multi-keyword) entries. Candidates are de-duped by code, keeping
// the highest confidence. A minimum-confidence floor drops noise from a single
// common word (e.g. "laparoscopic") partially matching a multi-keyword entry.
// Kept behind suggestCpt() so the strategy is swappable.
export function keywordMatch(caseName: string, map: CptMap, limit = 3, minConfidence = 0.5): CptSuggestion[] {
  const norm = normalize(caseName)
  if (!norm) return []
  const tokens = new Set(norm.split(' ').filter(Boolean))

  const byCode = new Map<string, CptSuggestion>()
  for (const entry of map.entries) {
    const kws = entry.keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)
    if (kws.length === 0) continue

    let matched = 0
    for (const kw of kws) {
      const hit = kw.includes(' ') ? norm.includes(kw) : tokens.has(kw)
      if (hit) matched++
    }
    if (matched === 0) continue

    const coverage = matched / kws.length
    const specificity = 0.8 + (0.2 * Math.min(kws.length, 3)) / 3
    const confidence = Math.min(1, coverage * specificity)

    for (const cand of entry.candidates) {
      const existing = byCode.get(cand.code)
      if (!existing || confidence > existing.confidence) {
        byCode.set(cand.code, { ...cand, confidence })
      }
    }
  }

  return [...byCode.values()]
    .filter((c) => c.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
}
