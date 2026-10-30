import { date, empty, escape, field, form, hidden, money, ownerOnly, panel, proposalPath, statusPill, type Feedback } from './shared'

// The client cards (owner pick A's dense, cared-for screen): each client's proposals, the value still open and
// the last thing that happened. Erase sits behind a quiet disclosure, offered only where client.erase can succeed.
const open = ['draft', 'approved', 'sent']
const shown = (cents: number, currency: string) => money(cents, currency === 'AUD' ? currency : undefined)

function lastActivity(state: any, proposals: any[]): [number, string] | undefined {
  const events: [number, string][] = []
  for (const p of proposals) {
    for (const r of state.revisions ?? []) if (r.proposal_id === p.id && r.prepared_at) events.push([Number(r.prepared_at), `revision ${r.revision} prepared`])
    if (p.approved_at) events.push([Number(p.approved_at), 'approved'])
    if (p.acceptance?.acceptedAt) events.push([Number(p.acceptance.acceptedAt), 'accepted'])
    if (p.invoice?.exported_at) events.push([Number(p.invoice.exported_at), 'deposit exported'])
  }
  return events.sort((a, b) => b[0] - a[0])[0]
}

function card(state: any, client: any, feedback?: Feedback): string {
  const proposals = (state.proposals ?? []).filter((p: any) => p.client_id === client.id)
  const value = new Map<string, number>()
  for (const p of proposals) if (open.includes(p.status)) value.set(p.currency ?? 'USD', (value.get(p.currency ?? 'USD') ?? 0) + Math.max(0, ...(p.options ?? []).map((o: any) => Number(o.cents))))
  const last = lastActivity(state, proposals)
  const erased = (state.privacy?.erasedClientIds ?? []).includes(client.id)
  const reply = feedback?.result
  const review = reply?.id === client.id ? reply.privacyReview : undefined
  const receipts = (state.privacy?.receipts ?? []).filter((r: any) => r.clientId === client.id)
  const erasable = !proposals.length && !(state.importedClients ?? []).includes(client.id)
  const facts = `<dl class="client-facts"><dt>Proposals</dt><dd>${proposals.length}</dd><dt>Open value</dt><dd>${value.size ? [...value].map(([currency, cents]) => shown(cents, currency)).join(' · ') : '—'}</dd><dt>Last activity</dt><dd>${last ? `${date(last[0])} · ${escape(last[1])}` : 'No proposals yet'}</dd></dl>`
  const list = proposals.length ? `<ul class="client-proposals">${proposals.slice(0, 4).map((p: any) => `<li><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a>${statusPill(p.status)}</li>`).join('')}${proposals.length > 4 ? `<li class="muted">${proposals.length - 4} more</li>` : ''}</ul>` : ''
  const erase = erasable ? `<details class="quiet-disclosure"><summary>Erase this client</summary>${form('client.erase', '/app/clients', hidden('id', client.id) + `<p>This client has no proposal or import history, so it can be erased. Type <strong>${escape(client.name)}</strong> to confirm.</p>` + field('Confirm client name', 'confirmName', '', 'required autocomplete="off"') + '<button class="danger">Erase unused client</button>')}</details>` : ''
  const privacy = erased ? receipts.map((r: any) => receiptPanel(r)).join('') : `<details class="quiet-disclosure"${review ? ' open' : ''}><summary>Review privacy erasure</summary><p>Review native contact details, draft discussions and engagement before erasing. Retained agreements and their original files keep a business-record exception. Holds prevent erasure.</p>${form('privacy.review', '/app/clients', hidden('id',client.id)+'<button class="secondary">Review erasure inventory</button>')}${review ? `<h3>Reviewed erasure inventory</h3><p>${review.eraseProposalIds.length} unretained proposals will be erased. Live client links and pending outbound work will be cancelled. Older archive checkpoints will be invalidated.</p><p>Draft revisions, questions, answers, internal discussions, engagement and copied source details are included in this review.</p>${review.retained.map((r:any)=>`<p>${escape(r.proposalId)}: ${escape(r.exception)}</p>`).join('')}${review.externalRecords.map((r:any)=>`<p>${escape(r.provider)} · ${escape(r.accountId)} · ${escape(r.recordId)}: ${escape(r.action)}</p>`).join('')}${form('privacy.erase','/app/clients',hidden('id',client.id)+hidden('reviewId',review.reviewId)+hidden('digest',review.digest)+field('Confirm client name for privacy erasure','confirmName','','required autocomplete="off"')+'<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>I authorize this reviewed erasure and the retained business-record exceptions.</span></label><button class="danger">Erase reviewed personal data</button>')}` : ''}</details>`
  return panel(client.name, `<p class="client-email">${escape(client.email)}</p>` + facts + list + (erased?'':erase) + privacy, 'client-card')
}

