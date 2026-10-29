import { documentImportPanel } from './document-import'
import { variablesPanel } from './variables'
import { recipientsPanel } from './recipients'
import { trackingPanel } from './tracking'
import { performancePanel, priceSuggestionsPanel } from './performance'
import { collaborationPanel } from './collaboration'
import { collectionPolicyPanel } from './collection-policy'
import { schedulePanel } from './payment-terms'
import { depositCents, paymentTerms } from '../payment-terms'
import { folderSelect } from './folders'
import { libraryInsertion } from './library'
import { blockEditor, documentBlocks } from './blocks'
import { reminderPanel } from './reminders'
import { disputesPanel } from './disputes'
import { catalogPanel } from './catalog'
import { sectionLocksPanel } from './section-locks'
import { paymentsPanel } from './payments'
import { internalPricingPanel } from './internal-pricing'
import { approvalPanel } from './approvals'
import { sharingPanel } from './team'
import { invitationComposer, invitationTimeline, signerReplacementPanel } from './invitation-mail'
import { testMailPanel } from './test-mail'
import { selectedSummary } from './packages'
import { personalTemplates, savePersonalTemplate, starterTemplatesPanel } from './templates'
import { pricingTables } from './pricing'
import { followupQueuePanel, followupPanel } from './followup'
import { duplicatePanel } from './duplicate'
import { withdrawalPanel } from './withdrawal'
import { ownerQuestions, openQuestionsPanel } from './questions'
import { expiryPanel } from './expiry'
import { pdfPanel } from './client-pdf'
import { bounceInbox, deliveryPanel } from './delivery'
import { proposalAttachments } from './attachments'
import { suggestionsPanel } from './suggestions'
import { historyPanel } from './history'
import { acceptanceMethod, paperAcceptanceForm } from './paper'
import { pipelinePanel } from './pipeline'
import { reportSchedulesPanel } from './report-schedules'
import { composerForm, composerShelf, exceptionBand, preparedLine, receipt, receiptSum } from './composer'
import { date, empty, escape, form, hidden, money, notices, panel, proposalPath, statusPill, type Feedback } from './shared'

export function proposalsPage(state: any, selection = new URLSearchParams(), feedback?: Feedback): string {
  if(selection.get('view')==='sales-performance')return panel('Report views','<a href="/app">Proposal pipeline</a> · <a href="/app?view=recorded-revenue">Recorded revenue</a>')+performancePanel(state,selection)
  const proposals = state.proposals ?? []
  const list = proposals.length ? `<ul class="records">${proposals.map((p: any) => `<li><a href="${escape(proposalPath(p.id))}">${escape(p.title)}</a><span>${escape(p.clientName)} · ${statusPill(p.status)}</span></li>`).join('')}</ul>` : empty('No proposals yet. Prepare your first proposal below.')
  const canPrepare = ['owner','admin','manager','sales','content_editor'].includes(state.actor?.role)
  const owner = ['owner','admin','manager','sales','viewer'].includes(state.actor?.role)||(state.actor?.role==='billing'&&selection.get('view')==='recorded-revenue')
  // Exceptions appear only when there is one, above the line they interrupt (owner pick A).
  const exceptions = (state.openQuestions?.length ? openQuestionsPanel(state) : '') + ((state.bounceNotices?.length || state.replyCapNotices?.length) ? bounceInbox(state) : '')
  const prepare = canPrepare ? `<section class="prepare" aria-labelledby="prepare-title"><h2 id="prepare-title">Prepare a proposal</h2>` + (state.clients?.length
    ? composerShelf(state) + composerForm(state, undefined, 'prepare', 'composer-new') + (exceptionBand(state, undefined, feedback, 'composer-new') ?? '') + receipt('<p class="receipt-sum muted">The client chooses one of the two options and pays the deposit percentage of it.</p>', '<button form="composer-new">Prepare proposal</button>')
    : '<p>Add a client before preparing a proposal.</p>' + (owner ? '<a href="/app/clients">Manage clients</a>' : '<p>Ask the owner to add a client.</p>')) + '</section>' : ''
  return (exceptions ? `<div class="exceptions">${exceptions}</div>` : '') + (['owner','admin','manager','sales','viewer','billing'].includes(state.actor?.role)?panel('Report views','<a href="/app?view=recorded-revenue">Recorded revenue</a>'+ (state.actor?.role!=='billing'?' · <a href="/app">Proposal pipeline</a> · <a href="/app?view=sales-performance">Sales performance</a>':'')):'') + followupQueuePanel(state, selection.get('owner')) + (owner ? pipelinePanel(proposals, selection, state.followups) + reportSchedulesPanel(state, selection) : panel('Your proposals', list)) + personalTemplates(state,selection.get('q')??'',selection) + starterTemplatesPanel(state) + prepare
}

