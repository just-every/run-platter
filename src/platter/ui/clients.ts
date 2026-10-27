import { date, empty, escape, field, form, hidden, money, ownerOnly, panel, proposalPath, statusPill } from './shared'

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

function card(state: any, client: any): string {
  const proposals = (state.proposals ?? []).filter((p: any) => p.client_id === client.id)
  const value = new Map<string, number>()
  for (const p of proposals) if (open.includes(p.status)) value.set(p.currency ?? 'USD', (value.get(p.currency ?? 'USD') ?? 0) + Math.max(0, ...(p.options ?? []).map((o: any) => Number(o.cents))))
  const last = lastActivity(state, proposals)
  const erasable = !proposals.length && !(state.importedClients ?? []).includes(client.id)
  const facts = `<dl class="client-facts"><dt>Proposals</dt><dd>${proposals.length}</dd><dt>Open value</dt><dd>${value.size ? [...value].map(([currency, cents]) => shown(cents, currency)).join(' · ') : '—'}</dd><dt>Last activity</dt><dd>${last ? `${date(last[0])} · ${escape(last[1])}` : 'No proposals yet'}</dd></dl>`
  const list = proposals.length ? `<ul class="client-proposals">${proposals.slice(0, 4).map((p: any) => `<li><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a>${statusPill(p.status)}</li>`).join('')}${proposals.length > 4 ? `<li class="muted">${proposals.length - 4} more</li>` : ''}</ul>` : ''
  const erase = erasable ? `<details class="quiet-disclosure"><summary>Erase this client</summary>${form('client.erase', '/app/clients', hidden('id', client.id) + `<p>This client has no proposal or import history, so it can be erased. Type <strong>${escape(client.name)}</strong> to confirm.</p>` + field('Confirm client name', 'confirmName', '', 'required autocomplete="off"') + '<button class="danger">Erase unused client</button>')}</details>` : ''
  return panel(client.name, `<p class="client-email">${escape(client.email)} · ${escape(client.segment)}</p>` + facts + list + erase, 'client-card')
}

export function clientsPage(state: any): string {
  if (state.actor?.role !== 'owner') return ownerOnly()
  const clients = state.clients ?? []
  const add = panel('Add a client', form('client.save', '/app/clients', field('Client name', 'name', '', 'required autocomplete="organization"') + field('Client email', 'email', '', 'type="email" required autocomplete="email"') + field('Client segment', 'segment', '', 'maxlength="100" placeholder="e.g. Small business"') + '<button>Add client</button>', 'client-new'), 'slim-form')
  return add + (clients.length ? `<div class="client-grid">${clients.map((client: any) => card(state, client)).join('')}</div>` : empty('No clients have been added.'))
}
