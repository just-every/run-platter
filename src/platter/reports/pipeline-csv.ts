import { performanceCsv, performanceMail } from './performance'
import { revenueKeys, revenueLabels } from './recorded-revenue'
import { cell } from '../invoices'
import { nextActions } from '../pipeline'

type Report = { rows: any[]; count: number; totals: { currency: string; count: number; valueCents: number }[]; generatedAt: number }
const decimal = (cents: number) => (cents / 100).toFixed(2)
const shown = (cents: number, currency: string) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

/** REPORT-005: the pipeline exactly as filtered and sorted on screen, then per-currency totals. */
export function pipelineCsv(report: Report & {view?:string}) {
 if((report as any).kind==='sales-performance')return performanceCsv(report)
 const lines = [['Title', 'Client', 'Owner', 'Status', 'Next action', 'Currency', 'Value', 'Age in days','Follow-up due']]
 for (const r of report.rows) lines.push([r.title, r.client, r.owner, r.status, nextActions[r.nextAction as keyof typeof nextActions], r.currency, decimal(r.valueCents), String(r.age),r.dueDate??''])
 for (const t of report.totals) lines.push([`Total (${t.count} proposals)`, '', '', '', '', t.currency, decimal(t.valueCents), '', ''])
 if(report.view==='recorded-revenue'){lines[0][6]='Booked signed value';lines[0].push('Accepted on (UTC)',...revenueLabels);for(const [i,row] of report.rows.entries())lines[i+1].push(row.bookedOn,...revenueKeys.map(k=>decimal(row.recordedRevenue?.[k]??0)));for(const [i,total] of report.totals.entries())lines[report.rows.length+i+1].push('',...revenueKeys.map(k=>decimal((total as any)[k]??0)))}
 return lines.map(line => line.map(cell).join(',')).join('\r\n') + '\r\n'
}

/** The mail body repeats the screen's count, totals and rows in its money format, then the CSV. */
export function pipelineMail(report: Report & {view?:string}, filters: string): [string, string] {
 if((report as any).kind==='sales-performance')return performanceMail(report,filters)
 const at = new Date(report.generatedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
 const financial=(row:any)=>report.view==='recorded-revenue'?' · '+revenueKeys.map((key,i)=>revenueLabels[i]+': '+shown(row[key]??0,row.currency)).join(' · '):''
 const body = [`Platter ${report.view==='recorded-revenue'?'recorded revenue':'pipeline'} report generated ${at}.`, `Filters: ${filters || 'all proposals'}.`, `${report.count} proposals match.`,
  ...report.totals.map(t => `${t.currency} total · ${t.count} proposals: ${shown(t.valueCents, t.currency)}${financial(t)}`), '',
  ...report.rows.map(r => `${r.title} · ${r.status} · ${shown(r.valueCents, r.currency)} · ${r.owner} · ${r.client} · ${r.age} days · ${nextActions[r.nextAction as keyof typeof nextActions]}${financial({...r.recordedRevenue,currency:r.currency})}`),
  '', 'CSV:', pipelineCsv(report)].join('\n')
 return [`Platter ${report.view==='recorded-revenue'?'recorded revenue':'pipeline'} report · ${at}`, body]
}
