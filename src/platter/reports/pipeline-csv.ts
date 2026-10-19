import { cell } from '../invoices'
import { nextActions } from '../pipeline'

type Report = { rows: any[]; count: number; totals: { currency: string; count: number; valueCents: number }[]; generatedAt: number }
const decimal = (cents: number) => (cents / 100).toFixed(2)
const shown = (cents: number, currency: string) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

/** REPORT-005: the pipeline exactly as filtered and sorted on screen, then per-currency totals. */
export function pipelineCsv(report: Report) {
 const lines = [['Title', 'Client', 'Owner', 'Status', 'Next action', 'Currency', 'Value', 'Age in days']]
 for (const r of report.rows) lines.push([r.title, r.client, r.owner, r.status, nextActions[r.nextAction as keyof typeof nextActions], r.currency, decimal(r.valueCents), String(r.age)])
 for (const t of report.totals) lines.push([`Total (${t.count} proposals)`, '', '', '', '', t.currency, decimal(t.valueCents), ''])
 return lines.map(line => line.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** The mail body repeats the screen's count, totals and rows in its money format, then the CSV. */
export function pipelineMail(report: Report, filters: string): [string, string] {
 const at = new Date(report.generatedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
 const body = [`Platter pipeline report generated ${at}.`, `Filters: ${filters || 'all proposals'}.`, `${report.count} proposals match.`,
  ...report.totals.map(t => `${t.currency} total · ${t.count} proposals: ${shown(t.valueCents, t.currency)}`), '',
  ...report.rows.map(r => `${r.title} · ${r.status} · ${shown(r.valueCents, r.currency)} · ${r.owner} · ${r.client} · ${r.age} days · ${nextActions[r.nextAction as keyof typeof nextActions]}`),
  '', 'CSV:', pipelineCsv(report)].join('\n')
 return [`Platter pipeline report · ${at}`, body]
}
