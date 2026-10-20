import { nextActions, pipeline } from '../pipeline'
import { empty, escape, field, money, panel, proposalPath, statusPill } from './shared'

export function pipelinePanel(proposals: any[], params: URLSearchParams) {
 const report = pipeline(proposals, params)
 const select = (label: string, key: string, choices: { id: string; name: string }[]) => `<label>${label}<select name="${key}" aria-label="${label}"><option value="">All</option>${choices.map(c => `<option value="${escape(c.id)}"${params.get(key) === c.id ? ' selected' : ''}>${escape(c.name)}</option>`).join('')}</select></label>`
 const filters = `<form method="get" action="/app"><div class="editor-grid">`
  + select('Owner', 'owner', report.owners) + select('Status', 'status', ['draft','approved','sent','accepted','expired'].map(id => ({id,name:id})))
  + select('Client', 'client', report.clients) + select('Next action', 'nextAction', Object.entries(nextActions).map(([id,name]) => ({id,name})))
  + field('Minimum value', 'minValue', params.get('minValue'), 'inputmode="decimal"') + field('Maximum value', 'maxValue', params.get('maxValue'), 'inputmode="decimal"')
  + field('Minimum age in days', 'minAge', params.get('minAge'), 'type="number" min="0"') + field('Maximum age in days', 'maxAge', params.get('maxAge'), 'type="number" min="0"')
  + `<label>Sort by<select name="sort" aria-label="Sort by">${['status','value','owner','client','age','nextAction'].map(id => `<option value="${id}"${(params.get('sort') || 'status') === id ? ' selected' : ''}>${escape(id === 'nextAction' ? 'Next action' : id)}</option>`).join('')}</select></label><label>Direction<select name="direction" aria-label="Direction"><option value="asc"${params.get('direction') !== 'desc' ? ' selected' : ''}>Ascending</option><option value="desc"${params.get('direction') === 'desc' ? ' selected' : ''}>Descending</option></select></label></div><button>Filter pipeline</button><a href="/app">Clear filters</a></form>`
 const totals = `<p data-pipeline-count="${report.count}">${report.count} proposals match.</p><dl>${report.totals.map(t => `<dt>${escape(t.currency)} total · ${t.count} proposals</dt><dd data-pipeline-total="${escape(t.currency)}">${money(t.valueCents,t.currency)}</dd>`).join('')}</dl>`
 const rows = report.rows.length ? `<ul class="records" aria-label="Pipeline proposals">${report.rows.map(p => `<li data-proposal-id="${escape(p.id)}"><article><h3><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a></h3><p>${statusPill(p.status)} · ${money(p.valueCents,p.currency)}</p><dl><dt>Owner</dt><dd>${escape(p.owner)}</dd><dt>Client</dt><dd>${escape(p.client)}</dd><dt>Age</dt><dd>${p.age} days</dd><dt>Next action</dt><dd>${escape(nextActions[p.nextAction])}</dd></dl></article></li>`).join('')}</ul>` : empty('No proposals match these filters.')
 return panel('Proposal pipeline', '<p>Unaccepted value is the highest offered option; accepted value is the chosen option. Currencies total separately. Age counts completed 24-hour days since creation. Next action reflects the recorded workflow.</p>' + filters + totals + rows)
}
