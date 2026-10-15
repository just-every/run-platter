import { area, date, empty, escape, field, form, hidden, ownerOnly, panel, type Feedback } from './shared'

export function clientsPage(state: any): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const clients = state.clients ?? []
  const list = clients.length ? clients.map((client: any) => panel(client.name, `<p>${escape(client.email)}</p>` + form('client.erase', '/app/clients', hidden('id', client.id) + `<p>Only clients without proposal or import history can be erased. Type <strong>${escape(client.name)}</strong> to confirm.</p>` + field('Confirm client name', 'confirmName', '', 'required autocomplete="off"') + '<button class="danger">Erase unused client</button>'))).join('') : empty('No clients have been added.')
  return panel('Add a client', form('client.save', '/app/clients', field('Client name', 'name', '', 'required autocomplete="organization"') + field('Client email', 'email', '', 'type="email" required autocomplete="email"') + '<button>Add client</button>', 'client-new')) + list
}
export function accessPage(state: any): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const keys = state.agentKeys ?? []
  const list = keys.length ? `<ul class="records">${keys.map((key: any) => `<li><div><strong>${escape(key.label)}</strong><p>Created ${date(key.createdAt)} · Expires ${date(key.expiresAt)}</p><p>${key.revokedAt ? `Revoked ${date(key.revokedAt)}` : 'Active'}</p></div>${key.revokedAt ? '' : form('agent.revoke', '/app/access', hidden('id', key.id) + '<button class="secondary">Revoke key</button>')}</li>`).join('')}</ul>` : empty('No agent keys yet.')
  return panel('Create agent key', '<p>Agent keys allow proposal preparation. Owner approval is required before an offer can be sent. Save the generated key securely; it is shown only once.</p>' + form('agent.create', '/app/access', field('Key label', 'label', '', 'required placeholder="Proposal assistant"') + '<button>Create key</button>', 'agent-new')) + panel('Agent keys', list)
}
function journalResult(result: any): string {
  return `<pre class="json" tabindex="0" aria-label="Import journal">${escape(JSON.stringify(result, null, 2))}</pre>`
}
function reviewPreview(preview: any): string {
  const counts = preview.counts ?? {}
  const summary = `<dl>${[['Input rows', 'input'], ['Unique clients', 'unique'], ['Duplicates', 'duplicates'], ['Rejected rows', 'rejected'], ['Changes to apply', 'effects']].map(([label, key]) => `<dt>${label}</dt><dd>${escape(counts[key] ?? 0)}</dd>`).join('')}</dl>`
  const clients = preview.clients?.length ? `<h3>Reviewed clients</h3><ul class="records">${preview.clients.map((client: any) => `<li><span>${escape(client.name)}</span><span>${escape(client.email)}</span></li>`).join('')}</ul>` : ''
  const diagnostics = preview.diagnostics?.length ? `<h3>Review notes</h3><ul>${preview.diagnostics.map((note: any) => `<li>${escape(note.severity)}: ${escape(note.message)}</li>`).join('')}</ul>` : ''
  const conflicts = preview.conflicts?.length ? `<h3>Conflicts</h3><ul>${preview.conflicts.map((conflict: any) => `<li>${escape(conflict.reason)}</li>`).join('')}</ul>` : ''
  return summary + clients + diagnostics + conflicts
}
export function importPage(state: any, feedback?: Feedback): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const result = feedback?.result
  const preview = result?.preview ?? result
  const fingerprint = preview?.fingerprint ?? result?.fingerprint
  const csv = result?.csv ?? preview?.csv
  let html = panel('Preview client CSV', '<p>Paste a CSV with client_id, name, and email columns. Review the preview before applying it.</p>' + form('import.preview', '/app/import', area('CSV content', 'csv', csv ?? '', 'required spellcheck="false"') + '<button>Preview import</button>', 'import-preview'))
  if (fingerprint && preview.counts) html += panel('Review import', reviewPreview(preview) + (typeof csv === 'string' && preview.canApply ? form('import.apply', '/app/import', hidden('csv', csv) + hidden('fingerprint', fingerprint) + '<p>Apply this exact reviewed CSV. Changes require a new preview.</p><button>Apply reviewed import</button>') : (preview.canApply ? '<p>Preview the CSV again to attach the reviewed source before applying.</p>' : '<p>Resolve the review notes and preview the corrected CSV before applying.</p>')))
  else if (result?.originals || result?.batches || result?.provenance) html += panel('Import journal', journalResult(result))
  else if (result?.job) html += panel('Import result', `<p>Import ${escape(result.job.state)}. ${escape(result.job.checkpoint ?? 0)} of ${escape(result.job.total ?? 0)} changes processed.</p>` + (typeof csv === 'string' && fingerprint && ['queued', 'applying', 'failed'].includes(result.job.state) ? form('import.apply', '/app/import', hidden('csv', csv) + hidden('fingerprint', fingerprint) + '<button>Resume reviewed import</button>') : ''))
  const jobs = state.importJobs ?? []
  html += panel('Import history', jobs.length ? `<ul class="records">${jobs.map((job: any, index: number) => `<li><div><strong>Import ${index + 1}</strong><p>${escape(job.state ?? job.status)} · ${escape(job.checkpoint ?? 0)} of ${escape(job.total ?? 0)} changes</p></div><div class="actions">${form('import.journal', '/app/import', hidden('id', job.id) + '<button class="secondary">View journal</button>')}${job.undoneAt || job.undone_at || job.state === 'undone' || job.status === 'undone' ? '<span>Undone</span>' : (['completed', 'undoing'].includes(job.state) ? form('import.undo', '/app/import', hidden('id', job.id) + `<button class="secondary">${job.state === 'undoing' ? 'Continue undo' : 'Undo import'}</button>`) : '')}</div></li>`).join('')}</ul>` : empty('No imports have been applied.'))
  return html
}
