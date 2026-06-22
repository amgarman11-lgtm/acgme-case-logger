import type { CaseRow } from '../types/models'

// Client-side .xlsx export (SheetJS). We only WRITE spreadsheets from the user's
// own de-identified case data — no untrusted files are ever parsed.
// SheetJS is loaded on demand (dynamic import) to keep the initial bundle light.
export async function exportCasesToXlsx(cases: CaseRow[], filename = 'acgme-cases.xlsx'): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = cases.map((c) => ({
    'Case #': c.case_number ?? '',
    Reference: c.case_ref ?? '',
    'Surgery date': c.surgery_date,
    Attending: c.attending_name,
    Role: c.resident_role,
    Procedure: c.case_name,
    CPT: c.cpt_code ?? '',
    'CPT description': c.cpt_description ?? '',
    Rotation: c.rotation ?? '',
    PGY: c.pgy_year ?? '',
    'Logged to ACGME': c.logged_to_acgme ? 'Yes' : 'No',
    'Created at': c.created_at,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 36 },
    { wch: 8 }, { wch: 36 }, { wch: 18 }, { wch: 6 }, { wch: 16 }, { wch: 22 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cases')
  XLSX.writeFile(wb, filename)
}
