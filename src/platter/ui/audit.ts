import { date, escape, field, panel } from './shared'
export function auditPage(rows: any[], query: URLSearchParams) {
 const filters = `<form method="get" action="/app/audit">${field('Search activity', 'q', query.get('q'))}${field('Actor ID', 'actor', query.get('actor'))}${field('Action', 'action', query.get('action'))}${field('Subject ID', 'subject', query.get('subject'))}<button>Search audit log</button></form>`
 const csv = '/api/platter/audit.csv?' + query.toString()
 return panel('Search activity', '<p>Successful product actions recorded from this version onward. Times show in the installation time zone. Earlier activity has not been reconstructed.</p>' + filters + `<p><a href="${escape(csv)}">Download audit CSV</a> · <a href="/app/audit">Clear search</a></p>`)
  + panel('Recorded activity', rows.length ? `<ul class="records">${rows.map(row => `<li><article><h3>${escape(row.action)}</h3><p class="wrap">${escape(row.actor_role)} · ${escape(row.actor_id)}</p><p class="wrap">${escape(row.subject)}</p><p>${date(row.occurred_at)}</p>${row.reason?`<p class="preserve">${escape(row.reason)}</p>`:''}</article></li>`).join('')}</ul>` : '<p>No activity matches this search.</p>')
}
