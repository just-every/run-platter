import { ui } from '../locales'
import { recipientPlan } from '../recipients'
import { offerSelection, selectionItems } from '../selection'
import { hasExpandedSelection, itemChoices, selectedSummary, selectionChoices } from './packages'
import { date, escape, field, form, hidden, money, panel, proposalPath } from './shared'

// SIGN-008 screens: record a client-signed copy, and label how an agreement was accepted.
export function paperAcceptanceForm(state: any, p: any, params = new URLSearchParams()): string {
  if (state.actor?.role !== 'owner' || p.status !== 'sent' || recipientPlan(p).length) return ''
  const options = (p.options ?? []).map((o: any) => `<label class="choice option-choice"><input type="radio" name="optionId" value="${escape(o.id)}" required><span>${escape(o.label)} — ${money(o.cents, p.currency)}</span></label>`).join('')
  const expanded = hasExpandedSelection(p.options ?? [])
  const selection = expanded ? offerSelection(p.options, p.deposit_bps, params.get('paperOption') ?? p.options[0].id, selectionItems(Object.fromEntries(params)),p) : undefined
  const review = selection ? `<form method="get" action="/app/proposal#paper-acceptance">${hidden('id',p.id)}<label>Package recorded from signed copy<select name="paperOption">${p.options.map((o:any)=>`<option value="${escape(o.id)}"${o.id===selection.option.id?' selected':''}>${escape(o.label)}</option>`).join('')}</select></label><button>Choose signed package</button></form><form method="get" action="/app/proposal#paper-acceptance">${hidden('id',p.id)}${hidden('paperOption',selection.option.id)}${itemChoices(selection.option,selection)}<button>Review signed-copy selection</button></form>${selectedSummary(selection,p.currency)}<p>Review the package and optional quantities against the signed file before recording acceptance. Changing packages clears optional-item choices.</p>` : ''
  const returnTo = encodeURIComponent(proposalPath(p.id))
  return '<div id="paper-acceptance">' + panel('Record acceptance signed outside Platter', `<p>Use this when the client signed revision ${escape(p.revision)} in their own procurement or signing system. Platter keeps the file and your attestation; it does not verify the signature.</p>`
    + review + `<form method="post" enctype="multipart/form-data" action="/app/paper-acceptance?returnTo=${returnTo}">${hidden('id', p.id)}${hidden('version', p.version)}`
    + (selection ? hidden('optionId',selection.option.id) + hidden('items',JSON.stringify(selectionChoices(selection))) + `<p>Package to record: ${escape(selection.option.label)}. Total: ${money(selection.option.cents,p.currency)}. Deposit: ${money(selection.deposit,p.currency)}.</p>` : `<fieldset><legend>Option the client signed</legend>${options}</fieldset>`)
    + field('Signer full name', 'signer', '', 'required maxlength="200" autocomplete="off"')
    + field('Signed date', 'signedOn', '', 'required type="date"')
    + '<label>Client-signed copy<input name="file" type="file" required></label>'
    + '<label class="choice"><input type="checkbox" name="attest" value="yes" required><span>I attest that this file is the client\'s signed copy of this revision, signed by the named signer on that date.</span></label>'
    + '<button>Record accepted by upload</button></form>') + '</div>'
}

export function acceptanceMethod(a: any, signedCopyBase?: string): string {
  if (a.method !== 'upload') return ui('<dt>Acceptance method</dt><dd>Platter e-signature after ')+(a.verificationMethod==='SMS code'?'text-code verification':ui('mailbox verification'))+'</dd>'
  const copy = a.signedCopy && signedCopyBase ? `<dt>Signed copy</dt><dd><a href="${signedCopyBase}${encodeURIComponent(a.signedCopy.id)}">${escape(a.signedCopy.filename)} · ${escape(a.signedCopy.size)} bytes</a></dd>` : ''
  return ui`<dt>Acceptance method</dt><dd>Accepted by upload: signed outside Platter. Platter did not verify this signature.</dd><dt>Signed on</dt><dd>${escape(a.signedOn)}</dd>${copy}<dt>Attested by</dt><dd>${escape(a.attestedBy)} · ${date(a.attestedAt)}</dd>`
}


export function depositRequestPanel(state:any,p:any):string {
 if(state.actor?.role!=='owner'||p.acceptance?.method!=='upload')return ''
 const history=(p.depositRequests??[]).map((r:any)=>`<dl><dt>Request identity</dt><dd>${escape(r.id)}</dd><dt>Accepted revision</dt><dd>${escape(r.revision)}</dd><dt>Invited mailbox</dt><dd>${escape(r.recipient)}</dd><dt>Deposit requested</dt><dd>${money(r.deposit_cents,r.currency)}</dd><dt>Authorized at</dt><dd>${date(r.authorized_at)}</dd><dt>Delivery outcome</dt><dd>${escape(r.status)} · ${date(r.updated_at)}${r.provider?' · '+escape(r.provider):''}${r.provider_message_id?' · '+escape(r.provider_message_id):''}</dd></dl><ol aria-label="Deposit delivery history">${(r.history??[]).map((e:any)=>`<li>${escape(e.status)} · ${date(e.occurred_at)}${e.provider?' · '+escape(e.provider):''}${e.provider_message_id?' · '+escape(e.provider_message_id):''}</li>`).join('')}</ol>`).join('')
 const b=p.depositRequestReview
 const authorize=b&&!p.depositRequests?.length?`<p>Request ${money(b.depositCents,b.currency)} from ${escape(b.recipient)} for accepted revision ${escape(b.revision)}. This sends an informational request once. No charge, payment link or additional invoice is created.</p>`+form('deposit.request',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+['revision','acceptedAt','recipient','depositCents','invitationHash'].map(k=>hidden(k,b[k])).join('')+'<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>I authorize this deposit request to the invited mailbox for the frozen amount shown.</span></label><button>Send deposit request</button>'):''
 return panel('Deposit request',history+authorize+(!b&&!history?'<p>A current matching invitation and a tax-free, one-off agreement with collection off are required.</p>':'')+'<p>The signed copy remains owner-attested. Platter did not verify the signature. Uncertain delivery is held for review and is never sent again automatically.</p>')
}
