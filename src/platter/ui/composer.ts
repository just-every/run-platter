import { catalogShelf } from './catalog-shelf'
import { editablePackages } from '../pricing'
import { optionalEditor } from './packages'
import { pricingEditor } from './pricing'
import { sectionConditions } from '../conditional'
import { area, date, escape, field, form, hidden, money, proposalPath, type Feedback } from './shared'

// The tier composer (owner pick A): the offer's priced packages as live columns beside the scope they share,
// the proposal's details under them, and a receipt that sums what the client will choose between.
export type ComposerMode = 'prepare' | 'revise' | 'negotiate'

const depositOf = (option: any, bps: number, currency?: string) => option ? money(Math.round(option.cents * bps / 10000), currency === 'AUD' ? currency : undefined) : '—'

// The tier figure is set as text over its field ("$4,200.00"); focusing the field shows the editable value.
const figure = (option: any) => option?.cents ? money(option.cents) : ''
const ordinal = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

/** One priced column. With packages (USD) it is also a package: its own optional items and package actions. */
function tier(option: any, index: number, currency: string, bps: number | undefined, raised: boolean, formId: string, packages: boolean): string {
  const id = option?.id ?? '', suffix = id === 'one' ? 'One' : id === 'two' ? 'Two' : ''
  const legend = index < 0 ? 'New package' : `Option ${ordinal[index] ?? index + 1}`
  const deposit = option?.cents && bps !== undefined ? Math.round(option.cents * bps / 10000) : undefined
  const shown = (cents?: number) => cents === undefined ? '—' : money(cents, currency === 'AUD' ? currency : undefined)
  const named = (field: string) => `${suffix ? ` name="${field}${suffix}"` : ''}${packages ? ` data-package-field="${field === 'option' ? 'label' : 'price'}"` : ''}`
  const extras = packages ? `<div class="tier-extras" data-optional-items>${(option?.optionalItems ?? []).map(optionalEditor).join('')}</div><div class="tier-actions"><button type="button" class="quiet" data-package-action="add-item">Add optional item</button><button type="button" class="quiet" data-package-action="remove-package">Remove package</button></div>` : ''
  return `<fieldset class="tier${raised ? ' raised' : ''}" data-tier="${escape(id)}"${packages ? ` data-package-id="${escape(id)}"` : ''}><legend>${legend}</legend>`
    + `<label class="tier-name">Option label<input${named('option')} value="${escape(option?.label)}" required maxlength="200" autocomplete="off"></label>`
    + `<label class="tier-price">Price${(Number(option?.discountPercent??0)>0||Number(option?.discountAmount??0)>0)?' before discount':''} in ${escape(currency)}<span class="money-field"><span class="money-sign" aria-hidden="true">$</span><input${id ? ` id="${escape(formId)}-price-${escape(id)}"` : ''}${named('price')} value="${escape(option?.price ?? '')}" required inputmode="decimal" placeholder="0.00" autocomplete="off"><span class="money-figure" aria-hidden="true">${figure((Number(option?.discountPercent??0)>0||Number(option?.discountAmount??0)>0)?{...option,cents:Math.round(Number(option.price)*100)}:option)}</span></span></label>`
    + (packages?`<label>Package discount (%)<input data-package-field="discountPercent" value="${escape(option?.discountPercent??'0')}" inputmode="decimal" aria-label="Package discount (%)"></label><label>Package discount in USD<input data-package-field="discountAmount" value="${escape(option?.discountAmount??'0')}" inputmode="decimal"></label><label>Show discounts to client<select data-package-field="showDiscount"><option value="yes"${option?.showDiscount!=='no'?' selected':''}>Show discounts</option><option value="no"${option?.showDiscount==='no'?' selected':''}>Show net prices only</option></select></label><label>Discount expiry date (UTC)<input type="date" data-package-field="discountExpiresOn" value="${escape(option?.discountExpiresOn??'')}"></label>`:'')
    + `<dl class="tier-lines"><dt>Deposit at acceptance</dt><dd data-line="deposit">${shown(deposit)}</dd><dt>Balance after the deposit</dt><dd data-line="balance">${shown(deposit === undefined ? undefined : option.cents - deposit)}</dd></dl>`
    + `<p class="chip sage tier-deposit"><span class="tick" aria-hidden="true"></span><span><output data-line="percent">${bps === undefined ? '—' : escape(bps / 100)}</output>% deposit</span></p>${extras}</fieldset>`
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
  const packages = currency === 'USD'
  const shown = (packages ? (options.length ? editablePackages(options).map((o, i) => ({ ...o, cents: options[i].cents })) : [{ id: 'one' }, { id: 'two' }]) : [0, 1].map(i => options[i] ? { ...options[i], price: (options[i].cents / 100).toFixed(2) } : { id: ['one', 'two'][i] }))
  // An optional item offered by several packages under one id is one condition: shown while the client adds it.
  const extras = [...new Map(shown.flatMap((o: any) => (o.optionalItems ?? []).map((x: any) => [x.id, x.label]))).entries()]
  const visibility = (section: 'scope' | 'terms') => `<label class="visibility">${section === 'scope' ? 'Scope' : 'Terms'} visibility<select name="${section}Option"><option value="">Every option</option>${shown.map((o: any) => `<option value="${escape(o.id)}"${conditions[section] === o.id ? ' selected' : ''}>Only ${escape(o.label || 'option ' + o.id)}</option>`).join('')}${extras.map(([item, label]) => `<option value="item:${escape(item)}"${conditions[section] === 'item:' + item ? ' selected' : ''}>Only with ${escape(label)}</option>`).join('')}</select></label>`
  const columns = shown.map((o: any, i: number) => tier(o, i, currency, bps, i === Math.min(1, shown.length - 1), id, packages)).join('')
    + `<div class="tier scope-tier">${area('Scope of work', 'scope', proposal?.scope, 'required rows="5"')}${area('Terms', 'terms', proposal?.terms ?? '', 'rows="2"')}<div class="visibility-row">${visibility('scope')}${visibility('terms')}</div></div>`
  // Main's packages editor (packages.js) works on these columns: it adds and removes packages and their optional items.
  const tiers = packages ? `<div data-packages-editor><input type="hidden" data-packages-payload><div class="tiers" data-packages>${columns}</div>`
    + `<div class="packages-foot"><button type="button" class="quiet" data-package-action="add-package">Add package</button><p class="muted">Offer one or more packages. Optional items start unselected; the client can add them and review the server total before accepting.</p><p class="muted" role="status" data-packages-status></p></div>`
    + `<template data-package-template>${tier(undefined, -1, currency, bps, false, id, true)}</template><template data-optional-template>${optionalEditor()}</template><script src="/packages.js" defer></script></div>`
    : `<div class="tiers">${columns}</div>`
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
  // The refused package: from the packages the composer posted, or the two named fields of a plain post.
  const refused = /^package:(.+)$/.exec(feedback.field ?? '')?.[1]
  if (refused) {
    let posted: any[] = []
    try { posted = typeof input.packages === 'string' ? JSON.parse(input.packages) : Array.isArray(input.packages) ? input.packages : [] } catch { posted = [] }
    const at = posted.findIndex((x: any) => x?.id === refused), suffix = refused === 'one' ? 'One' : refused === 'two' ? 'Two' : ''
    const typed = String(at >= 0 ? posted[at].price ?? '' : input['price' + suffix] ?? ''), named = String(at >= 0 ? posted[at].label ?? '' : input['option' + suffix] ?? '').trim()
    const index = at >= 0 ? at : ['one', 'two'].indexOf(refused), label = named || `Option ${ordinal[index] ?? index + 1}`
    const cents = readable(typed), target = `${formId}-price-${refused}`
    const fix = cents === undefined
      ? `<button type="button" class="secondary" data-fix-field="${escape(target)}" hidden>Edit the ${escape(label)} price</button>`
      : `<button type="button" data-fix-field="${escape(target)}" data-fix-value="${(cents / 100).toFixed(2)}" hidden>Use ${money(cents)}</button>`
    return `<div class="band error" role="alert" data-refused="package:${escape(refused)}"><p><strong>${escape(label)} · price ${escape(typed || '(empty)')} is not a price Platter can read.</strong> Nothing was saved${p ? `; revision ${escape(p.revision)} stays as it was` : ''}. ${priceRule}</p><div class="band-actions">${fix}</div></div>`
  }
  // A save from this composer that lost to a newer version; other refusals keep their own notice.
  if (feedback.status === 409 && p && ['proposal.revise', 'proposal.negotiate'].includes(feedback.command ?? '')) {
    return `<div class="band error" role="alert" data-refused="conflict"><p><strong>This proposal changed while you were editing.</strong> It is now revision ${escape(p.revision)}, ${escape(p.status)}; your changes were not saved.</p><div class="band-actions"><a class="button-link" href="${escape(proposalPath(p.id))}">Reload revision ${escape(p.revision)}</a></div></div>`
  }
  return undefined
}