/** The tracked-caps line over the heading: stage, status, revision and client. */
export function proposalEyebrow(state: any, id: string): string {
  const p = state.proposals?.find((item: any) => String(item.id) === id)
  if (!p) return ''
  const editable = ['draft', 'approved'].includes(p.status) && ['owner','admin','manager','sales','content_editor'].includes(state.actor?.role)
  return `<p class="eyebrow proposal-status">${editable ? 'Compose · ' : ''}${escape(p.collection?.enabled&&p.acceptance?(p.collection.complete?'accepted':'signed · payment pending'):p.status)} · Revision ${escape(p.revision)} · To ${escape(p.clientName)}${p.negotiating ? ` · Revision ${escape(p.sentRevision)} still with the client` : ''}</p>`
}

function offerCards(p: any): string {
  const chosen = p.acceptance?.optionId
  const card = (o: any, i: number) => `<article class="tier${(chosen ? o.id === chosen : i === 1) ? ' raised' : ''}"><p class="tier-legend">${i ? 'Option two' : 'Option one'}${o.id === chosen ? ' · chosen' : ''}</p><h2 class="tier-title">${escape(o.label)}</h2><p class="tier-amount">${money(o.cents, p.currency)}</p><dl class="tier-lines"><dt>Deposit at acceptance</dt><dd>${money(depositCents(o.cents,p.deposit_bps,p), p.currency)}</dd><dt>Balance after the deposit</dt><dd>${money(o.cents - depositCents(o.cents,p.deposit_bps,p), p.currency)}</dd></dl><p class="chip sage"><span class="tick" aria-hidden="true"></span>${paymentTerms(p)?.depositFixedCents!=null?'Fixed deposit':escape(Number(p.deposit_bps) / 100)+'% deposit'}${o.id === chosen ? ` · chosen by ${escape(p.acceptance.name)}` : ''}</p></article>`
  return `<div class="tiers">${(p.options ?? []).map(card).join('')}<article class="tier scope-tier"><h2 class="tier-legend">Scope of work</h2><p class="preserve">${escape(p.scope)}</p><h2 class="tier-legend">Terms</h2><p class="preserve">${escape(p.terms || 'No additional terms.')}</p></article></div>`
}

/** A person's name on record, from the email Platter stores for them. */
export const personName = (state: any, email: unknown) => (state.reportPeople ?? []).find((person: any) => person.email === email)?.name || email

function people(state: any, p: any): string {
  const name = (email: unknown) => personName(state, email)
  return `<dl class="offer-people"><dt>Client</dt><dd>${escape(p.clientName)} · ${escape(p.clientEmail)}</dd><dt>Prepared by</dt><dd>${escape(p.preparedByName === 'Agent' ? 'Agent' : name(p.preparedByName || p.prepared_by))}</dd><dt>Approved by</dt><dd>${escape(p.approved_by ? name(p.approved_by) : 'Awaiting approval')}</dd><dt>Approved at</dt><dd>${date(p.approved_at)}</dd></dl>`
}

