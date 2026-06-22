import type { ResidentRole } from '../types/models'
import { matchAttending } from './matchAttending'

// On-device parser: turns one free-form spoken case into structured fields.
// Deterministic, offline, no API. Whatever it can't place confidently is left
// for the user to fix on the edit screen (the master dictation lands there).

export interface ParsedCase {
  attending?: string
  role?: ResidentRole
  caseName?: string
  pgy?: number
  rotation?: string
  reference?: string // de-identified, user-assigned label — never PHI
}

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
}

const REF_RE =
  /\b(?:case ref(?:erence)?|reference|label|tag|ref)\b[:\s]+([a-z0-9][a-z0-9\-\s]{0,28}?)(?=\s*(?:[.,;]|$|\b(?:attending|doctor|dr|pgy|chief|junior|rotation|first assistant|teaching|surgeon)\b))/i

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractRole(t: string): ResidentRole | undefined {
  if (/\bchief\b/.test(t)) return 'Surgeon-Chief'
  if (/\bjunior\b/.test(t)) return 'Surgeon-Junior'
  if (/\bteaching\b/.test(t)) return 'Teaching Assistant'
  if (/\bfirst[-\s]?assist/.test(t) || /\bassistant\b/.test(t)) return 'First Assistant'
  return undefined
}

function extractPgy(t: string): number | undefined {
  const m =
    t.match(/\bp\.?\s?g\.?\s?y\.?\s*-?\s*(\d|one|two|three|four|five|six|seven)\b/) ||
    t.match(/\bpostgraduate year\s*(\d|one|two|three|four|five|six|seven)\b/)
  if (!m) return undefined
  const v = m[1]
  const n = /\d/.test(v) ? Number(v) : WORD_NUM[v]
  return n >= 1 && n <= 7 ? n : undefined
}

function extractRotation(t: string, rotations: string[]): string | undefined {
  let found: string | undefined
  for (const r of rotations) {
    if (r && t.includes(r.toLowerCase()) && (!found || r.length > found.length)) found = r
  }
  return found
}

function extractReference(raw: string): string | undefined {
  const m = raw.match(REF_RE)
  const v = m?.[1]?.trim()
  return v || undefined
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractProcedure(raw: string, parsed: ParsedCase): string {
  let s = ` ${raw} `
  s = s.replace(REF_RE, ' ')
  s = s.replace(/\b(?:dr\.?|doctor)\s+[a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+)?/gi, ' ')
  s = s.replace(/\bp\.?\s?g\.?\s?y\.?\s*-?\s*(?:\d|one|two|three|four|five|six|seven)\b/gi, ' ')
  s = s.replace(/\bpostgraduate year\s*(?:\d|one|two|three|four|five|six|seven)\b/gi, ' ')
  s = s.replace(/\b(surgeon[-\s]?chief|surgeon[-\s]?junior|first[-\s]?assistant|teaching assistant|chief|junior|teaching|assistant|surgeon|attending|resident)\b/gi, ' ')
  if (parsed.rotation) s = s.replace(new RegExp(escapeRegex(parsed.rotation), 'gi'), ' ')
  s = s.replace(/\b(i performed a|i did a|i was the|i performed|i did|i was|performed a|performed|did a|on a|for a|on the|for the|the case|rotation|service|case|procedure|today|role)\b/gi, ' ')
  s = s.replace(/[.,;:]/g, ' ').replace(/\s+/g, ' ').trim()
  return s
}

export function parseCaseDictation(
  transcript: string,
  opts: { attendings?: string[]; rotations?: string[] } = {},
): ParsedCase {
  const raw = transcript.trim()
  if (!raw) return {}
  const t = raw.toLowerCase()
  const result: ParsedCase = {}

  result.role = extractRole(t)
  result.pgy = extractPgy(t)
  result.rotation = extractRotation(t, opts.rotations ?? [])
  result.reference = extractReference(raw)

  if (opts.attendings?.length) {
    const m = matchAttending(raw, opts.attendings, 0.62)
    if (m) result.attending = m
  }
  if (!result.attending) {
    const dr = raw.match(/\b(?:dr\.?|doctor)\s+([a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+)?)/i)
    if (dr) result.attending = `Dr. ${titleCase(dr[1])}`
  }

  const proc = extractProcedure(raw, result)
  result.caseName = proc.length >= 3 ? proc : raw
  return result
}
