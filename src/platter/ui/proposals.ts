import { area, date, empty, escape, field, form, hidden, money, panel, proposalPath } from './shared'

function editor(state: any, proposal?: any): string {
  const options = proposal?.options ?? []
  const clients = (state.clients ?? []).map((client: any) => `<option value="${escape(client.id)}"${client.id === proposal?.client_id ? ' selected' : ''}>${escape(client.name)} — ${escape(client.email)}</option>`).join('')
  const inputs = `<label>Client<select name="clientId" required><option value="">Choose a client</option>${clients}</select></label>`
    + field('Proposal title', 'title', proposal?.title, 'required maxlength="200"')
    + area('Scope of work', 'scope', proposal?.scope, 'required')
    + '<fieldset><legend>Option one</legend>' + field('Option label', 'optionOne', options[0]?.label, 'required')
    + field('Price in dollars', 'priceOne', options[0] ? (options[0].cents / 100).toFixed(2) : '', 'required inputmode="decimal" placeholder="0.00"') + '</fieldset>'
    + '<fieldset><legend>Option two</legend>' + field('Option label', 'optionTwo', options[1]?.label, 'required')
    + field('Price in dollars', 'priceTwo', options[1] ? (options[1].cents / 100).toFixed(2) : '', 'required inputmode="decimal" placeholder="0.00"') + '</fieldset>'
    + field('Deposit percentage', 'depositPercent', proposal ? Number(proposal.deposit_bps) / 100 : '', 'required inputmode="decimal" placeholder="25"')
  return form(proposal ? 'proposal.revise' : 'proposal.prepare', proposal ? proposalPath(proposal.id) : '/app',
    (proposal ? hidden('id', proposal.id) + hidden('version', proposal.version) : '') + inputs + `<button>${proposal ? 'Save revision' : 'Prepare proposal'}</button>`,
    proposal ? `proposal-${proposal.id}-${proposal.version}` : 'proposal-new')
}
export function proposalsPage(state: any): string {
  const proposals = state.proposals ?? []
  const list = proposals.length ? `<ul class="records">${proposals.map((p: any) => `<li><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a><span>${escape(p.clientName)} · <span class="status">${escape(p.status)}</span></span></li>`).join('')}</ul>` : empty('No proposals yet. Prepare your first proposal below.')
  const canPrepare = ['owner', 'member'].includes(state.actor?.role)
  return panel('Your proposals', list) + (canPrepare ? panel('Prepare a proposal', state.clients?.length ? editor(state) : '<p>Add a client before preparing a proposal.</p>' + (state.actor.role === 'owner' ? '<a href="/app/clients">Manage clients</a>' : '<p>Ask the owner to add a client.</p>')) : '')
}
export function proposalPage(state: any, id: string): string | null {
  const p = state.proposals?.find((item: any) => String(item.id) === id)
  if (!p) return null
  const path = proposalPath(p.id)
  const owner = state.actor?.role === 'owner'
  const frozen = p.status === 'sent' || p.status === 'accepted'
  const summary = `<p><span class="status">${escape(p.status)}</span> · Revision ${escape(p.revision)}</p><dl><dt>Client</dt><dd>${escape(p.clientName)} · ${escape(p.clientEmail)}</dd><dt>Prepared by</dt><dd>${escape(p.preparedByName || p.prepared_by)}</dd><dt>Approved by</dt><dd>${escape(p.approvedByName || p.approved_by || 'Awaiting approval')}</dd><dt>Approved at</dt><dd>${date(p.approved_at)}</dd></dl><h3>Scope of work</h3><p class="preserve">${escape(p.scope)}</p><h3>Offered prices</h3><p>All prices are GST-free in AUD.</p><ul class="records">${(p.options ?? []).map((option: any) => `<li><span>${escape(option.label)}</span><strong>${money(option.cents)}</strong></li>`).join('')}</ul><p>Deposit: ${escape(Number(p.deposit_bps) / 100)}% of the chosen option.</p>`
  let html = '<p><a href="/app">All proposals</a></p>' + panel(p.title, summary)
  if (!frozen && ['owner', 'member'].includes(state.actor?.role)) html += panel('Revise proposal', '<p>Saving a revision clears any previous approval. The owner must approve the revised offer before sending.</p>' + editor(state, p))
  if (owner && p.status === 'draft') html += panel('Approve offer', '<p>Confirm the scope and exact offered prices above before approving this revision.</p>' + form('proposal.approve', path, hidden('id', p.id) + hidden('version', p.version) + hidden('revision', p.revision) + '<button>Approve this revision</button>'))
  if (owner && p.status === 'approved') html += panel('Send to client', '<p>Sending freezes this offer. The client will verify their email before accepting one option.</p>' + form('proposal.send', path, hidden('id', p.id) + hidden('version', p.version) + '<button>Send approved proposal</button>'))
  if (frozen) html += panel('Shared offer', `<p class="status">${escape(({local:'Captured locally',pending:'Queued',sending:'Attempt in progress',accepted:'Accepted by provider',uncertain:'Status unknown'} as Record<string,string>)[p.delivery] || 'No delivery attempt recorded')}</p>` + '<p>This offer is frozen. Its scope, options, and prices can no longer be revised.</p>' + (owner && p.shareToken ? `<a href="/p/${encodeURIComponent(p.shareToken)}">Open client proposal</a>` : ''))
  if (owner && p.status === 'sent') html += panel('Send a fresh invitation', '<p>This replaces any previous client link and verification session while keeping the offer frozen.</p>' + form('proposal.send', path, hidden('id', p.id) + hidden('version', p.version) + '<button>Send fresh client link</button>'))
  if (p.acceptance) html += panel('Client acceptance', `<dl><dt>Accepted by</dt><dd>${escape(p.acceptance.name)} · ${escape(p.acceptance.email)}</dd><dt>Chosen option</dt><dd>${escape(p.options?.find((o: any) => o.id === p.acceptance.optionId)?.label)}</dd><dt>Total</dt><dd>${money(p.acceptance.totalCents)}</dd><dt>Deposit due</dt><dd>${money(p.acceptance.depositCents)}</dd><dt>Accepted at</dt><dd>${date(p.acceptance.acceptedAt)}</dd></dl><p>The accepted agreement is permanent.</p>`)
  if (owner && p.acceptance) html += panel('Invoice export', form('invoice.export', path, hidden('id', p.id) + '<button>Export invoice CSV</button>') + (p.invoice ? `<p>Invoice ${escape(p.invoice.number)} · Exported ${date(p.invoice.exported_at)}</p><a href="/api/platter/invoices/${encodeURIComponent(p.invoice.id)}.csv">Download deposit invoice CSV</a>` : ''))
  return html
}
