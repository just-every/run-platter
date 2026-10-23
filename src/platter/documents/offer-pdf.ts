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
export async function offerPdf(view: any, optionId: string, fontBytes: (Uint8Array | ArrayBuffer)[] = [], items: unknown = []): Promise<Uint8Array> {
 const options = typeof view.options === 'string' ? JSON.parse(view.options) : view.options
 need(Array.isArray(options), 'Offer options are missing')
 const selection = offerSelection(options,view.deposit_bps,optionId,items), selected = selection.option
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
  return Math.round(cents * depositBps / 10000)
 }
 const pdf = await PdfText.create(revision, fontBytes)
 pdf.document.setTitle(String(view.title ?? ''))
 pdf.document.setSubject(`Not signed, revision ${revision}`)
 pdf.document.setCreator('Platter')
 pdf.document.setProducer('Platter')

 pdf.text(String(view.title ?? ''), 22)
 pdf.gap(8)
 if (view.clientName != null) pdf.text(`Client: ${view.clientName}`)
 if (view.clientEmail != null) pdf.text(`Client email: ${view.clientEmail}`)
 pdf.text(`Revision ${revision}`)
 pdf.text(`Not signed, revision ${revision}`)
 pdf.gap()
 pdf.text(`Selected option: ${selected.label}`, 13)
 if(selected.discount)pdf.text(`Package discount: ${selected.discount.bps/100}% off ${amount(selected.discount.grossCents,currency)}; discount ${amount(selected.discount.cents,currency)}`)
 pdf.text(`Selected option total: ${amount(selected.cents, currency)}`)
 pdf.text(`Deposit due: ${amount(deposit(selected.cents), currency)}`)
 if(selection.items.length){pdf.heading('Selected optional items');for(const item of selection.items)pdf.text(`${item.label}: ${item.quantity} x ${amount(item.unitCents,currency)} = ${amount(item.totalCents,currency)}`)}

 const doc=documentOf(view)
 if(doc.brand?.name)pdf.heading(doc.brand.name)
 for(const block of doc.blocks){
  if(block.type==='page_break'){pdf.pageBreak();continue}
  if(block.title)pdf.heading(block.title)
  if(block.type==='pricing'){const o=options.find((o:any)=>o.id===block.optionId),t=o?.tables?.[block.tableIndex??0];if(t){pdf.heading(t.name);for(const l of t.lines){pdf.text(`${l.name}: ${l.quantity} ${l.unit} x ${amount(Math.round(Number(l.unitPrice)*100),currency)} = ${amount(l.lineTotalCents,currency)}`);if(l.description)pdf.text(l.description)}pdf.text(`Table subtotal: ${amount(t.subtotalCents,currency)}`)}}
  else {pdf.text(block.text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'));if(block.second)pdf.text(block.second.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/_([^_]+)_/g,'$1'))}
 }

 if(!view.hiddenSections.includes('scope')) { pdf.heading('Scope of work'); pdf.text(String(view.scope ?? '')) }
 if(!view.hiddenSections.includes('terms')) { pdf.heading('Terms'); pdf.text(view.terms ? String(view.terms) : 'No additional terms.') }

 pdf.heading('Offer options')
 pdf.text(currency === 'AUD' ? 'All prices are GST-free in AUD.' : 'All prices are in USD. Sales tax is not calculated.')
 pdf.text(`Deposit: ${depositBps / 100}% of the chosen option.`)
 for (const option of options) {
  pdf.gap(8)
  pdf.text(`${option.id === optionId ? 'Selected option' : 'Option'}: ${option.label}`, 12)
  pdf.text(`Total: ${amount(option.cents, currency)}`)
  pdf.text(`Deposit due: ${amount(deposit(option.cents), currency)}`)
  for(const table of option.tables??[]){
   pdf.heading(table.name)
   for(const line of table.lines){pdf.text(`${line.group ? line.group+': ' : ''}${line.name}`,12);if(line.description)pdf.text(line.description);pdf.text(`${line.quantity} ${line.unit} x ${amount(Number(line.unitPrice.replace('.','')),currency)} = ${amount(line.lineTotalCents,currency)}`)}
   for(const group of table.groups)pdf.text(`${group.name||'Ungrouped'} subtotal: ${amount(group.subtotalCents,currency)}`)
   pdf.text(`Table subtotal: ${amount(table.subtotalCents,currency)}`,12)
  }
  if(option.discount)pdf.text(`Package discount: ${option.discount.bps/100}% off ${amount(option.discount.grossCents,currency)}; discount ${amount(option.discount.cents,currency)}`)
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
 return pdf.document.save()
}
