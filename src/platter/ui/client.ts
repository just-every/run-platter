import { collectionPanel } from './collection'
import { paymentTerms } from '../payment-terms'
import { schedulePanel } from './payment-terms'
import { documentBlocks, documentBrandCss } from './blocks'
import { hasExpandedSelection, itemChoices, selectedSummary, selectionChoices } from './packages'
import { pricingTables } from './pricing'
import { sectionConditions } from '../conditional'
import { previewBanner, previewSelection } from './preview'
import { offerSelection } from '../selection'
import { clientQuestions } from './questions'
import { clientExpiryPanel } from './expiry'
import { attachmentList } from './attachments'
import { clientSuggestions } from './suggestions'
import { changes } from './history'
import { acceptanceMethod } from './paper'
import { date, escape, field, hidden, inZone, money, optionPair, panel, type Feedback } from './shared'
import { document } from './shell'

// The client reads every time in the installation's zone, the same as the owner sees the same event.
export function renderClient(view: any, token: string, feedback?: Feedback): Response {
  return inZone(view.timeZone, () => clientDocument(view, token, feedback))
}
function clientDocument(view: any, token: string, feedback?: Feedback): Response {
  const selectedId = view.acceptance?.optionId ?? view.preview?.selection.option.id ?? view.selectedOptionId ?? 'one'
  const endpoint = view.preview ? '/app/preview/client/action?name=' : `/p/${encodeURIComponent(token)}/action?name=`
  const items=selectionChoices(view.selection),itemsQuery=items.length?'&amp;items='+encodeURIComponent(JSON.stringify(items)):''
  const publicForm = (name: string, body: string): string => `<form${name==='accept'?' id="platter-acceptance"':''} method="post" action="${endpoint}${name}&amp;optionId=${encodeURIComponent(selectedId)}${itemsQuery}">${hidden('items',JSON.stringify(items))}${view.preview ? `<fieldset disabled>${body}</fieldset>` : body}</form>`
  const options = view.options ?? []
  const currency = view.currency ?? 'AUD'
  const expanded=hasExpandedSelection(options),conditional=Boolean(paymentTerms(view))||Boolean(view.documentConditional)||expanded||Object.keys(sectionConditions(view.section_conditions)).length>0
  const pricing = currency === 'AUD' ? 'All prices are GST-free in AUD.' : 'All prices are in USD. Sales tax is not calculated.'
  let html = view.preview ? previewBanner(view) : ''
  html+=panel('View privacy',view.tracking?.enabled?'<p>Views of this page are measured. The firm records the invitation recipient, time, device class and approximate city, region and country. A link view is unverified until mailbox verification. No full IP address is stored. Engagement is retained for '+escape(view.tracking.retention_days)+' days, unless held, and the firm can erase it.</p>':'<p>View measurement is off for this proposal. No third-party trackers are used.</p>')
  html += documentBlocks(view,view.preview?'/app/preview/client/media/':`/p/${encodeURIComponent(token)}/media/`,view.preview?'?'+view.preview.query:(view.selectedOptionId?'?optionId='+encodeURIComponent(view.selectedOptionId)+(items.length?'&items='+encodeURIComponent(JSON.stringify(items)):''):''))
  if(view.measured)html+=`<div data-engagement-view="${escape(view.measured.id)}" data-engagement-endpoint="/p/${encodeURIComponent(token)}/engagement" data-engagement-option="${escape(selectedId)}" data-engagement-items="${escape(JSON.stringify(items))}"></div>`
  if(!view.hiddenSections?.includes('scope')) html += panel('Scope of work', `<p class="preserve">${escape(view.scope)}</p>`)
  html += panel('Offer options', `${expanded?'<p>Package prices below exclude optional items. Your selection shows the final total and deposit.</p>':''}<p>${pricing} Deposit: ${paymentTerms(view)?.depositFixedCents!=null?money(paymentTerms(view).depositFixedCents,currency)+' fixed deposit.':escape(Number(view.deposit_bps) / 100)+'% of the chosen option.'}</p>${optionPair(options, view.deposit_bps, view.acceptance?.optionId, currency,view)}${pricingTables(options,currency)}`)
  html+=schedulePanel(view.acceptance?.paymentSchedule??view.selection?.paymentSchedule,currency)
  html+=options.filter((o:any)=>o.discountExpiresOn).map((o:any)=>'<p>'+escape(o.label)+' offer price expires on '+escape(o.discountExpiresOn)+' (UTC). After expiry, contact the firm for a new revision.</p>').join('')
  if(options.some((o:any)=>o.discount&&!o.concealDiscount))html+=panel('Package discounts',options.filter((o:any)=>o.discount&&!o.concealDiscount).map((o:any)=>'<p>'+escape(o.label)+': '+escape(o.discount.bps/100)+'% off '+money(o.discount.grossCents,currency)+' = '+money(o.cents,currency)+(o.discount.fixedCents?' with a fixed reduction of '+money(o.discount.fixedCents,currency):'')+'. The percentage applies to selected optional items; a fixed reduction applies once.</p>').join(''))
  if(!view.hiddenSections?.includes('terms')) html += panel('Terms',`<p class="preserve">${escape(view.terms||'No additional terms.')}</p>`)
  html += panel(view.status==='accepted'?'Signed agreement package attachments':'Proposal attachments',attachmentList(view.attachments??[],view.preview?'/app/preview/client/attachments/':`/p/${encodeURIComponent(token)}/attachments/`,view.preview?'?id='+encodeURIComponent(view.id)+'&revision='+encodeURIComponent(view.revision):''))
  html += clientExpiryPanel(view,publicForm)
  if(view.verified&&!view.preview&&view.status==='sent')html+=panel('Email reminders',view.reminderOptedOut?'<p>Email reminders are stopped for this revision. Your proposal decision is unchanged.</p>':'<p>You can stop reminder email for this revision without accepting or declining the proposal.</p>'+publicForm('reminder.opt-out','<button class="secondary">Stop email reminders</button>'))
  html += clientQuestions(view,publicForm)
  if(!view.expiry?.expired) html += clientSuggestions(view,publicForm)
  if(view.previous) html += panel('Changes since your previous offer', `<p>Revision ${escape(view.previous.revision)} compared with revision ${escape(view.revision)}</p>${changes(view.previous,view)}`)
  if(conditional&&!view.preview)html+=selectedSummary(view.selection,currency,options.find((o:any)=>o.id===selectedId)?.label)
  if(view.preview)html+=previewSelection(view)
  else if(conditional&&view.status!=='accepted')html+=panel('Choose your package',`<form method="get" action="/p/${encodeURIComponent(token)}#selection-review">${hidden('itemsOptionId',selectedId)}<label>Review sections for<select name="optionId">${options.map((o:any)=>`<option value="${escape(o.id)}"${o.id===selectedId?' selected':''}>${escape(o.label)}</option>`).join('')}</select></label>${itemChoices(options.find((o:any)=>o.id===selectedId),view.selection)}<button>Review package</button></form><p>Scope and terms above match this selection. Review them before accepting.</p>`)
  if(view.measured&&!view.verified)html+=panel('Received a forwarded link?',`<p>Identify yourself using your own mailbox. Your verified name and email will be shared with the proposal owner. This grants no signing authority.</p><form method="post" action="/p/${encodeURIComponent(token)}/stakeholder">${field('Your stakeholder name','name','','required maxlength="200"')}${field('Your stakeholder email','email','','required type="email"')}<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>Send me a verification code and share my verified identity with the owner.</span></label><button>Identify stakeholder</button></form>`)
  if (view.acceptance) {
    const accepted = view.acceptance
    html += panel(view.collection?.enabled&&!view.collection.complete?'Agreement signed — waiting for payment':'Proposal accepted', `<p>${view.collection?.enabled&&!view.collection.complete?'Your signature is retained. Acceptance completes when the deposit succeeds.':'This agreement is complete and cannot be changed.'}</p><dl><dt>${view.collection?.enabled?'Signed by':'Accepted by'}</dt><dd>${escape(accepted.name)}${accepted.email && accepted.method !== 'upload' ? ` · ${escape(accepted.email)}` : ''}</dd><dt>Chosen option</dt><dd>${escape(options.find((option: any) => option.id === accepted.optionId)?.label)}</dd><dt>Total</dt><dd>${money(accepted.totalCents,accepted.currency??currency)}</dd><dt>${view.collection?.enabled?'Agreed deposit':'Deposit due'}</dt><dd>${money(accepted.depositCents,accepted.currency??currency)}</dd><dt>${view.collection?.enabled?'Signed at':'Accepted at'}</dt><dd>${date(accepted.acceptedAt)}</dd>${acceptanceMethod(accepted)}</dl>`)
    if(view.certificateAvailable&&view.collection?.complete)html+=panel('Agreement downloads',`<p><a href="/p/${encodeURIComponent(token)}/agreement.pdf">Signed agreement PDF</a></p><p><a href="/p/${encodeURIComponent(token)}/certificate.pdf">Certificate of completion</a></p>`)
  } else if (view.status === 'accepted') {
    html += panel('Proposal accepted', '<p>This proposal has already been accepted. Its agreement cannot be changed.</p>')
  } else if (!view.verified) {
    html += panel(view.verificationMethod==='SMS code'?'Verify by text':'Verify your email', (view.verificationMethod==='SMS code'?'<p>A verification code will be sent to the mobile number recorded with your consent. Texts respect your quiet hours. Reply STOP to stop or HELP for help.</p>':`<p>A verification code will be sent to ${escape(view.clientEmail)}. Verify your email to accept this offer.</p>`) + publicForm('code.request', '<button>Send verification code</button>') + publicForm('code.verify', field(view.verificationMethod==='SMS code'?'Text verification code':'Email verification code', 'code', '', 'required autocomplete="one-time-code" inputmode="numeric"') + (view.verificationMethod==='SMS code'?'<button>Verify text code</button>':'<button>Verify email</button>')))
  } else if (!view.expiry?.expired) {
    html += panel('Accept this proposal', '<p>Your '+(view.verificationMethod==='SMS code'?'text code':'email')+' is verified. Choose one option and confirm your acceptance below.</p>' + publicForm('accept', `<fieldset><legend>Choose one option</legend>${options.filter((o:any)=>!conditional||o.id===selectedId).map((option: any) => `<label class="choice option-choice"><input type="radio" name="optionId" value="${escape(option.id)}"${conditional||view.preview?.selection.option.id===option.id?' checked':''} required><span>${escape(option.label)} — ${money(expanded&&option.id===selectedId?(view.selection?.option?.cents??view.acceptance?.totalCents??option.cents):option.cents,currency)}<br><span class="muted">Deposit due: ${money(offerSelection(options,view.deposit_bps,option.id,expanded&&option.id===selectedId?items:[],view).deposit,currency)}</span></span></label>`).join('')}</fieldset>` + field('Your full name', 'name', '', 'required autocomplete="name"') + '<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>I accept the scope of work, chosen option, total price, and deposit' + (paymentTerms(view)?' and payment schedule':'') + ' shown above.</span></label><p>Acceptance is permanent. Check your chosen option before continuing.</p><button>Accept proposal</button>' + (view.pdfDownloadsEnabled ? `<p>Choose an option above to download the unsigned revision.</p><button formnovalidate formaction="${view.preview?'/app/preview/client/download.pdf':`/p/${encodeURIComponent(token)}/download.pdf`}">Download unsigned proposal PDF</button>` : '')))
  }
  html+=collectionPanel(view,token)
  if(view.status!=='accepted'&&view.verified)html+=panel('Decline this proposal','<p>Declining closes this offer and revokes its client links. The firm can send a new revision for a fresh decision.</p>'+publicForm('decline',hidden('revision',view.revision)+field('Decline reason','reason','','required maxlength="1000"')+'<button class="secondary">Decline proposal</button>'))
  for(const [heading,key] of [['Scope of work','scope'],['Offer options','pricing'],['Terms','terms'],[view.status==='accepted'?'Signed agreement package attachments':'Proposal attachments','attachments']])html=html.replace('<h2>'+heading+'</h2>','<h2 data-engagement-section="'+key+'">'+heading+'</h2>')
  return document(view.title, html, { client: true, collection:Boolean(view.collection?.enabled&&view.verified), styles:documentBrandCss(view)+(view.collection?.enabled?'[data-stripe-payment][hidden],[data-collection][hidden]{display:none}':''), feedback, eyebrow: `<p class="eyebrow">Proposal · Revision ${escape(view.revision)}${view.status === 'accepted' ? view.collection?.enabled&&!view.collection.complete?' · signed · payment pending':' · accepted' : ''}</p>` })
}