export function clientsPage(state: any, feedback?: Feedback): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const clients = state.clients ?? []
  const add = panel('Add a client', form('client.save', '/app/clients', field('Client name', 'name', '', 'required autocomplete="organization"') + field('Client email', 'email', '', 'type="email" required autocomplete="email"') + field('Contact name (optional)','contactName','')+field('Contact title (optional)','title','')+field('Postal address (optional)','address','')+ '<button>Add client</button>', 'client-new'), 'slim-form')
  return add + (clients.length ? `<div class="client-grid">${clients.map((client: any) => card(state, client, feedback)).join('')}</div>` : empty('No clients have been added.'))
}

function receiptPanel(receipt: any): string {
 return `<div class="privacy-receipt"><h3>Erasure receipt</h3><p class="wrap">Receipt ${escape(receipt.id)} · ${date(receipt.erasedAt)}</p><p>Native personal data erased. Client links and pending outbound work cancelled. Older archive checkpoints invalidated.</p>${receipt.retained.map((r:any)=>`<p><a href="${escape(proposalPath(r.proposalId))}">Retained agreement</a>: ${escape(r.exception)}</p>`).join('')}${[...receipt.externalRecords,...receipt.fileStoreRecords].map((r:any)=>`<p class="wrap">${escape(r.provider)} · ${escape(r.accountId)} · ${escape(r.recordId)}: ${escape(r.action)}</p>`).join('')}</div>`
}
export function privacyRetentionNote(state:any,id:string):string {
 const receipt=(state.privacy?.receipts??[]).find((r:any)=>r.retained.some((a:any)=>a.proposalId===id))
 return receipt ? panel('Business-record retention exception',receiptPanel(receipt)) : ''
}
export function privacyHoldSettings(state:any):string {
 if(state.actor?.role!=='owner')return ''
 const clients=(state.clients??[]).filter((c:any)=>!(state.privacy?.erasedClientIds??[]).includes(c.id))
 const choose=clients.length?form('privacy.hold','/app/settings','<label>Client for retention hold<select name="id" aria-label="Client for retention hold">'+clients.map((c:any)=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')+'</select></label><label>Hold kind<select name="kind" aria-label="Hold kind"><option value="retention">Retention</option><option value="legal">Legal</option></select></label>'+hidden('held','yes')+field('Contact hold reason','reason','','required maxlength="500"')+'<button>Hold contact data</button>'):''
 const holds=(state.privacy?.holds??[]).map((h:any)=>`<li>${escape(state.clients.find((c:any)=>c.id===h.client_id)?.name)} · ${escape(h.kind)} · ${escape(h.reason)}${form('privacy.hold','/app/settings',hidden('id',h.client_id)+hidden('kind',h.kind)+hidden('held','no')+'<button class="secondary">Release contact hold</button>')}</li>`).join('')
 return panel('Contact retention holds','<p>Retention and legal holds stop contact erasure and engagement purging until explicitly released by the owner.</p>'+choose+(holds?'<ul>'+holds+'</ul>':''))
}
