import { catalogShelf } from './catalog-shelf'
import { pricingEditor } from './pricing'
import { sectionConditions } from '../conditional'
import { area, date, escape, field, form, hidden, money, proposalPath, type Feedback } from './shared'

// The tier composer (owner pick A): the offer's two priced options as live columns beside the scope they share,
// the proposal's details under them, and a receipt that sums what the client will choose between.
export type ComposerMode = 'prepare' | 'revise' | 'negotiate'

const dollars = (option: any) => option ? (option.cents / 100).toFixed(2) : ''
const depositOf = (option: any, bps: number, currency?: string) => option ? money(Math.round(option.cents * bps / 10000), currency === 'AUD' ? currency : undefined) : '—'

// The tier figure is set as text over its field ("$4,200.00"); focusing the field shows the editable value.
const figure = (option: any) => option ? money(option.cents) : ''

function tier(n: 'One' | 'Two', option: any, currency: string, bps: number | undefined, raised: boolean, formId: string): string {
  const label = n === 'One' ? 'Option one' : 'Option two'
  const deposit = option && bps !== undefined ? Math.round(option.cents * bps / 10000) : undefined
  const shown = (cents?: number) => cents === undefined ? '—' : money(cents, currency === 'AUD' ? currency : undefined)
  return `<fieldset class="tier${raised ? ' raised' : ''}" data-tier="${n.toLowerCase()}"><legend>${label}</legend>`
    + `<label class="tier-name">Option label<input name="option${n}" value="${escape(option?.label)}" required maxlength="200" autocomplete="off"></label>`
    + `<label class="tier-price">Price in ${escape(currency)}<span class="money-field"><span class="money-sign" aria-hidden="true">$</span><input id="${escape(formId)}-price${n}" name="price${n}" value="${dollars(option)}" required inputmode="decimal" placeholder="0.00" autocomplete="off"><span class="money-figure" aria-hidden="true" data-figure-for="price${n}">${figure(option)}</span></span></label>`
    + `<dl class="tier-lines" data-lines-for="price${n}"><dt>Deposit at acceptance</dt><dd data-line="deposit">${shown(deposit)}</dd><dt>Balance after the deposit</dt><dd data-line="balance">${shown(deposit === undefined ? undefined : option.cents - deposit)}</dd></dl>`
    + `<p class="chip sage tier-deposit"><span class="tick" aria-hidden="true"></span><span><output data-line="percent">${bps === undefined ? '—' : escape(bps / 100)}</output>% deposit</span></p></fieldset>`
}

export function composerForm(state: any, proposal: any, mode: ComposerMode, id: string, inlineButton?: string): string {
  const options = proposal?.options ?? []
  const currency = proposal?.currency ?? 'USD'
  const bps = proposal ? Number(proposal.deposit_bps) : undefined
  // The option names the client; its email shows under the field so nothing is cut at the chevron.
  const list = state.clients ?? [], shared = (name: string) => list.filter((c: any) => c.name === name).length > 1
  const clients = list.map((client: any) => `<option value="${escape(client.id)}" data-email="${escape(client.email)}"${client.id === proposal?.client_id ? ' selected' : ''}>${escape(client.name)}${shared(client.name) ? ` — ${escape(client.email)}` : ''}</option>`).join('')
  const chosen = list.find((c: any) => c.id === proposal?.client_id)
  const conditions = sectionConditions(proposal?.section_conditions)
  const visibility = (section: 'scope' | 'terms') => `<label class="visibility">${section === 'scope' ? 'Scope' : 'Terms'} visibility<select name="${section}Option"><option value="">Every option</option>${['one', 'two'].map((id, i) => `<option value="${id}"${conditions[section] === id ? ' selected' : ''}>Only ${escape(options[i]?.label ?? ('option ' + id))}</option>`).join('')}</select></label>`
  const tiers = `<div class="tiers">${tier('One', options[0], currency, bps, false, id)}${tier('Two', options[1], currency, bps, true, id)}`
    + `<div class="tier scope-tier">${area('Scope of work', 'scope', proposal?.scope, 'required rows="5"')}${area('Terms', 'terms', proposal?.terms ?? '', 'rows="2"')}<div class="visibility-row">${visibility('scope')}${visibility('terms')}</div></div></div>`
  const details = `<div class="details-row"><label>Client<select name="clientId" required><option value="">Choose a client</option>${clients}</select><span class="field-note" data-client-email>${escape(chosen?.email ?? '')}</span></label>`
    + field('Proposal title', 'title', proposal?.title, 'required maxlength="200"')
    + field('Deposit percentage', 'depositPercent', proposal ? Number(proposal.deposit_bps) / 100 : '', 'required inputmode="decimal" placeholder="25"') + '</div>'
  const command = mode === 'negotiate' ? 'proposal.negotiate' : mode === 'revise' ? 'proposal.revise' : 'proposal.prepare'
  const body = (proposal ? hidden('id', proposal.id) + hidden('version', proposal.version) : '') + tiers + `<h2 class="shelf-title">Details</h2>` + details + (currency === 'USD' ? `<div class="itemised">${pricingEditor(options)}</div>` : '') + (inlineButton ? `<div class="composer-actions"><button>${inlineButton}</button></div>` : '')
  return form(command, proposal ? proposalPath(proposal.id) : '/app', body, proposal ? `proposal-${proposal.id}-${proposal.version}` : 'proposal-new')
    .replace('<form ', `<form id="${escape(id)}" class="composer" `)
}

