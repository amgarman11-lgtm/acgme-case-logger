import rawMap from '../data/cptMap.json'
import { keywordMatch } from './keywordMatcher'

export interface CptCandidate {
  code: string
  description: string
}
export interface CptMapEntry {
  keywords: string[]
  candidates: CptCandidate[]
}
export interface CptMap {
  version: number
  entries: CptMapEntry[]
}
export interface CptSuggestion extends CptCandidate {
  confidence: number // 0..1
}

// Seed map shipped with the app (general surgery). User overrides from Settings
// (user_settings.cpt_map) are layered on top via mergeCptMap().
export const seedCptMap: CptMap = rawMap as unknown as CptMap

/**
 * Suggest CPT candidates for a dictated case name, ranked by confidence.
 * All matching lives behind this function so the strategy can be swapped later
 * (e.g. embeddings) without touching the UI.
 */
export function suggestCpt(caseName: string, map: CptMap = seedCptMap, limit = 3): CptSuggestion[] {
  if (!caseName.trim()) return []
  return keywordMatch(caseName, map, limit)
}

/** Layer user override entries on top of the seed (overrides win, matched first). */
export function mergeCptMap(seed: CptMap, overrides?: CptMap | null): CptMap {
  if (!overrides || !Array.isArray(overrides.entries) || overrides.entries.length === 0) return seed
  return { version: seed.version, entries: [...overrides.entries, ...seed.entries] }
}
