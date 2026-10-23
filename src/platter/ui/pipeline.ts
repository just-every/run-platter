import { revenueKeys, revenueLabels } from '../reports/recorded-revenue'
import { nextActions, pipeline } from '../pipeline'
import { empty, escape, field, money, panel, proposalPath, statusPill } from './shared'

// The proposal line: each proposal on one dotted track through the stages Platter records.
const stages = ['Prepared', 'Approved', 'Sent', 'Accepted', 'Deposit exported']
const reached: Record<string, number> = { draft: 0, approved: 1, sent: 2, expired: 2, withdrawn: 2, declined: 2, lost: 2, accepted: 3 }

function track(row: any): string {
  const at = row.nextAction === 'complete' ? 4 : reached[row.status] ?? 0
  const stalled = ['expired', 'withdrawn', 'declined', 'lost'].includes(row.status)
  return `<ol class="track${stalled ? ' stalled' : ''}" aria-label="Progress">${stages.map((stage, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"><span>${stage}</span></li>`).join('')}</ol>`
}

export function pipelinePanel(proposals: any[], params: URLSearchParams, followups?:any) {
 const report = pipeline(proposals, params,Date.now(),followups),revenue=report.view==='recorded-revenue'
 const select = (label: string, key: string, choices: { id: string; name: string }[]) => `<label>${label}<select name="${key}" aria-label="${label}"><option value="">All</option>${choices.map(c => `<option value="${escape(c.id)}"${params.get(key) === c.id ? ' selected' : ''}>${escape(c.name)}</option>`).join('')}</select></label>`
 const filters = `<form method="get" action="/app" class="filters">${revenue?'<input type="hidden" name="view" value="recorded-revenue">':''}<div class="filter-grid">`
  + field('Search proposal text', 'q', params.get('q'), 'type="search" maxlength="200"')
  + select('Owner', 'owner', report.owners) + select('Status', 'status', ['draft','awaiting-approval','approved','sent','accepted','paid','expired','withdrawn','declined','lost'].map(id => ({id,name:id})))
  + select('Due follow-up','dueFollowup',[{id:'yes',name:'Due today or overdue'},{id:'no',name:'No due follow-up'}])
  + select('Client', 'client', report.clients) + select('Next action', 'nextAction', Object.entries(nextActions).map(([id,name]) => ({id,name})))
  + `<label>Sort by<select name="sort" aria-label="Sort by">${['status','value','owner','client','age','nextAction','dueDate'].map(id => `<option value="${id}"${(params.get('sort') || 'status') === id ? ' selected' : ''}>${escape(id === 'nextAction' ? 'Next action' : id === 'dueDate' ? 'Due date' : id)}</option>`).join('')}</select></label>`
  + field('Minimum value', 'minValue', params.get('minValue'), 'inputmode="decimal"') + field('Maximum value', 'maxValue', params.get('maxValue'), 'inputmode="decimal"')
  + field('Minimum age in days', 'minAge', params.get('minAge'), 'type="number" min="0"') + field('Maximum age in days', 'maxAge', params.get('maxAge'), 'type="number" min="0"')
  + `<label>Direction<select name="direction" aria-label="Direction"><option value="asc"${params.get('direction') !== 'desc' ? ' selected' : ''}>Ascending</option><option value="desc"${params.get('direction') === 'desc' ? ' selected' : ''}>Descending</option></select></label></div><div class="filter-actions"><button class="secondary">Filter pipeline</button><a href="${revenue?'/app?view=recorded-revenue':'/app'}">Clear filters</a></div></form>`
 const totals = `<div class="line-totals"><p data-pipeline-count="${report.count}">${report.count} proposals match.</p><dl>${report.totals.map(t => `<dt>${escape(t.currency)} total · ${t.count} proposals</dt><dd data-pipeline-total="${escape(t.currency)}">${money(t.valueCents,t.currency)}</dd>${revenue?revenueKeys.map((key,i)=>`<dt>${escape(revenueLabels[i])}</dt><dd>${money((t as any)[key],t.currency)}</dd>`).join(''):''}`).join('')}</dl></div>`
 const rows = report.rows.length ? `<ul class="line" aria-label="Pipeline proposals">${report.rows.map(p => `<li data-proposal-id="${escape(p.id)}"><article class="line-row"><div class="line-head"><h3><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a></h3><p class="line-value">${money(p.valueCents,p.currency)} ${statusPill(p.status)}</p></div>${track(p)}<dl class="line-facts">${revenue?revenueKeys.map((key,i)=>`<dt>${escape(revenueLabels[i])}</dt><dd>${money(p.recordedRevenue?.[key]??0,p.currency)}</dd>`).join(''):''}<dt>Owner</dt><dd>${escape(p.owner)}</dd><dt>Client</dt><dd>${escape(p.client)}</dd><dt>Age</dt><dd>${p.age} days</dd><dt>Follow-up due</dt><dd>${escape(p.dueDate??'None')}</dd><dt>Next action</dt><dd>${escape(nextActions[p.nextAction])}</dd></dl></article></li>`).join('')}</ul>` : empty('No proposals match these filters.')
 return panel(revenue?'Recorded revenue':'Proposal pipeline', (revenue?'<p>Accepted value and explicitly recorded receipts, grouped by currency. Confirmed refunds reduce net received; unconfirmed refunds are shown separately. Exported deposit CSV value is not a provider invoice or payment. Accounting reconciliation, recurring revenue, overdue balances and period reporting are not available.</p>':'')+'<p class="muted">Unaccepted value is the highest offered option; accepted value is the chosen option. Currencies total separately. Age counts completed 24-hour days since creation. Next action reflects the recorded workflow.</p>' + filters + totals + rows)
}