export function proposalPage(state: any, id: string, selection = new URLSearchParams(), feedback?: Feedback): string | null {
  const p = state.proposals?.find((item: any) => String(item.id) === id)
  if (!p) return null
  const path = proposalPath(p.id)
  const owner = state.actor?.role === 'owner'
  const person = Boolean(p.canEdit)
  const frozen = p.status === 'sent' || p.status === 'accepted' || p.status === 'expired' || p.status === 'withdrawn'
  const pricing = p.currency === 'AUD' ? 'All prices are GST-free in AUD.' : p.options?.some((o:any)=>o.tax)?'All prices are in USD. Package prices exclude tax; the selected total includes sales tax.':'All prices are in USD. Sales tax is not calculated.'
  const sum = receiptSum(p.options ?? [], Number(p.deposit_bps), p.currency, p.acceptance?.optionId,p)
  const withdrawn = p.withdrawals?.some((w: any) => w.revision === p.sentRevision)
  const clientView = owner && p.shareToken && !withdrawn ? `<div class="band-actions"><a class="button-link secondary" href="/p/${encodeURIComponent(p.shareToken)}">Open revision ${escape(p.sentRevision)} as ${escape(p.clientName)} sees it</a></div>` : ''
  const negotiated = p.negotiating ? `<div class="band caution" role="note"><p><strong>Negotiated draft · revision ${escape(p.sentRevision)} is still with ${escape(p.clientName)}.</strong> ${withdrawn ? 'The previous offer remains withdrawn.' : 'Revision ' + escape(p.sentRevision) + ' remains available to the client until'} this revision is approved and sent. If the client accepts it first, this draft cannot be sent.</p>${clientView}</div>` : ''
  let html = preparedLine(state, p)
  if (!frozen && person) {
    const actions = `<a class="button-link secondary" aria-label="Preview client page" href="/app/preview?id=${encodeURIComponent(p.id)}&amp;revision=${encodeURIComponent(p.revision)}">Preview</a><button form="composer-${escape(p.id)}" class="secondary">Save revision</button>`
      + (p.canApprove && ['draft','approved'].includes(p.status) ? form('proposal.approve', path, hidden('id', p.id) + hidden('version', p.version) + hidden('revision', p.revision) + '<button aria-label="Approve this revision"><span>Approve<span class="wide-only"> this revision</span></span></button>') : '')
      + (p.canSend && p.approval?.complete ? `<button form="invitation-${escape(p.id)}" aria-label="${p.approval.required?'Send approved proposal':'Send proposal'}"><span>Send<span class="wide-only"> ${p.approval.required?'approved proposal':'proposal'}</span></span></button>` : '')
    const note = p.approval?.complete&&!p.approval?.required ? 'Approval is not required under the current policy. Sending freezes this revision.' : p.status === 'approved' ? `Approved by ${escape(personName(state, p.approved_by))} · ${date(p.approved_at)}. Sending freezes this offer; saving a revision clears the approval.` : owner ? 'Confirm the scope and exact offered prices before approving this revision. Saving a revision clears any previous approval.' : 'Saving a revision clears any previous approval. The owner approves the offer before it is sent.'
    html += `<div class="composer-page">${composerShelf(state)}${composerForm(state, p, 'revise', `composer-${p.id}`)}${negotiated}${exceptionBand(state, p, feedback, `composer-${p.id}`) ?? notices(feedback)}${receipt(sum, actions, note)}</div>`
  } else {
    const share = owner && p.shareToken && frozen ? `<a class="button-link" href="/p/${encodeURIComponent(p.shareToken)}">Open client proposal</a>` : ''
    const fresh = p.canSend && ['sent', 'expired'].includes(p.status) ? `<button form="invitation-${escape(p.id)}" class="secondary">Send fresh client link</button>` : ''
    const note = frozen ? `${pricing} This offer is frozen. Its scope, options, and prices can no longer be revised.${fresh ? ' A fresh invitation replaces any previous client link and verification session while keeping the offer frozen.' : ''}` : pricing
    html += `<div class="composer-page frozen">${offerCards(p)}${exceptionBand(state, p, feedback, `negotiate-${p.id}`) ?? notices(feedback)}${receipt(sum, fresh + share, note)}</div>`
  }
  if(['owner','admin'].includes(state.actor.role))html+=panel('Proposal folder',form('proposal.folder',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+hidden('folderVersion',p.folderVersion)+folderSelect(state,'proposal',p.folderId)+'<label><input type="checkbox" name="shareConsent" value="yes" required>I confirm this folder audience. Existing proposal permissions still apply.</label><button>File proposal</button>'))
  html += !frozen&&person?blockEditor(p):documentBlocks(p,'/api/platter/document-media/'+encodeURIComponent(p.id)+'/')
  const itemised = pricingTables(p.options ?? [], p.currency)
  const dossier: string[] = [priceSuggestionsPanel(state,p),trackingPanel(state,p),collaborationPanel(state,p),p.canSend?collectionPolicyPanel(p):'',p.acceptance&&p.collection?.enabled?panel('Deposit status','<p>'+escape(p.collection.payment?.status??'Deposit due')+' · '+(p.collection.complete?'Acceptance complete':'Acceptance waiting for payment')+'</p>'):'',libraryInsertion(state,p),disputesPanel(state,p),catalogPanel(state,p),sectionLocksPanel(state,p),paymentsPanel(state,p),internalPricingPanel(p,selection.get('costOption')),approvalPanel(p),sharingPanel(state,p),followupPanel(state, p), withdrawalPanel(state, p), itemised ? `<section class="panel wide"><h2>Itemised pricing</h2>${itemised}</section>` : '', panel('Offer record', people(state, p)), proposalAttachments(state, p), p.status === 'withdrawn' ? '' : pdfPanel(state, p), expiryPanel(state, p), reminderPanel(state,p)]
  if (['sent', 'expired', 'withdrawn'].includes(p.status) && person) dossier.push(`<section class="panel wide"><h2>Negotiate a new revision</h2><p>The sent offer stays frozen. Prepare changed terms for a new approval before replacing the client invitation.</p>${composerForm(state, p, 'negotiate', `negotiate-${p.id}`, 'Prepare negotiated revision')}</section>`)
  dossier.push(paperAcceptanceForm(state, p, selection))
  if (p.acceptance) dossier.push(panel(p.collection?.enabled?'Signature record':'Client acceptance', `<dl><dt>${p.collection?.enabled?'Signed by':'Accepted by'}</dt><dd>${escape(p.acceptance.name)}${p.acceptance.method === 'upload' ? '' : ` · ${escape(p.acceptance.email)}`}</dd><dt>Chosen option</dt><dd>${escape(p.options?.find((o: any) => o.id === p.acceptance.optionId)?.label)}</dd><dt>Total</dt><dd>${money(p.acceptance.totalCents, p.currency)}</dd><dt>${p.collection?.enabled?'Agreed deposit':'Deposit due'}</dt><dd>${money(p.acceptance.depositCents, p.currency)}</dd><dt>${p.collection?.enabled?'Signed at':'Accepted at'}</dt><dd>${date(p.acceptance.acceptedAt)}</dd>${acceptanceMethod(p.acceptance, '/api/platter/attachments/' + encodeURIComponent(p.id) + '/')}</dl><p>${p.collection?.enabled?'The signature record is permanent.':'The accepted agreement is permanent.'}</p>`))
  if(p.acceptance?.paymentSchedule)dossier.push(schedulePanel(p.acceptance.paymentSchedule,p.currency))
  if (p.acceptance?.selection) dossier.push(selectedSummary(p.acceptance.selection, p.currency))
  if (owner && p.acceptance) dossier.push(panel('Invoice export', form('invoice.export', path, hidden('id', p.id) + '<button>Export invoice CSV</button>') + (p.invoice ? `<p>Invoice ${escape(p.invoice.number)} · Exported ${date(p.invoice.exported_at)}</p><a href="/api/platter/invoices/${encodeURIComponent(p.invoice.id)}.csv">Download deposit invoice CSV</a>` : '')))
  dossier.push(documentImportPanel(p),variablesPanel(p),recipientsPanel(state,p),signerReplacementPanel(p), invitationComposer(state, p, feedback), invitationTimeline(p), testMailPanel(state, p, feedback), duplicatePanel(state, p), savePersonalTemplate(state, p), ownerQuestions(state, p), deliveryPanel(state, p), p.status === 'withdrawn' ? '' : suggestionsPanel(state, p), historyPanel(state, p, selection))
  return html + `<div class="dossier">${dossier.join('')}</div>`
}
