import type { CaseRow } from '../types/models'

export interface SheetSyncResult {
  ok: boolean
  error?: string
}

/**
 * One-way push of cases to a Google Apps Script web-app webhook.
 *
 * Apps Script web apps don't return CORS headers, so we POST with mode:'no-cors'
 * and Content-Type text/plain (avoids a preflight). The response is opaque, so a
 * completed request is treated as success — the Sheet is the source of truth to
 * confirm. See README -> "Sync to a Google Sheet" for the script + setup.
 */
export async function syncCasesToSheet(webhookUrl: string, cases: CaseRow[]): Promise<SheetSyncResult> {
  const url = webhookUrl?.trim()
  if (!url) return { ok: false, error: 'No Google Sheet webhook URL is set (add it in Settings).' }
  if (!/^https:\/\/script\.google\.com\//.test(url)) {
    return { ok: false, error: 'That doesn’t look like a Google Apps Script URL (expected https://script.google.com/...).' }
  }

  const rows = cases.map((c) => ({
    case_number: c.case_number,
    surgery_date: c.surgery_date,
    attending: c.attending_name,
    role: c.resident_role,
    procedure: c.case_name,
    cpt: c.cpt_code ?? '',
    cpt_description: c.cpt_description ?? '',
    rotation: c.rotation ?? '',
    pgy: c.pgy_year ?? '',
    logged_to_acgme: c.logged_to_acgme,
    created_at: c.created_at,
  }))

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ cases: rows }),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Sync request failed' }
  }
}
