import { date, escape, field, panel } from './shared'

// Each recorded action reads as a sentence: who did it, what they did and to which proposal, client, key or
// person. The raw action, actor and subject ids stay under it for search; the CSV and JSON keep the stored rows.
export interface AuditNames { proposals: Map<string, string>; clients: Map<string, string>; people: Map<string, string>; keys: Map<string, string> }

const verbs: Record<string, string> = {
 'team.create':'created the team','member.set':'changed membership for','member.zone':'changed the personal time zone of','member.invite':'issued the member invitation',
 'proposal.share':'changed collaborator access to','proposal.unlock':'unlocked a section in','template.save':'saved the template','template.start':'started a draft from a template:', 'template.locks':'changed section locks in',
 'folder.save':'changed the shared resource folder','library.save':'saved the library item','catalog.save':'saved the catalog item','catalog.insert':'copied a catalog price into',
 'workspace.defaults':'changed workspace defaults for','approval.policy':'changed the approval policy for','approval.rule':'saved the approval rule','approval.rule.delete':'removed the approval rule',
 'pricing.cost':'saved private costing for','pricing.export':'downloaded private costing for','provider.connect':'verified the provider connection','provider.disconnect':'disconnected the provider',
 'payment.record':'recorded received money','payment.bind':'verified a Stripe deposit','payment.refund':'requested the deposit refund','dispute.import':'verified the Stripe dispute','dispute.submit':'submitted the available dispute evidence','dispute.evidence':'downloaded available dispute evidence for',

 'client.save': 'saved the client', 'client.erase': 'erased an unused client',
 'proposal.prepare': 'prepared', 'proposal.revise': 'saved a new revision of', 'proposal.restore': 'restored an earlier revision of',
 'proposal.approve': 'approved', 'proposal.send': 'sent', 'proposal.negotiate': 'prepared a negotiated revision of',
 'proposal.duplicate': 'duplicated', 'proposal.withdraw': 'withdrew', 'proposal.view': 'opened', 'proposal.preview': 'previewed the client page of',
 'proposal.pdf.download': 'downloaded the PDF of', 'proposal.accept': 'accepted', 'acceptance.upload': 'recorded the signed paper copy of',
 'code.request': 'asked for a verification code for', 'code.verify': 'verified their email for',
 'question.create': 'asked a question', 'question.answer': 'answered a client question', 'question.email': 'emailed an answer to a client question',
 'suggestions.allow': 'changed client suggestions on', 'suggestion.create': 'suggested a change to', 'suggestion.resolve': 'resolved a suggestion on',
 'invoice.export': 'exported the deposit invoice for', 'invoice.download': 'downloaded a deposit invoice',
 'expiry.set': 'set the expiry of', 'expiry.warning': 'warned that this offer expires soon:',
 'attachment.upload': 'attached a file to', 'attachment.download': 'downloaded an attachment', 'attachments.refresh': 'refreshed the attachments of',
 'vendor-document.save': 'saved a vendor document', 'pdf.downloads': 'changed PDF downloads for',
 'delivery.correct': 'corrected the client email for',
 'followup.schedule': 'scheduled a sales follow-up for', 'followup.complete': 'completed a sales follow-up for', 'followup.dismiss': 'dismissed a sales follow-up for', 'followup.notify': 'notified the sales owner of',
 'agent.create': 'created the agent key', 'agent.revoke': 'revoked the agent key', 'send-request.resolve': 'resolved an agent send request',
 'import.preview': 'previewed a client import', 'import.apply': 'applied a client import', 'import.journal': 'opened an import journal', 'import.undo': 'undid a client import',
 'business-import.preview': 'previewed a catalog and records import', 'business-import.apply': 'imported catalog and records',
 'report.time-zone': 'set the installation time zone', 'report.schedule': 'scheduled a pipeline report email', 'report.unschedule': 'stopped a pipeline report email', 'report.export': 'exported the pipeline report',
 'native.auth.bootstrap': 'claimed this installation', 'native.setup': 'finished first-run setup', 'native.auth.invite': 'invited',
 'native.auth.magic-link': 'asked for a sign-in link', 'native.auth.confirm': 'signed in', 'native.auth.signout': 'signed out',
 'native.auth.operator.role': 'changed the role of', 'native.auth.operator.status': 'changed the access of', 'native.auth.settings.identity': 'changed the sign-in settings',
}
const spoken = (action: string) => verbs[action] ?? (action.startsWith('mcp.') ? `used ${action.slice(4).replaceAll('_', ' ')} through the agent connection on` : action.replace(/^native\./, '').replace(/[._-]+/g, ' '))

function actor(row: any, names: AuditNames): string {
 const id = String(row.actor_id ?? '')
 if (id.startsWith('agent:')) return `<strong>${escape(names.keys.get(id.slice(6)) ?? 'An agent key')}</strong> (agent)`
 if (row.actor_role === 'client') return `<strong>${escape(names.clients.get(id) ?? 'The client')}</strong> (client)`
 if (row.actor_role === 'invitation') return '<strong>Someone with the client link</strong>'
 if (id === 'scheduler') return '<strong>Platter</strong>'
 if (row.actor_role === 'visitor') return '<strong>A visitor</strong>'
 return `<strong>${escape(names.people.get(id) ?? 'A person no longer in this installation')}</strong>`
}

function subject(row: any, names: AuditNames): string {
 const id = String(row.subject ?? '')
 const named = names.proposals.get(id) ?? names.clients.get(id) ?? names.keys.get(id) ?? names.people.get(id)
 return named ? ` <em class="audit-subject">${escape(named)}</em>` : ''
}

export function auditPage(rows: any[], query: URLSearchParams, names: AuditNames) {
 const filters = `<form method="get" action="/app/audit">${field('Search activity', 'q', query.get('q'))}${field('Actor ID', 'actor', query.get('actor'))}${field('Action', 'action', query.get('action'))}${field('Subject ID', 'subject', query.get('subject'))}<button>Search audit log</button></form>`
 const csv = '/api/platter/audit.csv?' + query.toString()
 const line = (row: any) => `<li class="audit-row"><article><h3 class="audit-key">${escape(row.action)}</h3><p class="audit-what">${actor(row, names)} ${escape(spoken(row.action))}${subject(row, names)}</p><p class="audit-when">${date(row.occurred_at)}</p>${row.reason ? `<p class="preserve">${escape(row.reason)}</p>` : ''}<p class="audit-ids wrap">${escape(row.actor_role)} ${escape(row.actor_id)} · ${escape(row.subject)}</p></article></li>`
 return panel('Search activity', '<p>Successful product actions recorded from this version onward. Times show in the installation time zone. Earlier activity has not been reconstructed. Search and the CSV use the ids under each line.</p>' + filters + `<p><a href="${escape(csv)}">Download audit CSV</a> · <a href="/app/audit">Clear search</a></p>`, 'audit-search')
  + panel('Recorded activity', rows.length ? `<ul class="records audit-log">${[...rows].reverse().map(line).join('')}</ul>` : '<p>No activity matches this search.</p>')
}
