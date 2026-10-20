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
  const publicForm = (name: string, body: string): string => `<form method="post" action="${endpoint}${name}&amp;optionId=${encodeURIComponent(selectedId)}${itemsQuery}">${hidden('items',JSON.stringify(items))}${view.preview ? `<fieldset disabled>${body}</fieldset>` : body}</form>`
  const options = view.options ?? []
  const currency = view.currency ?? 'AUD'
  const expanded=hasExpandedSelection(options),conditional=expanded||Object.keys(sectionConditions(view.section_conditions)).length>0
  const pricing = currency === 'AUD' ? 'All prices are GST-free in AUD.' : 'All prices are in USD. Sales tax is not calculated.'
  let html = view.preview ? previewBanner(view) : ''
  if(!view.hiddenSections?.includes('scope')) html += panel('Scope of work', `<p class="preserve">${escape(view.scope)}</p>`)
  html += panel('Offer options', `${expanded?'<p>Package prices below exclude optional items. Your selection shows the final total and deposit.</p>':''}<p>${pricing} Deposit: ${escape(Number(view.deposit_bps) / 100)}% of the chosen option.</p>${optionPair(options, view.deposit_bps, view.acceptance?.optionId, currency)}${pricingTables(options,currency)}`)
  if(!view.hiddenSections?.includes('terms')) html += panel('Terms',`<p class="preserve">${escape(view.terms||'No additional terms.')}</p>`)
  html += panel(view.status==='accepted'?'Signed agreement package attachments':'Proposal attachments',attachmentList(view.attachments??[],view.preview?'/app/preview/client/attachments/':`/p/${encodeURIComponent(token)}/attachments/`,view.preview?'?id='+encodeURIComponent(view.id)+'&revision='+encodeURIComponent(view.revision):''))
  html += clientExpiryPanel(view,publicForm)
  html += clientQuestions(view,publicForm)
  if(!view.expiry?.expired) html += clientSuggestions(view,publicForm)
  if(view.previous) html += panel('Changes since your previous offer', `<p>Revision ${escape(view.previous.revision)} compared with revision ${escape(view.revision)}</p>${changes(view.previous,view)}`)
  if(expanded&&!view.preview)html+=selectedSummary(view.selection,currency)
  if(view.preview)html+=previewSelection(view)
  else if(conditional&&view.status!=='accepted')html+=panel('Choose your package',`<form data-package-selection method="get" action="/p/${encodeURIComponent(token)}"><label>Review sections for<select name="optionId">${options.map((o:any)=>`<option value="${escape(o.id)}"${o.id===selectedId?' selected':''}>${escape(o.label)}</option>`).join('')}</select></label>${itemChoices(options.find((o:any)=>o.id===selectedId),view.selection)}<button>Review package</button></form><p>Scope and terms above match this selection. Review them before accepting.</p>`)
  if (view.acceptance) {
    const accepted = view.acceptance
    html += panel('Proposal accepted', `<p>This agreement is complete and cannot be changed.</p><dl><dt>Accepted by</dt><dd>${escape(accepted.name)}${accepted.email && accepted.method !== 'upload' ? ` · ${escape(accepted.email)}` : ''}</dd><dt>Chosen option</dt><dd>${escape(options.find((option: any) => option.id === accepted.optionId)?.label)}</dd><dt>Total</dt><dd>${money(accepted.totalCents,accepted.currency??currency)}</dd><dt>Deposit due</dt><dd>${money(accepted.depositCents,accepted.currency??currency)}</dd><dt>Accepted at</dt><dd>${date(accepted.acceptedAt)}</dd>${acceptanceMethod(accepted)}</dl>`)
  } else if (view.status === 'accepted') {
    html += panel('Proposal accepted', '<p>This proposal has already been accepted. Its agreement cannot be changed.</p>')
  } else if (!view.verified) {
    html += panel('Verify your email', `<p>A verification code will be sent to ${escape(view.clientEmail)}. Verify your email to accept this offer.</p>` + publicForm('code.request', '<button>Send verification code</button>') + publicForm('code.verify', field('Email verification code', 'code', '', 'required autocomplete="one-time-code" inputmode="numeric"') + '<button>Verify email</button>'))
  } else if (!view.expiry?.expired) {
    html += panel('Accept this proposal', '<p>Your email is verified. Choose one option and confirm your acceptance below.</p>' + publicForm('accept', `<fieldset><legend>Choose one option</legend>${options.filter((o:any)=>!conditional||o.id===selectedId).map((option: any) => `<label class="choice option-choice"><input type="radio" name="optionId" value="${escape(option.id)}"${conditional||view.preview?.selection.option.id===option.id?' checked':''} required><span>${escape(option.label)} — ${money(expanded&&option.id===selectedId?(view.selection?.option?.cents??view.acceptance?.totalCents??option.cents):option.cents,currency)}<br><span class="muted">Deposit due: ${money(offerSelection(options,view.deposit_bps,option.id,expanded&&option.id===selectedId?items:[]).deposit,currency)}</span></span></label>`).join('')}</fieldset>` + field('Your full name', 'name', '', 'required autocomplete="name"') + '<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>I accept the scope of work, chosen option, total price, and deposit shown above.</span></label><p>Acceptance is permanent. Check your chosen option before continuing.</p><button>Accept proposal</button>' + (view.pdfDownloadsEnabled ? `<p>Choose an option above to download the unsigned revision.</p><button formnovalidate formaction="${view.preview?'/app/preview/client/download.pdf':`/p/${encodeURIComponent(token)}/download.pdf`}">Download unsigned proposal PDF</button>` : '')))
  }
  if(expanded)html+='<script src="/selection.js" defer></script>'
  return document(view.title, html, { client: true, feedback, eyebrow: `<p class="eyebrow">Proposal · Revision ${escape(view.revision)}${view.status === 'accepted' ? ' · accepted' : ''}</p>` })
}
