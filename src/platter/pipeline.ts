import { revenueKeys } from './reports/recorded-revenue'
import { need } from './model'

export const nextActions = { approve: 'Approve revision', send: 'Send approved offer', 'await-client': 'Await client decision', 'export-deposit': 'Export deposit invoice', complete: 'Deposit invoice exported', withdrawn: 'Prepare a new revision', reopen: 'Review expiry or reopening', followup: 'Sales follow-up' }
const statuses = ['draft', 'awaiting-approval', 'approved', 'sent', 'viewed', 'accepted', 'expired', 'withdrawn', 'declined', 'lost']
const sorts = ['status', 'value', 'owner', 'client', 'age', 'nextAction', 'dueDate']
function bound(params: URLSearchParams, key: string, money = false) {
 const raw = params.get(key)
 if (!raw) return undefined
 need((money ? /^\d{1,8}(\.\d{1,2})?$/ : /^\d{1,8}$/).test(raw), `Invalid ${key}`)
 return money ? Math.round(Number(raw) * 100) : Number(raw)
}
export function pipeline(proposals: any[], params = new URLSearchParams(), now = Date.now(), followups?:any) {
 const revenue=params.get('view')==='recorded-revenue';need(!params.get('view')||revenue,'Choose a report view');if(revenue)proposals=proposals.filter(p=>p.acceptance)
 const query = params.get('q') || ''
 need(query.length <= 200, 'Search must be at most 200 characters')
 const phrase = query.trim().replace(/\s+/g, ' ').toLowerCase()
 const matching = new Set(proposals.filter(p => !phrase || proposalText(p).some(value => value.replace(/\s+/g, ' ').toLowerCase().includes(phrase))).map(p => String(p.id)))
 const sort = params.get('sort') || 'status', direction = params.get('direction') || 'asc'
 need(sorts.includes(sort) && ['asc', 'desc'].includes(direction), 'Choose a pipeline sort')
 const due=params.get('dueFollowup');need(!due||['yes','no'].includes(due),'Choose due follow-ups')
 const status = params.get('status'), nextAction = params.get('nextAction')
 need(!status || statuses.includes(status), 'Choose a proposal status')
 need(!nextAction || Object.hasOwn(nextActions, nextAction), 'Choose a next action')
 const minValue = bound(params, 'minValue', true), maxValue = bound(params, 'maxValue', true), minAge = bound(params, 'minAge'), maxAge = bound(params, 'maxAge')
 need(minValue === undefined || maxValue === undefined || minValue <= maxValue, 'Minimum value exceeds maximum')
 need(minAge === undefined || maxAge === undefined || minAge <= maxAge, 'Minimum age exceeds maximum')
 let rows = proposals.map(p => ({
  ...(revenue?{recordedRevenue:p.recordedRevenue}:{}),id: String(p.id), title: String(p.title), status: String(p.pipelineStatus ?? p.status), currency: String(p.currency),
  valueCents: Number(p.acceptance ? p.acceptance.totalCents : Math.max(...p.options.map((o: any) => o.cents))),
  ownerId: p.sales_owner_id as string | null, owner: p.sales_owner_name || 'Not recorded',
  clientId: String(p.client_id), client: String(p.clientName), age: Math.max(0, Math.floor((now - p.created_at) / 86400000)),
  dueDate: followups?.rows.find((r:any)=>r.id===p.id)?.dueDate??null,
  dueFollowup: Boolean(followups?.rows.some((r:any)=>r.id===p.id&&['overdue','today'].includes(r.period))),
  nextAction: (followups?.rows.some((r:any)=>r.id===p.id&&r.scheduled)?'followup':p.pipelineStatus === 'withdrawn' || p.status === 'withdrawn' ? 'withdrawn' : p.pipelineStatus === 'expired' || p.status === 'expired' ? 'reopen' : ['draft','approved'].includes(p.status) ? (p.approval ? p.approval.complete ? 'send' : 'approve' : p.status==='draft'?'approve':'send') : p.status === 'sent' ? 'await-client' : p.invoice ? 'complete' : 'export-deposit') as keyof typeof nextActions,
 }))
 const owners = [...new Map(rows.map(r => [r.ownerId || 'unrecorded', { id: r.ownerId || 'unrecorded', name: r.owner }])).values()].sort((a,b) => a.name.localeCompare(b.name))
 const clients = [...new Map(rows.map(r => [r.clientId, { id: r.clientId, name: r.client }])).values()].sort((a,b) => a.name.localeCompare(b.name))
 rows = rows.filter(r => matching.has(r.id) && (!due||(due==='yes')===r.dueFollowup) && (!status || r.status === status) && (!params.get('owner') || (r.ownerId || 'unrecorded') === params.get('owner')) && (!params.get('client') || r.clientId === params.get('client')) && (!nextAction || r.nextAction === nextAction) && (minValue === undefined || r.valueCents >= minValue) && (maxValue === undefined || r.valueCents <= maxValue) && (minAge === undefined || r.age >= minAge) && (maxAge === undefined || r.age <= maxAge))
 rows.sort((a,b) => {
  const order = sort === 'value' ? a.currency.localeCompare(b.currency) || a.valueCents - b.valueCents : sort === 'age' ? a.age - b.age : sort === 'dueDate' ? (a.dueDate??'9999').localeCompare(b.dueDate??'9999') : String(a[sort as 'status' | 'owner' | 'client' | 'nextAction']).localeCompare(String(b[sort as 'status' | 'owner' | 'client' | 'nextAction']))
  return order * (direction === 'asc' ? 1 : -1) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
 })
 const totals = [...new Set(rows.map(r => r.currency))].sort().map(currency => ({ currency, count: rows.filter(r => r.currency === currency).length, valueCents: rows.filter(r => r.currency === currency).reduce((sum,r) => sum + r.valueCents, 0) }))
 if(revenue)for(const total of totals)for(const key of revenueKeys){const sum=rows.filter(r=>r.currency===total.currency).reduce((n,r)=>n+(r.recordedRevenue?.[key]??0),0);need(Number.isSafeInteger(sum),'Recorded revenue exceeds the exact reporting limit',409);Object.assign(total,{[key]:sum})}
 return { ...(revenue?{view:'recorded-revenue'}:{}),rows, count: rows.length, totals, owners, clients, generatedAt: now }
}

/** Search only offer content and visible metadata; invitation and verification credentials never participate. */
function proposalText(p: any): string[] {
 return [p.title, p.clientName, p.clientEmail, p.sales_owner_name, p.pipelineStatus ?? p.status, p.scope, p.terms,
  ...p.options.flatMap((option: any) => [option.label,
   ...(option.optionalItems ?? []).flatMap((item: any) => [item.label, item.description]),
   ...(option.tables ?? []).flatMap((table: any) => [table.name, ...table.lines.flatMap((line: any) => [line.name, line.description, line.group, line.unit])]),
  ]),
 ].filter((value): value is string => typeof value === 'string')
}
