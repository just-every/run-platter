import { depositCents, paymentTerms, scheduleLines } from '../payment-terms'
import { displayOptions } from '../discounts'
import { documentOf } from './blocks'
import { offerSelection } from '../selection'
import { selectedContent } from '../conditional'
import { need } from '../model'
import { PdfText } from './pdf-text'

function amount(cents: number, currency: string) {
 need(Number.isSafeInteger(cents) && cents >= 0, 'Invalid offer price')
 const whole = Math.floor(cents / 100).toLocaleString('en-US')
 return `${currency} ${whole}.${String(cents % 100).padStart(2, '0')}`
}

/** Render the current offer only. Caller owns authorization and revision selection. */
export async function offerPdf(view: any, optionId: string, fontBytes: (Uint8Array | ArrayBuffer)[] = [], items: unknown = [],media?:(id:string)=>Promise<Uint8Array>,mediaLink?:(id:string)=>string,signer?:{name:string;email:string;method:string;acceptedAt:number;consent:string}): Promise<Uint8Array> {
 const options = typeof view.options === 'string' ? JSON.parse(view.options) : view.options
 need(Array.isArray(options), 'Offer options are missing')
 const selection = offerSelection(options,view.deposit_bps,optionId,items,view), selected = selection.option
 need(selected, 'Choose one offered option')
 view = selectedContent(view,optionId,selection.items)
 const revision = Number(view.revision)
 const depositBps = Number(view.deposit_bps)
 need(Number.isSafeInteger(revision) && revision > 0, 'Invalid proposal revision')
 need(Number.isSafeInteger(depositBps) && depositBps >= 0 && depositBps <= 10000, 'Invalid offer deposit')
 const currency = view.currency ?? 'AUD'
 need(currency === 'AUD' || currency === 'USD', 'Unsupported offer currency')
 const deposit = (cents: number) => {
  need(Number.isSafeInteger(cents) && cents >= 0 && Number.isSafeInteger(cents * depositBps), 'Invalid offer price')
  return view.payment_terms ? depositCents(cents,depositBps,view) : Math.round(cents * depositBps / 10000)
 }
 const pdf = await PdfText.create(revision, fontBytes,signer?`Signed agreement, revision ${revision}`:undefined,documentOf(view).brand)
 pdf.document.setTitle(String(view.title ?? ''))
 pdf.document.setSubject(`${signer?'Signed agreement':'Not signed'}, revision ${revision}`)
 pdf.document.setCreator('Platter')
 pdf.document.setProducer('Platter')

 pdf.text(String(view.title ?? ''), 22)
 pdf.gap(8)
 if (view.clientName != null) pdf.text(`Client: ${view.clientName}`)
 if (view.clientEmail != null) pdf.text(`Client email: ${view.clientEmail}`)
 pdf.text(`Revision ${revision}`)
 pdf.text(`${signer?'Signed agreement':'Not signed'}, revision ${revision}`)
 pdf.gap()
 pdf.text(`Selected option: ${selected.label}`, 13)
 if(selected.discount&&!selected.concealDiscount)pdf.text(`Package discount: ${selected.discount.bps/100}% off ${amount(selected.discount.grossCents,currency)}; discount ${amount(selected.discount.cents,currency)}${selected.discount.fixedCents?`; fixed reduction ${amount(selected.discount.fixedCents,currency)}`:''}`)
 pdf.text(`Selected option total: ${amount(selected.cents, currency)}`)
 pdf.text(`Deposit due: ${amount(deposit(selected.cents), currency)}`)
 if(selection.paymentSchedule){pdf.heading('Payment schedule');pdf.text('Informational schedule. No automatic charges or invoices. Monthly retainers are additional to the package price.');for(const line of scheduleLines(selection.paymentSchedule,currency))pdf.text(line)}
 if(selection.items.length){pdf.heading('Selected optional items');for(const item of selection.items)pdf.text(`${item.label}: ${item.quantity} x ${amount(item.unitCents,currency)} = ${amount(item.totalCents,currency)}`)}

 const doc=documentOf(view)
 if(doc.brand?.logoId){need(media,'Document media is unavailable',503);await pdf.image(await media(doc.brand.logoId),80)}
 if(doc.brand?.name)pdf.heading(doc.brand.name)
 for(const block of doc.blocks){
  if(block.type==='page_break'){pdf.pageBreak();continue}
  if(block.title)pdf.heading(block.title)
  if(block.type==='field'||block.type==='signature'){pdf.text((block.type==='signature'?'Client signature (not signed)':(block.required?'Required ':'Optional ')+block.fieldKind+' field')+': '+block.title);if(block.text)pdf.text(block.text)}
  else if(block.type==='image'||block.type==='video'){need(media,'Document media is unavailable',503);await pdf.image(await media(block.type==='video'?block.posterId!:block.assetId!));if(block.type==='video'){pdf.text('Video: '+(block.alt??block.title));if(mediaLink)pdf.link(mediaLink(block.assetId!))}if(block.text)pdf.text(block.text)}
  else if(block.type==='gallery'){need(media,'Document media is unavailable',503);for(const image of block.images??[]){await pdf.image(await media(image.assetId));pdf.text(image.alt)}if(block.text)pdf.text(block.text)}
  else if(block.type==='embed'){need(media,'Document media is unavailable',503);await pdf.image(await media(block.posterId!));pdf.text(block.alt??block.title);pdf.link(block.url!);if(block.text)pdf.text(block.text)}
  else if(block.type==='pricing'){const o=displayOptions(options).find((o:any)=>o.id===block.optionId),t=o?.tables?.[block.tableIndex??0];if(t){pdf.heading(t.name);for(const l of t.lines){pdf.text(`${l.group?l.group+': ':''}${l.name}: ${l.quantity} ${l.unit}${l.unitPrice!==undefined?' x '+amount(Math.round(Number(l.unitPrice)*100),currency):''} = ${amount(l.lineTotalCents,currency)}`);if(l.description)pdf.text(l.description);if(l.discountBps||l.discountFixedCents)pdf.text(`Line discount for ${l.name}: ${(l.discountBps??0)/100}% and ${amount(l.discountFixedCents??0,currency)}`);if(l.groupDiscountBps||l.groupDiscountFixedCents)pdf.text(`Group discount for ${l.group}: ${(l.groupDiscountBps??0)/100}% and ${amount(l.groupDiscountFixedCents??0,currency)} once`)}for(const g of t.groups)pdf.text(`${g.name||'Ungrouped'} subtotal: ${amount(g.subtotalCents,currency)}`);pdf.text(`Table subtotal: ${amount(t.subtotalCents,currency)}`)}}
  else if(block.type==='columns')pdf.columns(block.text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'),(block.second??'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'))
  else {pdf.text(block.text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'));if(block.second)pdf.text(block.second.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'))}
 }

 if(!view.hiddenSections.includes('scope')) { pdf.heading('Scope of work'); pdf.text(String(view.scope ?? '')) }
 if(!view.hiddenSections.includes('terms')) { pdf.heading('Terms'); pdf.text(view.terms ? String(view.terms) : 'No additional terms.') }

 pdf.heading('Offer options')
 pdf.text(currency === 'AUD' ? 'All prices are GST-free in AUD.' : 'All prices are in USD. Sales tax is not calculated.')
 pdf.text(view.payment_terms&&paymentTerms(view)?.depositFixedCents!=null?'Fixed deposit applies.':`Deposit: ${depositBps / 100}% of the chosen option.`)
 for (const option of displayOptions(options)) {
  pdf.gap(8)
  pdf.text(`${option.id === optionId ? 'Selected option' : 'Option'}: ${option.label}`, 12)
  pdf.text(`Total: ${amount(option.cents, currency)}`)
  if(option.discountExpiresOn)pdf.text(`Offer price expires on ${option.discountExpiresOn} (UTC)`)
  pdf.text(`Deposit due: ${amount(deposit(option.cents), currency)}`)
  for(const [tableIndex,table] of (option.tables??[]).entries()){
   if(doc.blocks.some(b=>b.type==='pricing'&&b.optionId===option.id&&b.tableIndex===tableIndex))continue
   pdf.heading(table.name)
   for(const line of table.lines){pdf.text(`${line.group ? line.group+': ' : ''}${line.name}`,12);if(line.description)pdf.text(line.description);pdf.text(`${line.quantity} ${line.unit}${line.unitPrice!==undefined?' x '+amount(Number(line.unitPrice.replace('.','')),currency):''} = ${amount(line.lineTotalCents,currency)}`)}
   for(const line of table.lines){if(line.discountBps||line.discountFixedCents)pdf.text(`Line discount for ${line.name}: ${(line.discountBps??0)/100}% and ${amount(line.discountFixedCents??0,currency)}`);if(line.groupDiscountBps||line.groupDiscountFixedCents)pdf.text(`Group discount for ${line.group}: ${(line.groupDiscountBps??0)/100}% and ${amount(line.groupDiscountFixedCents??0,currency)} once`)}
   for(const group of table.groups)pdf.text(`${group.name||'Ungrouped'} subtotal: ${amount(group.subtotalCents,currency)}`)
   pdf.text(`Table subtotal: ${amount(table.subtotalCents,currency)}`,12)
  }
  if(option.discount)pdf.text(`Package discount: ${option.discount.bps/100}% off ${amount(option.discount.grossCents,currency)}; discount ${amount(option.discount.cents,currency)}${option.discount.fixedCents?`; fixed reduction ${amount(option.discount.fixedCents,currency)}`:''}`)
  if(option.tables?.length)pdf.text(`Package grand total: ${amount(option.cents,currency)}`,13)
 }

 pdf.heading('Proposal attachments')
 const attachments = typeof view.attachments === 'string' ? JSON.parse(view.attachments) : view.attachments ?? []
 need(Array.isArray(attachments), 'Invalid proposal attachments')
 if (!attachments.length) pdf.text('No attachments.')
 for (const attachment of attachments) {
  pdf.text(String(attachment.filename ?? ''))
  if (attachment.size != null) pdf.text(`Size: ${attachment.size} bytes`, 9)
  if (attachment.sha256) pdf.text(`SHA-256: ${attachment.sha256}`, 9)
  pdf.gap(6)
 }
 if(signer){pdf.heading('Signature');pdf.text('Signed by: '+signer.name);pdf.text('Recipient: '+signer.email);pdf.text('Verification method: '+signer.method);pdf.text('Accepted at: '+new Date(signer.acceptedAt).toISOString());pdf.text('Consent: '+signer.consent)}
 return pdf.document.save()
}