/** What the client chooses between, priced the way acceptance prices it. */
export function receiptSum(options: any[], bps: number, currency: string, chosen?: string): string {
  const named = options.map((o: any) => `<span class="${o.id === chosen ? 'picked' : ''}"><strong class="serif">${escape(o.label)}</strong> <span data-sum-price="${escape(o.id)}">${money(o.cents, currency === 'AUD' ? currency : undefined)}</span></span>`).join(' <span class="muted">or</span> ')
  const deposits = options.map((o: any) => `<span data-sum-deposit="${escape(o.id)}">${depositOf(o, bps, currency)}</span>`).join(' or ')
  return `<p class="receipt-sum">${named} <span class="sep">·</span> <span data-sum-percent>${escape(bps / 100)}</span>% deposit ${deposits}<span class="currency-note"> <span class="sep">·</span> <span class="muted">${currency === 'AUD' ? 'GST-free in AUD' : 'USD · sales tax not calculated'}</span></span></p>`
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

const priceRule = 'Prices are US dollars with up to two decimals, such as 4,200.00.'
/** A typed price read the way a US firm writes it, rounded to cents: the fix the band offers, when there is one. */
function readable(value: string): number | undefined {
  const plain = value.trim().replace(/^\$\s*/, '')
  const digits = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(plain) ? plain.replaceAll(',', '') : plain
  if (!/^\d+(\.\d+)?$/.test(digits)) return undefined
  const cents = Math.round(Number(digits) * 100)
  return cents > 0 && cents <= 1_000_000_000 ? cents : undefined
}

/** The exception band in place (owner pick A): it names the field and the value, says what happened, and offers the fix. */
export function exceptionBand(state: any, p: any, feedback: Feedback | undefined, formId: string): string | undefined {
  if (!feedback?.error) return undefined
  const input = feedback.input ?? {}
  const price = /^price(One|Two)$/.exec(feedback.field ?? '')
  if (price) {
    const n = price[1] as 'One' | 'Two', typed = String(input['price' + n] ?? ''), label = String(input['option' + n] ?? '').trim() || (n === 'One' ? 'Option one' : 'Option two')
    const cents = readable(typed), target = `${formId}-price${n}`
    const fix = cents === undefined
      ? `<button type="button" class="secondary" data-fix-field="${escape(target)}" hidden>Edit the ${escape(label)} price</button>`
      : `<button type="button" data-fix-field="${escape(target)}" data-fix-value="${(cents / 100).toFixed(2)}" hidden>Use ${money(cents)}</button>`
    return `<div class="band error" role="alert" data-refused="price${n}"><p><strong>${escape(label)} · price ${escape(typed || '(empty)')} is not a price Platter can read.</strong> Nothing was saved${p ? `; revision ${escape(p.revision)} stays as it was` : ''}. ${priceRule}</p><div class="band-actions">${fix}</div></div>`
  }
  // A save from this composer that lost to a newer version; other refusals keep their own notice.
  if (feedback.status === 409 && p && ['proposal.revise', 'proposal.negotiate'].includes(feedback.command ?? '')) {
    return `<div class="band error" role="alert" data-refused="conflict"><p><strong>This proposal changed while you were editing.</strong> It is now revision ${escape(p.revision)}, ${escape(p.status)}; your changes were not saved.</p><div class="band-actions"><a class="button-link" href="${escape(proposalPath(p.id))}">Reload revision ${escape(p.revision)}</a></div></div>`
  }
  return undefined
}
