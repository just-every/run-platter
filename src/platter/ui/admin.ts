import { importJournal, importStatus } from './import-journal'
import { documentMoveinPage } from './document-movein'
import { businessImportPage } from './business-import'
import { area, date, empty, escape, field, form, hidden, ownerOnly, panel, proposalPath, statusPill, type Feedback } from './shared'

export function accessPage(state: any): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const keys = state.agentKeys ?? []
  const list = keys.length ? `<ul class="records">${keys.map((key: any) => `<li><div><strong>${escape(key.label)}</strong><p>Created ${date(key.createdAt)} · Expires ${date(key.expiresAt)}</p></div><div class="actions">${key.revokedAt ? `<span class="muted">Revoked ${date(key.revokedAt)}</span>` : statusPill('Active') + form('agent.revoke', '/app/access', hidden('id', key.id) + '<button class="secondary">Revoke key</button>')}</div></li>`).join('')}</ul>` : empty('No agent keys yet.')
  return panel('Create agent key', '<p><a href="/agents">Company policy, Pause and agent audit</a></p><p>Agent keys allow proposal preparation. Owner approval is required before an offer can be sent. Save the generated key securely; it is shown only once.</p>' + form('agent.create', '/app/access', field('Key label', 'label', '', 'required placeholder="Proposal assistant"') + '<button>Create key</button>', 'agent-new'), 'agent-key-form') + panel('Agent keys', list) + sendRequestPanel(state)
}
function reviewPreview(preview: any): string {
  const counts = preview.counts ?? {}
  const summary = `<dl>${[['Input rows', 'input'], ['Unique clients', 'unique'], ['Duplicates', 'duplicates'], ['Rejected rows', 'rejected'], ['Changes to apply', 'effects']].map(([label, key]) => `<dt>${label}</dt><dd>${escape(counts[key] ?? 0)}</dd>`).join('')}</dl>`
  const clients = preview.clients?.length ? `<h3>Reviewed clients</h3><ul class="records">${preview.clients.map((client: any) => `<li><span>${escape(client.name)}</span><span>${escape(client.email)}</span></li>`).join('')}</ul>` : ''
  const diagnostics = preview.diagnostics?.length ? `<h3>Review notes</h3><ul>${preview.diagnostics.map((note: any) => `<li>${escape(note.severity)}: ${escape(note.message)}</li>`).join('')}</ul>` : ''
  const conflicts = preview.conflicts?.length ? `<h3>Conflicts</h3><ul>${preview.conflicts.map((conflict: any) => `<li>${escape(conflict.message ?? 'This row conflicts with an existing client. Keep the existing client or remove the row, then preview again.')}</li>`).join('')}</ul>` : ''
  return summary + clients + diagnostics + conflicts
}
export function importPage(state: any, feedback?: Feedback): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const result = (feedback?.result?.businessInput||feedback?.result?.documentMovein)?undefined:feedback?.result
  const preview = result?.preview ?? result
  const fingerprint = preview?.fingerprint ?? result?.fingerprint
  const csv = result?.csv ?? preview?.csv
  let html = documentMoveinPage(state,feedback) + businessImportPage(state,feedback) + panel('Preview client CSV', '<p>Paste a CSV with client_id, name, and email columns. Review the preview before applying it.</p>' + form('import.preview', '/app/import', area('CSV content', 'csv', csv ?? '', 'required spellcheck="false"') + '<button>Preview import</button>', 'import-preview'))
  if (fingerprint && preview.counts) html += panel('Review import', reviewPreview(preview) + (typeof csv === 'string' && preview.canApply ? form('import.apply', '/app/import', hidden('csv', csv) + hidden('fingerprint', fingerprint) + '<p>Apply this exact reviewed CSV. Changes require a new preview.</p><button>Apply reviewed import</button>') : (preview.canApply ? '<p>Preview the CSV again to attach the reviewed source before applying.</p>' : '<p>Resolve the review notes and preview the corrected CSV before applying.</p>')))
  else if (result?.originals || result?.batches || result?.provenance) html += panel('Import journal', importJournal(result))
  else if (result?.job) html += panel('Import result', `<p>${escape(importStatus(result.job.state))}. ${escape(result.job.checkpoint ?? 0)} of ${escape(result.job.total ?? 0)} changes processed.</p>` + (typeof csv === 'string' && fingerprint && ['queued', 'applying', 'failed'].includes(result.job.state) ? form('import.apply', '/app/import', hidden('csv', csv) + hidden('fingerprint', fingerprint) + '<button>Resume reviewed import</button>') : ''))
  const jobs = state.importJobs ?? []
  html += panel('Import history', jobs.length ? `<ul class="records">${jobs.map((job: any, index: number) => `<li><div><strong>Import ${index + 1}</strong><p>${escape(importStatus(job.state ?? job.status))} · ${escape(job.checkpoint ?? 0)} of ${escape(job.total ?? 0)} changes</p></div><div class="actions">${form('import.journal', '/app/import', hidden('id', job.id) + '<button class="secondary">View journal</button>')}${job.undoneAt || job.undone_at || job.state === 'undone' || job.status === 'undone' ? '<span>Undone</span>' : (['completed', 'undoing'].includes(job.state) ? form('import.undo', '/app/import', hidden('id', job.id) + `<button class="secondary">${job.state === 'undoing' ? 'Continue undo' : 'Undo import'}</button>`) : '')}</div></li>`).join('')}</ul>` : empty('No imports have been applied.'))
  return html
}

export function sendRequestPanel(state: any): string {
 const requests = state.sendRequests ?? []
 return panel('Agent send requests', '<p>Requests are for owner review. They do not approve a revision or send an invitation.</p>' + (requests.length ? `<ul class="records">${requests.map((request: any) => `<li><article><h3><a href="${escape(proposalPath(request.proposal_id))}">${escape(request.title)}</a></h3><p>Revision ${escape(request.revision)} · ${date(request.requested_at)} · ${escape(request.status)}</p><p>Requested by ${escape(request.prepared_by ?? (state.agentKeys ?? []).find((key: any) => key.id === request.agent_key_id)?.label ?? 'an agent whose access is no longer available')}</p>${request.status === 'pending' ? `<p>${request.actionable ? 'Ready for review: open the proposal to approve and send.' : request.revision !== request.current_revision ? 'Stale request: the proposal revision has changed.' : 'The proposal is no longer awaiting sending.'}</p>` + form('send-request.resolve', '/app/access', hidden('id', request.id) + hidden('status', 'dismissed') + '<button class="secondary">Dismiss request</button>') + (request.revision === request.current_revision && ['sent', 'accepted'].includes(request.proposal_status) ? form('send-request.resolve', '/app/access', hidden('id', request.id) + hidden('status', 'fulfilled') + '<button>Mark request fulfilled</button>') : '') : ''}</article></li>`).join('')}</ul>` : '<p>No send requests yet.</p>'))
}
