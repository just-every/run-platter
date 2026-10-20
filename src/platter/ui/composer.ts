import { catalogShelf } from './catalog-shelf'
import { area, date, escape, field, form, hidden, money, proposalPath } from './shared'

// The tier composer (owner pick A): the offer's two priced options as live columns beside the scope they share,
// the proposal's details under them, and a receipt that sums what the client will choose between.
export type ComposerMode = 'prepare' | 'revise' | 'negotiate'

const dollars = (option: any) => option ? (option.cents / 100).toFixed(2) : ''
const depositOf = (option: any, bps: number, currency?: string) => option ? money(Math.round(option.cents * bps / 10000), currency === 'AUD' ? currency : undefined) : '—'

function tier(n: 'One' | 'Two', option: any, currency: string, bps: number | undefined, raised: boolean): string {
  const label = n === 'One' ? 'Option one' : 'Option two'
  const deposit = option && bps !== undefined ? Math.round(option.cents * bps / 10000) : undefined
  const shown = (cents?: number) => cents === undefined ? '—' : money(cents, currency === 'AUD' ? currency : undefined)
  return `<fieldset class="tier${raised ? ' raised' : ''}" data-tier="${n.toLowerCase()}"><legend>${label}</legend>`
    + `<label class="tier-name">Option label<input name="option${n}" value="${escape(option?.label)}" required maxlength="200" autocomplete="off"></label>`
    + `<label class="tier-price">Price in ${escape(currency)}<span class="money-field"><span aria-hidden="true">$</span><input name="price${n}" value="${dollars(option)}" required inputmode="decimal" placeholder="0.00" autocomplete="off"></span></label>`
    + `<dl class="tier-lines" data-lines-for="price${n}"><dt>Deposit at acceptance</dt><dd data-line="deposit">${shown(deposit)}</dd><dt>Balance after the deposit</dt><dd data-line="balance">${shown(deposit === undefined ? undefined : option.cents - deposit)}</dd></dl>`
    + `<p class="chip sage tier-deposit"><span class="tick" aria-hidden="true"></span><span><output data-line="percent">${bps === undefined ? '—' : escape(bps / 100)}</output>% deposit</span></p></fieldset>`
}

export function composerForm(state: any, proposal: any, mode: ComposerMode, id: string, inlineButton?: string): string {
  const options = proposal?.options ?? []
  const currency = proposal?.currency ?? 'USD'
  const bps = proposal ? Number(proposal.deposit_bps) : undefined
  const clients = (state.clients ?? []).map((client: any) => `<option value="${escape(client.id)}"${client.id === proposal?.client_id ? ' selected' : ''}>${escape(client.name)} — ${escape(client.email)}</option>`).join('')
  const tiers = `<div class="tiers">${tier('One', options[0], currency, bps, false)}${tier('Two', options[1], currency, bps, true)}`
    + `<div class="tier scope-tier">${area('Scope of work', 'scope', proposal?.scope, 'required rows="6"')}${area('Terms', 'terms', proposal?.terms ?? '', 'rows="2"')}</div></div>`
  const details = `<div class="details-row"><label>Client<select name="clientId" required><option value="">Choose a client</option>${clients}</select></label>`
    + field('Proposal title', 'title', proposal?.title, 'required maxlength="200"')
    + field('Deposit percentage', 'depositPercent', proposal ? Number(proposal.deposit_bps) / 100 : '', 'required inputmode="decimal" placeholder="25"') + '</div>'
  const command = mode === 'negotiate' ? 'proposal.negotiate' : mode === 'revise' ? 'proposal.revise' : 'proposal.prepare'
  const body = (proposal ? hidden('id', proposal.id) + hidden('version', proposal.version) : '') + tiers + `<h2 class="shelf-title">Details</h2>` + details + (inlineButton ? `<div class="composer-actions"><button>${inlineButton}</button></div>` : '')
  return form(command, proposal ? proposalPath(proposal.id) : '/app', body, proposal ? `proposal-${proposal.id}-${proposal.version}` : 'proposal-new')
    .replace('<form ', `<form id="${escape(id)}" class="composer" `)
}

/** What the client chooses between, priced the way acceptance prices it. */
export function receiptSum(options: any[], bps: number, currency: string, chosen?: string): string {
  const named = options.map((o: any) => `<span class="${o.id === chosen ? 'picked' : ''}"><strong class="serif">${escape(o.label)}</strong> <span data-sum-price="${escape(o.id)}">${money(o.cents, currency === 'AUD' ? currency : undefined)}</span></span>`).join(' <span class="muted">or</span> ')
  const deposits = options.map((o: any) => `<span data-sum-deposit="${escape(o.id)}">${depositOf(o, bps, currency)}</span>`).join(' or ')
  return `<p class="receipt-sum">${named} <span class="sep">·</span> <span data-sum-percent>${escape(bps / 100)}</span>% deposit ${deposits} <span class="sep">·</span> <span class="muted">${currency === 'AUD' ? 'GST-free in AUD' : 'USD · sales tax not calculated'}</span></p>`
}

export function receipt(sum: string, actions: string, note = ''): string {
  return `<section class="receipt" aria-label="Offer summary">${sum}${note ? `<p class="receipt-note">${note}</p>` : ''}<div class="receipt-actions">${actions}</div></section>`
}

/** Who prepared the current revision, beside the small mark when it was the agent. */
export function preparedLine(state: any, p: any): string {
  const revision = (state.revisions ?? []).find((r: any) => r.proposal_id === p.id && r.revision === p.revision)
  const by = String(p.prepared_by ?? '')
  const key = by.startsWith('agent:') ? (state.agentKeys ?? []).find((k: any) => `agent:${k.id}` === by) : undefined
  const agent = by.startsWith('agent:') || p.preparedByName === 'Agent'
  const person = (state.reportPeople ?? []).find((x: any) => x.email === (p.preparedByName || by))?.name
  const who = agent ? `<strong>${escape(key?.label ?? 'Agent')}</strong> (agent)` : `<strong>${escape(person || p.preparedByName || by)}</strong>`
  const next = p.status === 'draft' ? (agent ? ' · a person approves before it is sent' : ' · awaiting approval') : ''
  return `<p class="agent-line">${agent ? '<img src="/brand/mark-32.svg" width="26" height="26" alt="">' : '<span class="person-dot" aria-hidden="true"></span>'}<span>${who} prepared revision ${escape(p.revision)}${revision ? ` · ${date(revision.prepared_at)}` : ''}${next}</span></p>`
}

export function composerShelf(state: any): string {
  return state.actor?.role === 'owner' ? catalogShelf(state.businessRecords?.catalog ?? []) : ''
}
